import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createManagedUser,
  deleteManagedUser,
  listManagedUsers,
  resetManagedUserPassword,
  setManagedUserActive,
  updateManagedUser,
  type ManagedUser,
} from "@/lib/admin/users.functions";
import { useAdminStorefronts } from "@/lib/compliance/queries";

const ROLES = ["owner", "manager", "staff"] as const;
type AssignableRole = (typeof ROLES)[number];

const USERNAME_RE = /^[a-z0-9_-]{4,32}$/;
const NO_SHOP = "__none__";

function fmt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function UserManagement() {
  const qc = useQueryClient();
  const shops = useAdminStorefronts();
  const list = useServerFn(listManagedUsers);
  const create = useServerFn(createManagedUser);
  const update = useServerFn(updateManagedUser);
  const reset = useServerFn(resetManagedUserPassword);
  const setActive = useServerFn(setManagedUserActive);
  const deleteUser = useServerFn(deleteManagedUser);

  const users = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => list(),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "users"] });

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [resetUser, setResetUser] = useState<ManagedUser | null>(null);

  const toggleActive = useMutation({
    mutationFn: (u: ManagedUser) => setActive({ data: { userId: u.userId, isActive: !u.isActive } }),
    onSuccess: () => {
      toast.success("Account status updated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (u: ManagedUser) => deleteUser({ data: { userId: u.userId } }),
    onSuccess: () => {
      toast.success("Account deleted");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">User management</h2>
          <p className="text-xs text-muted-foreground">
            Only accounts created here can sign in to StreetVend OS.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          Create user
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="py-2 pr-4">Username</th>
              <th className="py-2 pr-4">Full name</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Store</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Created</th>
              <th className="py-2 pr-4">Last login</th>
              <th className="py-2 pr-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.data?.map((u) => (
              <tr key={u.userId} className="border-t border-border/60">
                <td className="py-2 pr-4 font-medium">{u.username ?? "—"}</td>
                <td className="py-2 pr-4">{u.fullName ?? "—"}</td>
                <td className="py-2 pr-4 capitalize">{u.role?.replace("_", " ") ?? "No role"}</td>
                <td className="py-2 pr-4">{u.storefrontName ?? "—"}</td>
                <td className="py-2 pr-4">
                  <Badge variant={u.isActive ? "default" : "secondary"}>
                    {u.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="py-2 pr-4 text-xs text-muted-foreground">{fmt(u.createdAt)}</td>
                <td className="py-2 pr-4 text-xs text-muted-foreground">{fmt(u.lastLoginAt)}</td>
                <td className="py-2 pr-4">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={u.role === "platform_admin"}
                      onClick={() => setEditUser(u)}
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setResetUser(u)}>
                      Reset password
                    </Button>
                    <Button
                      size="sm"
                      variant={u.isActive ? "outline" : "default"}
                      disabled={toggleActive.isPending || u.isSelf}
                      title={u.isSelf ? "You cannot deactivate your own account" : undefined}
                      onClick={() => toggleActive.mutate(u)}
                    >
                      {u.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={remove.isPending || u.isSelf || u.role === "platform_admin"}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Permanently delete ${u.username ?? "this user"}? Their orders and shop stay, but the login is gone for good.`,
                          )
                        )
                          return;
                        remove.mutate(u);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.isLoading && <p className="py-3 text-sm text-muted-foreground">Loading users…</p>}
        {users.data?.length === 0 && (
          <p className="py-3 text-sm text-muted-foreground">No users yet.</p>
        )}
      </div>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        shops={(shops.data ?? []).map((s) => ({ id: s.id, name: s.brand_name }))}
        onSubmit={async (values) => {
          await create({ data: values });
          toast.success("User created");
          refresh();
        }}
      />

      <EditUserDialog
        user={editUser}
        onClose={() => setEditUser(null)}
        shops={(shops.data ?? []).map((s) => ({ id: s.id, name: s.brand_name }))}
        onSubmit={async (values) => {
          await update({ data: values });
          toast.success("User updated");
          refresh();
        }}
      />

      <ResetPasswordDialog
        user={resetUser}
        onClose={() => setResetUser(null)}
        onSubmit={async (password) => {
          if (!resetUser) return;
          await reset({ data: { userId: resetUser.userId, password } });
          toast.success("Password reset");
        }}
      />
    </section>
  );
}

interface ShopOption {
  id: string;
  name: string;
}

function CreateUserDialog({
  open,
  onOpenChange,
  shops,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shops: ShopOption[];
  onSubmit: (values: {
    username: string;
    fullName: string;
    role: AssignableRole;
    storefrontId: string | null;
    password: string;
    isActive: boolean;
  }) => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AssignableRole>("staff");
  const [shop, setShop] = useState<string>(NO_SHOP);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setUsername("");
    setFullName("");
    setRole("staff");
    setShop(NO_SHOP);
    setPassword("");
    setConfirm("");
    setIsActive(true);
  };

  async function submit() {
    const normalized = username.trim().toLowerCase();
    if (!USERNAME_RE.test(normalized)) {
      toast.error("Username must be 4–32 lowercase letters, numbers, _ or -");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        username: normalized,
        fullName: fullName.trim(),
        role,
        storefrontId: shop === NO_SHOP ? null : shop,
        password,
        isActive,
      });
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || "Could not create the user");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>
            The user signs in with this username and password. No email needed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Username">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="magic_chef"
            />
          </Field>
          <Field label="Full name">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Role">
            <RoleSelect value={role} onChange={setRole} />
          </Field>
          <Field label="Store / vendor">
            <ShopSelect value={shop} onChange={setShop} shops={shops} />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Confirm password">
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
            <span className="text-sm">Active</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Creating…" : "Create user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  user,
  onClose,
  shops,
  onSubmit,
}: {
  user: ManagedUser | null;
  onClose: () => void;
  shops: ShopOption[];
  onSubmit: (values: {
    userId: string;
    fullName: string;
    role: AssignableRole;
    storefrontId: string | null;
  }) => Promise<void>;
}) {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AssignableRole>("staff");
  const [shop, setShop] = useState<string>(NO_SHOP);
  const [busy, setBusy] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  if (user && loadedFor !== user.userId) {
    setLoadedFor(user.userId);
    setFullName(user.fullName ?? "");
    setRole((ROLES as readonly string[]).includes(user.role ?? "")
      ? (user.role as AssignableRole)
      : "staff");
    setShop(user.storefrontId ?? NO_SHOP);
  }

  async function submit() {
    if (!user) return;
    setBusy(true);
    try {
      await onSubmit({
        userId: user.userId,
        fullName: fullName.trim() || (user.username ?? "User"),
        role,
        storefrontId: shop === NO_SHOP ? null : shop,
      });
      onClose();
    } catch (e) {
      toast.error((e as Error).message || "Could not update the user");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={Boolean(user)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {user?.username}</DialogTitle>
          <DialogDescription>Change the name, role or assigned store.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Full name">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Role">
            <RoleSelect value={role} onChange={setRole} />
          </Field>
          <Field label="Store / vendor">
            <ShopSelect value={shop} onChange={setShop} shops={shops} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  user,
  onClose,
  onSubmit,
}: {
  user: ManagedUser | null;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await onSubmit(password);
      setPassword("");
      setConfirm("");
      onClose();
    } catch (e) {
      toast.error((e as Error).message || "Could not reset the password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={Boolean(user)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set a new password for {user?.username}. Share it with them securely.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="New password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Confirm password">
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Reset password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function RoleSelect({
  value,
  onChange,
}: {
  value: AssignableRole;
  onChange: (v: AssignableRole) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as AssignableRole)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} value={r} className="capitalize">
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ShopSelect({
  value,
  onChange,
  shops,
}: {
  value: string;
  onChange: (v: string) => void;
  shops: ShopOption[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="No store" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_SHOP}>No store</SelectItem>
        {shops.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
