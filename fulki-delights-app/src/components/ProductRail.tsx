import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import fulkiCover from "@/assets/fulki-cover.jpg";
import { Button } from "@/components/ui/button";
import { money, type MenuProduct, type Storefront } from "@/lib/storefront/queries";

export function ProductRail({ title, items, onAdd }: {
  title: string;
  items: { product: MenuProduct; kitchen: Storefront }[];
  onAdd?: (product: MenuProduct) => void;
}) {
  if (!items.length) return null;
  return (
    <section className="mt-8" aria-label={title}>
      <h2 className="mb-3 text-xl font-extrabold">{title}</h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-3">
        {items.map(({ product, kitchen }) => (
          <article key={`${kitchen.id}-${product.id}`} className="w-40 shrink-0 overflow-hidden rounded-lg border border-line bg-card shadow-food">
            <Link to="/menu/$slug" params={{ slug: kitchen.slug }} className="block">
              <img src={product.image_url ?? fulkiCover} alt={product.name} loading="lazy" decoding="async"
                className="aspect-square w-full object-cover"
                onError={(event) => { event.currentTarget.src = fulkiCover; }} />
              <div className="px-3 pt-3">
                <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5">{product.name}</h3>
                <p className="mt-1 truncate text-xs text-muted-foreground">{kitchen.brand_name}</p>
              </div>
            </Link>
            <div className="flex items-center justify-between gap-2 p-3">
              <span className="text-sm font-extrabold">{money(Number(product.price))}</span>
              {onAdd && <Button size="icon" variant="outline" aria-label={`Add ${product.name}`} onClick={() => onAdd(product)}><Plus /></Button>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}