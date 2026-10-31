import {
  useMyStorefront,
  useMyStorefronts,
  useShopCategories,
  useShopProducts,
  type Storefront,
} from "@/lib/shop/queries";

export interface ReadinessStep {
  id: string;
  label: string;
  hint: string;
  done: boolean;
  /** Where the vendor fixes it */
  to: "/shop" | "/menu";
}

export interface Readiness {
  shop: Storefront | null | undefined;
  isLoading: boolean;
  steps: ReadinessStep[];
  completed: number;
  total: number;
  ready: boolean;
  isLive: boolean;
}

/**
 * Everything a vendor must finish before a shop can accept live orders.
 * Pass a shop id to check that specific shop (each shop has its own checklist).
 */
export function useShopReadiness(shopId?: string): Readiness {
  const { data: fallbackShop, isLoading: loadingFallback } = useMyStorefront();
  const { data: allShops = [], isLoading: loadingAll } = useMyStorefronts();
  const shop = shopId ? allShops.find((s) => s.id === shopId) ?? null : fallbackShop;
  const isLoading = shopId ? loadingAll : loadingFallback;
  const { data: categories = [] } = useShopCategories(shop?.id);
  const { data: products = [] } = useShopProducts(shop?.id);

  const available = products.filter((p) => p.is_available && Number(p.price) > 0);
  const withPhotos = products.filter((p) => Boolean(p.image_url));

  const steps: ReadinessStep[] = [
    {
      id: "profile",
      label: "Create your shop profile",
      hint: "Shop name and customer link",
      done: Boolean(shop?.brand_name && shop?.slug),
      to: "/shop",
    },
    {
      id: "photos",
      label: "Add logo and shop photo",
      hint: "Customers trust stalls they can see",
      done: Boolean(shop?.logo_url && shop?.cover_url),
      to: "/shop",
    },
    {
      id: "details",
      label: "Add contact and hours",
      hint: "Phone, address and opening hours",
      done: Boolean(shop?.phone && shop?.address && shop?.opening_hours),
      to: "/shop",
    },
    {
      id: "payout",
      label: "Set up UPI payouts",
      hint: "UPI ID and payee name for QR payments",
      done: Boolean(shop?.upi_id && shop?.upi_payee_name),
      to: "/shop",
    },
    {
      id: "categories",
      label: "Create at least one category",
      hint: "Group your menu, e.g. Signature specials",
      done: categories.length > 0,
      to: "/menu",
    },
    {
      id: "items",
      label: "Add 3 available menu items",
      hint: `${available.length} of 3 priced and visible`,
      done: available.length >= 3,
      to: "/menu",
    },
    {
      id: "item-photos",
      label: "Add photos to your items",
      hint: `${withPhotos.length} of ${products.length || 3} items have a photo`,
      done: products.length > 0 && withPhotos.length === products.length,
      to: "/menu",
    },
  ];

  const completed = steps.filter((s) => s.done).length;

  return {
    shop,
    isLoading,
    steps,
    completed,
    total: steps.length,
    ready: completed === steps.length,
    isLive: Boolean(shop?.is_open),
  };
}
