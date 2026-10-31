import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ChevronRight,
  Clock,
  MapPin,
  Search,
  Bell,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import fulkiCover from "@/assets/fulki-cover.jpg";
import { Button } from "@/components/ui/button";
import { FoodSkeleton, OpenBadge } from "@/components/FoodPrimitives";
import { BrandLogo } from "@/components/BrandLogo";
import { ProductRail } from "@/components/ProductRail";
import { useKitchenProducts } from "@/hooks/use-kitchen-products";
import {
  nearbyStorefrontsQuery,
  statusLabel,
  type OrderStatus,
  type Storefront,
} from "@/lib/storefront/queries";
import { getCategoryNames } from "@/lib/storefront/catalog.functions";
import { getPublicOrder } from "@/lib/storefront/orders.functions";
import { useCustomer } from "@/lib/customer";
import { useNearby } from "@/hooks/use-nearby";
import { useSelectedLocation } from "@/hooks/use-selected-location";
import { LocationPicker } from "@/components/LocationPicker";
import { haversine, walkMinutes } from "@/lib/geo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reservd — Reserve your Fulki pani puri" },
      {
        name: "description",
        content:
          "Order fresh, hand-filled pani puri from Fulki. Pick dine in or takeaway, pay by UPI, and track your order live.",
      },
      { property: "og:title", content: "Reservd — Reserve your Fulki pani puri" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        property: "og:description",
        content: "Fresh pani puri from Fulki, ordered in seconds and tracked live.",
      },
    ],
  }),
  component: Home,
});

const WALK_RADIUS_M = 1500;

