import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_shops",
  title: "List shops",
  description:
    "List the signed-in vendor's shop profiles (storefronts) with slug, open state and archive state.",
  inputSchema: {
    include_archived: z.boolean().optional().describe("Include archived shops. Defaults to false."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ include_archived }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("storefronts")
      .select("id, brand_name, slug, is_open, archived_at, phone, address, updated_at")
      .order("brand_name");
    if (!include_archived) query = query.is("archived_at", null);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { shops: data ?? [] },
    };
  },
});
