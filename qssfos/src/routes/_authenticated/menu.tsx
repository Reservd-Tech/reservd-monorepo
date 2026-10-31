import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Pencil, Plus, Store, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MenuItemDialog } from "@/components/shop/menu-item-dialog";
import { GoLiveChecklist } from "@/components/shop/go-live-checklist";
import { formatINR } from "@/lib/pos/format";
import {
  useDeleteCategory,
  useDeleteProduct,
  useMyStorefronts,
  useSaveCategory,
  useSaveProduct,
  useShopCategories,
  useShopProducts,
  type MenuProduct,
} from "@/lib/shop/queries";

export const Route = createFileRoute("/_authenticated/menu")({
  head: () => ({
    meta: [
      { title: "Menu builder — QSSF OS" },
      {
        name: "description",
        content:
          "Create categories, add menu items with photos and prices, and control availability for your street food shop.",
      },
      { property: "og:title", content: "Menu builder — QSSF OS" },
      {
        property: "og:description",
        content: "Add menu items, photos and prices for your street food shop.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MenuPage,
});

function MenuPage() {
  const { data: shops = [], isLoading } = useMyStorefronts();
  const active = shops.filter((s) => !s.archived_at);
  const [shopId, setShopId] = useState<string | null>(null);
  const shop = active.find((s) => s.id === shopId) ?? active[0] ?? null;
  const { data: categories = [] } = useShopCategories(shop?.id);
  const { data: products = [], isLoading: prodLoading } = useShopProducts(shop?.id);


  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MenuProduct | null>(null);
  const [newCat, setNewCat] = useState("");
  const [editingCat, setEditingCat] = useState<{ id: string; name: string } | null>(null);

  const saveCategory = useSaveCategory();
  const deleteCategory = useDeleteCategory();
  const deleteProduct = useDeleteProduct();
  const saveProduct = useSaveProduct();

  const grouped = useMemo(() => {
    const map = new Map<string, MenuProduct[]>();
    for (const p of products) {
      const key = p.category_id ?? "uncategorised";
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return map;
  }, [products]);

  if (isLoading) return <Skeleton className="h-96 w-full rounded-2xl" />;

  if (!shop) {
    return (
      <div className="mx-auto grid max-w-lg place-items-center rounded-2xl border border-dashed border-border p-12 text-center">
        <Store className="h-8 w-8 text-muted-foreground" />
        <h1 className="mt-4 text-lg font-semibold">Set up your shop first</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add your brand, photos and payout details, then build your menu.
        </p>
        <Button className="mt-5" asChild>
          <Link to="/shop">Set up shop</Link>
        </Button>
      </div>
    );
  }

  async function addCategory() {
    if (!shop) return;
    if (!newCat.trim()) return;
    try {
      await saveCategory.mutateAsync({
        storefront_id: shop.id,
        name: newCat.trim(),
        sort_order: categories.length,
      });
      setNewCat("");
      toast.success("Category added");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function renameCategory(sortOrder: number) {
    if (!shop || !editingCat) return;
    const name = editingCat.name.trim();
    if (!name) return toast.error("Category name is required");
    try {
      await saveCategory.mutateAsync({
        id: editingCat.id,
        storefront_id: shop.id,
        name,
        sort_order: sortOrder,
      });
      setEditingCat(null);
      toast.success("Category renamed");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }



  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Menu</h1>
            <p className="text-sm text-muted-foreground">
              {shop.brand_name} · {products.length} items · {categories.length} categories
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {active.length > 1 ? (
            <select
              value={shop.id}
              onChange={(e) => setShopId(e.target.value)}
              className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm"
              aria-label="Choose shop"
            >
              {active.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.brand_name}
                </option>
              ))}
            </select>
          ) : null}
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add item
          </Button>
        </div>

      </header>

      <GoLiveChecklist compact shopId={shop.id} />

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4 space-y-6">
          {prodLoading ? (
            <Skeleton className="h-64 w-full rounded-2xl" />
          ) : products.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border border-dashed border-border p-12 text-center">
              <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No menu items yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add your first dish with a photo and price.
              </p>
            </div>
          ) : (
            [...categories.map((c) => ({ id: c.id, name: c.name })), {
              id: "uncategorised",
              name: "Uncategorised",
            }]
              .filter((c) => (grouped.get(c.id) ?? []).length > 0)
              .map((c) => (
                <section key={c.id} className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {c.name}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {(grouped.get(c.id) ?? []).map((p) => (
                      <article
                        key={p.id}
                        className="overflow-hidden rounded-2xl border border-border/60 bg-card"
                      >
                        <div className="aspect-[4/3] w-full bg-gradient-to-br from-primary/15 via-accent/20 to-background">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="grid h-full place-items-center">
                              <UtensilsCrossed className="h-7 w-7 text-primary/60" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-2 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{p.name}</p>
                              <p className="text-sm font-bold text-primary">
                                {formatINR(Number(p.price))}
                              </p>
                            </div>
                            {!p.is_available && <Badge variant="destructive">Hidden</Badge>}
                          </div>
                          {p.description ? (
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {p.description}
                            </p>
                          ) : null}
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                setEditing(p);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                saveProduct.mutate({
                                  id: p.id,
                                  storefront_id: shop.id,
                                  name: p.name,
                                  description: p.description,
                                  price: Number(p.price),
                                  category_id: p.category_id,
                                  image_url: p.image_url,
                                  is_available: !p.is_available,
                                })
                              }
                            >
                              {p.is_available ? "Hide" : "Show"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                if (confirm(`Delete "${p.name}" from the menu?`))
                                  deleteProduct.mutate(p.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <Input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              placeholder="New category, e.g. Signature specials"
              className="max-w-sm"
            />
            <Button onClick={addCategory} disabled={saveCategory.isPending}>
              {saveCategory.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add
            </Button>
          </div>

          <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
            {categories.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No categories yet.</p>
            ) : (
              categories.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  {editingCat?.id === c.id ? (
                    <>
                      <Input
                        autoFocus
                        value={editingCat.name}
                        onChange={(e) => setEditingCat({ id: c.id, name: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && renameCategory(i)}
                        className="max-w-xs"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => renameCategory(i)}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingCat(null)}>
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(grouped.get(c.id) ?? []).length} items
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingCat({ id: c.id, name: c.name })}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Rename
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Delete category "${c.name}"?`)) deleteCategory.mutate(c.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <MenuItemDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        storefrontId={shop.id}
        categories={categories}
        product={editing}
      />
    </div>
  );
}
