import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, List as ListIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DietBadge, QuantityControl, FoodSkeleton, RatingPill } from "@/components/FoodPrimitives";
import { Switch } from "@/components/ui/switch";
import { filterDiet } from "@/lib/storefront/consumer-catalog";
import { ratingSummary, sortTopRated } from "@/lib/storefront/ratings";


import fulkiCover from "@/assets/fulki-cover.jpg";
import {
  categoriesQuery,
  menuQuery,
  money,
  storefrontQuery,
  type MenuProduct,
} from "@/lib/storefront/queries";
import { useCustomer } from "@/lib/customer";


export const Route = createFileRoute("/menu/$slug")({
  head: () => ({
    meta: [
      { title: "Fulki Menu — Pani Puri | Reservd" },
      {
        name: "description",
        content: "Browse the Fulki menu: classic pani puri and more, ready in about ten minutes.",
      },
      { property: "og:title", content: "Fulki Menu — Pani Puri" },
      { property: "og:description", content: "Classic pani puri, hand-filled to order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MenuPage,
});

function MenuPage() {
  const { slug } = Route.useParams();

  const { data: storefront, isLoading: sfLoading } = useQuery(storefrontQuery(slug));
  const { data: products, isLoading } = useQuery(menuQuery(slug));
  const { data: categories } = useQuery(categoriesQuery(slug));

  const [activeCat, setActiveCat] = useState<string>("all");
  const [vegOnly, setVegOnly] = useState(false);
  const [topRated, setTopRated] = useState(false);
  const filteredProducts = filterDiet(products ?? [], vegOnly);
  const dietaryProducts = topRated ? sortTopRated(filteredProducts) : filteredProducts;

  const usedCats = (categories ?? []).filter((c) =>
    dietaryProducts.some((p) => p.category_id === c.id),
  );
  const visible = dietaryProducts.filter(
    (p) => activeCat === "all" || p.category_id === activeCat,
  );
  const { cartCount } = useCustomer();
  const sections: Section[] = usedCats.map((c) => ({
    id: c.id,
    name: c.name,
    items: dietaryProducts.filter((p) => p.category_id === c.id),
  }));
  const knownIds = new Set(usedCats.map((c) => c.id));
  const uncategorised = dietaryProducts.filter(
    (p) => !p.category_id || !knownIds.has(p.category_id),
  );
  if (uncategorised.length)
    sections.push({ id: "other", name: sections.length ? "More" : "Menu", items: uncategorised });


  return (
    <div className="min-h-screen pb-40">
      <div className="relative h-56">
        <img
          src={storefront?.cover_url ?? storefront?.logo_url ?? fulkiCover}
          alt={storefront ? `${storefront.brand_name} storefront` : "Restaurant cover"}
          className="h-full w-full object-cover"
          loading="eager" decoding="async" fetchPriority="high"
          onError={(event) => {
            event.currentTarget.src = fulkiCover;
          }}
        />
        
        <Link
          to="/"
          className="press glass-panel absolute left-4 top-5 grid h-10 w-10 place-items-center rounded-full"
          aria-label="Back to home"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <Card className="absolute inset-x-5 -bottom-10 flex items-center gap-3 p-5">
          {storefront?.logo_url ? (
            <img
              src={storefront.logo_url}
              alt={`${storefront.brand_name} logo`}
              className="h-16 w-16 shrink-0 rounded-lg border-4 border-card object-cover shadow-food" decoding="async"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-extrabold">{storefront?.brand_name ?? "Menu"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {storefront?.tagline ?? (sfLoading ? "Loading…" : "Fresh, made to order")}
            </p>
          </div>
        </Card>
      </div>

      {usedCats.length > 0 && (
        <div className="sticky top-0 z-30 mt-14 border-b border-line bg-background">
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 py-3">
            {[{ id: "all", name: "All" }, ...usedCats].map((cat) => (
              <Button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCat(cat.id);
                  window.scrollTo({ top: 200, behavior: "smooth" });
                }}
                variant="chip" data-active={activeCat === cat.id}
                className="h-10 shrink-0 px-4 text-sm font-bold"
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="px-5 pt-2">
        <div className="my-3 flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Menu sorting" className="flex gap-2">
            <Button variant="chip" data-active={!topRated} aria-pressed={!topRated} onClick={() => setTopRated(false)} className="h-10 px-3 text-xs">Menu order</Button>
            <Button variant="chip" data-active={topRated} aria-pressed={topRated} onClick={() => setTopRated(true)} className="h-10 px-3 text-xs">Top rated</Button>
          </div>
        <label className="flex items-center justify-end gap-2 text-sm font-semibold">
          <span>Veg only</span>
          <Switch checked={vegOnly} onCheckedChange={(checked) => { setVegOnly(checked); setActiveCat("all"); }} aria-label="Veg only" />
        </label>
        </div>
        {isLoading || sfLoading ? (
          [0, 1].map((i) => <div key={i} className="my-4"><FoodSkeleton menu /></div>)
        ) : visible.length === 0 ? (
          <p className="pt-4 text-sm text-muted-foreground">Nothing on the menu right now.</p>
        ) : activeCat !== "all" || topRated ? (
          <div className="stagger divide-y divide-border">
            {visible.map((product) => <MenuItem key={product.id} product={product} />)}
          </div>
        ) : (
          <>
            {sections.map((sec) => (
              <section
                key={sec.id}
                id={`cat-${sec.id}`}
                className="scroll-mt-20"
                aria-labelledby={`cat-h-${sec.id}`}
              >
                <h2 id={`cat-h-${sec.id}`} className="pt-5 text-lg font-extrabold">
                  {sec.name}
                  <span className="ml-2 text-sm font-semibold text-muted-foreground">
                    {sec.items.length}
                  </span>
                </h2>
                <div className="stagger divide-y divide-border">
                  {sec.items.map((product) => (
                    <MenuItem key={product.id} product={product} />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>

      {sections.length > 1 && (
        <MenuNavigator
          sections={sections}
          raised={cartCount > 0}
          onPick={(id) => {
            setActiveCat("all");
            requestAnimationFrame(() =>
              document
                .getElementById(`cat-${id}`)
                ?.scrollIntoView({ behavior: "smooth", block: "start" }),
            );
          }}
        />
      )}
    </div>
  );
}

type Section = { id: string; name: string; items: MenuProduct[] };

function MenuNavigator({
  sections,
  raised,
  onPick,
}: {
  sections: Section[];
  raised: boolean;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open && (
        <Button
          type="button"
          aria-label="Close menu navigator"
          variant="ghost"
          className="fixed inset-0 z-40 h-auto w-full rounded-none bg-foreground/20 hover:bg-foreground/20"
          onClick={() => setOpen(false)}
        />
      )}
      <div
        className={
          "pointer-events-none fixed inset-x-0 z-50 mx-auto flex max-w-md flex-col items-end px-4 " +
          (raised
            ? "bottom-[calc(10.5rem+env(safe-area-inset-bottom))]"
            : "bottom-[calc(6.5rem+env(safe-area-inset-bottom))]")
        }
      >
        {open && (
          <div
            id="menu-navigator"
            role="dialog"
            aria-label="Menu categories"
            className="pop-in pointer-events-auto mb-3 w-64 overflow-hidden rounded-lg border border-border bg-card shadow-food"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-extrabold">Menu</span>
              <Button
                variant="ghost" size="icon"
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ul className="max-h-[50vh] divide-y divide-border overflow-y-auto">
              {sections.map((sec) => (
                <li key={sec.id}>
                  <Button
                    type="button"
                    autoFocus={sec === sections[0]}
                    onClick={() => {
                      setOpen(false);
                      onPick(sec.id);
                    }}
                    variant="ghost" className="flex h-auto w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  >
                    <span className="truncate">{sec.name}</span>
                    <span className="ml-3 text-xs text-muted-foreground">{sec.items.length}</span>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="menu-navigator"
          className="press pointer-events-auto flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-extrabold text-background shadow-food"
        >
          {open ? <X className="h-4 w-4" /> : <ListIcon className="h-4 w-4" />}
          Menu
        </Button>
      </div>
    </>
  );
}

function MenuItem({ product }: { product: MenuProduct }) {
  const { addToCart, cart, setQuantity } = useCustomer();
  const inCart = cart.find((l) => l.productId === product.id)?.quantity ?? 0;
  const summary = ratingSummary(product);

  return (
    <article className="rise-in grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-5">
      <div className="min-w-0">
        <DietBadge isVeg={product.is_veg} />
        <h2 className="mt-1.5 text-base font-bold leading-snug">{product.name}</h2>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          {summary ? <><RatingPill rating={summary.average} /><span>({summary.count})</span></> : <span className="font-semibold">New</span>}
        </div>
        <p className="mt-1 font-extrabold">{money(Number(product.price))}</p>
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
          {product.description ?? "Made fresh to order."}
        </p>
      </div>
      <div className="relative w-[120px] shrink-0 pb-4">
        <img
          src={product.image_url ?? fulkiCover}
          alt={product.name}
          className="h-[120px] w-[120px] rounded-lg object-cover"
          loading="lazy" decoding="async"
        />
        <div className="absolute inset-x-1 bottom-0">
          <QuantityControl quantity={inCart} name={product.name}
            onAdd={() => {
              addToCart({ productId: product.id, name: product.name, price: Number(product.price), imageUrl: product.image_url }, 1);
              toast.success(`${product.name} added`);
            }}
            onDecrease={() => setQuantity(product.id, inCart - 1)}
            onIncrease={() => setQuantity(product.id, Math.min(20, inCart + 1))}
          />
        </div>
      </div>
    </article>
  );
}
