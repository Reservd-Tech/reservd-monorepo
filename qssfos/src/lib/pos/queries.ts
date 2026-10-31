import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  Category,
  Customer,
  OrderStatus,
  OrderType,
  OrderWithItems,
  PaymentMethod,
  PaymentStatus,
  Product,
  CartLine,
} from "./types";

export const qk = {
  categories: ["pos", "categories"] as const,
  products: ["pos", "products"] as const,
  orders: ["pos", "orders"] as const,
  todayOrders: ["pos", "orders", "today"] as const,
  activeOrders: ["pos", "orders", "active"] as const,
  order: (id: string) => ["pos", "orders", id] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: qk.categories,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useProducts() {
  return useQuery({
    queryKey: qk.products,
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function useTodayOrders() {
  return useQuery({
    queryKey: qk.todayOrders,
    queryFn: async (): Promise<OrderWithItems[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*), customers(id, name, phone)")
        .is("archived_at", null)
        .gte("created_at", startOfTodayISO())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as OrderWithItems[];
    },
    refetchInterval: 15000,
  });
}

/** All unarchived orders still in the live workflow, regardless of age. */
export function useActiveOrders() {
  return useQuery({
    queryKey: qk.activeOrders,
    queryFn: async (): Promise<OrderWithItems[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*), customers(id, name, phone)")
        .is("archived_at", null)
        .in("status", ["pending", "preparing", "ready"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as OrderWithItems[];
    },
    refetchInterval: 15000,
  });
}

interface CreateOrderInput {
  lines: CartLine[];
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  taxRate: number; // 0..1
  notes?: string | null;
  customer?: { name?: string | null; phone?: string | null } | null;
}

async function upsertCustomer(input: CreateOrderInput["customer"]): Promise<string | null> {
  if (!input || (!input.phone && !input.name)) return null;
  if (input.phone) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", input.phone)
      .maybeSingle();
    if (existing) {
      if (input.name) {
        await supabase.from("customers").update({ name: input.name }).eq("id", existing.id);
      }
      return existing.id;
    }
  }
  const { data, error } = await supabase
    .from("customers")
    .insert({ name: input.name ?? null, phone: input.phone ?? null })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      const subtotal = input.lines.reduce((s, l) => s + l.price * l.quantity, 0);
      const tax = Math.round(subtotal * input.taxRate * 100) / 100;
      const total = subtotal + tax;

      const customerId = await upsertCustomer(input.customer ?? null);

      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          customer_id: customerId,
          order_type: input.orderType,
          status: "pending",
          payment_method: input.paymentMethod,
          payment_status: input.paymentStatus,
          subtotal,
          tax,
          discount: 0,
          total,
          notes: input.notes ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;

      const items = input.lines.map((l) => ({
        order_id: order.id,
        product_id: l.productId,
        product_name: l.name,
        unit_price: l.price,
        quantity: l.quantity,
        line_total: l.price * l.quantity,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(items);
      if (itemsErr) throw itemsErr;
      return order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.orders });
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const patch: { status: OrderStatus; ready_at?: string } = { status };
      if (status === "ready") patch.ready_at = new Date().toISOString();
      const { error } = await supabase.from("orders").update(patch).eq("id", id);
      if (error) throw error;

    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orders }),
  });
}

/** Vendor accepts an incoming order (no ETA — customer picked a slot). */
export function useAcceptOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "preparing",
          accepted_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orders }),
  });
}


/** Vendor rejects an incoming order. */
export function useRejectOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string | null }) => {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          payment_status: "cancelled",
          rejection_reason: reason?.trim() || "Rejected by vendor",
          eta_minutes: null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orders }),
  });
}


export function useUpdatePaymentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payment_status }: { id: string; payment_status: PaymentStatus }) => {
      const { error } = await supabase.from("orders").update({ payment_status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orders }),
  });
}

/** Vendor confirms the customer's UPI payment actually landed. */
export function useConfirmPaymentClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ payment_status: "paid", payment_confirmed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orders }),
  });
}

/** Vendor did not receive the money — clear the customer's claim. */
export function useClearPaymentClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ payment_reference: null, payment_claimed_at: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orders }),
  });
}


/** Start preparing a batch of one menu item — FIFO across oldest eligible orders (server-side RPC). */
export function useStartPreparation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const { data, error } = await supabase.rpc("start_item_preparation", { p_product_id: productId, p_quantity: quantity });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orders }),
  });
}

/** Mark a batch of in-preparation units of one menu item as prepared (server-side RPC). */
export function useMarkPrepared() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const { data, error } = await supabase.rpc("mark_item_prepared", { p_product_id: productId, p_quantity: quantity });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orders }),
  });
}

/** Mark a menu item available/sold out — updates the authoritative menu the customer app reads. */
export function useSetProductAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, available }: { id: string; available: boolean }) => {
      const { error } = await supabase.from("products").update({ is_available: available }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.products });
      qc.invalidateQueries({ queryKey: qk.orders });
    },
  });
}

export async function findCustomerByPhone(phone: string): Promise<Customer | null> {
  const { data } = await supabase.from("customers").select("*").eq("phone", phone).maybeSingle();
  return data;
}

/**
 * Keeps the vendor order queue in sync with the shared database in real time.
 * Any insert/update on `orders` (from the POS or the consumer storefront)
 * immediately refreshes today's orders.
 */
export function useOrdersRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("pos-orders-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        qc.invalidateQueries({ queryKey: qk.orders });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        qc.invalidateQueries({ queryKey: qk.orders });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
