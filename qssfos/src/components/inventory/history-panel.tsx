import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useInventoryMovements } from "@/lib/inventory/queries";
import { formatQty } from "@/lib/inventory/format";

const ACTION_STYLES: Record<string, string> = {
  add: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  reduce: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  adjust: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  waste: "bg-red-500/15 text-red-300 border-red-500/30",
  transfer: "bg-violet-500/15 text-violet-300 border-violet-500/30",
};

export function HistoryPanel() {
  const { data: movements = [], isLoading } = useInventoryMovements(500);

  return (
    <div className="rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Action</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead>Locations</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            ))
          ) : movements.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                No stock movements recorded yet.
              </TableCell>
            </TableRow>
          ) : (
            movements.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(m.created_at).toLocaleString()}
                </TableCell>
                <TableCell>{m.inventory_items?.name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`capitalize ${ACTION_STYLES[m.action] ?? ""}`}>
                    {m.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQty(Number(m.quantity), m.inventory_items?.unit ?? null)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {m.from_location || m.to_location
                    ? `${m.from_location ?? "—"} → ${m.to_location ?? "—"}`
                    : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate">
                  {m.notes ?? "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
