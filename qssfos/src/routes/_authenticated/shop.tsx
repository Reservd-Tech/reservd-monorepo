import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Archive, Loader2, Plus, RotateCcw, Store, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ImagePicker } from "@/components/shop/image-picker";
import { GoLiveChecklist } from "@/components/shop/go-live-checklist";
import { HoursEditor } from "@/components/shop/hours-editor";
import { defaultHours, parseHours, serialiseHours, type WeeklyHours } from "@/lib/shop/hours";
import { useShopReadiness } from "@/lib/shop/readiness";

import {
  slugify,
  useArchiveStorefront,
  useCreateStorefront,
  useDeleteStorefront,
  useMyStorefronts,
  useUpdateStorefront,
} from "@/lib/shop/queries";

export const Route = createFileRoute("/_authenticated/shop")({
  head: () => ({
    meta: [
      { title: "Shop profile — QSSF OS" },
      {
        name: "description",
        content:
          "Onboard your street food shop: brand details, kitchen photos, contact info and UPI payouts.",
      },
      { property: "og:title", content: "Shop profile — QSSF OS" },
      {
        property: "og:description",
        content: "Set up your shop brand, photos and payout details in QSSF OS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShopPage,
});

interface ShopForm {
  brand_name: string;
  slug: string;
  tagline: string;
  description: string;
  address: string;
  phone: string;
  opening_hours: string;
  upi_id: string;
  upi_payee_name: string;
  is_open: boolean;
  logo_url: string | null;
  cover_url: string | null;
  upi_qr_url: string | null;
}

const EMPTY: ShopForm = {
  brand_name: "",
  slug: "",
  tagline: "",
  description: "",
  address: "",
  phone: "",
  opening_hours: "",
  upi_id: "",
  upi_payee_name: "",
  is_open: true,
  logo_url: null,
  cover_url: null,
  upi_qr_url: null,
};

function ShopPage() {
  const { data: shops = [], isLoading } = useMyStorefronts();
  const createShop = useCreateStorefront();
  const updateShop = useUpdateStorefront();
  const archiveShop = useArchiveStorefront();
  const deleteShop = useDeleteStorefront();
  const [form, setForm] = useState<ShopForm>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [hours, setHours] = useState<WeeklyHours>(() => defaultHours());



  const shop =
    selectedId === "new"
      ? null
      : shops.find((s) => s.id === selectedId) ??
        shops.find((s) => !s.archived_at) ??
        shops[0] ??
        null;

  const { ready } = useShopReadiness(shop?.id);

  function startNewShop() {
    setSelectedId("new");
    setSlugTouched(false);
    setForm(EMPTY);
    setHours(defaultHours());
  }


  useEffect(() => {
    if (!shop) return;
    setSlugTouched(true);
    setForm({
      brand_name: shop.brand_name,
      slug: shop.slug,
      tagline: shop.tagline ?? "",
      description: shop.description ?? "",
      address: shop.address ?? "",
      phone: shop.phone ?? "",
      opening_hours: shop.opening_hours ?? "",
      upi_id: shop.upi_id ?? "",
      upi_payee_name: shop.upi_payee_name ?? "",
      is_open: shop.is_open,
      logo_url: shop.logo_url,
      cover_url: shop.cover_url,
      upi_qr_url: shop.upi_qr_url,
    });
    setHours(parseHours(shop.opening_hours));
  }, [shop]);



  const set = <K extends keyof ShopForm>(key: K, value: ShopForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  /** Photos save immediately so the consumer app picks them up right away. */
  async function setImage(key: "logo_url" | "cover_url" | "upi_qr_url", value: string | null) {
    set(key, value);
    if (!shop) return;
    try {
      await updateShop.mutateAsync({ id: shop.id, patch: { [key]: value } });
      toast.success(value ? "Photo updated live" : "Photo removed");
    } catch (e) {
      toast.error((e as Error).message || "Could not save photo");
    }
  }

  async function submit() {
    if (!form.brand_name.trim()) return toast.error("Shop name is required");
    const slug = slugify(form.slug || form.brand_name);
    if (!slug) return toast.error("Add a valid shop link");

    const payload = {
      brand_name: form.brand_name.trim(),
      slug,
      tagline: form.tagline.trim() || null,
      description: form.description.trim() || null,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      opening_hours: serialiseHours(hours),
      upi_id: form.upi_id.trim() || null,
      upi_payee_name: form.upi_payee_name.trim() || null,
      logo_url: form.logo_url,
      cover_url: form.cover_url,
      upi_qr_url: form.upi_qr_url,
    };

    try {
      if (shop) {
        await updateShop.mutateAsync({ id: shop.id, patch: { ...payload, is_open: form.is_open } });
        toast.success("Shop profile saved");
      } else {
        const created = await createShop.mutateAsync(payload);
        setSelectedId(created.id);
        toast.success("Shop created — now build your menu");
      }
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(msg.includes("duplicate") ? "That shop link is already taken" : msg);
    }
  }

  const saving = createShop.isPending || updateShop.isPending;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Store className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {shop ? "Shop profile" : "Set up your shop"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {shop
                ? "Everything customers see about your stall."
                : "Takes two minutes — brand, photos and payouts."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {shop ? (
            <Button variant="outline" asChild>
              <Link to="/menu">
                <UtensilsCrossed className="mr-2 h-4 w-4" /> Manage menu
              </Link>
            </Button>
          ) : null}
        </div>
      </header>

      <section className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold tracking-tight">Your shops</h2>
            <p className="text-sm text-muted-foreground">
              {shops.length
                ? "Pick a shop to edit its profile, or archive one you no longer run."
                : "No shops yet — create your first one below."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={startNewShop} disabled={selectedId === "new"}>
            <Plus className="mr-2 h-4 w-4" /> Add a shop
          </Button>
        </div>

        {shops.length ? (
          <ul className="mt-4 space-y-2">
            {shops.map((s) => {
              const active = shop?.id === s.id;
              const archived = Boolean(s.archived_at);
              const approved = s.listing_status === "live";
              const liveNow = !archived && approved && s.is_open;
              const status = archived
                ? "Archived"
                : !approved
                  ? s.listing_status === "pending_review"
                    ? "Awaiting approval"
                    : "Not submitted"
                  : s.is_open
                    ? "Active"
                    : "Invisible";
              const reason = archived
                ? "Archived — hidden from customers, but its orders and menu are kept."
                : !approved
                  ? s.listing_status === "pending_review"
                    ? "Submitted for review — customers will see it once it's approved."
                    : "Finish the onboarding steps and submit this shop for review to make it visible."
                  : s.is_open
                    ? "Visible to customers in the consumer app."
                    : "Hidden from customers — either the go-live checklist isn't finished or “Accepting orders” is off.";

              return (
                <li
                  key={s.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                    active ? "border-primary/60 bg-primary/5" : "border-border/60"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {s.logo_url ? (
                      <img
                        src={s.logo_url}
                        alt={`${s.brand_name} logo`}
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Store className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{s.brand_name}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            archived
                              ? "bg-muted text-muted-foreground"
                              : liveNow
                                ? "bg-emerald-500/15 text-emerald-500"
                                : "bg-amber-500/15 text-amber-500"
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        Customer link: <span className="font-mono">/{s.slug}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{reason}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={active ? "default" : "outline"}
                      onClick={() => setSelectedId(s.id)}
                    >
                      {active ? "Editing" : "Edit"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        archiveShop.mutate(
                          { id: s.id, archived: !archived },
                          {
                            onSuccess: () =>
                              toast.success(archived ? "Shop restored" : "Shop archived"),
                            onError: (e: Error) => toast.error(e.message),
                          },
                        )
                      }
                    >
                      {archived ? (
                        <>
                          <RotateCcw className="mr-2 h-4 w-4" /> Restore
                        </>
                      ) : (
                        <>
                          <Archive className="mr-2 h-4 w-4" /> Archive
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (!confirm(`Delete “${s.brand_name}” permanently?`)) return;
                        deleteShop.mutate(s.id, {
                          onSuccess: () => {
                            if (selectedId === s.id) setSelectedId(null);
                            toast.success("Shop deleted");
                          },
                          onError: (e: Error) => toast.error(e.message),
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      {selectedId === "new" ? (
        <p className="rounded-xl border border-dashed border-primary/50 bg-primary/5 px-4 py-3 text-sm text-primary">
          Filling in a brand new shop below. It stays invisible to customers until the go-live
          checklist is complete.
        </p>
      ) : null}

      {shop ? <GoLiveChecklist shopId={shop.id} /> : null}



      <section className="rounded-2xl border border-border/60 bg-card p-6">
        <div className="grid gap-5 sm:grid-cols-[220px_minmax(0,1fr)]">
          <ImagePicker
            value={form.logo_url}
            onChange={(v) => setImage("logo_url", v)}
            folder="brand"
            label="Logo"
            aspect="square"
            hint="Square, at least 400×400"
          />
          <ImagePicker
            value={form.cover_url}
            onChange={(v) => setImage("cover_url", v)}
            folder="shop"
            label="Shop / kitchen photo"
            hint="Show your stall or kitchen — builds trust with customers"
          />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field
            label="Shop name"
            value={form.brand_name}
            onChange={(v) => {
              set("brand_name", v);
              if (!slugTouched) set("slug", slugify(v));
            }}
            placeholder="Your shop name"
          />
          <Field
            label="Shop link (slug)"
            value={form.slug}
            onChange={(v) => {
              setSlugTouched(true);
              set("slug", slugify(v));
            }}
            hint="Used by your customer app"
            placeholder="your-shop"
          />
          <Field
            label="Tagline"
            value={form.tagline}
            onChange={(v) => set("tagline", v)}
            placeholder="What you are known for"
          />
          <Field
            label="Phone"
            value={form.phone}
            onChange={(v) => set("phone", v)}
            placeholder="98765 43210"
          />
          <Field
            label="Address"
            value={form.address}
            onChange={(v) => set("address", v)}
            placeholder="Linking Road, Bandra West"
          />
          <div className="sm:col-span-2">
            <HoursEditor value={hours} onChange={setHours} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>About your shop</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="Family recipe since 1998, filtered water, fresh masala daily."
            />
          </div>
          <Field
            label="UPI ID"
            value={form.upi_id}
            onChange={(v) => set("upi_id", v)}
            placeholder="yourshop@okicici"
          />
          <Field
            label="UPI payee name"
            value={form.upi_payee_name}
            onChange={(v) => set("upi_payee_name", v)}
            placeholder="Registered payee name"
          />
          <div className="sm:col-span-2 grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-start">
            <ImagePicker
              value={form.upi_qr_url}
              onChange={(v) => setImage("upi_qr_url", v)}
              folder="payment-qr"
              label="UPI payment QR"
              aspect="square"
              hint="Upload the QR from your UPI app"
            />
            <p className="text-xs text-muted-foreground sm:pt-8">
              Customers scan this QR to pay. Make sure the code is sharp, fully visible and
              matches the UPI ID above — a blurry or cropped QR will fail to scan.
            </p>
          </div>

          {shop ? (
            <div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 sm:col-span-2">
              <div>
                <p className="text-sm font-medium">Accepting orders</p>
                <p className="text-xs text-muted-foreground">
                  {ready
                    ? "Turn off to hide the shop from customers"
                    : "Finish the go-live checklist above to accept orders"}
                </p>
              </div>
              <Switch
                checked={form.is_open && ready}
                disabled={!ready}
                onCheckedChange={(v) => set("is_open", v)}
              />
            </div>
          ) : null}
        </div>

        <Button className="mt-6" onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {shop ? "Save changes" : "Create shop"}
        </Button>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
