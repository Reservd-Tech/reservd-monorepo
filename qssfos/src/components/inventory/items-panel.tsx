import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  IndianRupee,
  Layers,
  PackageMinus,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Timer,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useDeleteInventoryItem,
  useInventoryItems,
  useInventoryMovements,
  useVendors,
} from "@/lib/inventory/queries";
import { daysUntil, formatQty, stockLevel } from "@/lib/inventory/format";
import { formatINR } from "@/lib/pos/format";
import type { InventoryItem } from "@/lib/inventory/types";
import { ItemDialog } from "@/components/inventory/item-dialog";
import { StockOpDialog } from "@/components/inventory/stock-op-dialog";
import { VendorDialog } from "@/components/inventory/vendor-dialog";

const PAGE_SIZE = 10;

export function InventoryItemsPanel() {
  const { data: items = [], isLoading } = useInventoryItems();
  const { data: vendors = [] } = useVendors();
  const { data: movements = [] } = useInventoryMovements(1000);
  const del = useDeleteInventoryItem();

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);

  const [itemDialog, setItemDialog] = useState<{ open: boolean; item: InventoryItem | null }>({
    open: false,
    item: null,
  });
  const [stockDialog, setStockDialog] = useState<{ open: boolean; item: InventoryItem | null }>({
    open: false,
    item: null,
  });
  const [vendorDialog, setVendorDialog] = useState<{ open: boolean }>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<InventoryItem | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) if (i.category) set.add(i.category);
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (category !== "all" && i.category !== category) return false;
      if (status !== "all" && i.status !== status) return false;
      if (q) {
        const needle = q.toLowerCase();
        if (
          !i.name.toLowerCase().includes(needle) &&
          !(i.sku ?? "").toLowerCase().includes(needle)
        )
          return false;
      }
      return true;
    });
  }, [items, category, status, q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Dashboard stats
  const stats = useMemo(() => {
    const totalValue = items.reduce(
      (s, i) => s + Number(i.current_quantity) * Number(i.cost_per_unit),
      0,
    );
    const low = items.filter(
      (i) => Number(i.minimum_quantity) > 0 && Number(i.current_quantity) <= Number(i.minimum_quantity) && Number(i.current_quantity) > 0,
    ).length;
    const out = items.filter((i) => Number(i.current_quantity) <= 0).length;
    const soon = items.filter((i) => {
      const d = daysUntil(i.expiry_date);
      return d !== null && d >= 0 && d <= 7;
    }).length;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const usageToday = movements
      .filter((m) => {
        if (new Date(m.created_at) < startOfDay) return false;
        return m.action === "reduce" || m.action === "waste";
      })
      .reduce((s, m) => s + Number(m.quantity), 0);
    return { totalValue, low, out, soon, usageToday };
  }, [items, movements]);

  async function handleDelete(item: InventoryItem) {
    try {
      await del.mutateAsync(item.id);
      toast.success("Item deleted");
    } catch (e) {
      toast.error((e as Error).message);
    }
    setConfirmDelete(null);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total value" value={formatINR(stats.totalValue)} icon={IndianRupee} loading={isLoading} />
        <Stat label="Items" value={String(items.length)} icon={Boxes} loading={isLoading} />
        <Stat label="Low stock" value={String(stats.low)} icon={AlertTriangle} tone="warn" loading={isLoading} />
        <Stat label="Out of stock" value={String(stats.out)} icon={PackageMinus} tone="danger" loading={isLoading} />
        <Stat label="Expiring ≤7d" value={String(stats.soon)} icon={Timer} tone="warn" loading={isLoading} />
        <Stat label="Used today" value={formatQty(stats.usageToday)} icon={Sparkles} loading={isLoading} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or SKU"
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="discontinued">Discontinued</SelectItem>
          </SelectContent>
        </Select>
        {vendors.length === 0 && (
          <Button variant="outline" size="sm" onClick={() => setVendorDialog({ open: true })}>
            Add first vendor
          </Button>
        )}
        <Button onClick={() => setItemDialog({ open: true, item: null })}>
          <Plus className="mr-1 h-4 w-4" /> New item
        </Button>
      </div>

      {stats.low + stats.out > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="h-4 w-4" />
          <span>
            {stats.out} out of stock · {stats.low} low-stock items need attention.
          </span>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              ))
            ) : pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-sm text-muted-foreground">
                  No inventory items. Add your first item to get started.
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((i) => {
                const level = stockLevel(Number(i.current_quantity), Number(i.minimum_quantity));
                const expDays = daysUntil(i.expiry_date);
                return (
                  <TableRow key={i.id}>
                    <TableCell>
                      <div className="font-medium">{i.name}</div>
                      {i.sku && <div className="text-xs text-muted-foreground">{i.sku}</div>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{i.category ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={cn(
                        level === "out" && "text-destructive font-semibold",
                        level === "low" && "text-amber-300 font-semibold",
                      )}>
                        {formatQty(Number(i.current_quantity), i.unit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatINR(Number(i.cost_per_unit))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatINR(Number(i.current_quantity) * Number(i.cost_per_unit))}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {i.vendors?.business_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {i.expiry_date ? (
                        <span className={cn(
                          expDays !== null && expDays < 0 && "text-destructive",
                          expDays !== null && expDays >= 0 && expDays <= 7 && "text-amber-300",
                        )}>
                          {i.expiry_date}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={i.status === "active" ? "default" : "secondary"} className="capitalize">
                        {i.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setStockDialog({ open: true, item: i })}>
                          Stock
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setItemDialog({ open: true, item: i })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }}
                aria-disabled={page === 1}
                className={cn(page === 1 && "pointer-events-none opacity-40")}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-3 text-xs text-muted-foreground">Page {page} of {pageCount}</span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(pageCount, p + 1)); }}
                aria-disabled={page === pageCount}
                className={cn(page === pageCount && "pointer-events-none opacity-40")}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <ItemDialog
        open={itemDialog.open}
        item={itemDialog.item}
        onClose={() => setItemDialog({ open: false, item: null })}
      />
      <StockOpDialog
        open={stockDialog.open}
        item={stockDialog.item}
        onClose={() => setStockDialog({ open: false, item: null })}
      />
      <VendorDialog open={vendorDialog.open} onClose={() => setVendorDialog({ open: false })} />

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will also remove its stock history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && handleDelete(confirmDelete)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  loading,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  tone?: "warn" | "danger";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={cn(
          "h-4 w-4",
          tone === "warn" ? "text-amber-400" : tone === "danger" ? "text-destructive" : "text-primary",
        )} />
      </div>
      <div className="mt-2 text-xl font-semibold">
        {loading ? <Skeleton className="h-6 w-16" /> : value}
      </div>
    </div>
  );
}

export { Layers };
