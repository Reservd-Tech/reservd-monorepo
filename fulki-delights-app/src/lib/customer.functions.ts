import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const syncCustomer = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        name: z.string().trim().min(1),
        phone: z.string().trim().min(7),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const hasAdminKey = Boolean(
      process.env["SUPABASE_URL"] &&
        (process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? process.env["STREETVEND_SERVICE_ROLE_KEY"]),
    );
    // Profile sync is best-effort: without a privileged key we simply skip it
    // instead of crashing the welcome flow.
    if (!hasAdminKey) return { ok: false, skipped: true } as const;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("phone", data.phone)
      .limit(1)
      .maybeSingle();
    const payload = { name: data.name, phone: data.phone };
    const { error } = existing
      ? await supabaseAdmin.from("customers").update(payload).eq("id", existing.id)
      : await supabaseAdmin.from("customers").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true, skipped: false } as const;
  });
