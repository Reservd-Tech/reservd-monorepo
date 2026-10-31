import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { json, preflight, requireApiKey } from "@/lib/api/public-auth.server";

const TAX_RATE = 0.05;

const placeOrderSchema = z.object({
  slug: z.string().min(1).max(80),
  orderType: z.enum(["dine_in", "takeaway", "delivery"]).default("takeaway"),
  paymentMethod: z.enum(["upi", "card"]).default("upi"),
  paymentStatus: z.enum(["pending", "paid"]).default("pending"),
  customerName: z.string().max(80).optional(),
  customerPhone: z.string().max(20).optional(),
  notes: z.string().max(300).optional(),
  items: z
    .array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(50) }))
    .min(1)
    .max(40),
});

export const Route = createFileRoute("/api/public/orders")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => {
        const denied = requireApiKey(request);
        if (denied) return denied;

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
        const parsed = placeOrderSchema.safeParse(raw);
        if (!parsed.success) {
          return json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
        }
        const data = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: storefront, error: sfError } = await supabaseAdmin
          .from("storefronts")
          .select("id, is_open, brand_name")
          .eq("slug", data.slug)
          .maybeSingle();
        if (sfError) return json({ error: sfError.message }, 500);
        if (!storefront) return json({ error: "Storefront not found" }, 404);
        if (!storefront.is_open) return json({ error: "Storefront is not accepting orders" }, 409);

        const ids = data.items.map((i) => i.productId);
        const { data: products, error: prodError } = await supabaseAdmin
          .from("products")
          .select("id, name, price, is_available")
          .in("id", ids)
          .eq("storefront_id", storefront.id);
        if (prodError) return json({ error: prodError.message }, 500);

        const lines: {
          product_id: string;
          product_name: string;
          unit_price: number;
          quantity: number;
          line_total: number;
        }[] = [];
        for (const item of data.items) {
          const product = products?.find((p) => p.id === item.productId);
          if (!product || !product.is_available) {
            return json({ error: `Item unavailable: ${item.productId}` }, 409);
          }
          lines.push({
            product_id: product.id,
            product_name: product.name,
            unit_price: Number(product.price),
            quantity: item.quantity,
            line_total: Math.round(Number(product.price) * item.quantity * 100) / 100,
          });
        }

        const subtotal = Math.round(lines.reduce((s, l) => s + l.line_total, 0) * 100) / 100;
        const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
        const total = Math.round((subtotal + tax) * 100) / 100;

        let customerId: string | null = null;
        if (data.customerPhone) {
          const { data: existing } = await supabaseAdmin
            .from("customers")
            .select("id")
            .eq("phone", data.customerPhone)
            .maybeSingle();
          if (existing) {
            customerId = existing.id;
            if (data.customerName) {
              await supabaseAdmin
                .from("customers")
                .update({ name: data.customerName })
                .eq("id", existing.id);
            }
          } else {
            const { data: created } = await supabaseAdmin
              .from("customers")
              .insert({ name: data.customerName ?? null, phone: data.customerPhone })
              .select("id")
              .single();
            customerId = created?.id ?? null;
          }
        }

        const { data: order, error: orderError } = await supabaseAdmin
          .from("orders")
          .insert({
            storefront_id: storefront.id,
            customer_id: customerId,
            customer_name: data.customerName ?? null,
            customer_phone: data.customerPhone ?? null,
            order_type: data.orderType,
            status: "pending",
            payment_method: data.paymentMethod,
            payment_status: data.paymentStatus,
            subtotal,
            tax,
            total,
            notes: data.notes ?? null,
            source: "consumer",
          })
          .select("id, order_number, subtotal, tax, total, status, payment_status, created_at")
          .single();
        if (orderError) return json({ error: orderError.message }, 500);

        const { error: itemsError } = await supabaseAdmin
          .from("order_items")
          .insert(lines.map((l) => ({ ...l, order_id: order.id })));
        if (itemsError) {
          await supabaseAdmin.from("orders").delete().eq("id", order.id);
          return json({ error: itemsError.message }, 500);
        }

        return json(
          {
            orderId: order.id,
            orderNumber: order.order_number,
            status: order.status,
            paymentStatus: order.payment_status,
            subtotal: Number(order.subtotal),
            tax: Number(order.tax),
            total: Number(order.total),
            createdAt: order.created_at,
          },
          201,
        );
      },
    },
  },
});
