import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_order_status",
  title: "Update order status",
  description:
    "Move one of the vendor's orders to a new status: accept it (preparing), mark it ready, complete it, or cancel/reject it with a reason.",
  inputSchema: {
    order_id: z.string().describe("The order id to update."),
    status: z
      .enum(["pending", "preparing", "ready", "completed", "cancelled"])
      .describe("New status for the order."),
    rejection_reason: z
      .string()
      .optional()
      .describe("Reason shown to the customer when cancelling/rejecting."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ order_id, status, rejection_reason }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const patch: Record<string, unknown> = { status };
    const now = new Date().toISOString();
    if (status === "preparing") patch.accepted_at = now;
    if (status === "ready") patch.ready_at = now;
    if (status === "cancelled" && rejection_reason) patch.rejection_reason = rejection_reason;
    const { data, error } = await supabase
      .from("orders")
      .update(patch)
      .eq("id", order_id)
      .select("id, order_number, status, eta_minutes, rejection_reason")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data)
      return {
        content: [{ type: "text", text: "Order not found or not owned by you." }],
        isError: true,
      };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { order: data },
    };
  },
});
