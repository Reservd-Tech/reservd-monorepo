import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OrderArchive {
  id: string;
  period: string;
  label: string;
  order_count: number;
  total: number;
  csv: string;
  created_at: string;
}

/** Monthly CSV archives created automatically at the start of each month. */
export function useOrderArchives() {
  return useQuery({
    queryKey: ["pos", "archives"],
    queryFn: async (): Promise<OrderArchive[]> => {
      const { data, error } = await supabase
        .from("order_archives")
        .select("*")
        .order("period", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((a) => ({ ...a, total: Number(a.total) }));
    },
  });
}

function invalidateOrders(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["pos"] });
}

/** Hides an order from every app view without touching the stored record. */
export function useArchiveOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => invalidateOrders(qc),
  });
}

export function useRestoreOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.from("orders").update({ archived_at: null }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => invalidateOrders(qc),
  });
}

/** Permanently removes an order and its line items. */
export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const items = await supabase.from("order_items").delete().eq("order_id", orderId);
      if (items.error) throw items.error;
      const { error } = await supabase.from("orders").delete().eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => invalidateOrders(qc),
  });
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
