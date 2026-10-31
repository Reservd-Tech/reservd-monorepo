import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  createManagedUser,
  listManagedUsers,
  type ManagedUser,
} from "@/lib/admin/users.functions";
import { useAdminStorefronts, useIsPlatformAdmin } from "@/lib/compliance/queries";

export const Route = createFileRoute("/_authenticated/admin_/vendors")({
  head: () => ({
    meta: [
      { title: "Vendor accounts — QSSF OS" },
      {
        name: "description",
        content: "Create and review the vendor logins that can access QSSF OS.",
      },
      { property: "og:title", content: "Vendor accounts — QSSF OS" },
      { property: "og:description", content: "Admin-controlled vendor account provisioning." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorAccountsPage,
});

type AssignableRole = "owner" | "manager" | "staff";
const ROLES: AssignableRole[] = ["owner", "manager", "staff"];

/** Cryptographically strong, easy to read aloud once. */
function generatePassword(): string {
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function VendorAccountsPage() {
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: checking } = useIsPlatformAdmin();
  const shops = useAdminStorefronts();
  const qc = useQueryClient();
  const create = useServerFn(createManagedUser);
  const list = useServerFn(listManagedUsers);

  const users = useQuery({
    queryKey: ["admin", "managed-users"],
    queryFn: (): Promise<ManagedUser[]> => list(),
    enabled: isAdmin === true,
  });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [storefrontId, setStorefrontId] = useState("");
  const [role, setRole] = useState<AssignableRole>("owner");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [issued, setIssued] = useState<{ username: string; password: string } | null>(null);

  useEffect(() => {
    if (!checking && isAdmin === false) navigate({ to: "/dashboard", replace: true });
  }, [checking, isAdmin, navigate]);

  if (checking || isAdmin !== true) {
    return <div className="text-sm text-muted-foreground">Checking access…</div>;
  }

  async function submit() {
    setSaving(true);
    try {
      await create({
        data: {
          username: username.trim().toLowerCase(),
          password,
          fullName: fullName.trim(),
          role,
          storefrontId: storefrontId || null,
          isActive: true,
          recoveryEmail: recoveryEmail.trim() || null,
        },
      });
      setIssued({ username: username.trim().toLowerCase(), password });
      setUsername("");
      setPassword("");
      setFullName("");
      setRecoveryEmail("");
      qc.invalidateQueries({ queryKey: ["admin", "managed-users"] });
      toast.success("Account created");
    } catch (e) {
      toast.error((e as Error).message || "Could not create the account");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    username.trim().length >= 4 && password.length >= 8 && fullName.trim().length > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendor accounts</h1>
          <p className="text-sm text-muted-foreground">
            Create the logins that can access QSSF OS. There is no public signup.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin">Back to admin</Link>
        </Button>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">New account</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="v-username">Username</Label>
            <Input
              id="v-username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-password">Temporary password</Label>
            <div className="flex gap-2">
              <Input
                id="v-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())}>
                Generate
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-name">Full name</Label>
            <Input id="v-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-shop">Storefront</Label>
            <select
              id="v-shop"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={storefrontId}
              onChange={(e) => setStorefrontId(e.target.value)}
            >
              <option value="">No storefront</option>
              {shops.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.brand_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-role">Role</Label>
            <select
              id="v-role"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as AssignableRole)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-recovery">Recovery email (optional)</Label>
            <Input
              id="v-recovery"
              type="email"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
            />
          </div>
        </div>
        <Button className="mt-4" onClick={submit} disabled={saving || !canSubmit}>
          {saving ? "Creating…" : "Create account"}
        </Button>

        {issued && (
          <div className="mt-4 rounded-xl border border-primary/40 bg-primary/5 p-4">
            <p className="text-sm font-medium">Share these credentials now — shown only once.</p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-background p-3 text-sm">
              {`Username: ${issued.username}\nPassword: ${issued.password}`}
            </pre>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    `Username: ${issued.username}\nPassword: ${issued.password}`,
                  );
                  toast.success("Copied");
                }}
              >
                Copy
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIssued(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Accounts with access</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Username</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Storefront</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.data?.map((u) => (
                <tr key={u.userId} className="border-t border-border/60">
                  <td className="py-2 pr-4">{u.username ?? "—"}</td>
                  <td className="py-2 pr-4">{u.fullName ?? "—"}</td>
                  <td className="py-2 pr-4">{u.storefrontName ?? "—"}</td>
                  <td className="py-2 pr-4">{u.role ?? "No access"}</td>
                  <td className="py-2 pr-4">
                    <Badge variant={u.isActive ? "default" : "secondary"}>
                      {u.isActive ? "Active" : "Deactivated"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.isLoading && <p className="py-3 text-sm text-muted-foreground">Loading…</p>}
        </div>
      </section>
    </div>
  );
}
