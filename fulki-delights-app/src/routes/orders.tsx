import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import { getOrdersByIds, getPublicOrder } from "@/lib/storefront/orders.functions";
import { getMenu } from "@/lib/storefront/catalog.functions";
import { prepareReorder } from "@/lib/storefront/consumer-catalog";
import { money, orderCode, sfKeys, statusLabel, type OrderStatus } from "@/lib/storefront/queries";
import { useCustomer } from "@/lib/customer";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Your orders — Reservd" },
      { name: "description", content: "Your Fulki order history with live status and tracking links." },
      { property: "og:title", content: "Your orders — Reservd" },
      { property: "og:description", content: "Order history and live tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Orders,
});

function Orders() {
  const { orderIds, hydrated, profile, addToCart } = useCustomer();
  const fetchOrders = useServerFn(getOrdersByIds);
  const fetchOrder = useServerFn(getPublicOrder);
  const fetchMenu = useServerFn(getMenu);
  const navigate = useNavigate();
  const [reordering, setReordering] = useState<string | null>(null);
  const reorder = async (orderId: string) => {
    if (reordering) return;
    setReordering(orderId);
    try {
      const order = await fetchOrder({ data: { orderId } });
      if (!order?.storefronts?.slug) throw new Error("This kitchen is no longer available.");
      const menu = await fetchMenu({ data: { slug: order.storefronts.slug } });
      const { lines, skipped } = prepareReorder(order.order_items, menu?.products ?? []);
      for (const { quantity, ...line } of lines) addToCart(line, quantity);
      if (skipped.length) toast.warning(`Unavailable: ${[...new Set(skipped)].join(", ")}`);
      if (lines.length) toast.success("Items added to your cart");
      await navigate({ to: "/cart" });
    } catch {
      toast.error("Couldn't load this order's menu. Please try again.");
    } finally {
      setReordering(null);
    }
  };

  const { data: orders, isLoading } = useQuery({
    queryKey: sfKeys.myOrders(orderIds),
    enabled: hydrated && orderIds.length > 0,
    queryFn: () => fetchOrders({ data: { orderIds } }),
    refetchInterval: 20000,
  });

  return (
    <div className="min-h-screen px-5 pb-32 pt-10">
      <h1 className="text-3xl font-extrabold">
        {profile.name ? `${profile.name.split(" ")[0]}’s orders` : "Your orders"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Track everything you've ordered.</p>

      <div className="stagger mt-6 space-y-3">
        {!hydrated || (isLoading && orderIds.length > 0) ? (
          [0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-card" />)
        ) : !orders || orders.length === 0 ? (
          <div className="glass-panel rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground">No orders yet.</p>
            <Link
              to="/"
              className="press mt-4 inline-block rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
            >
              Order something
            </Link>
          </div>
        ) : (
          orders.map((order) => {
            const brand = order.storefronts?.brand_name ?? "Fulki";
            const status = order.status as OrderStatus;
            const live = status !== "completed" && status !== "cancelled";
            return (
              <div key={order.id} className="overflow-hidden rounded-lg border border-line bg-card shadow-food">
              <Link
                key={order.id}
                to="/order/$orderId"
                params={{ orderId: order.id }}
                className="press grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-extrabold">{orderCode(order.order_number, brand)}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {brand} · {new Date(order.created_at).toLocaleString()}
                  </p>
                  <span
                    className={
                      "mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-bold " +
                      (live ? "bg-accent text-accent-foreground pulse-ring" : "bg-accent text-muted-foreground")
                    }
                  >
                    {statusLabel(status)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-bold text-primary">{money(Number(order.total))}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
              {!live && <div className="px-4 pb-4"><Button variant="outline" size="sm" disabled={reordering !== null} onClick={() => void reorder(order.id)}><RotateCcw />{reordering === order.id ? "Adding…" : "Order Again"}</Button></div>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}