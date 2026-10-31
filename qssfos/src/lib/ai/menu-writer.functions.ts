import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayRunIdFetch } from "./run-id";

const GATEWAY_BASE_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

const inputSchema = z.object({
  storefrontId: z.string().uuid(),
  itemName: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(500).nullable().optional(),
  tone: z.enum(["simple", "premium", "playful"]),
});

const menuCopySchema = z.object({
  name: z.string().describe("Polished menu item name, 2-6 words"),
  description: z
    .string()
    .describe("Customer-facing description, 1-2 short sentences, appetising and honest"),
  tagline: z
    .string()
    .nullable()
    .describe("Optional 3-8 word tagline, or null when it adds nothing"),
});

export type MenuCopy = z.infer<typeof menuCopySchema>;

export const generateMenuCopy = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<MenuCopy> => {
    const { supabase, userId } = context;

    // Verify the vendor owns this shop before spending an AI call on it.
    const { data: shop, error: shopError } = await supabase
      .from("storefronts")
      .select("id, brand_name, tagline")
      .eq("id", data.storefrontId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (shopError) throw new Error(shopError.message);
    if (!shop) throw new Error("Shop not found or not owned by you.");

    const { data: existing } = await supabase
      .from("products")
      .select("name")
      .eq("storefront_id", data.storefrontId)
      .order("name")
      .limit(8);
    const existingNames = (existing ?? []).map((p) => p.name);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured on this project yet.");

    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const provider = createOpenAI({
      baseURL: GATEWAY_BASE_URL,
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });

    const toneGuide =
      data.tone === "premium"
        ? "Refined, minimal, confident — no exclamation marks."
        : data.tone === "playful"
          ? "Warm, fun, street-food energy — light humour is fine."
          : "Clear and simple — easy words, no fluff.";

    const result = streamText({
      model: provider.responses(MODEL),
      output: Output.object({ schema: menuCopySchema }),
      system:
        "You write menu copy for street food vendors. Return only the structured fields. " +
        "Never invent allergens, health claims or ingredients the vendor did not mention.",
      messages: [
        {
          role: "user",
          content: [
            `Shop: ${shop.brand_name}${shop.tagline ? ` — "${shop.tagline}"` : ""}`,
            existingNames.length > 0 ? `Existing menu items: ${existingNames.join(", ")}` : null,
            `Item to write about: ${data.itemName}`,
            data.notes ? `Vendor notes: ${data.notes}` : null,
            `Tone: ${toneGuide}`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    const output = await result.output;
    if (!output) throw new Error("The AI did not return a result — please try again.");
    return output;
  });
