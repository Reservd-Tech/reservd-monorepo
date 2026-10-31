# AI Menu Writing Helper

Add an AI-powered menu writing assistant to the existing `/ai` page, plus a shortcut inside the menu item editor. It helps vendors write item names, descriptions and taglines for their menu.

## What vendors get

- **AI page (`/ai`)**: a "Menu writer" tool. Vendor picks a shop, enters an item name (and optional notes like ingredients or spice level), and the AI generates:
  - a polished item name
  - a short customer-facing description
  - an optional tagline
  - Generated text appears in copyable blocks with a "Use this" action.
- **Menu item dialog shortcut**: a small "Write with AI" button next to the description field in the menu item editor that fills the description in place.

## How it works

1. **Server function** `src/lib/ai/menu-writer.functions.ts` (new):
   - `createServerFn` with `requireSupabaseAuth` — only signed-in vendors can call it; verifies the vendor owns the selected storefront via `context.supabase`.
   - Calls the Lovable AI Gateway (OpenAI model `openai/gpt-6-astra` on the Responses API) using the server-only `LOVABLE_API_KEY`. No OpenAI account or API key needed from you — it's built in.
   - Streams the call server-side, returns the final structured result (name, description, tagline) via a strict JSON schema.
   - Loads the shop's brand name/tagline and a few existing menu items as context so the writing matches the shop's style.

2. **AI page** `src/routes/_authenticated/ai.tsx` (replace placeholder):
   - Shop selector, item name input, optional notes field, tone selector (simple / premium / playful).
   - Generate button → streamed-feel loading state → result cards with copy buttons.
   - Error states show the gateway's safe error message (e.g. rate limit, credits).

3. **Menu dialog integration** `src/components/shop/menu-item-dialog.tsx`:
   - "Write with AI" button beside the description field; uses the current item name + shop context and fills the description textarea (vendor can still edit before saving).

## Technical details

- Model: `openai/gpt-6-astra` via Lovable AI Gateway Responses API (`https://ai.gateway.lovable.dev/v1/responses`), `store: false`, reasoning effort `low`, strict `json_schema` output. Provider + run-ID fetch wrapper created per request in server code; `LOVABLE_API_KEY` never leaves the server.
- No database changes. No changes to orders, POS, RLS, or the public consumer APIs.
- Typed throughout, no `any`; `bunx tsgo --noEmit` must pass.
- Verify with a real generation on the preview before reporting done.
