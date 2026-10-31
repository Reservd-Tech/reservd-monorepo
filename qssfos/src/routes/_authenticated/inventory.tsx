import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryItemsPanel } from "@/components/inventory/items-panel";
import { VendorsPanel } from "@/components/inventory/vendors-panel";
import { HistoryPanel } from "@/components/inventory/history-panel";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — QSSF OS" },
      { name: "description", content: "Manage inventory, stock movements and suppliers in QSSF OS." },
      { property: "og:title", content: "Inventory — QSSF OS" },
      { property: "og:description", content: "Manage inventory, stock movements and suppliers in QSSF OS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Package className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stock levels, waste tracking, vendors, and full movement history.
          </p>
        </div>
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="items" className="mt-6">
          <InventoryItemsPanel />
        </TabsContent>
        <TabsContent value="vendors" className="mt-6">
          <VendorsPanel />
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <HistoryPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
