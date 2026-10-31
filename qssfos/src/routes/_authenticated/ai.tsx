import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMyStorefronts } from "@/lib/shop/queries";
import { generateMenuCopy, type MenuCopy } from "@/lib/ai/menu-writer.functions";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({
    meta: [
      { title: "AI menu writer — QSSF OS" },
      { name: "description", content: "Generate menu names, descriptions and taglines for your shop with QSSF OS." },
      { property: "og:title", content: "AI menu writer — QSSF OS" },
      { property: "og:description", content: "Generate menu names, descriptions and taglines for your shop with QSSF OS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AIPage,
});

type Tone = "simple" | "premium" | "playful";

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy — select the text manually.");
    }
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Button variant="ghost" size="sm" onClick={copy} className="h-7 px-2">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="ml-1 text-xs">{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>
      <p className="text-sm leading-relaxed">{value}</p>
    </div>
  );
}

function AIPage() {
  const { data: shops = [] } = useMyStorefronts();
  const activeShops = shops.filter((s) => !s.archived_at);

  const [storefrontId, setStorefrontId] = useState<string>("");
  const [itemName, setItemName] = useState("");
  const [notes, setNotes] = useState("");
  const [tone, setTone] = useState<Tone>("simple");
  const [result, setResult] = useState<MenuCopy | null>(null);
  const [generating, setGenerating] = useState(false);

  const selectedShop = storefrontId || activeShops[0]?.id || "";

  async function generate() {
    if (!selectedShop) return toast.error("Create a shop profile first.");
    if (!itemName.trim()) return toast.error("Enter an item name.");
    setGenerating(true);
    setResult(null);
    try {
      const copy = await generateMenuCopy({
        data: {
          storefrontId: selectedShop,
          itemName: itemName.trim(),
          notes: notes.trim() || null,
          tone,
        },
      });
      setResult(copy);
    } catch (e) {
      toast.error((e as Error).message || "Generation failed — please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Sparkles className="h-5 w-5 text-primary" />
          AI menu writer
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Turn a dish idea into a polished name, description and tagline for your menu.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Shop</Label>
            <Select value={selectedShop} onValueChange={setStorefrontId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a shop" />
              </SelectTrigger>
              <SelectContent>
                {activeShops.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.brand_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tone</Label>
            <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">Simple</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="playful">Playful</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Item name or idea</Label>
          <Input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g. masala fries with cheese"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ingredients, spice level, what makes it special…"
            rows={2}
          />
        </div>

        <Button onClick={generate} disabled={generating} className="w-full sm:w-auto">
          {generating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {generating ? "Writing…" : "Generate menu copy"}
        </Button>
      </div>

      {result ? (
        <div className="space-y-3">
          <CopyBlock label="Item name" value={result.name} />
          <CopyBlock label="Description" value={result.description} />
          {result.tagline ? <CopyBlock label="Tagline" value={result.tagline} /> : null}
          <p className="text-xs text-muted-foreground">
            Tip: you can also fill descriptions directly from the menu editor with the "Write with
            AI" button.
          </p>
        </div>
      ) : null}
    </div>
  );
}
