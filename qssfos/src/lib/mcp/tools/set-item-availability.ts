import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "set_item_availability",
  title: "Set menu item availability",
  description:
    "Mark one of the vendor's menu items as available or sold out. Changes appear instantly on the consumer app.",
  inputSchema: {
    product_id: z.string().describe("The menu item id."),
    is_available: z.boolean().describe("True to make it orderable, false to mark it sold out."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ product_id, is_available }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("products")
      .update({ is_available })
      .eq("id", product_id)
      .select("id, name, is_available")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data)
      return {
        content: [{ type: "text", text: "Menu item not found or not owned by you." }],
        isError: true,
      };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { item: data },
    };
  },
});
