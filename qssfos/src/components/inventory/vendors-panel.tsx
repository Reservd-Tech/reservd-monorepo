import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useDeleteVendor, useVendorPurchases, useVendors,
} from "@/lib/inventory/queries";
import { formatINR } from "@/lib/pos/format";
import type { Vendor } from "@/lib/inventory/types";
import { VendorDialog } from "@/components/inventory/vendor-dialog";

export function VendorsPanel() {
  const { data: vendors = [], isLoading } = useVendors();
  const del = useDeleteVendor();
  const [q, setQ] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; vendor: Vendor | null }>({
    open: false, vendor: null,
  });
  const [confirmDelete, setConfirmDelete] = useState<Vendor | null>(null);
  const [historyOf, setHistoryOf] = useState<Vendor | null>(null);

  const filtered = useMemo(() => {
    if (!q) return vendors;
    const needle = q.toLowerCase();
    return vendors.filter((v) =>
      v.business_name.toLowerCase().includes(needle) ||
      (v.contact_person ?? "").toLowerCase().includes(needle) ||
      (v.phone ?? "").includes(needle),
    );
  }, [vendors, q]);

  async function handleDelete(v: Vendor) {
    try {
      await del.mutateAsync(v.id);
      toast.success("Vendor deleted");
    } catch (e) {
      toast.error((e as Error).message);
    }
    setConfirmDelete(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vendors" className="pl-9" />
        </div>
        <Button onClick={() => setDialog({ open: true, vendor: null })}>
          <Plus className="mr-1 h-4 w-4" /> New vendor
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>GST</TableHead>
              <TableHead>Terms</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-sm text-muted-foreground">
                  No vendors yet.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="font-medium">{v.business_name}</div>
                    {v.email && <div className="text-xs text-muted-foreground">{v.email}</div>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{v.contact_person ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{v.phone ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{v.gst_number ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{v.payment_terms ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(v.outstanding_balance) > 0 ? (
                      <Badge variant="destructive">{formatINR(Number(v.outstanding_balance))}</Badge>
                    ) : (
                      <span className="text-muted-foreground">{formatINR(0)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {Number(v.rating).toFixed(1)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => setHistoryOf(v)}>
                        History
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDialog({ open: true, vendor: v })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(v)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <VendorDialog
        open={dialog.open}
        vendor={dialog.vendor}
        onClose={() => setDialog({ open: false, vendor: null })}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.business_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Inventory items linked to this vendor will lose their vendor reference.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && handleDelete(confirmDelete)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <VendorHistoryDialog vendor={historyOf} onClose={() => setHistoryOf(null)} />
    </div>
  );
}

function VendorHistoryDialog({ vendor, onClose }: { vendor: Vendor | null; onClose: () => void }) {
  const { data: purchases = [], isLoading } = useVendorPurchases(vendor?.id ?? null);
  return (
    <Dialog open={!!vendor} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Purchase history — {vendor?.business_name}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[400px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit cost</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5}><Skeleton className="h-8" /></TableCell></TableRow>
              ) : purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                    No purchases recorded.
                  </TableCell>
                </TableRow>
              ) : (
                purchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.purchased_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{p.item_name}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(p.quantity)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatINR(Number(p.unit_cost))}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatINR(Number(p.total_cost))}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
