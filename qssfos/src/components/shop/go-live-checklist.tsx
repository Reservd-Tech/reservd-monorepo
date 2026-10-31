import { Link } from "@tanstack/react-router";
import { Check, Circle, Loader2, Radio, Rocket } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateStorefront } from "@/lib/shop/queries";
import { useShopReadiness } from "@/lib/shop/readiness";
import { cn } from "@/lib/utils";

/** Step-by-step onboarding checklist that gates going live. */
export function GoLiveChecklist({
  compact = false,
  shopId,
}: {
  compact?: boolean;
  shopId?: string;
}) {
  const { shop, isLoading, steps, completed, total, ready, isLive } = useShopReadiness(shopId);
  const update = useUpdateStorefront();

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const pct = Math.round((completed / total) * 100);

  async function toggleLive(next: boolean) {
    if (!shop) return;
    try {
      await update.mutateAsync({ id: shop.id, patch: { is_open: next } });
      toast.success(next ? "You're live — customers can order now" : "Shop paused");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (compact && ready && isLive) return null;

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl",
              isLive ? "bg-emerald-500/15" : "bg-primary/10",
            )}
          >
            {isLive ? (
              <Radio className="h-5 w-5 text-emerald-500" />
            ) : (
              <Rocket className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <h2 className="font-semibold tracking-tight">
              {isLive ? "Your shop is live" : "Get ready to go live"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {completed} of {total} steps complete
              {!ready ? " — finish everything to start taking orders" : ""}
            </p>
          </div>
        </div>

        {isLive ? (
          <Button variant="outline" onClick={() => toggleLive(false)} disabled={update.isPending}>
            {update.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Pause orders
          </Button>
        ) : (
          <Button onClick={() => toggleLive(true)} disabled={!ready || update.isPending}>
            {update.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {ready ? "Go live" : `${total - completed} step${total - completed === 1 ? "" : "s"} left`}
          </Button>
        )}
      </div>

      <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ol className="mt-5 space-y-1">
        {steps.map((s, i) => (
          <li
            key={s.id}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/40"
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                s.done
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-500"
                  : "border-border text-muted-foreground",
              )}
            >
              {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate text-sm font-medium",
                  s.done && "text-muted-foreground line-through",
                )}
              >
                {s.label}
              </p>
              <p className="truncate text-xs text-muted-foreground">{s.hint}</p>
            </div>
            {s.done ? (
              <Badge variant="outline" className="hidden sm:inline-flex">
                Done
              </Badge>
            ) : (
              <Button size="sm" variant="ghost" asChild>
                <Link to={s.to}>Fix</Link>
              </Button>
            )}
          </li>
        ))}
      </ol>

      {!ready ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Circle className="h-3 w-3" />
          Your shop stays hidden from customers until every step is complete.
        </p>
      ) : null}
    </section>
  );
}
