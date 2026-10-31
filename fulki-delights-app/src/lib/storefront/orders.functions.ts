import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkoutPaymentSchema, checkoutPaymentNote, paymentAmountMatches } from "./checkout-payment";
import { transactionRefForOrder } from "@/lib/upi";

const placeOrderSchema = z.object({
  /** Client-generated reference for this checkout attempt (idempotency key). */
  clientRef: z.string().uuid(),
  slug: z.string().min(1).max(80),
  orderType: z.enum(["dine_in", "takeaway"]),
  paymentMethod: z.literal("upi"),
  payment: checkoutPaymentSchema,
  customerName: z.string().max(80).optional(),
  customerPhone: z.string().max(20).optional(),
  notes: z.string().max(300).optional(),
  items: z
    .array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(50) }))
    .min(1)
    .max(40),
});

/**
 * Places the customer's order and hands it to the vendor app (Street OS)
 * over an authenticated server-to-server request. Returns only once the
 * vendor side has accepted the order.
 */
export const placePublicOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => placeOrderSchema.parse(input))
  .handler(async ({ data }) => {
    const { submitOrderToStreetOs, fetchStreetOsMenu, claimOrderPayment } = await import("@/lib/streetos/client.server");
    const { getRecorded, recordInflight, recordAck, forget } = await import(
      "@/lib/streetos/idempotency.server"
    );

    const attachClaim = async (ack: { orderId: string; orderNumber: number; total: number }) => {
      if (!data.payment.reference) return { orderId: ack.orderId, orderNumber: ack.orderNumber, total: ack.total, paymentClaimSaved: false };
      try {
        await claimOrderPayment(ack.orderId, { reference: data.payment.reference, ...(data.payment.app ? { app: data.payment.app } : {}) });
        return { orderId: ack.orderId, orderNumber: ack.orderNumber, total: ack.total, paymentClaimSaved: true };
      } catch {
        return { orderId: ack.orderId, orderNumber: ack.orderNumber, total: ack.total, paymentClaimSaved: false };
      }
    };
    const existing = getRecorded(data.clientRef);
    if (existing?.ack) {
      const ack = existing.ack;
      return attachClaim(ack);
    }
    if (existing?.inflight) {
      const ack = await existing.inflight;
      return attachClaim(ack);
    }

    const menu = await fetchStreetOsMenu(data.slug);
    if (!menu?.storefront?.is_open) throw new Error("The kitchen isn't accepting orders right now. If you already paid, contact the kitchen with your UPI receipt.");
    let subtotal = 0;
    for (const item of data.items) {
      const product = menu.products.find((p) => p.id === item.productId && p.is_available);
      if (!product) throw new Error("An item is no longer available. If you already paid, contact the kitchen with your UPI receipt.");
      subtotal += Number(product.price) * item.quantity;
    }
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    if (!paymentAmountMatches(data.payment.amount, subtotal + tax)) throw new Error("The kitchen's prices have changed. Do not pay again; contact the kitchen with your UPI receipt.");
    const { clientRef, payment, ...payload } = data;
    const request = submitOrderToStreetOs({
      ...payload,
      notes: [payload.notes, checkoutPaymentNote(payment), `Payment tr: ${transactionRefForOrder(clientRef)}`].filter(Boolean).join(" · ").slice(0, 300),
      paymentStatus: "pending",
    });
    recordInflight(clientRef, request);

    let ack;
    try {
      ack = await request;
    } catch (error) {
      forget(clientRef);
      throw error instanceof Error ? error : new Error("Could not place your order.");
    }
    recordAck(clientRef, ack);

    return attachClaim(ack);
  });

export const getPublicOrder = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { fetchStreetOsOrder } = await import("@/lib/streetos/client.server");
    return await fetchStreetOsOrder(data.orderId);
  });

const claimPaymentSchema = z.object({
  orderId: z.string().uuid(),
  reference: z.string().min(6).max(32),
  app: z.string().max(40).optional(),
});

/** Attaches the customer's UPI transaction reference (UTR) to their order in Street OS. */
export const claimPayment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => claimPaymentSchema.parse(input))
  .handler(async ({ data }) => {
    const { claimOrderPayment } = await import("@/lib/streetos/client.server");
    return await claimOrderPayment(data.orderId, {
      reference: data.reference,
      ...(data.app ? { app: data.app } : {}),
    });
  });

/**
 * Order history for this customer. Orders are addressed by their unguessable
 * UUID (kept on the customer's device), so no phone-number enumeration is
 * possible.
 */
export const getOrdersByIds = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ orderIds: z.array(z.string().uuid()).max(60) }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.orderIds.length === 0) return [];
    const { fetchStreetOsOrder } = await import("@/lib/streetos/client.server");

    const results = await Promise.all(
      data.orderIds.slice(0, 30).map((id) => fetchStreetOsOrder(id).catch(() => null)),
    );

    return results
      .filter((order): order is NonNullable<typeof order> => Boolean(order))
      .map((order) => ({
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        total: Number(order.total),
        created_at: order.created_at,
        order_type: order.order_type,
        storefronts: order.storefronts
          ? { slug: order.storefronts.slug, brand_name: order.storefronts.brand_name }
          : null,
      }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  });
