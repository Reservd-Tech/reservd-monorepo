import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Home, ReceiptText, ShoppingBag, User } from "lucide-react";

import { useCustomer } from "@/lib/customer";
import { money } from "@/lib/storefront/queries";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/cart", label: "Cart", icon: ShoppingBag },
  { to: "/orders", label: "Orders", icon: ReceiptText },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const { cartCount, cartSubtotal } = useCustomer();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Cart and checkout have their own fixed action bars; the nav would sit on top of them.
  if (pathname.startsWith("/checkout") || pathname.startsWith("/cart")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {cartCount > 0 && (
        <Link
          to="/cart"
          className="mb-2 flex items-center justify-between rounded-lg bg-primary px-4 py-3.5 text-primary-foreground shadow-food active:scale-[0.98] transition-transform"
        >
          <span className="flex items-center gap-2 text-sm font-bold">
            <ShoppingBag className="h-4 w-4" />
            {cartCount} item{cartCount > 1 ? "s" : ""} · {money(cartSubtotal)}
          </span>
          <span className="flex items-center gap-1 text-sm font-extrabold">
            View cart <ChevronRight className="h-4 w-4" />
          </span>
        </Link>
      )}
      <div className="grid grid-cols-4 rounded-lg border border-line bg-card p-1.5 shadow-food">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="press group relative flex flex-col items-center gap-1 rounded-lg py-2.5 text-muted-foreground data-[status=active]:bg-accent data-[status=active]:text-primary"
          >
            <span className="relative">
              <Icon className="h-5 w-5" strokeWidth={2.2} />
              {to === "/cart" && cartCount > 0 && (
                <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </span>
            <span className="text-[11px] font-semibold tracking-normal">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
