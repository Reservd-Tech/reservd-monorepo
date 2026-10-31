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
import { useCreateVendor, useUpdateVendor } from "@/lib/inventory/queries";
import type { Vendor } from "@/lib/inventory/types";

interface Props {
  open: boolean;
  onClose: () => void;
  vendor?: Vendor | null;
}

const empty = {
  business_name: "",
  contact_person: "",
  phone: "",
  email: "",
  gst_number: "",
  address: "",
  payment_terms: "",
  avg_delivery_days: "0",
  rating: "0",
  outstanding_balance: "0",
  notes: "",
};

export function VendorDialog({ open, onClose, vendor }: Props) {
  const create = useCreateVendor();
  const update = useUpdateVendor();
  const [f, setF] = useState(empty);
  const submitting = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    if (vendor) {
      setF({
        business_name: vendor.business_name,
        contact_person: vendor.contact_person ?? "",
        phone: vendor.phone ?? "",
        email: vendor.email ?? "",
        gst_number: vendor.gst_number ?? "",
        address: vendor.address ?? "",
        payment_terms: vendor.payment_terms ?? "",
        avg_delivery_days: String(vendor.avg_delivery_days ?? 0),
        rating: String(vendor.rating ?? 0),
        outstanding_balance: String(vendor.outstanding_balance ?? 0),
        notes: vendor.notes ?? "",
      });
    } else {
      setF(empty);
    }
  }, [open, vendor]);

  async function handleSave() {
    if (!f.business_name.trim()) {
      toast.error("Business name is required");
      return;
    }
    const payload = {
      business_name: f.business_name.trim(),
      contact_person: f.contact_person.trim() || null,
      phone: f.phone.trim() || null,
      email: f.email.trim() || null,
      gst_number: f.gst_number.trim() || null,
      address: f.address.trim() || null,
      payment_terms: f.payment_terms.trim() || null,
      avg_delivery_days: Number(f.avg_delivery_days) || 0,
      rating: Number(f.rating) || 0,
      outstanding_balance: Number(f.outstanding_balance) || 0,
      notes: f.notes.trim() || null,
    };
    try {
      if (vendor) {
        await update.mutateAsync({ id: vendor.id, patch: payload });
        toast.success("Vendor updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Vendor added");
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
          <DialogTitle>{vendor ? "Edit vendor" : "New vendor"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Business name" required>
            <Input value={f.business_name} onChange={(e) => setF({ ...f, business_name: e.target.value })} />
          </Field>
          <Field label="Contact person">
            <Input value={f.contact_person} onChange={(e) => setF({ ...f, contact_person: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" />
          </Field>
          <Field label="Email">
            <Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} type="email" />
          </Field>
          <Field label="GST number">
            <Input value={f.gst_number} onChange={(e) => setF({ ...f, gst_number: e.target.value })} />
          </Field>
          <Field label="Payment terms">
            <Input value={f.payment_terms} onChange={(e) => setF({ ...f, payment_terms: e.target.value })} placeholder="Net 30" />
          </Field>
          <Field label="Avg delivery (days)">
            <Input type="number" value={f.avg_delivery_days} onChange={(e) => setF({ ...f, avg_delivery_days: e.target.value })} />
          </Field>
          <Field label="Rating (0-5)">
            <Input type="number" step="0.1" min="0" max="5" value={f.rating} onChange={(e) => setF({ ...f, rating: e.target.value })} />
          </Field>
          <Field label="Outstanding balance (₹)">
            <Input type="number" step="0.01" value={f.outstanding_balance} onChange={(e) => setF({ ...f, outstanding_balance: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <Field label="Address">
              <Textarea rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
            </Field>
          </div>
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
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : vendor ? "Save changes" : "Add vendor"}
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
