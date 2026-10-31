import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImagePicker } from "@/components/shop/image-picker";
import { DocumentPicker } from "@/components/shop/document-picker";
import {
  ENTITY_TYPES,
  FSSAI_TYPES,
  useCreateOnboardingShop,
  useOnboardingShop,
  useSaveCompliance,
  type Storefront,
  type StorefrontUpdate,
} from "@/lib/compliance/queries";
import { slugify } from "@/lib/shop/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Vendor onboarding — QSSF OS" },
      {
        name: "description",
        content:
          "Complete your kitchen listing, FSSAI details, invoice information and verification to go live.",
      },
      { property: "og:title", content: "Vendor onboarding — QSSF OS" },
      {
        property: "og:description",
        content: "Five quick steps to get your street food kitchen live for customers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OnboardingPage,
});

const STEPS = ["Basics", "Listing", "FSSAI", "Invoice details", "Verification"];

type Form = {
  brand_name: string;
  phone: string;
  upi_vpa: string;
  tagline: string;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
  opening_hours: string;
  stall_photo_url: string | null;
  fssai_number: string;
  fssai_type: string;
  fssai_certificate_url: string | null;
  legal_name: string;
  pan_number: string;
  entity_type: string;
  business_address: string;
  business_pincode: string;
  is_gst_registered: boolean;
  gstin: string;
  id_proof_type: string;
  id_proof_url: string | null;
  bank_alert_phone: string;
  bank_account_holder_name: string;
  bank_account_number: string;
  bank_ifsc: string;
  self_declaration_accepted: boolean;
};

function toForm(s: Storefront | null): Form {
  return {
    brand_name: s?.brand_name ?? "",
    phone: s?.phone ?? "",
    upi_vpa: s?.upi_vpa ?? s?.upi_id ?? "",
    tagline: s?.tagline ?? "",
    description: s?.description ?? "",
    address: s?.address ?? "",
    latitude: s?.latitude != null ? String(s.latitude) : "",
    longitude: s?.longitude != null ? String(s.longitude) : "",
    opening_hours: s?.opening_hours ?? "",
    stall_photo_url: s?.stall_photo_url ?? s?.cover_url ?? null,
    fssai_number: s?.fssai_number ?? "",
    fssai_type: s?.fssai_type ?? "",
    fssai_certificate_url: s?.fssai_certificate_url ?? null,
    legal_name: s?.legal_name ?? "",
    pan_number: s?.pan_number ?? "",
    entity_type: s?.entity_type ?? "",
    business_address: s?.business_address ?? "",
    business_pincode: s?.business_pincode ?? "",
    is_gst_registered: s?.is_gst_registered ?? false,
    gstin: s?.gstin ?? "",
    id_proof_type: s?.id_proof_type ?? "",
    id_proof_url: s?.id_proof_url ?? null,
    bank_alert_phone: s?.bank_alert_phone ?? "",
    bank_account_holder_name: s?.bank_account_holder_name ?? "",
    bank_account_number: s?.bank_account_number ?? "",
    bank_ifsc: s?.bank_ifsc ?? "",
    self_declaration_accepted: s?.self_declaration_accepted ?? false,
  };
}

const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";

