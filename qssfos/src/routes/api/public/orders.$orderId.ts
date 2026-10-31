import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { json, preflight, requireApiKey } from "@/lib/api/public-auth.server";

export const Route = createFileRoute("/api/public/orders/$orderId")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request, params }) => {
        const denied = requireApiKey(request);
        if (denied) return denied;

        const parsed = z.string().uuid().safeParse(params.orderId);
        if (!parsed.success) return json({ error: "Invalid order id" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: order, error } = await supabaseAdmin
          .from("orders")
          .select(
            "id, order_number, status, payment_status, payment_method, order_type, subtotal, tax, total, created_at, updated_at, customer_name, eta_minutes, accepted_at, ready_at, rejection_reason, payment_reference, payment_app, payment_claimed_at, payment_confirmed_at, storefronts(slug, brand_name, upi_id, upi_payee_name, upi_qr_url), order_items(id, product_name, quantity, unit_price, line_total)",
          )
          .eq("id", parsed.data)
          .maybeSingle();

        if (error) return json({ error: error.message }, 500);
        if (!order) return json({ error: "Order not found" }, 404);

        return json({ order });
      },
    },
  },
});
