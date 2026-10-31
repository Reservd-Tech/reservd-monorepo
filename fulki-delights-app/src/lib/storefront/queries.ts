import { queryOptions } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";
import { getMenu, getStorefronts } from "@/lib/storefront/catalog.functions";

export type Storefront = {
  id: string;
  slug: string;
  brand_name: string;
  tagline: string | null;
  logo_url: string | null;
  cover_url: string | null;
  latitude: number | null;
  longitude: number | null;
  is_open: boolean;
  archived_at: string | null;
};
export type MenuCategory = { id: string; name: string; sort_order: number };
export type MenuProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
  is_available: boolean;
  is_veg?: boolean | null;
  avg_rating?: number | string | null;
  rating_count?: number | null;
};
export type OrderStatus = Database["public"]["Enums"]["order_status"];

export const TAX_RATE = 0.05;

export const sfKeys = {
  storefronts: ["storefront", "list"] as const,
  storefront: (slug: string) => ["storefront", slug] as const,
  menu: (slug: string) => ["storefront", "menu", slug] as const,
  order: (id: string) => ["storefront", "order", id] as const,
  myOrders: (ids: string[]) => ["storefront", "my-orders", ids.join(",")] as const,
};

function normalize(s: Record<string, unknown>): Storefront {
  return {
    id: String(s["id"]),
    slug: String(s["slug"]),
    brand_name: String(s["brand_name"]),
    tagline: (s["tagline"] as string | null) ?? null,
    logo_url: (s["logo_url"] as string | null) ?? null,
    cover_url: (s["cover_url"] as string | null) ?? null,
    latitude: (s["latitude"] as number | null) ?? null,
    longitude: (s["longitude"] as number | null) ?? null,
    is_open: Boolean(s["is_open"]),
    archived_at: (s["archived_at"] as string | null) ?? null,
  };
}

/** All open, non-archived kitchens, sorted alphabetically. */
export const nearbyStorefrontsQuery = () =>
  queryOptions({
    queryKey: sfKeys.storefronts,
    staleTime: 5_000,
    refetchOnMount: "always" as const,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Storefront[]> => {
      const list = await getStorefronts();
      return (list ?? [])
        .map((s) => normalize(s as unknown as Record<string, unknown>))
        .sort((a, b) => a.brand_name.localeCompare(b.brand_name));
    },
  });

const menuBundleQuery = (slug: string | undefined) =>
  queryOptions({
    queryKey: sfKeys.menu(slug ?? "none"),
    enabled: Boolean(slug),
    staleTime: 5_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!slug) return null;
      return await getMenu({ data: { slug } });
    },
  });

export const storefrontQuery = (slug: string) =>
  queryOptions({
    ...menuBundleQuery(slug),
    select: (data): Storefront | null =>
      data?.storefront ? normalize(data.storefront as unknown as Record<string, unknown>) : null,
  });

export const menuQuery = (slug: string | undefined) =>
  queryOptions({
    ...menuBundleQuery(slug),
    select: (data): MenuProduct[] =>
      ((data?.products ?? []) as MenuProduct[]).filter((p) => p.is_available),
  });

export function orderCode(orderNumber: number, brandName?: string | null) {
  const prefix = (brandName ?? "ORD").replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "ORD";
  return `${prefix}-${String(orderNumber).padStart(4, "0")}`;
}

export const STATUS_FLOW: { key: OrderStatus; label: string }[] = [
  { key: "pending", label: "Received" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "completed", label: "Completed" },
];

export function statusLabel(status: OrderStatus) {
  return STATUS_FLOW.find((s) => s.key === status)?.label ?? "Cancelled";
}

export function money(value: number) {
  return `₹${value.toFixed(2)}`;
}
export const categoriesQuery = (slug: string | undefined) =>
  queryOptions({
    ...menuBundleQuery(slug),
    select: (data): MenuCategory[] =>
      [...((data?.categories ?? []) as MenuCategory[])].sort((a, b) => a.sort_order - b.sort_order),
  });
