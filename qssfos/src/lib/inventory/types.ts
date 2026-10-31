import type { Database } from "@/integrations/supabase/types";

export type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];
export type InventoryItemInsert = Database["public"]["Tables"]["inventory_items"]["Insert"];
export type InventoryItemUpdate = Database["public"]["Tables"]["inventory_items"]["Update"];
export type InventoryMovement = Database["public"]["Tables"]["inventory_movements"]["Row"];
export type Vendor = Database["public"]["Tables"]["vendors"]["Row"];
export type VendorInsert = Database["public"]["Tables"]["vendors"]["Insert"];
export type VendorUpdate = Database["public"]["Tables"]["vendors"]["Update"];
export type VendorPurchase = Database["public"]["Tables"]["vendor_purchases"]["Row"];

export type InventoryAction = Database["public"]["Enums"]["inventory_action"];
export type InventoryStatus = Database["public"]["Enums"]["inventory_status"];

export interface InventoryItemWithVendor extends InventoryItem {
  vendors: Pick<Vendor, "id" | "business_name"> | null;
}

export interface InventoryMovementWithItem extends InventoryMovement {
  inventory_items: Pick<InventoryItem, "id" | "name" | "unit"> | null;
}

export interface VendorPurchaseWithRefs extends VendorPurchase {
  vendors: Pick<Vendor, "id" | "business_name"> | null;
}
