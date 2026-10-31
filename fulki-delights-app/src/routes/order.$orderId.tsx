import confetti from "canvas-confetti";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { claimPayment, getPublicOrder } from "@/lib/storefront/orders.functions";
import { money, orderCode, sfKeys, STATUS_FLOW, type OrderStatus } from "@/lib/storefront/queries";
import { useCustomer } from "@/lib/customer";
import { UpiPaymentSheet } from "@/components/UpiPaymentSheet";
import { FoodRatings } from "@/components/FoodRatings";

export const Route = createFileRoute("/order/$orderId")({
  head: () => ({
    meta: [
      { title: "Track your order — Reservd" },
      { name: "description", content: "Live status of your Fulki order, from received to ready." },
      { property: "og:title", content: "Track your order — Reservd" },
      { property: "og:description", content: "Live status of your Fulki order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrderTracking,
});

const STEP_HINTS: Record<string, string> = {
  pending: "The kitchen has your order.",
  preparing: "Your pani puri is being made fresh.",
  ready: "Ready — please collect at the counter.",
  completed: "Order handed over. Enjoy!",
};

function OrderTracking() {
  const { orderId } = Route.useParams();
  const fetchOrder = useServerFn(getPublicOrder);
  const queryClient = useQueryClient();
  const { rememberOrder } = useCustomer();

  useEffect(() => {
    rememberOrder(orderId);
  }, [orderId, rememberOrder]);

  const { data: order, isLoading } = useQuery({
    queryKey: sfKeys.order(orderId),
    queryFn: () => fetchOrder({ data: { orderId } }),
    // Live tracking: poll quickly until the order is finished. Realtime below
    // pushes instant updates when the vendor app changes the status. While a
    // payment claim awaits vendor confirmation, poll every 10s.
    refetchInterval: (query) => {
      const o = query.state.data as
        | { status?: string; payment_status?: string; payment_claimed_at?: string | null }
        | null
        | undefined;
      if (o?.payment_status === "pending" && o.payment_claimed_at) return 10_000;
      const status = o?.status;
      return status === "completed" || status === "cancelled" ? false : 4000;
    },
    refetchOnWindowFocus: true,
  });

  const claimPaymentFn = useServerFn(claimPayment);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);

  const savePaymentRef = useCallback(
    async (reference: string) => {
      await claimPaymentFn({
        data: { orderId, reference, ...(selectedApp ? { app: selectedApp } : {}) },
      });
      await queryClient.invalidateQueries({ queryKey: sfKeys.order(orderId) });
    },
    [claimPaymentFn, orderId, selectedApp, queryClient],
  );


  /** Refresh the tracked status right away, then a few times as the vendor reacts. */
  const refreshStatus = useCallback(() => {
    const invalidate = () =>
      void queryClient.invalidateQueries({ queryKey: sfKeys.order(orderId) });
    invalidate();
    const timers = [1500, 4000, 8000].map((ms) => setTimeout(invalidate, ms));
    return () => timers.forEach(clearTimeout);
  }, [orderId, queryClient]);

  useEffect(() => {
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        () => queryClient.invalidateQueries({ queryKey: sfKeys.order(orderId) }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId, queryClient]);

  if (isLoading) {
    return <div className="min-h-screen px-5 pt-20 text-sm text-muted-foreground">Loading order…</div>;
  }
  if (!order) {
    return (
      <div className="min-h-screen px-5 pt-20">
        <p className="text-sm text-muted-foreground">We couldn't find that order.</p>
        <Link to="/" className="press mt-4 inline-block rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">
          Go home
        </Link>
      </div>
    );
  }

  const status = order.status as OrderStatus;
  const activeIndex = STATUS_FLOW.findIndex((s) => s.key === status);
  const brand = order.storefronts?.brand_name ?? "Fulki";
  const upiId = order.storefronts?.upi_id ?? null;
  const qrImageUrl = order.storefronts?.upi_qr_url ?? null;
  const paymentRef = order.payment_reference ?? null;
  const paymentApp = order.payment_app ?? selectedApp;
  const awaitingConfirm =
    order.payment_status === "pending" && Boolean(order.payment_claimed_at);
  const paymentPaid = order.payment_status === "paid";
  const showPayment =
    order.payment_method === "upi" && !paymentPaid && !paymentRef && status !== "cancelled";

  return (
    <div className="ember-bg min-h-screen px-5 pb-32 pt-10">
      <Celebrate status={status} />
      {(status === "pending" || status === "preparing" || status === "ready") && (
        <div className="lift border border-line mb-6 flex items-center gap-3 rounded-lg bg-primary px-5 py-4 text-primary-foreground">
          <span className="relative grid h-3 w-3 shrink-0 place-items-center">
            <span className="absolute h-3 w-3 animate-ping rounded-full bg-primary-foreground/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-primary-foreground" />
          </span>
          <p className="text-sm font-extrabold">
            {status === "ready" ? "Ready for pickup now" : status === "preparing" ? "Ready for pickup in ~5–10 mins" : "Kitchen will start shortly"}
          </p>
        </div>
      )}
      <div className="rise-in text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-accent text-accent-foreground mx-auto">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold">Order confirmed</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {brand} · {order.order_type === "dine_in" ? "Dine in" : "Takeaway"}
        </p>
        <p className="heat-text mt-3 text-4xl font-extrabold tracking-normal">
          {orderCode(order.order_number, brand)}
        </p>
      </div>

      {showPayment ? (
        <div className="mt-8">
          <UpiPaymentSheet
            orderId={orderId}
            upiId={upiId}
            payeeName={order.storefronts?.upi_payee_name ?? brand}
            qrImageUrl={qrImageUrl}
            amount={Number(order.total)}
            note={orderCode(order.order_number, brand)}
            brandName={brand}
            onMarkedPaid={refreshStatus}
            savedReference={paymentRef}
            onSaveReference={savePaymentRef}
            onAppSelected={setSelectedApp}
          />
        </div>
      ) : null}

      {order.payment_method === "upi" && (awaitingConfirm || paymentPaid) ? (
        <section className="glass-panel mt-5 rounded-lg p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-bold uppercase tracking-normal text-muted-foreground">
              Payment confirmation
            </h2>
            <span
              className={
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold " +
                (paymentPaid
                  ? "bg-success/15 text-success"
                  : "bg-accent text-muted-foreground")
              }
            >
              {paymentPaid ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Payment confirmed
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5" /> Awaiting vendor
                </>
              )}
            </span>
          </div>
          {!paymentPaid && awaitingConfirm ? (
            <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Waiting for {brand} to confirm
            </p>
          ) : null}
          <dl className="mt-4 space-y-2.5 text-sm">
            <Row label="Paid via" value={paymentApp ?? "UPI app"} />
            {upiId ? <Row label="UPI ID" value={upiId} /> : null}
            <Row label="Amount" value={money(Number(order.total))} />
            {paymentRef ? <Row label="UTR / reference" value={paymentRef} mono /> : null}
          </dl>
        </section>
      ) : null}






      <section className="glass-panel mt-5 rounded-lg p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-normal text-muted-foreground">
            Live tracking
          </h2>
          {status !== "cancelled" && status !== "completed" ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Live
            </span>
          ) : null}
        </div>

        {status === "cancelled" ? (
          <p className="mt-4 text-sm font-semibold text-destructive">This order was cancelled.</p>
        ) : (
          <ol className="mt-5">
            {STATUS_FLOW.map((step, index) => {
              const done = index < activeIndex;
              const current = index === activeIndex;
              const last = index === STATUS_FLOW.length - 1;
              return (
                <li key={step.key} className="relative flex gap-4 pb-6 last:pb-0">
                  {!last ? (
                    <span
                      aria-hidden
                      className={
                        "absolute left-[17px] top-9 h-[calc(100%-2.25rem)] w-0.5 rounded-full " +
                        (done ? "bg-primary" : "bg-border")
                      }
                    />
                  ) : null}
                  <span
                    className={
                      "relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors " +
                      (done
                        ? "bg-primary text-primary-foreground"
                        : current
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/25"
                          : "bg-accent text-muted-foreground")
                    }
                  >
                    {current && !last ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : done || current ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-current" />
                    )}
                  </span>
                  <span className="min-w-0 pt-1">
                    <span
                      className={
                        "block text-sm font-bold " +
                        (current ? "text-primary" : done ? "" : "text-muted-foreground")
                      }
                    >
                      {step.label}
                    </span>
                    {current ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {STEP_HINTS[step.key]}
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="lift border border-line mt-5 rounded-lg bg-card p-5">
        <h2 className="text-xs font-bold uppercase tracking-normal text-muted-foreground">Summary</h2>
        <div className="mt-3 space-y-2 text-sm">
          {order.order_items?.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate">
                {item.quantity} × {item.product_name}
              </span>
              <span className="shrink-0 font-semibold">{money(Number(item.line_total))}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-border pt-3 text-base font-extrabold">
            <span>Total</span>
            <span className="text-primary">{money(Number(order.total))}</span>
          </div>
          <p className="pt-1 text-xs text-muted-foreground">
            Payment: {order.payment_method === "upi" ? "UPI" : "Cash"} · {order.payment_status}
            {paymentRef ? (
              <>
                <br />
                UPI ref: <span className="font-semibold text-foreground">{paymentRef}</span>
              </>
            ) : null}
          </p>
        </div>
      </section>

      <FoodRatings order={order} />

      <Link
        to="/orders"
        className="press mt-6 block rounded-lg bg-accent py-4 text-center text-sm font-bold"
      >
        View all orders
      </Link>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={"min-w-0 truncate font-bold " + (mono ? "font-mono text-xs" : "")}>{value}</dd>
    </div>
  );
}

/** Fire confetti once when the order moves to Ready (not on first load of an already-ready order). */
function Celebrate({ status }: { status: OrderStatus }) {
  const prev = useRef<OrderStatus | null>(null);
  useEffect(() => {
    if (prev.current && prev.current !== status && status === "ready") {
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
    }
    prev.current = status;
  }, [status]);
  return null;
}
