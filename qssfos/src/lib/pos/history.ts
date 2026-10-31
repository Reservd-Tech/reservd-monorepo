import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { OrderWithItems } from "./types";

export const historyKeys = {
  day: (date: string) => ["pos", "history", date] as const,
};

/** Local-day boundaries for a `YYYY-MM-DD` date string. */
function dayRange(date: string) {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function todayKey() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Full audit log of orders placed on a given day (all statuses, POS + online). */
export function useOrderHistory(date: string) {
  return useQuery({
    queryKey: historyKeys.day(date),
    queryFn: async (): Promise<OrderWithItems[]> => {
      const { from, to } = dayRange(date);
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*), customers(id, name, phone)")
        .is("archived_at", null)
        .gte("created_at", from)
        .lt("created_at", to)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as OrderWithItems[];
    },
  });
}

export function orderCustomerName(o: OrderWithItems) {
  return o.customer_name?.trim() || o.customers?.name?.trim() || "Walk-in";
}

export function orderCustomerPhone(o: OrderWithItems) {
  return o.customer_phone?.trim() || o.customers?.phone?.trim() || "";
}

export function historyToCsv(orders: OrderWithItems[]) {
  const head = [
    "Order #",
    "Placed at",
    "Customer",
    "Phone",
    "Source",
    "Type",
    "Status",
    "Payment",
    "Payment status",
    "Items",
    "Subtotal",
    "Tax",
    "Discount",
    "Total",
    "Notes",
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = orders.map((o) =>
    [
      o.order_number,
      new Date(o.created_at).toLocaleString("en-IN"),
      orderCustomerName(o),
      orderCustomerPhone(o),
      o.source,
      o.order_type,
      o.status,
      o.payment_method ?? "",
      o.payment_status,
      (o.order_items ?? []).map((i) => `${i.quantity}x ${i.product_name}`).join("; "),
      o.subtotal,
      o.tax,
      o.discount,
      o.total,
      o.notes ?? "",
    ]
      .map(esc)
      .join(","),
  );
  return [head.map(esc).join(","), ...rows].join("\n");
}
