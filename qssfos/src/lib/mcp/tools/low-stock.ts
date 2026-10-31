import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_inventory",
  title: "List inventory",
  description:
    "List the vendor's inventory items with current quantity, unit and reorder threshold. Optionally only items at or below their minimum.",
  inputSchema: {
    low_stock_only: z.boolean().optional().describe("Only items at or below the minimum quantity."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ low_stock_only }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("inventory_items")
      .select(
        "id, name, sku, unit, current_quantity, minimum_quantity, maximum_quantity, cost_per_unit, status, expiry_date",
      )
      .order("name");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []).filter(
      (row) => !low_stock_only || Number(row.current_quantity) <= Number(row.minimum_quantity),
    );
    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
      structuredContent: { items: rows },
    };
  },
});
