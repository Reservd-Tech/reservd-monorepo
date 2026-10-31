export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

/** Best-known name for whoever placed the order (POS customer or online guest). */
export const customerName = (o: {
  customers?: { name?: string | null; phone?: string | null } | null;
  customer_name?: string | null;
  customer_phone?: string | null;
}) => o.customers?.name?.trim() || o.customer_name?.trim() || "Walk-in customer";

export const customerPhone = (o: {
  customers?: { phone?: string | null } | null;
  customer_phone?: string | null;
}) => o.customers?.phone?.trim() || o.customer_phone?.trim() || null;
