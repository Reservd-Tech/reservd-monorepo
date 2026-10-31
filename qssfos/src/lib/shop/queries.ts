import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Storefront = Database["public"]["Tables"]["storefronts"]["Row"];
export type StorefrontUpdate = Database["public"]["Tables"]["storefronts"]["Update"];
export type MenuCategory = Database["public"]["Tables"]["categories"]["Row"];
export type MenuProduct = Database["public"]["Tables"]["products"]["Row"];

export const shopKeys = {
  myShop: ["shop", "mine"] as const,
  myShops: ["shop", "mine", "all"] as const,
  categories: (sid?: string) => ["shop", "categories", sid ?? "none"] as const,
  products: (sid?: string) => ["shop", "products", sid ?? "none"] as const,
};

/** The storefront owned by the signed-in vendor (RLS already scopes it). */
export function useMyStorefront() {
  return useQuery({
    queryKey: shopKeys.myShop,
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

/** Every storefront the signed-in vendor owns. */
export function useMyStorefronts() {
  return useQuery({
    queryKey: shopKeys.myShops,
    queryFn: async (): Promise<Storefront[]> => {
      const { data, error } = await supabase
        .from("storefronts")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function useCreateStorefront() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      brand_name: string;
      slug: string;
      tagline?: string | null;
      description?: string | null;
      address?: string | null;
      phone?: string | null;
      opening_hours?: string | null;
      upi_id?: string | null;
      upi_payee_name?: string | null;
      logo_url?: string | null;
      cover_url?: string | null;
      upi_qr_url?: string | null;
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const ownerId = userRes.user?.id;
      if (!ownerId) throw new Error("You must be signed in");

      // Slugs are unique across every vendor, including shops you cannot see.
      // Quietly try a numbered suffix instead of failing with "already exists".
      const base = input.slug;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
        const { data, error } = await supabase
          .from("storefronts")
          // Stays hidden from customers until the onboarding checklist is complete.
          .insert({ ...input, slug, owner_id: ownerId, is_open: false })
          .select("*")
          .single();
        if (!error) return data;
        if (error.code !== "23505") throw error;
      }
      throw new Error(
        `The shop link "${base}" is taken by another vendor — pick a different link.`,
      );
    },

    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop"] }),
  });
}

/** Archive (soft-delete) or restore a shop — keeps orders and menu intact. */
export function useArchiveStorefront() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase
        .from("storefronts")
        .update({ archived_at: archived ? new Date().toISOString() : null, ...(archived ? { is_open: false } : {}) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop"] }),
  });
}

/** Permanently delete a shop — refused when it already has orders. */
export function useDeleteStorefront() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { count, error: countErr } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("storefront_id", id);
      if (countErr) throw countErr;
      if ((count ?? 0) > 0) {
        throw new Error(
          "This shop has orders in its history — archive it instead so the records stay intact.",
        );
      }
      await supabase.from("products").delete().eq("storefront_id", id);
      await supabase.from("categories").delete().eq("storefront_id", id);
      const { error } = await supabase.from("storefronts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop"] }),
  });
}

export function useUpdateStorefront() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: StorefrontUpdate }) => {
      const { error } = await supabase.from("storefronts").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop"] }),
  });
}

export function useShopCategories(storefrontId?: string) {
  return useQuery({
    queryKey: shopKeys.categories(storefrontId),
    enabled: Boolean(storefrontId),
    queryFn: async (): Promise<MenuCategory[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("storefront_id", storefrontId!)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useShopProducts(storefrontId?: string) {
  return useQuery({
    queryKey: shopKeys.products(storefrontId),
    enabled: Boolean(storefrontId),
    queryFn: async (): Promise<MenuProduct[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("storefront_id", storefrontId!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      storefront_id: string;
      name: string;
      sort_order: number;
    }): Promise<MenuCategory> => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Your session expired — sign in again to edit the menu.");

      if (input.id) {
        const { data, error } = await supabase
          .from("categories")
          .update({ name: input.name, sort_order: input.sort_order })
          .eq("id", input.id)
          .select("*")
          .maybeSingle();
        if (error) throw new Error(friendlyCategoryError(error));
        if (!data) throw new Error("That category no longer exists.");
        return data;
      }

      const { data, error } = await supabase
        .from("categories")
        .insert({
          storefront_id: input.storefront_id,
          name: input.name,
          sort_order: input.sort_order,
          created_by: userRes.user.id,
        })
        .select("*")
        .maybeSingle();
      if (error) throw new Error(friendlyCategoryError(error));
      if (!data) throw new Error("Category could not be saved — please try again.");
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop"] }),
  });
}

function friendlyCategoryError(error: { code?: string; message: string }) {
  if (error.code === "42501" || /row-level security/i.test(error.message)) {
    return "You can only add categories to a shop you own — reopen the shop profile and try again.";
  }
  if (error.code === "23503") {
    return "This shop no longer exists — refresh the page.";
  }
  return error.message;
}


export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop"] }),
  });
}

export function useSaveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      storefront_id: string;
      name: string;
      description: string | null;
      price: number;
      category_id: string | null;
      image_url: string | null;
      is_available: boolean;
    }) => {
      const { id, ...fields } = input;
      if (id) {
        const { error } = await supabase.from("products").update(fields).eq("id", id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("products").insert(fields);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop"] });
      qc.invalidateQueries({ queryKey: ["pos"] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop"] });
      qc.invalidateQueries({ queryKey: ["pos"] });
    },
  });
}
