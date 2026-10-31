import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  IndianRupee,
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
  UserCog,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTodayOrders, qk } from "@/lib/pos/queries";
import { useInventoryItems, invKeys } from "@/lib/inventory/queries";
import { formatINR } from "@/lib/pos/format";
import { stockLevel } from "@/lib/inventory/format";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — QSSF OS" },
      { name: "description", content: "Monitor today’s orders, sales and stock alerts in QSSF OS." },
      { property: "og:title", content: "Dashboard — QSSF OS" },
      { property: "og:description", content: "Monitor today’s orders, sales and stock alerts in QSSF OS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const { data: orders = [], isLoading } = useTodayOrders();
  const { data: items = [] } = useInventoryItems();

  // Realtime subscriptions
  useEffect(() => {
    const ordersChannel = supabase
      .channel("dashboard-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        qc.invalidateQueries({ queryKey: qk.todayOrders });
      })
      .subscribe();
    const invChannel = supabase
      .channel("dashboard-inventory")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, () => {
        qc.invalidateQueries({ queryKey: invKeys.items });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(invChannel);
    };
  }, [qc]);

  const metrics = useMemo(() => {
    const active = orders.filter((o) => o.status !== "cancelled");
    const paid = active.filter((o) => o.payment_status === "paid");
    const sales = paid.reduce((s, o) => s + Number(o.total), 0);
    const avg = paid.length ? sales / paid.length : 0;
    const pending = active.filter((o) => o.status === "pending" || o.status === "preparing").length;
    const completed = active.filter((o) => o.status === "completed").length;
    const uniqueCustomers = new Set(
      active.map((o) => o.customer_id).filter((v): v is string => !!v),
    ).size;
    const uniqueStaff = new Set(
      active.map((o) => o.created_by).filter((v): v is string => !!v),
    ).size;
    const recentPayments = paid.slice(0, 5);
    return { sales, orders: active.length, pending, completed, avg, uniqueCustomers, uniqueStaff, active, recentPayments };
  }, [orders]);

  const inventoryAlerts = useMemo(() => {
    const low: typeof items = [];
    const out: typeof items = [];
    for (const i of items) {
      const level = stockLevel(Number(i.current_quantity), Number(i.minimum_quantity));
      if (level === "out") out.push(i);
      else if (level === "low") low.push(i);
    }
    return { low, out };
  }, [items]);

  const stats = [
    { label: "Today's sales", value: formatINR(metrics.sales), icon: IndianRupee },
    { label: "Orders", value: String(metrics.orders), icon: ShoppingBag },
    { label: "Avg. bill", value: formatINR(metrics.avg), icon: TrendingUp },
    { label: "Pending", value: String(metrics.pending), icon: Clock },
    { label: "Completed", value: String(metrics.completed), icon: CheckCircle2 },
    { label: "Customers", value: String(metrics.uniqueCustomers), icon: Users },
    { label: "Active staff", value: String(metrics.uniqueStaff), icon: UserCog },
    { label: "Low stock", value: String(inventoryAlerts.low.length + inventoryAlerts.out.length), icon: AlertTriangle },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Good day, chef</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's what's happening across your outlets today.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {s.label}
              </span>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-2xl font-semibold">
              {isLoading ? <Skeleton className="h-7 w-20" /> : s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Live orders</h2>
            <Link to="/orders" className="text-xs font-medium text-primary hover:underline">
              Open POS →
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
            ) : metrics.active.slice(0, 6).length === 0 ? (
              <EmptyBox>No active orders</EmptyBox>
            ) : (
              metrics.active.slice(0, 6).map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-3 text-sm"
                >
                  <div>
                    <div className="font-semibold">#{o.order_number}</div>
                    <div className="text-xs capitalize text-muted-foreground">
                      {o.status} · {o.order_type.replace("_", " ")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="tabular-nums font-medium">{formatINR(Number(o.total))}</div>
                    <Badge
                      variant={o.payment_status === "paid" ? "default" : "secondary"}
                      className="mt-0.5 text-[10px]"
                    >
                      {o.payment_status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Inventory alerts</h2>
            <Link to="/inventory" className="text-xs font-medium text-primary hover:underline">
              Open inventory →
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {inventoryAlerts.out.length + inventoryAlerts.low.length === 0 ? (
              <EmptyBox>All stocked</EmptyBox>
            ) : (
              [...inventoryAlerts.out, ...inventoryAlerts.low].slice(0, 6).map((i) => {
                const isOut = Number(i.current_quantity) <= 0;
                return (
                  <div
                    key={i.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{i.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {Number(i.current_quantity)} {i.unit} on hand
                        </div>
                      </div>
                    </div>
                    <Badge variant={isOut ? "destructive" : "secondary"}>
                      {isOut ? "Out" : "Low"}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent orders</h2>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 space-y-2">
            {metrics.active.slice(0, 5).length === 0 ? (
              <EmptyBox>Nothing yet today</EmptyBox>
            ) : (
              metrics.active.slice(0, 5).map((o) => (
                <div key={o.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground">#{o.order_number}</span>
                    <span className="capitalize">{o.status}</span>
                  </div>
                  <span className="tabular-nums text-muted-foreground">
                    {new Date(o.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent payments</h2>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 space-y-2">
            {metrics.recentPayments.length === 0 ? (
              <EmptyBox>No payments yet</EmptyBox>
            ) : (
              metrics.recentPayments.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground">#{o.order_number}</span>
                    <span className="capitalize text-xs text-muted-foreground">
                      {o.payment_method ?? "—"}
                    </span>
                  </div>
                  <span className="tabular-nums font-medium">{formatINR(Number(o.total))}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
      {children}
    </div>
  );
}
