import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  InventoryAction,
  InventoryItem,
  InventoryItemInsert,
  InventoryItemUpdate,
  InventoryItemWithVendor,
  InventoryMovementWithItem,
  Vendor,
  VendorInsert,
  VendorPurchaseWithRefs,
  VendorUpdate,
} from "./types";

export const invKeys = {
  items: ["inv", "items"] as const,
  item: (id: string) => ["inv", "items", id] as const,
  movements: ["inv", "movements"] as const,
  itemMovements: (id: string) => ["inv", "movements", id] as const,
  vendors: ["inv", "vendors"] as const,
  vendor: (id: string) => ["inv", "vendors", id] as const,
  vendorPurchases: (id: string) => ["inv", "vendor-purchases", id] as const,
};

/* --------------------------------- Items --------------------------------- */

export function useInventoryItems() {
  return useQuery({
    queryKey: invKeys.items,
    queryFn: async (): Promise<InventoryItemWithVendor[]> => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*, vendors(id, business_name)")
        .order("name");
      if (error) throw error;
      return data as unknown as InventoryItemWithVendor[];
    },
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InventoryItemInsert) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("inventory_items")
        .insert({ ...input, created_by: auth.user?.id ?? null })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: invKeys.items }),
  });
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: InventoryItemUpdate }) => {
      const { data, error } = await supabase
        .from("inventory_items")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: invKeys.items }),
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invKeys.items });
      qc.invalidateQueries({ queryKey: invKeys.movements });
    },
  });
}

/* ------------------------------- Movements ------------------------------- */

export function useInventoryMovements(limit = 200) {
  return useQuery({
    queryKey: invKeys.movements,
    queryFn: async (): Promise<InventoryMovementWithItem[]> => {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("*, inventory_items(id, name, unit)")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as unknown as InventoryMovementWithItem[];
    },
  });
}

export function useItemMovements(itemId: string | null) {
  return useQuery({
    enabled: !!itemId,
    queryKey: itemId ? invKeys.itemMovements(itemId) : ["inv", "movements", "none"],
    queryFn: async (): Promise<InventoryMovementWithItem[]> => {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("*, inventory_items(id, name, unit)")
        .eq("item_id", itemId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as InventoryMovementWithItem[];
    },
  });
}

export interface StockOpInput {
  item: InventoryItem;
  action: InventoryAction;
  quantity: number;
  notes?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
}

export function useStockOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: StockOpInput) => {
      const { data: auth } = await supabase.auth.getUser();
      const q = Number(input.quantity);
      if (!q || q <= 0) throw new Error("Quantity must be greater than zero");

      let nextQty = Number(input.item.current_quantity);
      switch (input.action) {
        case "add":
          nextQty += q;
          break;
        case "reduce":
        case "waste":
        case "transfer":
          nextQty -= q;
          break;
        case "adjust":
          nextQty = q;
          break;
      }
      if (nextQty < 0) throw new Error("Resulting quantity cannot be negative");

      const { error: updErr } = await supabase
        .from("inventory_items")
        .update({ current_quantity: nextQty })
        .eq("id", input.item.id);
      if (updErr) throw updErr;

      const { error: movErr } = await supabase.from("inventory_movements").insert({
        item_id: input.item.id,
        user_id: auth.user?.id ?? null,
        action: input.action,
        quantity: q,
        from_location: input.fromLocation ?? null,
        to_location: input.toLocation ?? null,
        notes: input.notes ?? null,
      });
      if (movErr) throw movErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invKeys.items });
      qc.invalidateQueries({ queryKey: invKeys.movements });
    },
  });
}

/* -------------------------------- Vendors -------------------------------- */

export function useVendors() {
  return useQuery({
    queryKey: invKeys.vendors,
    queryFn: async (): Promise<Vendor[]> => {
      const { data, error } = await supabase.from("vendors").select("*").order("business_name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: VendorInsert) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("vendors")
        .insert({ ...input, created_by: auth.user?.id ?? null })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: invKeys.vendors }),
  });
}

export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: VendorUpdate }) => {
      const { data, error } = await supabase
        .from("vendors")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: invKeys.vendors }),
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: invKeys.vendors }),
  });
}

export function useVendorPurchases(vendorId: string | null) {
  return useQuery({
    enabled: !!vendorId,
    queryKey: vendorId ? invKeys.vendorPurchases(vendorId) : ["inv", "vendor-purchases", "none"],
    queryFn: async (): Promise<VendorPurchaseWithRefs[]> => {
      const { data, error } = await supabase
        .from("vendor_purchases")
        .select("*, vendors(id, business_name)")
        .eq("vendor_id", vendorId!)
        .order("purchased_at", { ascending: false });
      if (error) throw error;
      return data as unknown as VendorPurchaseWithRefs[];
    },
  });
}
