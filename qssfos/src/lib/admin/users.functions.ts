import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const USERNAME_DOMAIN = "users.streetvend.internal";

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function internalEmail(username: string): string {
  return `${normalizeUsername(username)}@${USERNAME_DOMAIN}`;
}

const usernameSchema = z
  .string()
  .min(4)
  .max(32)
  .regex(/^[a-z0-9_-]+$/, "Use lowercase letters, numbers, _ and - only");

const assignableRole = z.enum(["owner", "manager", "staff"]);

const createSchema = z.object({
  username: usernameSchema,
  fullName: z.string().min(1).max(120),
  role: assignableRole,
  storefrontId: z.string().uuid().nullable(),
  password: z.string().min(8).max(200),
  isActive: z.boolean(),
  recoveryEmail: z.string().email().max(160).nullable().optional(),
});

const updateSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(1).max(120),
  role: assignableRole,
  storefrontId: z.string().uuid().nullable(),
});

const resetSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(8).max(200),
});

const activeSchema = z.object({
  userId: z.string().uuid(),
  isActive: z.boolean(),
});

const deleteSchema = z.object({ userId: z.string().uuid() });

const BAN_FOREVER = "876000h";

/** Throws unless the caller is a platform admin. Server-side authorization. */
interface AdminCheckContext {
  supabase: {
    rpc: (
      fn: "is_platform_admin",
    ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  };
}

async function assertAdmin(context: AdminCheckContext) {
  const { data, error } = await context.supabase.rpc("is_platform_admin");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only platform admins can manage users");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function audit(
  targetUserId: string,
  performedBy: string,
  action: string,
  metadata: Record<string, string | number | boolean | null> = {},
) {
  const db = await admin();
  await db.from("user_access_audit").insert({
    target_user_id: targetUserId,
    performed_by: performedBy,
    action,
    metadata,
  });
}

export interface ManagedUser {
  userId: string;
  username: string | null;
  fullName: string | null;
  role: string | null;
  storefrontId: string | null;
  storefrontName: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  isSelf: boolean;
}

export const listManagedUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ManagedUser[]> => {
    await assertAdmin(context);
    const db = await admin();

    const [{ data: authUsers, error: authErr }, names, roles, profiles, shops] = await Promise.all([
      db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      db.from("auth_usernames").select("user_id, username"),
      db.from("user_roles").select("user_id, role, storefront_id"),
      db.from("profiles").select("id, full_name, is_active"),
      db.from("storefronts").select("id, brand_name"),
    ]);
    if (authErr) throw new Error(authErr.message);

    const nameByUser = new Map((names.data ?? []).map((n) => [n.user_id, n.username]));
    const roleByUser = new Map((roles.data ?? []).map((r) => [r.user_id, r]));
    const profileById = new Map((profiles.data ?? []).map((p) => [p.id, p]));
    const shopById = new Map((shops.data ?? []).map((s) => [s.id, s.brand_name]));

    return authUsers.users.map((u) => {
      const role = roleByUser.get(u.id);
      const profile = profileById.get(u.id);
      return {
        userId: u.id,
        username: nameByUser.get(u.id) ?? u.email?.split("@")[0] ?? null,
        fullName: profile?.full_name ?? null,
        role: role?.role ?? null,
        storefrontId: role?.storefront_id ?? null,
        storefrontName: role?.storefront_id ? (shopById.get(role.storefront_id) ?? null) : null,
        isActive: profile?.is_active ?? true,
        createdAt: u.created_at,
        lastLoginAt: u.last_sign_in_at ?? null,
        isSelf: u.id === context.userId,
      };
    });
  });

export const createManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const normalized = normalizeUsername(data.username);

    const { data: taken } = await db
      .from("auth_usernames")
      .select("id")
      .eq("normalized_username", normalized)
      .maybeSingle();
    if (taken) throw new Error(`The username "${normalized}" is already taken`);

    const created = await db.auth.admin.createUser({
      email: internalEmail(normalized),
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        username: normalized,
        recovery_email: data.recoveryEmail ?? null,
      },
    });
    if (created.error) throw new Error(created.error.message);
    const userId = created.data.user?.id;
    if (!userId) throw new Error("Could not create the account");

    await db.from("auth_usernames").insert({
      user_id: userId,
      username: data.username.trim(),
      normalized_username: normalized,
    });
    await db
      .from("profiles")
      .upsert({ id: userId, full_name: data.fullName, is_active: data.isActive });
    const { error: roleErr } = await db
      .from("user_roles")
      .insert({ user_id: userId, role: data.role, storefront_id: data.storefrontId });
    if (roleErr) {
      // Nothing orphaned: remove the account we just created.
      await db.from("auth_usernames").delete().eq("user_id", userId);
      await db.from("profiles").delete().eq("id", userId);
      await db.auth.admin.deleteUser(userId);
      throw new Error(roleErr.message);
    }


    if (!data.isActive) {
      await db.auth.admin.updateUserById(userId, { ban_duration: BAN_FOREVER });
    }

    await audit(userId, context.userId, "user_created", {
      username: normalized,
      role: data.role,
      storefront_id: data.storefrontId,
      is_active: data.isActive,
    });
    return { userId };
  });

export const updateManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();

    const { data: existing } = await db
      .from("user_roles")
      .select("id, role, storefront_id")
      .eq("user_id", data.userId)
      .maybeSingle();

    if (existing?.role === "platform_admin") {
      throw new Error("Platform admin accounts cannot be edited here");
    }

    await db.from("profiles").upsert({ id: data.userId, full_name: data.fullName });

    if (existing) {
      await db
        .from("user_roles")
        .update({ role: data.role, storefront_id: data.storefrontId })
        .eq("id", existing.id);
    } else {
      await db
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role, storefront_id: data.storefrontId });
    }

    if (existing?.role !== data.role) {
      await audit(data.userId, context.userId, "role_changed", {
        from: existing?.role ?? null,
        to: data.role,
      });
    }
    if ((existing?.storefront_id ?? null) !== data.storefrontId) {
      await audit(data.userId, context.userId, "store_changed", {
        from: existing?.storefront_id ?? null,
        to: data.storefrontId,
      });
    }
    return { ok: true };
  });

export const resetManagedUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => resetSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const res = await db.auth.admin.updateUserById(data.userId, { password: data.password });
    if (res.error) throw new Error(res.error.message);
    await audit(data.userId, context.userId, "password_reset");
    return { ok: true };
  });

export const setManagedUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => activeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot deactivate your own account");
    const db = await admin();

    await db.from("profiles").upsert({ id: data.userId, is_active: data.isActive });
    const res = await db.auth.admin.updateUserById(data.userId, {
      ban_duration: data.isActive ? "none" : BAN_FOREVER,
    });
    if (res.error) throw new Error(res.error.message);

    await audit(
      data.userId,
      context.userId,
      data.isActive ? "user_activated" : "user_deactivated",
    );
    return { ok: true };
  });

/** Permanently removes an account. Vendor data (orders, shops) is left intact. */
export const deleteManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deleteSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot delete your own account");
    const db = await admin();

    const { data: existing } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (existing?.role === "platform_admin") {
      throw new Error("Platform admin accounts cannot be deleted here");
    }

    await audit(data.userId, context.userId, "user_deleted");

    await db.from("user_roles").delete().eq("user_id", data.userId);
    await db.from("auth_usernames").delete().eq("user_id", data.userId);
    await db.from("profiles").delete().eq("id", data.userId);

    const res = await db.auth.admin.deleteUser(data.userId);
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });
