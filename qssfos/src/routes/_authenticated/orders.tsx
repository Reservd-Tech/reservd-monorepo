import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { History, Loader2, Pause, Play, Zap } from "lucide-react";
import { toast } from "sonner";
import { OrdersPanel } from "@/components/pos/orders-panel";
import { ProductionQueue } from "@/components/pos/production-queue";
import { IncomingItemDemand } from "@/components/pos/incoming-demand";
import { OrderDetailsDialog } from "@/components/pos/order-details-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useActiveOrders, useOrdersRealtime } from "@/lib/pos/queries";
import { aggregatePendingDemand, aggregateProduction } from "@/lib/pos/production";
import { useMyStorefront, useUpdateStorefront } from "@/lib/shop/queries";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "Order Management — QSSF OS" },
      { name: "description", content: "Live order intake, aggregate production queue and pickup management for vendors in QSSF OS." },
      { property: "og:title", content: "Order Management — QSSF OS" },
      { property: "og:description", content: "Live order intake, aggregate production queue and pickup management for vendors in QSSF OS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrderManagementPage,
});

type View = "incoming" | "production" | "ready";

/** Requested items in unaccepted orders — informational only, never counts toward production. */
function PendingDemand({ orders }: { orders: import("@/lib/pos/types").OrderWithItems[] }) {
  const demand = aggregatePendingDemand(orders);
  if (!demand.length) return null;
  return (
    <p className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
      Requested in new orders (not yet accepted): {demand.map((d) => `${d.name} × ${d.units}`).join(" · ")}
    </p>
  );
}

const VIEWS: Array<{ id: View; label: string }> = [
  { id: "incoming", label: "Incoming" },
  { id: "production", label: "Production Queue" },
  { id: "ready", label: "Ready for Pickup" },
];

const RUSH_KEY = "qssf-rush-mode";

function OrderManagementPage() {
  useOrdersRealtime();
  const [view, setView] = useState<View>("incoming");
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [rush, setRush] = useState(false);
  const { data: orders = [], isLoading } = useActiveOrders();
  const { data: shop } = useMyStorefront();
  const updateStorefront = useUpdateStorefront();

  useEffect(() => {
    setRush(window.localStorage.getItem(RUSH_KEY) === "1");
  }, []);

  function toggleRush(next: boolean) {
    setRush(next);
    window.localStorage.setItem(RUSH_KEY, next ? "1" : "0");
  }

  const metrics = useMemo(() => {
    const pending = orders.filter((o) => o.status === "pending" && !o.archived_at).length;
    const preparing = orders.filter((o) => o.status === "preparing" && !o.archived_at).length;
    const ready = orders.filter((o) => o.status === "ready" && !o.archived_at).length;
    const units = aggregateProduction(orders).reduce((sum, line) => sum + line.remaining + line.preparing, 0);
    return { pending, preparing, ready, units };
  }, [orders]);

  const accepting = shop?.is_open ?? true;

  async function toggleIntake() {
    if (!shop) return;
    try {
      await updateStorefront.mutateAsync({ id: shop.id, patch: { is_open: !accepting } });
      toast.success(accepting ? "New orders paused — your shop shows as closed to customers." : "Accepting orders again.");
    } catch {
      toast.error("Couldn't update intake. Try again.");
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Order Management</h1>
          <div className="flex flex-wrap items-center gap-2">
            <label className={cn("flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm", rush ? "border-primary bg-primary/10" : "border-border")}>
              <Zap className={cn("size-4", rush && "text-primary")} />
              Rush Mode
              <Switch aria-label="Toggle Rush Mode" checked={rush} onCheckedChange={toggleRush} />
            </label>
            <Button variant={accepting ? "outline" : "secondary"} className="min-h-11" disabled={!shop || updateStorefront.isPending} onClick={() => void toggleIntake()}>
              {updateStorefront.isPending ? <Loader2 className="size-4 animate-spin" /> : accepting ? <Pause className="size-4" /> : <Play className="size-4" />}
              {accepting ? "Pause new orders" : "Resume orders"}
            </Button>
            <Button variant="ghost" className="min-h-11" asChild><Link to="/history"><History className="size-4" />Order history</Link></Button>
          </div>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm" aria-label="Live order summary">
          <div><dt className="inline text-muted-foreground">Awaiting decision: </dt><dd className="inline font-semibold tabular-nums">{metrics.pending}</dd></div>
          <div><dt className="inline text-muted-foreground">In progress: </dt><dd className="inline font-semibold tabular-nums">{metrics.preparing}</dd></div>
          <div><dt className="inline text-muted-foreground">Units to prepare: </dt><dd className="inline font-semibold tabular-nums">{metrics.units}</dd></div>
          <div><dt className="inline text-muted-foreground">Ready for pickup: </dt><dd className="inline font-semibold tabular-nums">{metrics.ready}</dd></div>
          <div><dt className="inline text-muted-foreground">Intake: </dt><dd className={cn("inline font-semibold", accepting ? "text-primary" : "text-destructive")}>{accepting ? "Accepting orders" : "Paused"}</dd></div>
        </dl>
      </header>

      <nav className="sticky top-14 z-20 grid grid-cols-3 gap-1 rounded-lg bg-muted p-1" aria-label="Order management views">
        {VIEWS.map((v) => (
          <Button key={v.id} variant="ghost" aria-pressed={view === v.id} onClick={() => setView(v.id)}
            className={cn("h-auto min-h-14 flex-col gap-1 whitespace-normal px-1 py-2 text-xs sm:text-sm", view === v.id && "bg-background text-foreground shadow-sm hover:bg-background")}>
            <span>{v.label}</span><span className="font-semibold tabular-nums">{v.id === "incoming" ? metrics.pending : v.id === "production" ? metrics.preparing : metrics.ready}</span>
          </Button>
        ))}
      </nav>

      {view === "incoming" && (rush ? <IncomingItemDemand orders={orders} onProduction={() => setView("production")} /> : <PendingDemand orders={orders} />)}
      {view === "production" ? (
        <ProductionQueue orders={orders} isLoading={isLoading} rush={rush} onOpen={(order) => setOpenOrderId(order.id)} />
      ) : (
        <OrdersPanel key={view} lockedStage={view === "incoming" ? "pending" : "ready"} onOpen={(order) => setOpenOrderId(order.id)} />
      )}

      <OrderDetailsDialog
        order={orders.find((order) => order.id === openOrderId) ?? null}
        onClose={() => setOpenOrderId(null)}
      />
    </div>
  );
}
