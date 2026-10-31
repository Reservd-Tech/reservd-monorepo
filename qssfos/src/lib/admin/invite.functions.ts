import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inviteSchema = z.object({
  email: z.string().email().max(160),
  brandName: z.string().min(2).max(80),
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens"),
  redirectTo: z.string().url().max(300),
});

/**
 * Admin-only: invites a vendor by email, creates their shop record and links
 * their account to it. Signup is closed, so this is the only way in.
 */
export const inviteVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inviteSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: adminErr } = await context.supabase.rpc("is_platform_admin");
    if (adminErr) throw new Error(adminErr.message);
    if (!isAdmin) throw new Error("Only platform admins can invite vendors");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let userId: string | null = null;
    const invited = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: data.redirectTo,
    });
    if (invited.error) {
      // Already registered — reuse the existing account instead of failing.
      const existing = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const match = existing.data?.users.find(
        (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
      );
      if (!match) throw new Error(invited.error.message);
      userId = match.id;
    } else {
      userId = invited.data.user?.id ?? null;
    }
    if (!userId) throw new Error("Could not create the vendor account");

    let slug = data.slug;
    let shopId: string | null = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const candidate = attempt === 0 ? data.slug : `${data.slug}-${attempt + 1}`;
      const { data: shop, error } = await supabaseAdmin
        .from("storefronts")
        .insert({
          brand_name: data.brandName,
          slug: candidate,
          owner_id: userId,
          is_open: false,
          listing_status: "draft",
        })
        .select("id, slug")
        .single();
      if (!error && shop) {
        shopId = shop.id;
        slug = shop.slug;
        break;
      }
      if (error && error.code !== "23505") throw new Error(error.message);
    }
    if (!shopId) throw new Error(`The link "${data.slug}" is already taken`);

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "owner", storefront_id: shopId });
    if (roleErr && roleErr.code !== "23505") throw new Error(roleErr.message);

    return { userId, shopId, slug, invited: !invited.error };
  });
