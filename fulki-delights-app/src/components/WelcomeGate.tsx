import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MailCheck } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import { Onboarding, ONBOARDING_KEY } from "@/components/Onboarding";
import { useCustomer } from "@/lib/customer";
import { syncCustomer } from "@/lib/customer.functions";
import { requestOtp, verifyOtp } from "@/lib/otp.functions";

const RESEND_COOLDOWN = 30;

export function WelcomeGate({ children }: { children: ReactNode }) {
  const { hydrated, onboarded, saveProfile } = useCustomer();
  const sync = useServerFn(syncCustomer);
  const sendCode = useServerFn(requestOtp);
  const checkCode = useServerFn(verifyOtp);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [step, setStep] = useState<"details" | "otp">("details");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [expiresIn, setExpiresIn] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const [intro, setIntro] = useState(false);

  useEffect(() => {
    if (step !== "otp") return;
    const id = setInterval(() => {
      setExpiresIn((v) => (v > 0 ? v - 1 : 0));
      setCooldown((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (step === "otp") codeRef.current?.focus();
  }, [step]);

  if (!hydrated) return <div className="min-h-screen bg-background" />;
  if (onboarded) return <>{children}</>;
  if (intro)
    return (
      <Onboarding
        onDone={() => {
          const trimmed = { name: name.trim(), phone: phone.trim(), email: email.trim() };
          saveProfile(trimmed);
          void sync({ data: { name: trimmed.name, phone: trimmed.phone } }).catch(() => {});
        }}
      />
    );

  const trimmedEmail = email.trim();
  const validName = name.trim().length > 1;
  const validPhone = /^\d{7,15}$/.test(phone.replace(/\D/g, ""));
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const canContinue = validName && validPhone && validEmail && !sending;

  const send = async () => {
    setSending(true);
    setError("");
    try {
      const res = await sendCode({ data: { email: trimmedEmail, name: name.trim() } });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStep("otp");
      setCode("");
      setToken(res.token);
      setExpiresIn(res.expiresInSeconds);
      setCooldown(RESEND_COOLDOWN);
    } catch {
      setError("Something went wrong sending your code. Please try again.");

    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    setVerifying(true);
    setError("");
    try {
      const res = await checkCode({ data: { email: trimmedEmail, code, token } });
      if (!res.ok) {
        setError(res.error);
        setCode("");
        if (res.requiresNewCode) setExpiresIn(0);
        return;
      }
      const trimmed = { name: name.trim(), phone: phone.trim(), email: trimmedEmail };
      let seenIntro = false;
      try {
        seenIntro = !!localStorage.getItem(ONBOARDING_KEY);
      } catch {}
      if (seenIntro) {
        saveProfile(trimmed);
        void sync({ data: { name: trimmed.name, phone: trimmed.phone } }).catch(() => {});
      } else {
        setIntro(true);
      }
    } catch {
      setError("Couldn't verify that code. Please try again.");
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
            <MailCheck className="h-3.5 w-3.5" /> Verify email
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight">
            Enter your <span className="heat-text">code</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            We sent a 6-digit code to <span className="font-semibold text-foreground">{trimmedEmail}</span>.
          </p>
        </header>

        <section className="glass-panel lift mt-10 space-y-4 rounded-lg p-5">
          <input
            ref={codeRef}
            value={code}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            placeholder="••••••"
            className="w-full rounded-md border border-input bg-background px-4 py-4 text-center text-2xl font-extrabold tracking-[0.5em] outline-none ring-ring/60 placeholder:text-muted-foreground focus:ring-2"
          />
          <p className="text-center text-xs text-muted-foreground">
            {expiresIn > 0
              ? `Code expires in ${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, "0")}`
              : "Your code has expired — request a new one."}
          </p>
          {error && <p className="text-center text-xs font-medium text-destructive">{error}</p>}
          <div className="flex items-center justify-between pt-1 text-xs font-semibold">
            <Button
              variant="link" className="text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => {
                setStep("details");
                setError("");
              }}
            >
              Change email
            </Button>
            <Button
              disabled={cooldown > 0 || sending}
              onClick={() => void send()}
              variant="link" className="text-primary disabled:text-muted-foreground"
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
        <Field label="Your name" value={name} onChange={setName} placeholder="Your name" />
        <Field
          label="Email"
          value={email}
          onChange={setEmail}
          placeholder="you@email.com"
          type="email"
        />
        <Field
          label="Phone"
          value={phone}
          onChange={setPhone}
          placeholder="98765 43210"
          inputMode="tel"
        />
        {trimmedEmail !== "" && !validEmail && (
          <p className="text-xs font-medium text-destructive">Enter a valid email address.</p>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  inputMode?: "tel" | "text" | "email";
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
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-4 py-3.5 text-base outline-none ring-ring/60 placeholder:text-muted-foreground focus:ring-2"
      />
    </label>
  );
}
