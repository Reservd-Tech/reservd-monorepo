import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireApiKey } from "@/lib/api/public-auth.server";
import { hoursPayload } from "@/lib/shop/hours";
import { withVersion } from "@/lib/shop/image-url";

export const Route = createFileRoute("/api/public/storefronts")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        const denied = requireApiKey(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("storefronts")
          .select("id, slug, brand_name, tagline, description, address, phone, opening_hours, logo_url, cover_url, stall_photo_url, upi_id, upi_payee_name, upi_qr_url, latitude, longitude, is_open, fssai_number, fssai_verified, listing_status, updated_at")
          .eq("is_open", true)
          .eq("listing_status", "live")
          .is("archived_at", null)
          .order("brand_name");

        if (error) return json({ error: error.message }, 500);
        const storefronts = (data ?? []).map((s) => {
          const hours = hoursPayload(s.opening_hours);
          return {
            ...s,
            logo_url: withVersion(s.logo_url, s.updated_at),
            cover_url: withVersion(s.cover_url, s.updated_at),
            upi_qr_url: withVersion(s.upi_qr_url, s.updated_at),
            // Legacy field kept as a human-readable string for older clients.
            opening_hours: hours.text || s.opening_hours,
            hours,
            // Manual switch AND the schedule must both allow orders.
            accepting_orders: s.is_open && hours.open_now !== false,
          };
        });
        return json({ storefronts });
      },
    },
  },
});

