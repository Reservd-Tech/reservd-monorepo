import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { customerName, customerPhone, formatINR, formatTime } from "@/lib/pos/format";
import {
  useAcceptOrder,
  useRejectOrder,
  useUpdateOrderStatus,
  useUpdatePaymentStatus,
} from "@/lib/pos/queries";
import type { OrderStatus, OrderWithItems } from "@/lib/pos/types";
import { PaymentClaimPanel } from "@/components/pos/payment-claim-panel";
import { toast } from "sonner";

const STATUS_FLOW: OrderStatus[] = ["pending", "preparing", "ready", "completed"];

interface Props {
  order: OrderWithItems | null;
  onClose: () => void;
}

export function OrderDetailsDialog({ order, onClose }: Props) {
  const updateStatus = useUpdateOrderStatus();
  const updatePayment = useUpdatePaymentStatus();
  const acceptOrder = useAcceptOrder();
  const rejectOrder = useRejectOrder();
  const [rejectReason, setRejectReason] = useState("");

  if (!order) return null;

  async function setStatus(status: OrderStatus) {
    if (!order) return;
    try {
      await updateStatus.mutateAsync({ id: order.id, status });
      toast.success(`Order marked ${status}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function accept() {
    if (!order) return;
    try {
      await acceptOrder.mutateAsync({ id: order.id });
      toast.success("Order accepted");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function reject() {
    if (!order) return;
    try {
      await rejectOrder.mutateAsync({ id: order.id, reason: rejectReason });
      toast.success("Order rejected");
      setRejectReason("");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function markPaid() {
    if (!order) return;
    try {
      await updatePayment.mutateAsync({ id: order.id, payment_status: "paid" });
      toast.success("Payment received");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }


  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Order #{order.order_number}
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
              {order.order_type.replace("_", " ")}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-background/50 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Customer
            </div>
            <div className="text-sm font-semibold">{customerName(order)}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {customerPhone(order) ?? "No phone shared"} · placed {formatTime(order.created_at)} ·{" "}
              {order.source === "pos" ? "counter" : "online"}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/50">
            <ul className="divide-y divide-border/60">
              {order.order_items.map((it) => (
                <li key={it.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="line-clamp-1 font-medium">{it.product_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatINR(Number(it.unit_price))} × {it.quantity}
                    </div>
                  </div>
                  <div className="tabular-nums">{formatINR(Number(it.line_total))}</div>
                </li>
              ))}
            </ul>
            <Separator />
            <div className="space-y-1 px-4 py-3 text-sm">
              <Row label="Subtotal" value={formatINR(Number(order.subtotal))} muted />
              <Row label="Tax" value={formatINR(Number(order.tax))} muted />
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Total</span>
                <span className="text-xl font-bold">{formatINR(Number(order.total))}</span>
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Notes: </span>
              {order.notes}
            </div>
          )}

          {order.status === "pending" ? (
            <div className="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
              <div className="text-xs uppercase tracking-wider text-primary">Accept this order?</div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={accept}
                  disabled={acceptOrder.isPending || rejectOrder.isPending}
                >
                  Accept
                </Button>
                <Button
                  variant="destructive"
                  onClick={reject}
                  disabled={acceptOrder.isPending || rejectOrder.isPending}
                >
                  Reject
                </Button>
              </div>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Rejection reason (optional)"
                className="h-9"
              />
            </div>
          ) : (
            order.rejection_reason && (
              <div className="rounded-xl border border-border bg-background/50 p-3 text-xs">
                <span className="text-destructive">Rejected: {order.rejection_reason}</span>
              </div>
            )
          )}

          {order.status === "preparing" && (
            <Button
              className="w-full"
              onClick={() => setStatus("ready")}
              disabled={updateStatus.isPending}
            >
              Mark ready for pickup
            </Button>
          )}

          <div>

            <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Status</div>
            <div className="flex flex-wrap gap-2">
              {STATUS_FLOW.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  disabled={updateStatus.isPending || order.status === s}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                    order.status === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                    updateStatus.isPending && "opacity-60",
                  )}
                >
                  {s}
                </button>
              ))}
              <button
                onClick={() => setStatus("cancelled")}
                disabled={updateStatus.isPending || order.status === "cancelled"}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  order.status === "cancelled"
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-border text-muted-foreground hover:text-destructive",
                )}
              >
                Cancel
              </button>
            </div>
          </div>

          <PaymentClaimPanel order={order} />

          <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Payment</div>
              <div className="text-sm font-medium capitalize">
                {order.payment_method ?? "—"} · {order.payment_status}
              </div>
            </div>
            {order.payment_status !== "paid" && (
              <Button size="sm" onClick={markPaid} disabled={updatePayment.isPending}>
                Mark paid
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-xs", muted ? "text-muted-foreground" : "text-foreground")}>
        {label}
      </span>
      <span className={cn("tabular-nums", muted && "text-muted-foreground")}>{value}</span>
    </div>
  );
}
