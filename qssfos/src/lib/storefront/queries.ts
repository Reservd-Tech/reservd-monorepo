import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Storefront = Database["public"]["Tables"]["storefronts"]["Row"];
export type MenuCategory = Database["public"]["Tables"]["categories"]["Row"];
export type MenuProduct = Database["public"]["Tables"]["products"]["Row"];

export const TAX_RATE = 0.05;

export interface CartLine {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export const sfKeys = {
  storefronts: ["storefront", "list"] as const,
  storefront: (slug: string) => ["storefront", slug] as const,
  menu: (id: string) => ["storefront", "menu", id] as const,
  order: (id: string) => ["storefront", "order", id] as const,
};

export const storefrontsQuery = () =>
  queryOptions({
    queryKey: sfKeys.storefronts,
    queryFn: async (): Promise<Storefront[]> => {
      const { data, error } = await supabase
        .from("storefronts")
        .select("*")
        .eq("is_open", true)
        .order("brand_name");
      if (error) throw error;
      return data ?? [];
    },
  });

export const storefrontQuery = (slug: string) =>
  queryOptions({
    queryKey: sfKeys.storefront(slug),
    queryFn: async (): Promise<Storefront | null> => {
      const { data, error } = await supabase
        .from("storefronts")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const menuQuery = (storefrontId: string | undefined) =>
  queryOptions({
    queryKey: sfKeys.menu(storefrontId ?? "none"),
    enabled: Boolean(storefrontId),
    queryFn: async (): Promise<{ categories: MenuCategory[]; products: MenuProduct[] }> => {
      const [cats, prods] = await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .eq("storefront_id", storefrontId!)
          .order("sort_order")
          .order("name"),
        supabase
          .from("products")
          .select("*")
          .eq("storefront_id", storefrontId!)
          .eq("is_available", true)
          .order("name"),
      ]);
      if (cats.error) throw cats.error;
      if (prods.error) throw prods.error;
      return { categories: cats.data ?? [], products: prods.data ?? [] };
    },
  });

export function upiUri(opts: {
  upiId: string;
  payee: string;
  amount: number;
  note: string;
}) {
  const params = new URLSearchParams({
    pa: opts.upiId,
    pn: opts.payee,
    am: opts.amount.toFixed(2),
    cu: "INR",
    tn: opts.note,
  });
  return `upi://pay?${params.toString()}`;
}
