import { useQueries } from "@tanstack/react-query";
import { menuQuery, type Storefront } from "@/lib/storefront/queries";

/** Reuses the existing menu cache without changing kitchen discovery. */
export function useKitchenProducts(kitchens: Storefront[]) {
  const results = useQueries({ queries: kitchens.map((kitchen) => menuQuery(kitchen.slug)) });
  return {
    loading: results.some((result) => result.isPending),
    products: results.flatMap((result, index) => {
      const kitchen = kitchens[index];
      return kitchen ? (result.data ?? []).map((product) => ({ product, kitchen })) : [];
    }),
  };
}