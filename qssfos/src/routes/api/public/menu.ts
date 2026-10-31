import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { corsHeaders, json, preflight, requireApiKey } from "@/lib/api/public-auth.server";
import { hoursPayload } from "@/lib/shop/hours";
import { withVersion } from "@/lib/shop/image-url";

const querySchema = z.object({ slug: z.string().min(1).max(80) });

export const Route = createFileRoute("/api/public/menu")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        const denied = requireApiKey(request);
        if (denied) return denied;

        const url = new URL(request.url);
        const parsed = querySchema.safeParse({ slug: url.searchParams.get("slug") ?? "" });
        if (!parsed.success) return json({ error: "Invalid or missing `slug`" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: storefront, error: sfError } = await supabaseAdmin
          .from("storefronts")
          .select("id, slug, brand_name, tagline, description, address, phone, opening_hours, logo_url, cover_url, gallery_urls, upi_id, upi_payee_name, upi_qr_url, is_open, fssai_number, fssai_verified, stall_photo_url, updated_at")
          .eq("slug", parsed.data.slug)
          .eq("listing_status", "live")
          .is("archived_at", null)
          .maybeSingle();
        if (sfError) return json({ error: sfError.message }, 500);
        if (!storefront) return json({ error: "Storefront not found" }, 404);

        const [cats, prods] = await Promise.all([
          supabaseAdmin
            .from("categories")
            .select("id, name, sort_order")
            .eq("storefront_id", storefront.id)
            .order("sort_order")
            .order("name"),
          supabaseAdmin
            .from("products")
            .select("id, name, description, price, image_url, category_id, is_available")
            .eq("storefront_id", storefront.id)
            .eq("is_available", true)
            .order("name"),
        ]);
        if (cats.error) return json({ error: cats.error.message }, 500);
        if (prods.error) return json({ error: prods.error.message }, 500);

        const hours = hoursPayload(storefront.opening_hours);

        return new Response(
          JSON.stringify({
            storefront: {
              ...storefront,
              logo_url: withVersion(storefront.logo_url, storefront.updated_at),
              cover_url: withVersion(storefront.cover_url, storefront.updated_at),
              upi_qr_url: withVersion(storefront.upi_qr_url, storefront.updated_at),
              opening_hours: hours.text || storefront.opening_hours,
              hours,
              accepting_orders: storefront.is_open && hours.open_now !== false,
            },
            categories: cats.data ?? [],
            products: (prods.data ?? []).map((p) => ({ ...p, price: Number(p.price) })),
            taxRate: 0.05,
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              "cache-control": "no-store",
              ...corsHeaders,
            },
          },
        );
      },
    },
  },
});
