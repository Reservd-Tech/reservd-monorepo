import { Button } from "@/components/ui/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ProductRail } from "@/components/ProductRail";
import { useKitchenProducts } from "@/hooks/use-kitchen-products";
import { cartSuggestions } from "@/lib/storefront/consumer-catalog";

import { money, nearbyStorefrontsQuery, TAX_RATE } from "@/lib/storefront/queries";
import { useCustomer } from "@/lib/customer";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — Reservd" },
      {
        name: "description",
        content: "Review your Fulki pani puri order, adjust quantities, and place it straight to the kitchen.",
      },
      { property: "og:title", content: "Your Cart — Reservd" },
      { property: "og:description", content: "Review and place your Fulki order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CartPage,
});

const SLUG_FALLBACK = "fulki";

function CartPage() {
  const navigate = useNavigate();
  const { cart, cartSubtotal, cartCount, setQuantity, clearCart, addToCart } = useCustomer();
  const { data: storefronts } = useQuery(nearbyStorefrontsQuery());
  const menuSlug = storefronts?.[0]?.slug ?? SLUG_FALLBACK;
  const { products: kitchenProducts } = useKitchenProducts(storefronts ?? []);
  // Resolve ownership by actual product IDs, never by the first open kitchen.
  const cartKitchens = new Set(kitchenProducts.filter(({ product }) => cart.some((line) => line.productId === product.id)).map(({ kitchen }) => kitchen.id));
  const cartKitchenId = cartKitchens.size === 1 ? [...cartKitchens][0] : undefined;
  const sameKitchen = kitchenProducts.filter(({ kitchen }) => kitchen.id === cartKitchenId);
  const suggestedIds = new Set(cartSuggestions(sameKitchen.map(({ product }) => product), cart).map((product) => product.id));
  const suggestions = sameKitchen.filter(({ product }) => suggestedIds.has(product.id));

  const tax = Math.round(cartSubtotal * TAX_RATE * 100) / 100;
  const total = Math.round((cartSubtotal + tax) * 100) / 100;

  return (
    <div className="min-h-screen px-5 pb-44 pt-6">
      <header className="flex items-center gap-3">
        <Link
          to="/menu/$slug"
          params={{ slug: menuSlug }}
          className="press glass-panel grid h-10 w-10 shrink-0 place-items-center rounded-full"
          aria-label="Back to menu"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="truncate text-2xl font-extrabold">Your cart</h1>
        {cart.length > 0 && (
          <Button
            onClick={clearCart}
            variant="ghost" className="press ml-auto rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-normal text-muted-foreground"
          >
            Clear
          </Button>
        )}
      </header>

      {cart.length === 0 ? (
        <div className="glass-panel mt-10 rounded-lg p-8 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" strokeWidth={1.6} />
          <p className="mt-4 text-sm text-muted-foreground">Your cart is empty.</p>
          <Link
            to="/menu/$slug"
            params={{ slug: menuSlug }}
            className="press mt-5 inline-block rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
          >
            Browse Fulki menu
          </Link>
        </div>
      ) : (
        <>
          <section className="mt-6 space-y-3">
            {cart.map((line) => (
              <div key={line.productId} className="lift border border-line flex items-center gap-3 rounded-lg bg-card p-3">
                {line.imageUrl && (
                  <img
                    src={line.imageUrl}
                    alt={line.name}
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    loading="lazy" decoding="async"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-bold">{line.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {money(line.price)} · {money(line.price * line.quantity)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 rounded-lg bg-accent p-1">
                  <Button
                    onClick={() => setQuantity(line.productId, line.quantity - 1)}
                    variant="ghost" size="icon" className="press grid h-9 w-9 place-items-center rounded-xl"
                    aria-label={`Decrease ${line.name} quantity`}
                  >
                    {line.quantity === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                  </Button>
                  <span className="w-6 text-center font-bold tabular-nums">{line.quantity}</span>
                  <Button
                    onClick={() => setQuantity(line.productId, line.quantity + 1)}
                    variant="ghost" size="icon" className="press grid h-9 w-9 place-items-center rounded-xl"
                    aria-label={`Increase ${line.name} quantity`}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </section>

          <section className="glass-panel mt-6 space-y-2 rounded-lg p-5 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Subtotal ({cartCount} item{cartCount > 1 ? "s" : ""})</span>
              <span className="font-semibold text-foreground">{money(cartSubtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Taxes</span>
              <span className="font-semibold text-foreground">{money(tax)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-3 text-lg font-extrabold">
              <span>Total</span>
              <span className="text-primary">{money(total)}</span>
            </div>
          </section>

          <ProductRail title="You might also like" items={suggestions} onAdd={(product) => {
            addToCart({ productId: product.id, name: product.name, price: Number(product.price), imageUrl: product.image_url }, 1);
            toast.success(`${product.name} added`);
          }} />

          <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              onClick={() => navigate({ to: "/checkout" })}
              className="press glow flex h-auto w-full items-center justify-between rounded-lg bg-primary px-5 py-4 text-primary-foreground"
            >
              <span className="text-base font-extrabold">{money(total)}</span>
              <span className="text-sm font-extrabold">Proceed to pay →</span>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