function Home() {
  const { profile, orderIds } = useCustomer();
  const { data: storefronts, isLoading } = useQuery(nearbyStorefrontsQuery());
  const deviceLocation = useNearby();
  const { coords, status, label: locationLabel, select: selectLocation } = useSelectedLocation(deviceLocation);
  const [noteDismissed, setNoteDismissed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");

  // Most recent order: if it's still active, the tracking banner replaces the search box.
  const latestOrderId = orderIds[0];
  const { data: latestOrder } = useQuery({
    queryKey: ["storefront", "order", latestOrderId],
    enabled: Boolean(latestOrderId),
    staleTime: 5_000,
    refetchInterval: 8_000,
    queryFn: async () =>
      latestOrderId ? await getPublicOrder({ data: { orderId: latestOrderId } }) : null,
  });
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      setDismissedIds(JSON.parse(localStorage.getItem("reservd:dismissed-orders") ?? "[]"));
    } catch {
      /* ignore */
    }
  }, []);
  const dismissOrder = (id: string) => {
    const next = [...dismissedIds.filter((d) => d !== id), id].slice(-30);
    setDismissedIds(next);
    localStorage.setItem("reservd:dismissed-orders", JSON.stringify(next));
  };
  const activeOrder =
    latestOrder &&
    latestOrder.status !== "completed" &&
    latestOrder.status !== "cancelled" &&
    !dismissedIds.includes(latestOrder.id)
      ? latestOrder
      : null;

  const trimmedSearch = search.trim().toLowerCase();
  const searching = trimmedSearch.length > 0;

  // Category names for every shown kitchen, so dish searches match a kitchen's menu.
  const { data: categoryNames } = useQuery({
    queryKey: ["storefront", "category-names"],
    enabled: searching,
    staleTime: 60_000,
    queryFn: async () => await getCategoryNames(),
  });

  const locationOff = status === "denied" || status === "unavailable";
  const filterActive = status === "ready" && coords && !showAll;

  const withDistance = (storefronts ?? []).map((s) => {
    const metres =
      coords && s.latitude != null && s.longitude != null
        ? haversine(coords.latitude, coords.longitude, s.latitude, s.longitude)
        : null;
    return { storefront: s, metres };
  });

  const near = filterActive
    ? withDistance
        .filter((w) => w.metres != null && w.metres <= WALK_RADIUS_M)
        .sort((a, b) => (a.metres ?? 0) - (b.metres ?? 0))
    : withDistance.filter((w) => w.metres != null).sort((a, b) => (a.metres ?? 0) - (b.metres ?? 0));

  const noCoords = filterActive ? withDistance.filter((w) => w.metres == null) : [];

  const distanceList = filterActive ? near : withDistance;

  // Live search filter on top of the distance-based list: matches kitchen name,
  // tagline, or any of its menu category names.
  const matchesSearch = (s: Storefront) => {
    if (!searching) return true;
    if (s.brand_name.toLowerCase().includes(trimmedSearch)) return true;
    if (s.tagline?.toLowerCase().includes(trimmedSearch)) return true;
    return (categoryNames ?? []).some(
      (c) => c.storefront_id === s.id && c.name.toLowerCase().includes(trimmedSearch),
    );
  };

  const displayList = distanceList.filter((w) => matchesSearch(w.storefront));
  const displayNoCoords = noCoords.filter((w) => matchesSearch(w.storefront));

  const nothingMatches = searching && displayList.length === 0 && displayNoCoords.length === 0;

  return (
    <div className="min-h-screen px-5 pb-36 pt-7">
      <header className="rise-in">
        <div className="mb-5 flex items-center justify-between">
          <BrandLogo className="w-36" />
          <Button asChild variant="outline" size="icon" className="h-11 w-11 rounded-full bg-card"><Link to="/orders" aria-label="Your order updates"><Bell className="h-5 w-5" /></Link></Button>
        </div>
        <LocationPicker label={locationLabel} coords={coords} onSelect={selectLocation} />
        <p className="text-sm font-medium text-muted-foreground">
          {profile.name ? `Welcome back, ${profile.name.split(" ")[0]}` : "Welcome to Reservd"}
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight">
          Kitchens <span className="heat-text">near you</span>
        </h1>
      </header>

      <section className="mt-6">
        {activeOrder ? (
          <div className="rise-in glass-panel flex items-center gap-2 rounded-lg p-4 pl-5">
            <Link
              to="/order/$orderId"
              params={{ orderId: activeOrder.id }}
              className="press flex min-w-0 flex-1 items-center gap-4"
            >
              <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
                <Truck className="h-6 w-6" />
                <span className="pulse-ring absolute inset-0 rounded-2xl" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold">Track your order</span>
                <span className="block truncate text-xs font-medium text-muted-foreground">
                  {activeOrder.storefronts?.brand_name ?? "Your kitchen"} ·{" "}
                  {statusLabel(activeOrder.status as OrderStatus)}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Link>
            <Button
              type="button"
              aria-label="Dismiss order banner"
              onClick={() => dismissOrder(activeOrder.id)}
              variant="ghost" size="icon" className="press grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-accent-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="rise-in glass-panel flex items-center gap-3 rounded-lg p-3 pl-4">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search kitchens or dishes"
              aria-label="Search kitchens or dishes"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
            />
            {searching ? (
              <Button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
                variant="ghost" size="icon" className="press grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-accent-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        )}
      </section>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
        <Button variant="chip" data-active={!searching} onClick={() => setSearch("")} className="h-9 shrink-0 px-4">All kitchens</Button>
        {searching && <span className="flex h-9 items-center rounded-full bg-accent px-4 text-xs font-semibold text-accent-foreground">Search results</span>}
      </div>
      <section className="mt-7">
        {displayList.length > 0 || displayNoCoords.length === 0 ? (
          <h2 className="mb-3 text-xs font-bold uppercase tracking-normal text-muted-foreground">
            Available now
          </h2>
        ) : null}

        {locationOff && !noteDismissed ? (
          <div className="glass-panel mb-4 flex items-center gap-3 rounded-2xl p-3 pl-4 text-xs font-medium text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <span className="flex-1">Turn on location to see kitchens within walking distance.</span>
            <Button
              type="button"
              aria-label="Dismiss"
              onClick={() => setNoteDismissed(true)}
              variant="ghost" size="icon" className="press grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-accent-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}

        {isLoading || status === "asking" ? (
          <div className="space-y-4">
            <FoodSkeleton />
            <FoodSkeleton />
          </div>
        ) : !storefronts || storefronts.length === 0 ? (
          <div className="glass-panel rounded-lg p-6 text-sm text-muted-foreground">
            No kitchens are online yet. Please check back soon.
          </div>
        ) : nothingMatches ? (
          <div className="glass-panel rise-in rounded-lg p-6 text-center text-sm font-medium text-muted-foreground">
            No kitchens or dishes match “{search.trim()}”.
          </div>
        ) : displayList.length === 0 && displayNoCoords.length === 0 ? (
          <div className="glass-panel rise-in rounded-lg p-6 text-center">
            <p className="text-sm font-medium">No kitchens within a 15 minute walk right now</p>
            <Button
              type="button"
              onClick={() => setShowAll(true)}
              className="press mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              Show all open kitchens
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {displayList.map(({ storefront, metres }, index) => (
              <KitchenCard key={storefront.id} storefront={storefront} metres={metres} priority={index === 0} />
            ))}
          </div>
        )}

        {displayNoCoords.length > 0 ? (
          <div className="mt-8">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-normal text-muted-foreground">
              Also open
            </h2>
            <div className="space-y-4">
              {displayNoCoords.map(({ storefront }) => (
                <KitchenCard key={storefront.id} storefront={storefront} metres={null} />
              ))}
            </div>
          </div>
        ) : null}
      </section>
      <TopPicks kitchens={storefronts ?? []} />
    </div>
  );
}

function TopPicks({ kitchens }: { kitchens: Storefront[] }) {
  const { products } = useKitchenProducts(kitchens);
  return <ProductRail title="Top Picks" items={products.filter(({ product }) => product.is_available)} />;
}

function formatDistance(metres: number) {
  return metres >= 1000 ? `${(metres / 1000).toFixed(1)}km` : `${Math.round(metres)}m`;
}

function KitchenCard({ storefront, metres, priority = false }: { storefront: Storefront; metres: number | null; priority?: boolean }) {
  return (
    <Link
      to="/menu/$slug"
      params={{ slug: storefront.slug }}
      className="press lift rise-in block overflow-hidden rounded-lg bg-card"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={storefront.cover_url ?? storefront.logo_url ?? fulkiCover}
          alt={`${storefront.brand_name} storefront`}
          className="h-full w-full object-cover"
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onError={(event) => {
            event.currentTarget.src = fulkiCover;
          }}
        />
        <div className="absolute left-4 top-4"><OpenBadge open={storefront.is_open} /></div>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {storefront.logo_url ? (
              <img
                src={storefront.logo_url}
                alt={`${storefront.brand_name} logo`}
                className="h-11 w-11 shrink-0 rounded-md object-cover"
                loading="lazy" decoding="async"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            <h3 className="break-words text-xl font-extrabold">{storefront.brand_name}</h3>
          </div>

        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {storefront.tagline}
        </p>
        <div className="mt-4 flex items-center justify-between">
          {metres != null ? (
            <span className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {walkMinutes(metres)} min walk · {formatDistance(metres)}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Clock className="h-4 w-4" /> Ready in ~10 min
            </span>
          )}
          <span className="flex items-center gap-1 text-sm font-bold text-primary">
            View menu <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
