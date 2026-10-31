import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Clock, Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { aggregateProduction, contributingOrders, elapsedMinutes, formatElapsed, type ProductionLine, type ProductionSort } from "@/lib/pos/production";
import { useMarkPrepared, useProducts, useSetProductAvailability, useStartPreparation } from "@/lib/pos/queries";
import type { OrderWithItems } from "@/lib/pos/types";

interface Props {
  orders: OrderWithItems[];
  isLoading: boolean;
  rush: boolean;
  onOpen: (order: OrderWithItems) => void;
}

interface PendingBatch {
  line: ProductionLine;
  action: "start" | "ready";
  quantity: number;
}

const SORTS: Array<{ value: ProductionSort; label: string }> = [
  { value: "oldest", label: "Oldest first" },
  { value: "remaining", label: "Most remaining" },
  { value: "name", label: "Item name" },
];

export function ProductionQueue({ orders, isLoading, rush, onOpen }: Props) {
  const [sort, setSort] = useState<ProductionSort>("oldest");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [batch, setBatch] = useState<PendingBatch | null>(null);
  const startPreparation = useStartPreparation();
  const markPrepared = useMarkPrepared();
  const setAvailability = useSetProductAvailability();
  const { data: products = [] } = useProducts();
  const busy = startPreparation.isPending || markPrepared.isPending || setAvailability.isPending;
  const lines = useMemo(() => aggregateProduction(orders, sort), [orders, sort]);

  function amount(line: ProductionLine, fallback: number) {
    return Math.max(1, Math.min(amounts[line.key] ?? fallback, fallback));
  }

  function setAmount(key: string, value: number) {
    setAmounts((prev) => ({ ...prev, [key]: value }));
  }

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function runBatch() {
    if (!batch || !batch.line.productId) return;
    const { line, action, quantity } = batch;
    const productId: string = batch.line.productId;
    try {
      const done = action === "start"
        ? await startPreparation.mutateAsync({ productId, quantity })
        : await markPrepared.mutateAsync({ productId, quantity });
      toast.success(`${done} × ${line.name} ${action === "start" ? "started" : "marked ready"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The batch couldn't be updated. Try again.");
    } finally {
      setBatch(null);
    }
  }

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>;
  }
  if (!lines.length) {
    return <div className="grid min-h-64 place-items-center text-center"><p className="font-medium text-muted-foreground">Nothing in production — accepted orders will appear here.</p></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{lines.length} item{lines.length === 1 ? "" : "s"} in production</p>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Sort</span>
          <select aria-label="Sort production queue" value={sort} onChange={(e) => setSort(e.target.value as ProductionSort)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm">
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      </div>

      <ul className="space-y-3">
        {lines.map((line) => {
          const waitMin = elapsedMinutes(line.oldestAt);
          const urgent = waitMin >= 30;
          const open = expanded.has(line.key);
          const startable = line.remaining;
          const readyable = line.preparing;
          return (
            <li key={line.key} className={cn("rounded-lg border bg-card p-4", urgent ? "border-destructive/60" : "border-border")}>
              <div className="flex items-start gap-3">
                <Button variant="ghost" size="icon" className="size-11 shrink-0 -ml-2" aria-label={open ? `Collapse ${line.name}` : `Show orders for ${line.name}`}
                  onClick={() => toggleExpanded(line.key)}>
                  {open ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
                </Button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className={cn("font-semibold", rush ? "text-2xl" : "text-lg")}>{line.name}</span>
                    {urgent && <span className="flex items-center gap-1 text-xs font-medium text-destructive"><AlertTriangle className="size-3" />Waiting {formatElapsed(waitMin)}</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span><strong className={cn("tabular-nums text-foreground", rush && "text-xl")}>{line.remaining}</strong> to start</span>
                    <span><strong className="tabular-nums text-foreground">{line.preparing}</strong> in preparation</span>
                    <span><strong className="tabular-nums text-foreground">{line.prepared}</strong> ready</span>
                    <span>{line.orderCount} order{line.orderCount === 1 ? "" : "s"}</span>
                    {!urgent && <span className="flex items-center gap-1"><Clock className="size-3" />{formatElapsed(waitMin)}</span>}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-md border border-border">
                  <Button variant="ghost" size="icon" className="size-11" aria-label={`Decrease ${line.name} batch`} disabled={busy}
                    onClick={() => setAmount(line.key, Math.max(1, amount(line, startable || readyable) - 1))}><Minus className="size-4" /></Button>
                  <span className="min-w-10 text-center text-lg font-semibold tabular-nums" aria-live="polite">{amount(line, startable || readyable)}</span>
                  <Button variant="ghost" size="icon" className="size-11" aria-label={`Increase ${line.name} batch`} disabled={busy}
                    onClick={() => setAmount(line.key, Math.min(startable || readyable, amount(line, startable || readyable) + 1))}><Plus className="size-4" /></Button>
                </div>
                <Button className="min-h-11" disabled={busy || !startable || !line.productId}
                  onClick={() => setBatch({ line, action: "start", quantity: amount(line, startable) })}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}Start {amount(line, startable)}
                </Button>
                <Button variant="secondary" className="min-h-11" disabled={busy || !readyable || !line.productId}
                  onClick={() => setBatch({ line, action: "ready", quantity: Math.min(amount(line, readyable), readyable) })}>
                  Mark {Math.min(amount(line, readyable), readyable)} ready
                </Button>
                {line.productId && (() => {
                  const product = products.find((p) => p.id === line.productId);
                  if (!product) return null;
                  return (
                    <Button variant="ghost" className="min-h-11 text-muted-foreground" disabled={busy}
                      onClick={async () => {
                        try {
                          await setAvailability.mutateAsync({ id: product.id, available: !product.is_available });
                          toast.success(product.is_available ? `${line.name} marked sold out — hidden from customers.` : `${line.name} available again.`);
                        } catch { toast.error("Couldn't update availability. Try again."); }
                      }}>
                      {product.is_available ? "Mark sold out" : "Available again"}
                    </Button>
                  );
                })()}
              </div>

              {open && (
                <ul className="mt-3 space-y-1 border-t border-border pt-3">
                  {contributingOrders(orders, line).map((row) => {
                    const order = orders.find((o) => o.id === row.orderId);
                    return (
                      <li key={row.orderId} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <Button variant="link" className="h-auto p-0 font-semibold" onClick={() => order && onOpen(order)}>#{row.orderNumber}</Button>
                        <span className="text-muted-foreground">{formatElapsed(elapsedMinutes(row.createdAt))} waiting</span>
                        <span className="tabular-nums">{row.remaining} to start · {row.preparing} in prep · {row.prepared} ready</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <AlertDialog open={batch !== null} onOpenChange={(openNext) => { if (!openNext) setBatch(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{batch?.action === "start" ? "Start preparation" : "Mark ready"}: {batch?.quantity} × {batch?.line.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Units are allocated oldest-order-first across {batch?.line.orderCount} order{batch?.line.orderCount === 1 ? "" : "s"}. This updates the actual order items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void runBatch()}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
