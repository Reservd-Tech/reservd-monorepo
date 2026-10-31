# Consumer app: instant menu updates

The vendor OS now broadcasts live changes for `products`, `categories` and `storefronts`
(added to the realtime publication with `REPLICA IDENTITY FULL`). Public read rules already
allow the anon key to see open, non-archived shops, available products and their categories.

Paste the two pieces below into the consumer app.

## 1. Realtime subscription + focus refetch hook

```tsx
// src/hooks/useLiveMenu.ts (consumer app)
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const API = import.meta.env.VITE_VENDOR_API_URL; // e.g. https://qssfos.lovable.app
const API_KEY = import.meta.env.VITE_CONSUMER_API_KEY;

async function fetchJson(path: string) {
  const res = await fetch(`${API}${path}`, {
    headers: { "x-api-key": API_KEY },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function useLiveMenu(slug: string) {
  const qc = useQueryClient();

  const menu = useQuery({
    queryKey: ["public-menu", slug],
    queryFn: () => fetchJson(`/api/public/menu?slug=${encodeURIComponent(slug)}`),
    staleTime: 0,
    refetchOnWindowFocus: true,   // refetch when the tab/screen regains focus
    refetchOnMount: "always",     // refetch when the screen opens
    refetchOnReconnect: true,
  });

  const storefrontId = menu.data?.storefront?.id as string | undefined;

  // Refetch on app resume (mobile / bfcache) as well as browser focus.
  useEffect(() => {
    const refetch = () => {
      if (document.visibilityState === "visible") {
        qc.invalidateQueries({ queryKey: ["public-menu", slug] });
        qc.invalidateQueries({ queryKey: ["public-storefronts"] });
      }
    };
    document.addEventListener("visibilitychange", refetch);
    window.addEventListener("focus", refetch);
    window.addEventListener("pageshow", refetch);
    return () => {
      document.removeEventListener("visibilitychange", refetch);
      window.removeEventListener("focus", refetch);
      window.removeEventListener("pageshow", refetch);
    };
  }, [qc, slug]);

  // Live push updates: any menu/category/shop change refetches immediately.
  useEffect(() => {
    if (!storefrontId) return;
    const filter = `storefront_id=eq.${storefrontId}`;
    const channel = supabase
      .channel(`menu:${storefrontId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "products", filter }, () =>
        qc.invalidateQueries({ queryKey: ["public-menu", slug] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "categories", filter }, () =>
        qc.invalidateQueries({ queryKey: ["public-menu", slug] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "storefronts", filter: `id=eq.${storefrontId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["public-menu", slug] });
          qc.invalidateQueries({ queryKey: ["public-storefronts"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, slug, storefrontId]);

  return menu;
}
```

## 2. Storefront list query

```tsx
export function useStorefronts() {
  return useQuery({
    queryKey: ["public-storefronts"],
    queryFn: () => fetchJson("/api/public/storefronts"),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
```

Notes

- Subscribe with the **anon/publishable** key only; RLS filters what the socket delivers.
- Both endpoints already return `cache-control: no-store`, so no CDN/browser cache delay.
- The realtime event is only a signal — always re-read through the public API so pricing,
  availability and hours stay consistent with server rules.
