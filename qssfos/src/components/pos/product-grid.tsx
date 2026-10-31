import { useMemo, useState } from "react";
import { Search, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCategories, useProducts } from "@/lib/pos/queries";
import { formatINR } from "@/lib/pos/format";
import type { Product } from "@/lib/pos/types";

interface Props {
  onAdd: (p: Product) => void;
}

export function ProductGrid({ onAdd }: Props) {
  const { data: categories = [], isLoading: catsLoading } = useCategories();
  const { data: products = [], isLoading: prodLoading } = useProducts();
  const [activeCat, setActiveCat] = useState<string | "all">("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCat !== "all" && p.category_id !== activeCat) return false;
      if (term && !p.name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [products, activeCat, q]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search menu…"
          className="h-11 pl-10"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <CategoryChip active={activeCat === "all"} onClick={() => setActiveCat("all")}>
          All
        </CategoryChip>
        {catsLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-full" />
            ))
          : categories.map((c) => (
              <CategoryChip
                key={c.id}
                active={activeCat === c.id}
                onClick={() => setActiveCat(c.id)}
              >
                {c.name}
              </CategoryChip>
            ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto pr-1">
        {prodLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} onClick={() => p.is_available && onAdd(p)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-9 rounded-full border px-4 text-sm font-medium transition-all",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const disabled = !product.is_available;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-left transition-all",
        !disabled && "hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg active:translate-y-0",
        disabled && "opacity-50",
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-primary/15 via-accent/20 to-background">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <UtensilsCrossed className="h-8 w-8 text-primary/60" />
          </div>
        )}
        {disabled && (
          <div className="absolute inset-0 grid place-items-center bg-background/70">
            <Badge variant="destructive">Unavailable</Badge>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="line-clamp-1 text-sm font-semibold">{product.name}</div>
        <div className="text-base font-bold text-primary">{formatINR(Number(product.price))}</div>
      </div>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="grid h-full min-h-[240px] place-items-center rounded-2xl border border-dashed border-border p-8 text-center">
      <div>
        <UtensilsCrossed className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">No products match</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Try clearing search or a different category.
        </p>
      </div>
    </div>
  );
}