function OnboardingPage() {
  const navigate = useNavigate();
  const { data: shop, isLoading } = useOnboardingShop();
  const createShop = useCreateOnboardingShop();
  const save = useSaveCompliance();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(() => toForm(null));
  const [hydrated, setHydrated] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated || isLoading) return;
    setForm(toForm(shop ?? null));
    setStep(Math.min(Math.max(shop?.onboarding_step ?? 1, 1), 5));
    setHydrated(true);
  }, [shop, isLoading, hydrated]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const patchForStep = useMemo(
    () =>
      (n: number): StorefrontUpdate => {
        const num = (v: string) => (v.trim() === "" ? null : Number(v));
        const text = (v: string) => (v.trim() === "" ? null : v.trim());
        switch (n) {
          case 1:
            return {
              brand_name: form.brand_name.trim(),
              phone: text(form.phone),
              upi_vpa: text(form.upi_vpa),
              upi_id: text(form.upi_vpa),
            };
          case 2:
            return {
              tagline: text(form.tagline),
              description: text(form.description),
              address: text(form.address),
              latitude: num(form.latitude),
              longitude: num(form.longitude),
              opening_hours: text(form.opening_hours),
              stall_photo_url: form.stall_photo_url,
              cover_url: form.stall_photo_url,
            };
          case 3:
            return {
              fssai_number: text(form.fssai_number),
              fssai_type: text(form.fssai_type),
              fssai_certificate_url: form.fssai_certificate_url,
            };
          case 4:
            return {
              legal_name: text(form.legal_name),
              pan_number: text(form.pan_number)?.toUpperCase() ?? null,
              entity_type: text(form.entity_type),
              business_address: text(form.business_address),
              business_pincode: text(form.business_pincode),
              is_gst_registered: form.is_gst_registered,
              gstin: form.is_gst_registered ? text(form.gstin)?.toUpperCase() ?? null : null,
            };
          default:
            return {
              id_proof_type: text(form.id_proof_type),
              id_proof_url: form.id_proof_url,
              bank_alert_phone: text(form.bank_alert_phone),
              bank_account_holder_name: text(form.bank_account_holder_name),
              bank_account_number: text(form.bank_account_number),
              bank_ifsc: text(form.bank_ifsc)?.toUpperCase() ?? null,
              self_declaration_accepted: form.self_declaration_accepted,
            };
        }
      },
    [form],
  );

  function validate(n: number): string | null {
    if (n === 1) {
      if (form.brand_name.trim().length < 2) return "Enter your kitchen name";
      if (form.phone.replace(/\D/g, "").length < 10) return "Enter a 10-digit phone number";
      if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(form.upi_vpa.trim())) return "Enter a valid UPI ID";
    }
    if (n === 2 && !form.address.trim()) return "Add the address customers will see";
    if (n === 3) {
      if (!/^\d{14}$/.test(form.fssai_number.trim()))
        return "FSSAI numbers are 14 digits";
      if (!form.fssai_type) return "Choose your FSSAI registration type";
    }
    if (n === 4) {
      if (!form.legal_name.trim()) return "Enter the legal name on your PAN";
      if (!/^[A-Z]{5}\d{4}[A-Z]$/i.test(form.pan_number.trim())) return "Enter a valid PAN";
      if (!form.entity_type) return "Choose your business type";
      if (!/^\d{6}$/.test(form.business_pincode.trim())) return "Enter a 6-digit pincode";
      if (form.is_gst_registered && !/^[0-9A-Z]{15}$/i.test(form.gstin.trim()))
        return "Enter a valid 15-character GSTIN";
    }
    if (n === 5) {
      if (!form.id_proof_type) return "Choose an ID proof type";
      if (!form.id_proof_url) return "Upload your ID proof";
      if (form.bank_alert_phone.replace(/\D/g, "").length < 10)
        return "Enter the phone number your bank sends SMS alerts to";
      if (!form.self_declaration_accepted) return "Please accept the declaration";
    }
    return null;
  }

  async function persist(nextStep: number, finish = false) {
    const problem = validate(step);
    if (problem) {
      toast.error(problem);
      return;
    }
    try {
      let shopId = shop?.id;
      if (!shopId) {
        const created = await createShop.mutateAsync({
          brand_name: form.brand_name.trim(),
          slug: slugify(form.brand_name),
          phone: form.phone.trim() || null,
        });
        shopId = created.id;
      }
      await save.mutateAsync({
        id: shopId,
        patch: {
          ...patchForStep(step),
          onboarding_step: finish ? 6 : Math.max(nextStep, shop?.onboarding_step ?? 1),
          ...(finish ? { listing_status: "pending_review" as const } : {}),
        },
      });
      if (finish) {
        toast.success("Submitted for review — we'll confirm once your listing is approved.");
        navigate({ to: "/shop" });
        return;
      }
      setStep(nextStep);
    } catch (e) {
      toast.error((e as Error).message || "Could not save");
    }
  }

  function useMyLocation() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("This browser cannot share your location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("latitude", pos.coords.latitude.toFixed(6));
        set("longitude", pos.coords.longitude.toFixed(6));
      },
      () => setGeoError("Location permission was denied — enter the coordinates manually."),
    );
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading your details…</div>;
  }

  const busy = save.isPending || createShop.isPending;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Get your kitchen listed</h1>
        <p className="text-sm text-muted-foreground">
          Five short steps. Your progress is saved, so you can leave and come back.
        </p>
      </header>

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const reached = n <= Math.max(step, shop?.onboarding_step ?? 1);
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => reached && setStep(n)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  n === step
                    ? "border-primary bg-primary/10 text-primary"
                    : reached
                      ? "border-border text-muted-foreground hover:text-foreground"
                      : "border-border/60 text-muted-foreground/50",
                )}
              >
                {n}. {label}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="brand">Kitchen name</Label>
              <Input
                id="brand"
                value={form.brand_name}
                onChange={(e) => set("brand_name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="upi">UPI ID</Label>
              <Input
                id="upi"
                placeholder="name@bank"
                value={form.upi_vpa}
                onChange={(e) => set("upi_vpa", e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tagline">Cuisine / tagline</Label>
              <Input
                id="tagline"
                placeholder="Street-style chaat & pani puri"
                value={form.tagline}
                onChange={(e) => set("tagline", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="desc">About your kitchen</Label>
              <Textarea
                id="desc"
                rows={3}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="addr">Stall address</Label>
              <Input
                id="addr"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                inputMode="decimal"
                value={form.latitude}
                onChange={(e) => set("latitude", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                inputMode="decimal"
                value={form.longitude}
                onChange={(e) => set("longitude", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>
                Use my current location
              </Button>
              {geoError ? (
                <p className="mt-1.5 text-xs text-destructive">{geoError}</p>
              ) : null}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="hours">Opening hours</Label>
              <Input
                id="hours"
                placeholder="Mon–Sun 5pm–11pm"
                value={form.opening_hours}
                onChange={(e) => set("opening_hours", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <ImagePicker
                value={form.stall_photo_url}
                onChange={(url) => set("stall_photo_url", url)}
                folder="stall"
                label="Stall photo"
                hint="This is the first thing customers see."
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <p className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground sm:col-span-2">
              Most street food vendors need Basic Registration — free, ~10 min at
              foscos.fssai.gov.in. If registered under the Street Vendors Act 2014, choose deemed
              registration.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="fssai">FSSAI number</Label>
              <Input
                id="fssai"
                inputMode="numeric"
                maxLength={14}
                value={form.fssai_number}
                onChange={(e) => set("fssai_number", e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fssai-type">Registration type</Label>
              <select
                id="fssai-type"
                className={selectClass}
                value={form.fssai_type}
                onChange={(e) => set("fssai_type", e.target.value)}
              >
                <option value="">Select…</option>
                {FSSAI_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <DocumentPicker
                value={form.fssai_certificate_url}
                onChange={(p) => set("fssai_certificate_url", p)}
                folder="fssai"
                label="FSSAI certificate"
                hint="Only you and our review team can open this file."
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Details for your monthly invoice.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="legal">Legal name</Label>
              <Input
                id="legal"
                value={form.legal_name}
                onChange={(e) => set("legal_name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pan">PAN</Label>
              <Input
                id="pan"
                maxLength={10}
                value={form.pan_number}
                onChange={(e) => set("pan_number", e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entity">Business type</Label>
              <select
                id="entity"
                className={selectClass}
                value={form.entity_type}
                onChange={(e) => set("entity_type", e.target.value)}
              >
                <option value="">Select…</option>
                {ENTITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pin">Pincode</Label>
              <Input
                id="pin"
                inputMode="numeric"
                maxLength={6}
                value={form.business_pincode}
                onChange={(e) => set("business_pincode", e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="baddr">Billing address</Label>
              <Textarea
                id="baddr"
                rows={2}
                value={form.business_address}
                onChange={(e) => set("business_address", e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={form.is_gst_registered}
                onChange={(e) => set("is_gst_registered", e.target.checked)}
              />
              I am registered for GST
            </label>
            {form.is_gst_registered && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  maxLength={15}
                  value={form.gstin}
                  onChange={(e) => set("gstin", e.target.value.toUpperCase())}
                />
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="idtype">ID proof type</Label>
              <select
                id="idtype"
                className={selectClass}
                value={form.id_proof_type}
                onChange={(e) => set("id_proof_type", e.target.value)}
              >
                <option value="">Select…</option>
                <option value="aadhaar">Aadhaar</option>
                <option value="voter_id">Voter ID</option>
                <option value="driving_licence">Driving licence</option>
                <option value="passport">Passport</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alert">Bank alert phone</Label>
              <Input
                id="alert"
                value={form.bank_alert_phone}
                onChange={(e) => set("bank_alert_phone", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The number your bank sends payment SMS alerts to — we use it to confirm your
                orders automatically.
              </p>
            </div>
            <div className="sm:col-span-2">
              <DocumentPicker
                value={form.id_proof_url}
                onChange={(p) => set("id_proof_url", p)}
                folder="id-proof"
                label="ID proof"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="holder">Account holder name</Label>
              <Input
                id="holder"
                value={form.bank_account_holder_name}
                onChange={(e) => set("bank_account_holder_name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acct">Bank account number</Label>
              <Input
                id="acct"
                value={form.bank_account_number}
                onChange={(e) => set("bank_account_number", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ifsc">IFSC</Label>
              <Input
                id="ifsc"
                maxLength={11}
                value={form.bank_ifsc}
                onChange={(e) => set("bank_ifsc", e.target.value.toUpperCase())}
              />
            </div>
            <label className="flex items-start gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-primary"
                checked={form.self_declaration_accepted}
                onChange={(e) => set("self_declaration_accepted", e.target.checked)}
              />
              I confirm these details are accurate and the UPI ID and bank account belong to me or
              my business.
            </label>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button
            type="button"
            variant="ghost"
            disabled={step === 1 || busy}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            Back
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={() => (step === 5 ? persist(5, true) : persist(step + 1))}
          >
            {busy ? "Saving…" : step === 5 ? "Submit for review" : "Save & continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
