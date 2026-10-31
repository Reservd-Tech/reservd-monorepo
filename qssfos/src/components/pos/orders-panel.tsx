import { useMemo, useState } from "react";
import { ArrowRight, Check, CheckCheck, Clock, Loader2, Receipt, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { customerName, customerPhone, formatINR, formatTime } from "@/lib/pos/format";
import { isActiveStage, selectedAtStage, STAGES, type ActiveStage } from "@/lib/pos/queue";
import { elapsedMinutes, formatElapsed, summarizeItems } from "@/lib/pos/production";
import { useAcceptOrder, useActiveOrders, useRejectOrder, useUpdateOrderStatus } from "@/lib/pos/queries";
import { needsPaymentReview } from "./payment-claim-panel";
import type { OrderWithItems } from "@/lib/pos/types";

interface Props { onOpen: (order: OrderWithItems) => void; lockedStage?: ActiveStage }

export function OrdersPanel({ onOpen, lockedStage }: Props) {
  const { data: orders = [], isLoading, error, refetch } = useActiveOrders();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<ActiveStage | "all" | "payments">(lockedStage ?? "all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [rejectIds, setRejectIds] = useState<string[]>([]);
  const acceptOrder = useAcceptOrder();
  const rejectOrder = useRejectOrder();
  const updateStatus = useUpdateOrderStatus();
  const active = useMemo(() => orders.filter((o) => isActiveStage(o.status)), [orders]);
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const source = filter === "payments" ? orders.filter((o) => needsPaymentReview(o) && Boolean(o.payment_reference)) : active;
    return source.filter((o) => (filter === "all" || filter === "payments" || o.status === filter) &&
      (!term || `${o.order_number} ${customerName(o)} ${customerPhone(o) ?? ""}`.toLowerCase().includes(term)))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [active, orders, q, filter]);
  const chosen = filtered.filter((o) => selected.has(o.id));
  const busy = busyIds.size > 0;
  const allSelected = filtered.length > 0 && chosen.length === filtered.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function runBatch(ids: string[], stage: ActiveStage, reject = false) {
    if (!ids.length || busy) return;
    setBusyIds(new Set(ids));
    const succeeded = new Set<string>();
    let failures = 0;
    try {
      // Small parallel batches avoid flooding the backend during peak hours.
      for (let offset = 0; offset < ids.length; offset += 5) {
        const chunk = ids.slice(offset, offset + 5);
        const results = await Promise.allSettled(chunk.map(async (id) => {
          if (reject) await rejectOrder.mutateAsync({ id });
          else if (stage === "pending") await acceptOrder.mutateAsync({ id });
          else await updateStatus.mutateAsync({ id, status: stage === "preparing" ? "ready" : "completed" });
          return id;
        }));
        results.forEach((result) => {
          if (result.status === "fulfilled") succeeded.add(result.value);
          else failures += 1;
        });
      }
      setSelected((prev) => new Set([...prev].filter((id) => !succeeded.has(id))));
      if (succeeded.size) toast.success(`${succeeded.size} order${succeeded.size === 1 ? "" : "s"} ${reject ? "rejected" : stage === "pending" ? "accepted" : stage === "preparing" ? "marked ready" : "completed"}`);
      if (failures) toast.error(`${failures} order${failures === 1 ? "" : "s"} couldn't be updated. Retry the remaining orders.`);
    } finally {
      setBusyIds(new Set());
    }
  }

  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-semibold">{lockedStage === "pending" ? "Individual orders" : lockedStage === "ready" ? "Pickup orders" : "Orders"}</h2>
          <span className="text-sm text-muted-foreground">{filtered.length}</span>
        </div>
        <div className="flex items-center gap-2">
        {orders.some((o) => needsPaymentReview(o) && Boolean(o.payment_reference)) && <Button variant={filter === "payments" ? "secondary" : "ghost"} size="sm" disabled={busy} onClick={() => { setFilter(filter === "payments" ? "all" : "payments"); setSelected(new Set()); }}>UPI review ({orders.filter((o) => needsPaymentReview(o) && Boolean(o.payment_reference)).length})</Button>}
        <Button variant="ghost" size="icon" aria-label="Refresh orders" title="Refresh orders" onClick={() => refetch()}>
          <RefreshCw className="size-4" />
        </Button>
        </div>
      </header>

      <div className={cn("sticky z-10 space-y-3 border-b border-border bg-background py-3", lockedStage ? "top-32" : "top-14")}>
        {!lockedStage && <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1" aria-label="Order stage filters">
          {[{ status: "all" as const, label: "All", count: active.length }, ...STAGES.map((s) => ({ ...s, count: active.filter((o) => o.status === s.status).length }))].map((s) => (
            <Button key={s.status} variant="ghost" aria-pressed={filter === s.status}
              onClick={() => { setFilter(s.status); setSelected(new Set()); }} disabled={busy}
              className={cn("h-auto min-h-11 flex-col gap-0.5 px-1 py-2 sm:flex-row sm:gap-2", filter === s.status && "bg-background text-foreground shadow-sm hover:bg-background")}>
              <span className="text-xs sm:text-sm">{s.label}</span><span className="text-xs tabular-nums text-muted-foreground">{s.count}</span>
            </Button>
          ))}
        </div>}
        <div className="flex items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search orders" value={q} onChange={(e) => { setQ(e.target.value); setSelected(new Set()); }} disabled={busy} placeholder="Order #, name or phone" className="h-11 pl-9" />
          </div>
          <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-xs sm:text-sm">
            <Checkbox aria-label="Select all visible orders" className="size-5" disabled={busy || !filtered.length} checked={allSelected ? true : chosen.length ? "indeterminate" : false}
              onCheckedChange={() => setSelected(allSelected ? new Set() : new Set(filtered.map((o) => o.id)))} />
            Select all
          </label>
        </div>
        {chosen.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3" aria-label="Bulk order actions">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium" aria-live="polite">{busy ? "Updating orders…" : `${chosen.length} selected`}</span>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => setSelected(new Set())}><X className="size-4" /> Clear</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => {
                const ids = selectedAtStage(filtered, selected, s.status).map((o) => o.id);
                return ids.length > 0 && <Button key={s.status} className="min-h-11" disabled={busy} onClick={() => runBatch(ids, s.status)}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}{s.action} ({ids.length})
                </Button>;
              })}
              {chosen.some((o) => o.status === "pending") && <Button variant="outline" className="min-h-11 text-destructive" disabled={busy}
                onClick={() => setRejectIds(selectedAtStage(filtered, selected, "pending").map((o) => o.id))}><X className="size-4" /> Reject new ({chosen.filter((o) => o.status === "pending").length})</Button>}
            </div>
          </div>
        )}
      </div>

      {error ? <div className="py-12 text-center"><p className="text-sm text-destructive">Orders couldn't be loaded.</p><Button variant="outline" className="mt-3" onClick={() => refetch()}>Try again</Button></div> : isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}</div>
      ) : !filtered.length ? (
        <div className="grid min-h-64 place-items-center text-center"><div><Receipt className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-medium">{q ? "No matching orders" : filter === "all" ? "No live orders" : `No ${filter === "pending" ? "new" : filter} orders`}</p></div></div>
      ) : (
        <ul className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((o) => {
            const stage = STAGES.find((s) => s.status === o.status);
            const review = needsPaymentReview(o) && Boolean(o.payment_reference);
            return <li key={o.id} className={cn("min-w-0 rounded-lg border bg-card p-4", selected.has(o.id) ? "border-primary ring-1 ring-primary" : "border-border")}>
              <div className="flex items-center gap-3">
                <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center -ml-3"><Checkbox aria-label={`Select order ${o.order_number}`} className="size-5" checked={selected.has(o.id)} disabled={busy} onCheckedChange={() => toggle(o.id)} /></label>
                <Button variant="link" className="h-auto min-w-0 p-0 text-lg font-semibold text-foreground" onClick={() => onOpen(o)} aria-label={`Open order ${o.order_number}`}>#{o.order_number}</Button>
                <span className={cn("ml-auto rounded-md px-2 py-1 text-xs font-medium", o.status === "pending" ? "bg-accent text-accent-foreground" : o.status === "ready" ? "bg-primary/15 text-primary" : "bg-muted text-foreground")}>{stage?.label ?? o.status}</span>
              </div>
              <p className="mt-2 break-words text-sm">{summarizeItems(o)}</p>
              <div className="mt-1 flex items-start justify-between gap-2"><p className="min-w-0 break-words text-sm font-medium">{customerName(o)}</p><span className="shrink-0 text-sm tabular-nums">{formatINR(Number(o.total))}</span></div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"><span className="capitalize">{o.order_type.replace("_", " ")}</span><span>·</span><span className="flex items-center gap-1"><Clock className="size-3" />{formatTime(o.created_at)} ({formatElapsed(elapsedMinutes(o.created_at))} waiting)</span><span>· {o.payment_status === "paid" ? "Paid" : "Unpaid"}</span>{o.notes ? <span className="w-full break-words">Note: {o.notes}</span> : null}</div>
              <Button variant="ghost" className={cn("mt-2 h-8 px-0 text-xs", review ? "text-primary" : "text-muted-foreground")} onClick={() => onOpen(o)}>{review ? "Review UPI payment" : "Order details"}<ArrowRight className="size-3" /></Button>
              <div className="mt-2 flex gap-2">
                {stage && <Button className="min-h-11 flex-1" disabled={busy} onClick={() => runBatch([o.id], stage.status)}>
                  {busyIds.has(o.id) ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}{stage.action}
                </Button>}
                {o.status === "pending" && <Button variant="outline" size="icon" className="size-11 shrink-0 text-destructive" aria-label={`Reject order ${o.order_number}`} title="Reject order" disabled={busy} onClick={() => setRejectIds([o.id])}><X className="size-4" /></Button>}
              </div>
            </li>;
          })}
        </ul>
      )}
      <AlertDialog open={rejectIds.length > 0} onOpenChange={(open) => { if (!open) setRejectIds([]); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Reject {rejectIds.length} order{rejectIds.length === 1 ? "" : "s"}?</AlertDialogTitle><AlertDialogDescription>The selected new orders will be cancelled and removed from the live queue.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep orders</AlertDialogCancel><AlertDialogAction onClick={() => { const ids = [...rejectIds]; setRejectIds([]); void runBatch(ids, "pending", true); }}>Reject orders</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
