import type { CartLine } from "@/lib/customer";
import type { MenuProduct } from "@/lib/storefront/queries";

export function filterDiet(products: MenuProduct[], vegOnly: boolean) {
  return products.filter((p) => p.is_available && (!vegOnly || p.is_veg === true));
}

export function cartSuggestions(products: MenuProduct[], cart: Pick<CartLine, "productId">[]) {
  const ids = new Set(cart.map((line) => line.productId));
  return products.filter((p) => p.is_available && !ids.has(p.id));
}

export type ReorderItem = {
  product_id?: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
};

export function prepareReorder(items: ReorderItem[], products: MenuProduct[]) {
  const current = new Map(products.filter((p) => p.is_available).map((p) => [p.id, p]));
  const lines: CartLine[] = [];
  const skipped: string[] = [];
  for (const item of items) {
    const product = item.product_id ? current.get(item.product_id) : undefined;
    if (!product) {
      skipped.push(item.product_name);
      continue;
    }
    lines.push({
      productId: product.id,
      name: item.product_name,
      price: Number(item.unit_price),
      quantity: item.quantity,
      imageUrl: product.image_url,
    });
  }
  return { lines, skipped };
}