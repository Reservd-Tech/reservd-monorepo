import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { json, preflight, requireApiKey } from "@/lib/api/public-auth.server";

const bodySchema = z.object({
  reference: z
    .string()
    .trim()
    .min(6)
    .max(32)
    .regex(/^[a-zA-Z0-9]+$/, "Reference must be alphanumeric"),
  app: z.string().trim().max(40).optional(),
});

export const Route = createFileRoute("/api/public/orders/$orderId/payment-claim")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request, params }) => {
        const denied = requireApiKey(request);
        if (denied) return denied;

        const idParsed = z.string().uuid().safeParse(params.orderId);
        if (!idParsed.success) return json({ error: "Invalid order id" }, 400);

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          return json({ error: "Invalid body", issues: parsed.error.issues }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: order, error } = await supabaseAdmin
          .from("orders")
          .update({
            payment_reference: parsed.data.reference,
            payment_app: parsed.data.app ?? null,
            payment_claimed_at: new Date().toISOString(),
          })
          .eq("id", idParsed.data)
          .select(
            "id, order_number, status, payment_status, payment_method, total, payment_reference, payment_app, payment_claimed_at, payment_confirmed_at",
          )
          .maybeSingle();

        if (error) return json({ error: error.message }, 500);
        if (!order) return json({ error: "Order not found" }, 404);

        return json({ order });
      },
    },
  },
});
