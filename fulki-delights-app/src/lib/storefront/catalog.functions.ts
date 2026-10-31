import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Open kitchens, straight from the vendor app. */
export const getStorefronts = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchStreetOsStorefronts } = await import("@/lib/streetos/client.server");
  const list = await fetchStreetOsStorefronts();
  return list.filter((s) => s.is_open && !s.archived_at);
});

/** Category names per storefront, used for home-screen search matching. */
export const getCategoryNames = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchStreetOsStorefronts, fetchStreetOsMenu } = await import(
    "@/lib/streetos/client.server"
  );
  const storefronts = await fetchStreetOsStorefronts();
  const open = storefronts.filter((s) => s.is_open && !s.archived_at);
  const results: { storefront_id: string; name: string }[] = [];
  await Promise.all(
    open.map(async (s) => {
      const menu = await fetchStreetOsMenu(s.slug).catch(() => null);
      for (const c of menu?.categories ?? []) {
        results.push({ storefront_id: s.id, name: c.name });
      }
    }),
  );
  return results;
});

export const getMenu = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ data }) => {
    const { fetchStreetOsMenu } = await import("@/lib/streetos/client.server");
    return await fetchStreetOsMenu(data.slug);
  });
