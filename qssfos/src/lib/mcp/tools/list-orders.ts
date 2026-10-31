import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_orders",
  title: "List orders",
  description:
    "List the vendor's orders, newest first, with customer, totals, status and line items. Filter by status or shop.",
  inputSchema: {
    status: z
      .enum(["pending", "preparing", "ready", "completed", "cancelled"])
      .optional()
      .describe("Only orders in this status."),
    storefront_id: z.string().optional().describe("Only orders for this shop id."),
    since: z.string().optional().describe("ISO timestamp; only orders created at or after it."),
    limit: z.number().int().optional().describe("Max orders to return (1-100, default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, storefront_id, since, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const take = Math.min(Math.max(limit ?? 20, 1), 100);
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("orders")
      .select(
        "id, order_number, status, order_type, source, customer_name, customer_phone, subtotal, discount, tax, total, payment_method, payment_status, eta_minutes, rejection_reason, storefront_id, created_at, order_items(name, quantity, unit_price, line_total)",
      )
      .order("created_at", { ascending: false })
      .limit(take);
    if (status) query = query.eq("status", status);
    if (storefront_id) query = query.eq("storefront_id", storefront_id);
    if (since) query = query.gte("created_at", since);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { orders: data ?? [] },
    };
  },
});
