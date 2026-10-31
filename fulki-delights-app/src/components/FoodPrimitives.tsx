import { Minus, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function RatingPill({ rating }: { rating?: number | null }) {
  if (rating == null || !Number.isFinite(rating)) return null;
  return <Badge className="gap-1 rounded-full border-0 bg-success text-success-foreground"><Star className="h-3 w-3 fill-current" />{rating.toFixed(1)}</Badge>;
}
export function OpenBadge({ open }: { open: boolean }) {
  return <Badge variant="secondary" className="rounded-full border-0 bg-card px-3 py-1.5 text-xs font-extrabold text-primary shadow-food">{open ? "OPEN" : "CLOSED"}</Badge>;
}
export function OfferRibbon({ promo }: { promo?: string | null }) {
  return promo ? <Badge variant="secondary" className="rounded-r-md border-0 bg-secondary text-secondary-foreground">{promo}</Badge> : null;
}
export function DietBadge({ isVeg }: { isVeg: boolean | null | undefined }) {
  if (isVeg == null) return null;
  return <span title={isVeg ? "Veg" : "Non-veg"} aria-label={isVeg ? "Veg" : "Non-veg"} className={`grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border-[1.5px] ${isVeg ? "border-veg" : "border-non-veg"}`}><span className={`h-2 w-2 rounded-full ${isVeg ? "bg-veg" : "bg-non-veg"}`} /></span>;
}
export function QuantityControl({ quantity, name, onAdd, onDecrease, onIncrease }: {
  quantity: number; name: string; onAdd: () => void; onDecrease: () => void; onIncrease: () => void;
}) {
  if (!quantity) return <Button variant="add" onClick={onAdd} className="h-10 w-full">+ ADD</Button>;
  return <div className="flex h-10 w-full items-center justify-between rounded-md border border-primary bg-card text-primary shadow-food">
    <Button variant="ghost" size="icon" className="h-9 w-8 rounded-md" onClick={onDecrease} aria-label={`Decrease ${name} quantity`}><Minus /></Button>
    <span className="min-w-5 text-center text-sm font-extrabold tabular-nums">{quantity}</span>
    <Button variant="ghost" size="icon" className="h-9 w-8 rounded-md" onClick={onIncrease} aria-label={`Increase ${name} quantity`}><Plus /></Button>
  </div>;
}
export function FoodSkeleton({ menu = false }: { menu?: boolean }) {
  return <div aria-label="Loading" role="status" className={`overflow-hidden rounded-lg border border-line bg-card ${menu ? "flex h-40 items-center gap-4 p-5" : "h-72 shadow-food"}`}>
    <div className={menu ? "h-24 flex-1 rounded-md bg-muted" : "h-44 bg-muted"} />
    <div className={menu ? "h-28 w-28 rounded-md bg-muted" : "space-y-3 p-5"}>{!menu && <><div className="h-5 w-2/3 rounded bg-muted" /><div className="h-3 w-1/2 rounded bg-muted" /></>}</div>
  </div>;
}