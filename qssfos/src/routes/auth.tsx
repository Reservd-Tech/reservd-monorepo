import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpCodeInput } from "@/components/auth/otp-code-input";
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
  const [method, setMethod] = useState<"email" | "sms">("email");
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"send" | "verify">("send");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const requestCode = async () => {
    const email = method === "email" ? toAuthEmail(usernameOrEmail) : undefined;
    const smsPhone = method === "sms" ? phone.trim() : undefined;
    if (smsPhone && !/^\+[1-9]\d{7,14}$/.test(smsPhone)) {
      throw new Error("Enter a phone number in international format, such as +14155550123.");
    }

    const { error } = await supabase.auth.signInWithOtp({
      ...(email ? { email } : { phone: smsPhone! }),
      // Staff and invited vendor accounts must already exist; public login must never sign up.
      options: { shouldCreateUser: false },
    });
    if (error) throw error;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const email = method === "email" ? toAuthEmail(usernameOrEmail) : undefined;
      const smsPhone = method === "sms" ? phone.trim() : undefined;

      if (step === "send") {
        await requestCode();
        setStep("verify");
        setCode("");
        toast.success(
          method === "sms"
            ? "A sign-in code was sent by SMS."
            : "A sign-in code was sent by email.",
        );
        return;
      }

      const { data, error } = await supabase.auth.verifyOtp({
        ...(email ? { email } : { phone: smsPhone! }),
        token: code,
        type: method === "sms" ? "sms" : "email",
      });
      if (error) throw new Error("That code is invalid or expired. Request a new code.");

      const userId = data.user?.id;
      if (!userId) throw new Error("Could not verify this account. Request a new code.");

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", userId)
        .maybeSingle();
      if (profile?.is_active === false) {
        await supabase.auth.signOut();
        throw new Error("This account has been deactivated. Contact your administrator.");
      }

      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const resetCode = () => {
    setStep("send");
    setCode("");
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await requestCode();
      setCode("");
      toast.success(
        method === "sms"
          ? "A new sign-in code was sent by SMS."
          : "A new sign-in code was sent by email.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-heat" />
          <span className="text-lg font-semibold tracking-tight">QSSF OS</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "verify"
              ? "Enter the 6-digit code we sent you."
              : "Sign in to your account with a one-time code."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {step === "send" ? (
              <>
                <div
                  className="grid grid-cols-2 gap-2"
                  role="group"
                  aria-label="Code delivery method"
                >
                  <Button
                    type="button"
                    variant={method === "email" ? "default" : "outline"}
                    aria-pressed={method === "email"}
                    onClick={() => setMethod("email")}
                  >
                    Email
                  </Button>
                  <Button
                    type="button"
                    variant={method === "sms" ? "default" : "outline"}
                    aria-pressed={method === "sms"}
                    onClick={() => setMethod("sms")}
                  >
                    SMS
                  </Button>
                </div>
                {method === "email" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="username-or-email">Username or email</Label>
                    <Input
                      id="username-or-email"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Staff can use the username provided by their administrator.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+14155550123"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="otp-code">6-digit code</Label>
                  <OtpCodeInput
                    id="otp-code"
                    value={code}
                    onChange={setCode}
                    disabled={loading}
                    useSmsAutofill={method === "sms"}
                  />
                </div>
                <Button type="button" variant="link" className="h-auto p-0" onClick={resetCode}>
                  Use a different {method === "sms" ? "phone number" : "username or email"}
                </Button>
              </>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || (step === "verify" && code.length !== 6)}
            >
              {loading
                ? "Please wait..."
                : step === "send"
                  ? "Send sign-in code"
                  : "Verify and sign in"}
            </Button>
          </form>

          {step === "verify" && (
            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
                disabled={loading}
                onClick={handleResend}
              >
                Resend code
              </button>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
