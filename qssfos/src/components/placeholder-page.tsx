import type { LucideIcon } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  items?: string[];
}

export function PlaceholderPage({ title, description, icon: Icon, items }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
        <p className="text-sm text-muted-foreground">
          This module is scaffolded and ready. Wire it up when you're ready to ship.
        </p>
        {items && items.length > 0 && (
          <div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-3 text-left md:grid-cols-3">
            {items.map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground"
              >
                {i}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
