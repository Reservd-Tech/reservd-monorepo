import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";

const USERNAME_DOMAIN = "users.streetvend.internal";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — QSSF OS" },
      { name: "description", content: "Sign in to your QSSF OS vendor dashboard." },
      { property: "og:title", content: "Sign in — QSSF OS" },
      {
        property: "og:description",
        content: "Access your street food operating system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

/** Usernames map to a deterministic internal address; admins may use an email. */
function toAuthEmail(identifier: string): string {
  const value = identifier.trim().toLowerCase();
  return value.includes("@") ? value : `${value}@${USERNAME_DOMAIN}`;
}

function AuthPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: toAuthEmail(username),
        password,
      });
      if (error) throw new Error("Incorrect username or password");

      const userId = data.user?.id;
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_active")
          .eq("id", userId)
          .maybeSingle();
        if (profile && profile.is_active === false) {
          await supabase.auth.signOut();
          throw new Error("This account has been deactivated. Contact your administrator.");
        }
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-heat" />
          <span className="text-lg font-semibold tracking-tight">QSSF OS</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in with the username your administrator gave you.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
