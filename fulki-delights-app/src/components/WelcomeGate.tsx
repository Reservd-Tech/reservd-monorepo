import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MailCheck, Smartphone } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import { Onboarding, ONBOARDING_KEY } from "@/components/Onboarding";
import { OtpCodeInput } from "@/components/OtpCodeInput";
import { useCustomer } from "@/lib/customer";
import { syncCustomer } from "@/lib/customer.functions";
import { grantVerifiedLocationSession } from "@/lib/otp.functions";
import { supabase } from "@/integrations/supabase/client";

const RESEND_COOLDOWN = 30;
type OtpChannel = "email" | "sms";

function normalizePhone(phone: string) {
  const compact = phone.trim().replace(/[()\s-]/g, "");
  if (/^\+[1-9]\d{6,14}$/.test(compact)) return compact;

  const digits = compact.replace(/\D/g, "");
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  if (/^91\d{10}$/.test(digits)) return `+${digits}`;
  return null;
}

export function WelcomeGate({ children }: { children: ReactNode }) {
  const { hydrated, onboarded, profile, saveProfile } = useCustomer();
  const sync = useServerFn(syncCustomer);
  const grantLocationAccess = useServerFn(grantVerifiedLocationSession);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [step, setStep] = useState<"details" | "otp">("details");
  const [channel, setChannel] = useState<OtpChannel>("email");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [intro, setIntro] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    setName(profile.name);
    setEmail(profile.email);
    setPhone(profile.phone);
  }, [hydrated, profile.email, profile.name, profile.phone]);

  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setAuthenticated(Boolean(session));
      setAuthReady(true);
    });

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) console.error("[auth] session restore failed", sessionError);
      setAuthenticated(Boolean(data.session));
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (step !== "otp") return;
    const id = setInterval(() => {
      setCooldown((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  if (!hydrated || !authReady) return <div className="min-h-screen bg-background" />;
  if (authenticated && onboarded) return <>{children}</>;
  if (intro)
    return (
      <Onboarding
        onDone={() => {
          const trimmed = {
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim(),
          };
          saveProfile(trimmed);
          void sync({ data: { name: trimmed.name, phone: trimmed.phone } }).catch(() => {});
        }}
      />
    );

  const trimmedEmail = email.trim();
  const validName = name.trim().length > 1;
  const normalizedPhone = normalizePhone(phone);
  const validPhone = normalizedPhone !== null;
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const canContinue = validName && validPhone && (channel !== "email" || validEmail) && !sending;

  const send = async () => {
    const recipient =
      channel === "email"
        ? { email: trimmedEmail }
        : normalizedPhone
          ? { phone: normalizedPhone }
          : null;
    if (!recipient) {
      setError("Enter a valid phone number in international format.");
      return;
    }

    setSending(true);
    setError("");
    try {
      const { error: requestError } =
        "email" in recipient
          ? await supabase.auth.signInWithOtp({
              email: recipient.email,
              options: { shouldCreateUser: true },
            })
          : await supabase.auth.signInWithOtp({
              phone: recipient.phone,
              options: { shouldCreateUser: true },
            });
      if (requestError) {
        setError(requestError.message || "We couldn't send a code. Please try again.");
        return;
      }
      setStep("otp");
      setCode("");
      setCooldown(RESEND_COOLDOWN);
    } catch (requestError) {
      console.error("[auth] OTP request failed", requestError);
      setError("Something went wrong sending your code. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    const recipient =
      channel === "email"
        ? { email: trimmedEmail }
        : normalizedPhone
          ? { phone: normalizedPhone }
          : null;
    if (!recipient) {
      setError("Enter a valid phone number in international format.");
      return;
    }

    setVerifying(true);
    setError("");
    try {
      const { data, error: verifyError } =
        "email" in recipient
          ? await supabase.auth.verifyOtp({
              email: recipient.email,
              token: code,
              type: "email",
            })
          : await supabase.auth.verifyOtp({
              phone: recipient.phone,
              token: code,
              type: "sms",
            });
      if (verifyError || !data.session) {
        if (verifyError) console.warn("[auth] OTP verification rejected", verifyError);
        setError("That code is incorrect or expired. Request a new code and try again.");
        setCode("");
        return;
      }

      await grantLocationAccess({ data: { accessToken: data.session.access_token } });
      const trimmed = {
        name: name.trim(),
        phone: phone.trim(),
        email: trimmedEmail,
      };
      let seenIntro = false;
      try {
        seenIntro = !!localStorage.getItem(ONBOARDING_KEY);
      } catch (storageError) {
        console.warn("[auth] couldn't read onboarding state", storageError);
      }
      if (seenIntro) {
        saveProfile(trimmed);
        void sync({ data: { name: trimmed.name, phone: trimmed.phone } }).catch(() => {});
      } else {
        setIntro(true);
      }
    } catch (verifyError) {
      console.error("[auth] OTP verification failed", verifyError);
      setError("We couldn't complete sign-in. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  if (step === "otp") {
    return (
      <div className="ember-bg flex min-h-screen flex-col justify-between px-6 pb-10 pt-16">
        <header className="rise-in">
          <BrandLogo className="mb-8 w-48" />
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-normal text-accent-foreground">
            {channel === "email" ? (
              <MailCheck className="h-3.5 w-3.5" />
            ) : (
              <Smartphone className="h-3.5 w-3.5" />
            )}
            Verify {channel === "email" ? "email" : "phone"}
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight">
            Enter your <span className="heat-text">code</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            We sent a 6-digit code to{" "}
            <span className="font-semibold text-foreground">
              {channel === "email" ? trimmedEmail : normalizedPhone}
            </span>
            .
          </p>
        </header>

        <section className="glass-panel lift mt-10 space-y-4 rounded-lg p-5">
          <OtpCodeInput
            channel={channel}
            value={code}
            onChange={(value) => {
              setCode(value);
              setError("");
            }}
            disabled={verifying}
          />
          <p className="text-center text-xs text-muted-foreground">
            Enter the code before it expires. You can also type it manually.
          </p>
          {error && <p className="text-center text-xs font-medium text-destructive">{error}</p>}
          <div className="flex items-center justify-between pt-1 text-xs font-semibold">
            <Button
              variant="link"
              className="text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => {
                setStep("details");
                setError("");
                setCode("");
              }}
            >
              Change {channel === "email" ? "email" : "phone"}
            </Button>
            <Button
              disabled={cooldown > 0 || sending}
              onClick={() => void send()}
              variant="link"
              className="text-primary disabled:text-muted-foreground"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : sending ? "Sending…" : "Resend code"}
            </Button>
          </div>
        </section>

        <Button
          disabled={code.length !== 6 || verifying}
          onClick={() => void verify()}
          className="press glow mt-8 flex h-auto w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 text-sm font-extrabold text-primary-foreground disabled:opacity-40"
        >
          {verifying && <Loader2 className="h-4 w-4 animate-spin" />}
          Verify & continue
        </Button>
      </div>
    );
  }

  return (
    <div className="ember-bg flex min-h-screen flex-col justify-between px-6 pb-10 pt-16">
      <header className="rise-in">
        <BrandLogo className="w-56" />
        <h1 className="mt-8 text-4xl font-extrabold leading-tight">
          Good food, <span className="heat-text">reserved</span> for you.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Tell us who you are so every order, slot and update is personalised to you.
        </p>
      </header>

      <section className="glass-panel lift mt-10 space-y-4 rounded-lg p-5">
        <Field
          label="Your name"
          value={name}
          onChange={setName}
          placeholder="Your name"
          autoComplete="name"
        />
        <div
          className="grid grid-cols-2 gap-2"
          role="group"
          aria-label="Choose a verification method"
        >
          {(["email", "sms"] as const).map((method) => (
            <button
              key={method}
              type="button"
              aria-pressed={channel === method}
              onClick={() => {
                setChannel(method);
                setError("");
              }}
              className={`rounded-md border px-3 py-2.5 text-sm font-bold transition-colors ${
                channel === method
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-muted-foreground"
              }`}
            >
              {method === "email" ? "Email code" : "Text me a code"}
            </button>
          ))}
        </div>
        <Field
          label="Email"
          value={email}
          onChange={setEmail}
          placeholder="you@email.com"
          type="email"
          autoComplete="email"
        />
        <Field
          label="Phone"
          value={phone}
          onChange={setPhone}
          placeholder="+91 98765 43210"
          inputMode="tel"
          autoComplete="tel"
        />
        <p className="text-xs text-muted-foreground">
          Use +country code for international numbers; Indian 10-digit numbers are accepted.
        </p>
        {channel === "email" && trimmedEmail !== "" && !validEmail && (
          <p className="text-xs font-medium text-destructive">Enter a valid email address.</p>
        )}
        {phone !== "" && !validPhone && (
          <p className="text-xs font-medium text-destructive">Enter a valid phone number.</p>
        )}
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      </section>

      <Button
        disabled={!canContinue}
        onClick={() => void send()}
        className="press glow mt-8 flex h-auto w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 text-sm font-extrabold text-primary-foreground disabled:opacity-40"
      >
        {sending && <Loader2 className="h-4 w-4 animate-spin" />}
        {sending ? "Sending code…" : "Send verification code"}
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  inputMode?: "tel" | "text" | "email";
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-normal text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-4 py-3.5 text-base outline-none ring-ring/60 placeholder:text-muted-foreground focus:ring-2"
      />
    </label>
  );
}
