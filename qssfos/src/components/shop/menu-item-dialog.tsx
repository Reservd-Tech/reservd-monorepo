import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImagePicker } from "@/components/shop/image-picker";
import { useSaveCategory, useSaveProduct, type MenuCategory, type MenuProduct } from "@/lib/shop/queries";
import { generateMenuCopy } from "@/lib/ai/menu-writer.functions";

const NO_CATEGORY = "__none__";
const NEW_CATEGORY = "__new__";

interface Props {
  open: boolean;
  onClose: () => void;
  storefrontId: string;
  categories: MenuCategory[];
  product: MenuProduct | null;
}

export function MenuItemDialog({ open, onClose, storefrontId, categories, product }: Props) {
  const save = useSaveProduct();
  const saveCategory = useSaveCategory();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState<string>(NO_CATEGORY);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);
  const [writing, setWriting] = useState(false);
  const saving = save.isPending || saveCategory.isPending;

  async function writeWithAI() {
    if (!name.trim()) return toast.error("Enter an item name first");
    setWriting(true);
    try {
      const copy = await generateMenuCopy({
        data: {
          storefrontId,
          itemName: name.trim(),
          notes: description.trim() || null,
          tone: "simple",
        },
      });
      setDescription(copy.description);
      if (!product && copy.name) setName(copy.name);
      toast.success("Description written — edit it however you like");
    } catch (e) {
      toast.error((e as Error).message || "AI writing failed — try again");
    } finally {
      setWriting(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? "");
    setDescription(product?.description ?? "");
    setPrice(product ? String(Number(product.price)) : "");
    setCategoryId(product?.category_id ?? NO_CATEGORY);
    setNewCategoryName("");
    setImageUrl(product?.image_url ?? null);
    setAvailable(product?.is_available ?? true);
  }, [open, product]);

  async function submit() {
    const priceNum = Number(price);
    if (!name.trim()) return toast.error("Item name is required");
    if (!Number.isFinite(priceNum) || priceNum <= 0) return toast.error("Enter a valid price");
    try {
      let resolvedCategoryId = categoryId === NO_CATEGORY || categoryId === NEW_CATEGORY ? null : categoryId;
      if (categoryId === NEW_CATEGORY) {
        const catName = newCategoryName.trim();
        if (!catName) return toast.error("Give the new category a name");
        const existing = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
        if (existing) {
          resolvedCategoryId = existing.id;
        } else {
          const created = await saveCategory.mutateAsync({
            storefront_id: storefrontId,
            name: catName,
            sort_order: categories.length,
          });
          resolvedCategoryId = created.id;
        }
        // Keep the dropdown in sync immediately, even if the dialog stays open.
        setCategoryId(resolvedCategoryId ?? NO_CATEGORY);
        setNewCategoryName("");
      }
      await save.mutateAsync({
        id: product?.id,
        storefront_id: storefrontId,
        name: name.trim(),
        description: description.trim() || null,
        price: priceNum,
        category_id: resolvedCategoryId,
        image_url: imageUrl,
        is_available: available,
      });
      toast.success(product ? "Item updated" : "Item added to menu");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? "Edit menu item" : "New menu item"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <ImagePicker
            value={imageUrl}
            onChange={setImageUrl}
            folder="menu"
            label="Item photo"
            hint="A clear top-down shot works best"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Signature dish" />
            </div>
            <div className="space-y-1.5">
              <Label>Price (₹)</Label>
              <Input
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                placeholder="60"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Description</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={writeWithAI}
                disabled={writing || saving}
              >
                {writing ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                )}
                {writing ? "Writing…" : "Write with AI"}
              </Button>
            </div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description shown to customers"
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Uncategorised" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>Uncategorised</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_CATEGORY}>+ New category…</SelectItem>
                </SelectContent>
              </Select>
              {categoryId === NEW_CATEGORY ? (
                <Input
                  autoFocus
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name, e.g. Signature specials"
                  className="mt-2"
                />
              ) : null}
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Available</p>
                <p className="text-xs text-muted-foreground">Show on the menu</p>
              </div>
              <Switch checked={available} onCheckedChange={setAvailable} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className="min-w-[120px]">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {product ? "Save item" : "Add item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
