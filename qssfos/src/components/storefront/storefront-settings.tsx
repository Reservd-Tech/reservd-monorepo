import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, Store } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { sfKeys, type Storefront } from "@/lib/storefront/queries";

export function StorefrontSettings() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["storefront", "settings"],
    queryFn: async (): Promise<Storefront | null> => {
      const { data, error } = await supabase
        .from("storefronts")
        .select("*")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({
    slug: "",
    brand_name: "",
    tagline: "",
    upi_id: "",
    upi_payee_name: "",
    latitude: "",
    longitude: "",
    is_open: true,
  });
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        slug: data.slug,
        brand_name: data.brand_name,
        tagline: data.tagline ?? "",
        upi_id: data.upi_id ?? "",
        upi_payee_name: data.upi_payee_name ?? "",
        latitude: data.latitude == null ? "" : String(data.latitude),
        longitude: data.longitude == null ? "" : String(data.longitude),
        is_open: data.is_open,
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error("No storefront found");
      const { error } = await supabase
        .from("storefronts")
        .update({
          slug: form.slug.trim(),
          brand_name: form.brand_name.trim(),
          tagline: form.tagline.trim() || null,
          upi_id: form.upi_id.trim() || null,
          upi_payee_name: form.upi_payee_name.trim() || null,
          latitude: form.latitude.trim() === "" ? null : Number(form.latitude),
          longitude: form.longitude.trim() === "" ? null : Number(form.longitude),
          is_open: form.is_open,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Storefront updated");
      queryClient.invalidateQueries({ queryKey: ["storefront"] });
      queryClient.invalidateQueries({ queryKey: sfKeys.storefronts });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function fillCurrentLocation() {
    setGeoError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("This browser does not support location access.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied — enter the coordinates manually."
            : "Could not read your location. Try again or enter it manually.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!data) return null;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Store className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold tracking-tight">Customer storefront</h2>
            <p className="text-sm text-muted-foreground">
              Brand + UPI details served to your consumer app over the public API.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground">
          API slug: {data.slug}
        </span>

      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Brand name" value={form.brand_name} onChange={(v) => setForm((f) => ({ ...f, brand_name: v }))} />
        <Field label="Storefront link (slug)" value={form.slug} onChange={(v) => setForm((f) => ({ ...f, slug: v }))} hint="used by the consumer app API" />
        <Field label="Tagline" value={form.tagline} onChange={(v) => setForm((f) => ({ ...f, tagline: v }))} />
        <Field label="UPI ID" value={form.upi_id} onChange={(v) => setForm((f) => ({ ...f, upi_id: v }))} hint="e.g. yourshop@okicici" />
        <Field label="UPI payee name" value={form.upi_payee_name} onChange={(v) => setForm((f) => ({ ...f, upi_payee_name: v }))} />
        <div className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Accepting orders</p>
            <p className="text-xs text-muted-foreground">Closed hides the storefront</p>
          </div>
          <Switch
            checked={form.is_open}
            onCheckedChange={(v) => setForm((f) => ({ ...f, is_open: v }))}
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">Pickup location</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Coordinates customers use to navigate to your counter.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Latitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={form.latitude}
              onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
              placeholder="12.971599"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Longitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={form.longitude}
              onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
              placeholder="77.594566"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={fillCurrentLocation}
          disabled={locating}
        >
          {locating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
          Use my current location
        </Button>
        {geoError ? <p className="mt-2 text-xs text-destructive">{geoError}</p> : null}
      </div>

      <Button className="mt-5" onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save changes
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
