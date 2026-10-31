import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_menu_items",
  title: "List menu items",
  description: "List the vendor's menu items (products) with price, availability and category.",
  inputSchema: {
    storefront_id: z.string().optional().describe("Only items for this shop id."),
    available_only: z.boolean().optional().describe("Only currently available items."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ storefront_id, available_only }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("products")
      .select("id, name, description, price, is_available, storefront_id, categories(name)")
      .order("name");
    if (storefront_id) query = query.eq("storefront_id", storefront_id);
    if (available_only) query = query.eq("is_available", true);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { items: data ?? [] },
    };
  },
});
