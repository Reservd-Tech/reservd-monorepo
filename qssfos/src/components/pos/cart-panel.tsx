import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/pos/format";
import type { CartLine } from "@/lib/pos/types";

interface Props {
  lines: CartLine[];
  notes: string;
  taxRate: number;
  onQtyChange: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
  onNotesChange: (v: string) => void;
  onClear: () => void;
  onCheckout: () => void;
}

export function CartPanel({
  lines,
  notes,
  taxRate,
  onQtyChange,
  onRemove,
  onNotesChange,
  onClear,
  onCheckout,
}: Props) {
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = subtotal + tax;
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Current order</h2>
          {itemCount > 0 && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {itemCount}
            </span>
          )}
        </div>
        {lines.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      <div className={cn("min-h-0 flex-1 overflow-auto px-3 py-3", lines.length === 0 && "grid place-items-center")}>
        {lines.length === 0 ? (
          <div className="text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted">
              <ShoppingCart className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium">Cart is empty</p>
            <p className="mt-1 text-xs text-muted-foreground">Tap any product to add it.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {lines.map((l) => (
              <li
                key={l.productId}
                className="group flex items-center gap-2 rounded-xl border border-transparent bg-background/50 p-2 transition-colors hover:border-border"
              >
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-sm font-medium">{l.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatINR(l.price)} · {formatINR(l.price * l.quantity)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <QtyBtn onClick={() => onQtyChange(l.productId, -1)}>
                    <Minus className="h-3.5 w-3.5" />
                  </QtyBtn>
                  <div className="w-6 text-center text-sm font-semibold tabular-nums">
                    {l.quantity}
                  </div>
                  <QtyBtn onClick={() => onQtyChange(l.productId, +1)}>
                    <Plus className="h-3.5 w-3.5" />
                  </QtyBtn>
                  <button
                    onClick={() => onRemove(l.productId)}
                    className="ml-1 grid h-7 w-7 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {lines.length > 0 && (
        <>
          <div className="px-4 pb-2">
            <Textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Notes (allergies, prep instructions…)"
              rows={2}
              className="resize-none text-sm"
            />
          </div>
          <Separator />
          <div className="space-y-1.5 px-5 py-4 text-sm">
            <Row label="Subtotal" value={formatINR(subtotal)} />
            <Row label={`Tax (${Math.round(taxRate * 100)}%)`} value={formatINR(tax)} muted />
            <Row label="Discount" value="—" muted />
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Total</span>
              <span className="text-2xl font-bold">{formatINR(total)}</span>
            </div>
          </div>
          <div className="p-4 pt-0">
            <Button size="lg" className="h-12 w-full text-base font-semibold" onClick={onCheckout}>
              Checkout · {formatINR(total)}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function QtyBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-md border border-border bg-background transition-colors hover:border-primary hover:text-primary"
    >
      {children}
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
