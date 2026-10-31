import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useStockOperation } from "@/lib/inventory/queries";
import type { InventoryAction, InventoryItem } from "@/lib/inventory/types";

interface Props {
  open: boolean;
  onClose: () => void;
  item: InventoryItem | null;
}

const ACTIONS: { key: InventoryAction; label: string }[] = [
  { key: "add", label: "Add stock" },
  { key: "reduce", label: "Reduce" },
  { key: "adjust", label: "Adjust to" },
  { key: "waste", label: "Waste" },
  { key: "transfer", label: "Transfer" },
];

export function StockOpDialog({ open, onClose, item }: Props) {
  const op = useStockOperation();
  const [action, setAction] = useState<InventoryAction>("add");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    if (open) {
      setAction("add");
      setQty("");
      setNotes("");
      setFrom(item?.storage_location ?? "");
      setTo("");
    }
  }, [open, item]);

  async function handleSubmit() {
    if (!item) return;
    try {
      await op.mutateAsync({
        item,
        action,
        quantity: Number(qty),
        notes: notes.trim() || null,
        fromLocation: action === "transfer" ? from : null,
        toLocation: action === "transfer" ? to : null,
      });
      toast.success("Stock updated");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !op.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? `Stock operation — ${item.name}` : "Stock operation"}</DialogTitle>
        </DialogHeader>
        {item && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-background/50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Current</span>
                <span className="tabular-nums font-semibold">
                  {Number(item.current_quantity)} {item.unit}
                </span>
              </div>
            </div>

            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
                Action
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {ACTIONS.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => setAction(a.key)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                      action === a.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                Quantity ({item.unit})
              </Label>
              <Input
                type="number"
                step="0.01"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>

            {action === "transfer" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                    From
                  </Label>
                  <Input value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                    To
                  </Label>
                  <Input value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </div>
            )}

            <div>
              <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                Notes
              </Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={op.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={op.isPending || !qty} className="min-w-[120px]">
            {op.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
