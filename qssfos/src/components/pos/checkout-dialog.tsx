import { useEffect, useState } from "react";
import { CreditCard, Loader2, QrCode, ShoppingBag, Truck, User, UserRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/pos/format";
import type {
  CartLine,
  OrderType,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/pos/types";
import { findCustomerByPhone } from "@/lib/pos/queries";

interface Props {
  open: boolean;
  onClose: () => void;
  lines: CartLine[];
  taxRate: number;
  notes: string;
  submitting: boolean;
  onConfirm: (payload: {
    orderType: OrderType;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    customer: { name?: string | null; phone?: string | null } | null;
  }) => Promise<void>;
}

export function CheckoutDialog({
  open,
  onClose,
  lines,
  taxRate,
  submitting,
  onConfirm,
}: Props) {
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [walkIn, setWalkIn] = useState(true);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      setOrderType("dine_in");
      setPaymentMethod("upi");
      setPaymentStatus("pending");
      setWalkIn(true);
      setPhone("");
      setName("");
    }
  }, [open]);

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = subtotal + tax;

  async function handlePhoneBlur() {
    if (!phone || phone.length < 6) return;
    const c = await findCustomerByPhone(phone);
    if (c?.name) setName(c.name);
  }

  async function handleConfirm() {
    await onConfirm({
      orderType,
      paymentMethod,
      paymentStatus,
      customer: walkIn ? null : { name: name || null, phone: phone || null },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !submitting && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <section>
            <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
              Order type
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <OptionTile
                active={orderType === "dine_in"}
                onClick={() => setOrderType("dine_in")}
                icon={<UserRound className="h-4 w-4" />}
                label="Dine in"
              />
              <OptionTile
                active={orderType === "takeaway"}
                onClick={() => setOrderType("takeaway")}
                icon={<ShoppingBag className="h-4 w-4" />}
                label="Takeaway"
              />
              <OptionTile
                active={false}
                disabled
                onClick={() => {}}
                icon={<Truck className="h-4 w-4" />}
                label="Delivery"
                sublabel="Soon"
              />
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Customer
              </Label>
              <button
                type="button"
                onClick={() => setWalkIn((w) => !w)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  walkIn
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <User className="h-3.5 w-3.5" />
                Walk-in
              </button>
            </div>
            {!walkIn && (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={handlePhoneBlur}
                  placeholder="Phone"
                  inputMode="tel"
                />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                />
              </div>
            )}
          </section>

          <section>
            <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
              Payment method
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <OptionTile
                active={paymentMethod === "upi"}
                onClick={() => setPaymentMethod("upi")}
                icon={<QrCode className="h-4 w-4" />}
                label="UPI"
              />
              <OptionTile
                active={paymentMethod === "card"}
                onClick={() => setPaymentMethod("card")}
                icon={<CreditCard className="h-4 w-4" />}
                label="Card"
              />
            </div>

            {paymentMethod === "upi" && (
              <div className="mt-3 rounded-xl border border-dashed border-border bg-background/50 p-4 text-center">
                <div className="mx-auto grid h-32 w-32 place-items-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/30">
                  <QrCode className="h-16 w-16 text-primary" />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Show this QR to the customer. Mark as paid once received.
                </p>
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPaymentStatus("pending")}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-xs font-medium",
                  paymentStatus === "pending"
                    ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                    : "border-border text-muted-foreground",
                )}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus("paid")}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-xs font-medium",
                  paymentStatus === "paid"
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                    : "border-border text-muted-foreground",
                )}
              >
                Mark paid
              </button>
            </div>
          </section>

          <Separator />

          <div className="space-y-1 text-sm">
            <Row label="Subtotal" value={formatINR(subtotal)} muted />
            <Row label={`Tax (${Math.round(taxRate * 100)}%)`} value={formatINR(tax)} muted />
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Total</span>
              <span className="text-2xl font-bold">{formatINR(total)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={submitting} className="min-w-[140px]">
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Placing…
              </>
            ) : (
              <>Place order</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OptionTile({
  active,
  onClick,
  icon,
  label,
  sublabel,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-sm transition-all",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-foreground hover:border-primary/40",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
      {sublabel && <span className="text-[10px] uppercase text-muted-foreground">{sublabel}</span>}
    </button>
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
