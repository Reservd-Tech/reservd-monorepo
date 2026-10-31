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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useVendors,
} from "@/lib/inventory/queries";
import type { InventoryItem, InventoryStatus } from "@/lib/inventory/types";

interface Props {
  open: boolean;
  onClose: () => void;
  item?: InventoryItem | null;
}

const STATUSES: InventoryStatus[] = ["active", "inactive", "discontinued"];

const empty = {
  name: "",
  sku: "",
  category: "",
  unit: "unit",
  current_quantity: "0",
  minimum_quantity: "0",
  maximum_quantity: "0",
  cost_per_unit: "0",
  vendor_id: "",
  storage_location: "",
  status: "active" as InventoryStatus,
  expiry_date: "",
  notes: "",
};

export function ItemDialog({ open, onClose, item }: Props) {
  const { data: vendors = [] } = useVendors();
  const create = useCreateInventoryItem();
  const update = useUpdateInventoryItem();
  const [f, setF] = useState(empty);
  const submitting = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    if (item) {
      setF({
        name: item.name,
        sku: item.sku ?? "",
        category: item.category ?? "",
        unit: item.unit,
        current_quantity: String(item.current_quantity),
        minimum_quantity: String(item.minimum_quantity),
        maximum_quantity: String(item.maximum_quantity),
        cost_per_unit: String(item.cost_per_unit),
        vendor_id: item.vendor_id ?? "",
        storage_location: item.storage_location ?? "",
        status: item.status,
        expiry_date: item.expiry_date ?? "",
        notes: item.notes ?? "",
      });
    } else {
      setF(empty);
    }
  }, [open, item]);

  async function handleSave() {
    if (!f.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const payload = {
      name: f.name.trim(),
      sku: f.sku.trim() || null,
      category: f.category.trim() || null,
      unit: f.unit.trim() || "unit",
      current_quantity: Number(f.current_quantity) || 0,
      minimum_quantity: Number(f.minimum_quantity) || 0,
      maximum_quantity: Number(f.maximum_quantity) || 0,
      cost_per_unit: Number(f.cost_per_unit) || 0,
      vendor_id: f.vendor_id || null,
      storage_location: f.storage_location.trim() || null,
      status: f.status,
      expiry_date: f.expiry_date || null,
      notes: f.notes.trim() || null,
    };
    try {
      if (item) {
        await update.mutateAsync({ id: item.id, patch: payload });
        toast.success("Item updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Item created");
      }
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !submitting && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? "Edit item" : "New inventory item"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" required>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="SKU">
            <Input value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} />
          </Field>
          <Field label="Category">
            <Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
          </Field>
          <Field label="Unit">
            <Input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} placeholder="kg, ltr, pcs" />
          </Field>
          <Field label="Current qty">
            <Input type="number" step="0.01" value={f.current_quantity} onChange={(e) => setF({ ...f, current_quantity: e.target.value })} />
          </Field>
          <Field label="Cost / unit (₹)">
            <Input type="number" step="0.01" value={f.cost_per_unit} onChange={(e) => setF({ ...f, cost_per_unit: e.target.value })} />
          </Field>
          <Field label="Min qty">
            <Input type="number" step="0.01" value={f.minimum_quantity} onChange={(e) => setF({ ...f, minimum_quantity: e.target.value })} />
          </Field>
          <Field label="Max qty">
            <Input type="number" step="0.01" value={f.maximum_quantity} onChange={(e) => setF({ ...f, maximum_quantity: e.target.value })} />
          </Field>
          <Field label="Vendor">
            <Select
              value={f.vendor_id || "none"}
              onValueChange={(v) => setF({ ...f, vendor_id: v === "none" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.business_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Storage location">
            <Input value={f.storage_location} onChange={(e) => setF({ ...f, storage_location: e.target.value })} />
          </Field>
          <Field label="Status">
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as InventoryStatus })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Expiry date">
            <Input type="date" value={f.expiry_date} onChange={(e) => setF({ ...f, expiry_date: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <Field label="Notes">
              <Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={submitting} className="min-w-[120px]">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : item ? "Save changes" : "Create item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        {label} {required && <span className="text-primary">*</span>}
      </Label>
      {children}
    </div>
  );
}
