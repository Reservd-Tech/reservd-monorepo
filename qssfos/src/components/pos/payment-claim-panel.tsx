import { useState } from "react";
import { Check, Copy, IndianRupee, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/pos/format";
import { useClearPaymentClaim, useConfirmPaymentClaim } from "@/lib/pos/queries";
import type { OrderWithItems } from "@/lib/pos/types";

/** True when the order is an unverified UPI payment awaiting vendor confirmation. */
export function needsPaymentReview(order: OrderWithItems): boolean {
  return order.payment_method === "upi" && order.payment_status === "pending";
}

interface Props {
  order: OrderWithItems;
  className?: string;
}

export function PaymentClaimPanel({ order, className }: Props) {
  const confirm = useConfirmPaymentClaim();
  const clear = useClearPaymentClaim();
  const [copied, setCopied] = useState(false);

  if (!needsPaymentReview(order)) return null;

  const reference = order.payment_reference?.trim() || null;

  async function copyReference() {
    if (!reference) return;
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy the reference");
    }
  }

  async function run(p: Promise<unknown>, label: string) {
    try {
      await p;
      toast.success(label);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-amber-300">
        <IndianRupee className="h-3.5 w-3.5" />
        {reference ? "Payment claimed" : "UPI payment pending"}
      </div>

      {reference ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <code className="rounded-md border border-border bg-background/60 px-2 py-1 text-xs tracking-wide">
              {reference}
            </code>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={copyReference}
              aria-label="Copy payment reference"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {order.payment_app?.trim() || "UPI app not specified"}
            {order.payment_claimed_at ? ` · claimed ${formatTime(order.payment_claimed_at)}` : ""}
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          The customer has not shared a UPI reference yet.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          className="h-8 text-xs"
          disabled={confirm.isPending}
          onClick={() => run(confirm.mutateAsync({ id: order.id }), "Payment confirmed")}
        >
          <Check className="mr-1 h-3.5 w-3.5" /> Confirm received
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs text-destructive hover:text-destructive"
          disabled={clear.isPending || !reference}
          onClick={() => run(clear.mutateAsync({ id: order.id }), "Payment claim cleared")}
        >
          <X className="mr-1 h-3.5 w-3.5" /> Not received
        </Button>
      </div>
    </div>
  );
}
