import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { inviteVendor } from "@/lib/admin/invite.functions";
import { UserManagement } from "@/components/admin/user-management";
import { signedDocumentUrl } from "@/lib/shop/documents";
import { slugify } from "@/lib/shop/queries";
import {
  LISTING_LABEL,
  useAdminOrders,
  useAdminStorefronts,
  useAdminUpdateShop,
  useIsPlatformAdmin,
  type ListingStatus,
  type Storefront,
} from "@/lib/compliance/queries";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Platform admin — QSSF OS" },
      { name: "description", content: "Review vendor compliance, approve listings and invite new kitchens." },
      { property: "og:title", content: "Platform admin — QSSF OS" },
      { property: "og:description", content: "Vendor review and approval console." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const STATUSES: ListingStatus[] = ["draft", "pending_review", "live", "suspended"];

function AdminPage() {
  const { data: isAdmin, isLoading: checking } = useIsPlatformAdmin();
  const shops = useAdminStorefronts();
  const orders = useAdminOrders();
  const update = useAdminUpdateShop();
  const qc = useQueryClient();
  const invite = useServerFn(inviteVendor);

  const [email, setEmail] = useState("");
  const [brand, setBrand] = useState("");
  const [inviting, setInviting] = useState(false);
  const [openShop, setOpenShop] = useState<string | null>(null);

  if (checking) return <div className="text-sm text-muted-foreground">Checking access…</div>;
  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="text-lg font-semibold">Not available</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This area is only for platform administrators.
        </p>
      </div>
    );
  }

  async function sendInvite() {
    setInviting(true);
    try {
      const res = await invite({
        data: {
          email: email.trim(),
          brandName: brand.trim(),
          slug: slugify(brand),
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      toast.success(`Invite sent — shop link /${res.slug}`);
      setEmail("");
      setBrand("");
      qc.invalidateQueries({ queryKey: ["compliance", "admin"] });
    } catch (e) {
      toast.error((e as Error).message || "Could not send the invite");
    } finally {
      setInviting(false);
    }
  }

  async function openDoc(path: string | null) {
    if (!path) return;
    try {
      window.open(await signedDocumentUrl(path), "_blank", "noopener");
    } catch {
      toast.error("Could not open that document");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Platform admin</h1>
          <p className="text-sm text-muted-foreground">
            Review vendor compliance and control who is visible to customers.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/vendors">Vendor accounts</Link>
        </Button>
      </header>

      <UserManagement />

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Invite a vendor</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-brand">Kitchen name</Label>
            <Input id="invite-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
          <Button onClick={sendInvite} disabled={inviting || !email.trim() || brand.trim().length < 2}>
            {inviting ? "Sending…" : "Send invite"}
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Vendors</h2>
        <div className="mt-4 space-y-3">
          {shops.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {shops.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No vendors yet.</p>
          )}
          {shops.data?.map((s: Storefront) => (
            <div key={s.id} className="rounded-xl border border-border/70 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{s.brand_name}</span>
                    <Badge variant={s.listing_status === "live" ? "default" : "secondary"}>
                      {LISTING_LABEL[(s.listing_status as ListingStatus) ?? "draft"]}
                    </Badge>
                    {s.fssai_verified ? <Badge variant="outline">FSSAI verified</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    /{s.slug} · step {s.onboarding_step} of 5
                    {s.fssai_number ? ` · FSSAI ${s.fssai_number}` : ""}
                  </p>
                </div>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={s.listing_status}
                  onChange={(e) =>
                    update.mutate({ id: s.id, patch: { listing_status: e.target.value } })
                  }
                >
                  {STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {LISTING_LABEL[st]}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant={s.fssai_verified ? "secondary" : "outline"}
                  onClick={() =>
                    update.mutate({ id: s.id, patch: { fssai_verified: !s.fssai_verified } })
                  }
                >
                  {s.fssai_verified ? "Unverify FSSAI" : "Mark FSSAI verified"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setOpenShop(openShop === s.id ? null : s.id)}
                >
                  {openShop === s.id ? "Hide" : "Review"}
                </Button>
              </div>

              {openShop === s.id && (
                <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-border/60 pt-4 text-sm sm:grid-cols-2">
                  <Row label="Legal name" value={s.legal_name} />
                  <Row label="Entity type" value={s.entity_type} />
                  <Row label="PAN" value={s.pan_number} />
                  <Row label="GSTIN" value={s.is_gst_registered ? s.gstin : "Not registered"} />
                  <Row label="Billing address" value={s.business_address} />
                  <Row label="Pincode" value={s.business_pincode} />
                  <Row label="FSSAI type" value={s.fssai_type} />
                  <Row label="UPI ID" value={s.upi_vpa ?? s.upi_id} />
                  <Row label="Bank alert phone" value={s.bank_alert_phone} />
                  <Row label="Account holder" value={s.bank_account_holder_name} />
                  <Row label="Account number" value={s.bank_account_number} />
                  <Row label="IFSC" value={s.bank_ifsc} />
                  <Row label="ID proof type" value={s.id_proof_type} />
                  <Row
                    label="Declaration"
                    value={s.self_declaration_accepted ? "Accepted" : "Not accepted"}
                  />
                  <div className="sm:col-span-2 flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!s.fssai_certificate_url}
                      onClick={() => openDoc(s.fssai_certificate_url)}
                    >
                      FSSAI certificate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!s.id_proof_url}
                      onClick={() => openDoc(s.id_proof_url)}
                    >
                      ID proof
                    </Button>
                  </div>
                </dl>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Recent orders across all vendors</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Order</th>
                <th className="py-2 pr-4">Vendor</th>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Payment</th>
                <th className="py-2 pr-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.data?.map((o) => {
                const shop = shops.data?.find((s) => s.id === o.storefront_id);
                return (
                  <tr key={o.id} className="border-t border-border/60">
                    <td className="py-2 pr-4">#{o.order_number}</td>
                    <td className="py-2 pr-4">{shop?.brand_name ?? "—"}</td>
                    <td className="py-2 pr-4">{o.customer_name ?? "Guest"}</td>
                    <td className="py-2 pr-4 capitalize">{o.status}</td>
                    <td className="py-2 pr-4 capitalize">
                      {o.payment_status}
                      {o.payment_reference ? ` · ${o.payment_reference}` : ""}
                    </td>
                    <td className="py-2 pr-4 text-right">₹{o.total.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {orders.data?.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">No orders yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 sm:block">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate">{value || "—"}</dd>
    </div>
  );
}
