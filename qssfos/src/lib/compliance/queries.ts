import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Storefront = Database["public"]["Tables"]["storefronts"]["Row"];
export type StorefrontUpdate = Database["public"]["Tables"]["storefronts"]["Update"];

export type ListingStatus = "draft" | "pending_review" | "live" | "suspended";

export const LISTING_LABEL: Record<ListingStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  live: "Live",
  suspended: "Suspended",
};

export const ENTITY_TYPES = [
  { value: "proprietorship", label: "Sole proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "llp", label: "LLP" },
  { value: "private_limited", label: "Private limited" },
  { value: "unregistered", label: "Not registered" },
] as const;

export const FSSAI_TYPES = [
  { value: "basic_registration", label: "Basic registration" },
  { value: "state_licence", label: "State licence" },
  { value: "central_licence", label: "Central licence" },
  { value: "deemed_street_vendor", label: "Deemed (Street Vendors Act 2014)" },
] as const;

/** True when the signed-in account can review every vendor on the platform. */
export function useIsPlatformAdmin() {
  return useQuery({
    queryKey: ["compliance", "is-admin"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc("is_platform_admin");
      if (error) return false;
      return Boolean(data);
    },
  });
}

/** The shop the signed-in vendor is onboarding (RLS already scopes this). */
export function useOnboardingShop() {
  return useQuery({
    queryKey: ["compliance", "shop"],
    queryFn: async (): Promise<Storefront | null> => {
      const { data, error } = await supabase
        .from("storefronts")
        .select("*")
        .is("archived_at", null)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveCompliance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: StorefrontUpdate }) => {
      const { error } = await supabase.from("storefronts").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance"] });
      qc.invalidateQueries({ queryKey: ["shop"] });
    },
  });
}

/** Creates the vendor's first shop record so the wizard has somewhere to save. */
export function useCreateOnboardingShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { brand_name: string; slug: string; phone: string | null }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const ownerId = userRes.user?.id;
      if (!ownerId) throw new Error("You must be signed in");
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const slug = attempt === 0 ? input.slug : `${input.slug}-${attempt + 1}`;
        const { data, error } = await supabase
          .from("storefronts")
          .insert({ ...input, slug, owner_id: ownerId, is_open: false, listing_status: "draft" })
          .select("*")
          .single();
        if (!error) return data;
        if (error.code !== "23505") throw error;
      }
      throw new Error(`The link "${input.slug}" is taken — pick a different kitchen name.`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance"] }),
  });
}

/* ---------------------------------- admin --------------------------------- */

export function useAdminStorefronts() {
  return useQuery({
    queryKey: ["compliance", "admin", "shops"],
    queryFn: async (): Promise<Storefront[]> => {
      const { data, error } = await supabase
        .from("storefronts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminUpdateShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: StorefrontUpdate }) => {
      const { error } = await supabase.from("storefronts").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance", "admin"] }),
  });
}

export interface AdminOrderRow {
  id: string;
  order_number: number;
  storefront_id: string | null;
  status: string;
  payment_status: string;
  payment_method: string | null;
  payment_reference: string | null;
  payment_app: string | null;
  payment_claimed_at: string | null;
  payment_confirmed_at: string | null;
  total: number;
  customer_name: string | null;
  created_at: string;
}

export function useAdminOrders() {
  return useQuery({
    queryKey: ["compliance", "admin", "orders"],
    queryFn: async (): Promise<AdminOrderRow[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, storefront_id, status, payment_status, payment_method, payment_reference, payment_app, payment_claimed_at, payment_confirmed_at, total, customer_name, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((o) => ({
        ...o,
        status: String(o.status),
        payment_status: String(o.payment_status),
        payment_method: o.payment_method ? String(o.payment_method) : null,
        total: Number(o.total),
      }));
    },
  });
}
