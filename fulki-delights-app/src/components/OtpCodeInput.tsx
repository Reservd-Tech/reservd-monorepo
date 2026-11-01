import { useEffect, useRef } from "react";

import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type OtpChannel = "email" | "sms";

type SmsOtpRequest = CredentialRequestOptions & {
  otp: { transport: ["sms"] };
  signal: AbortSignal;
};

type SmsOtpCredential = Credential & { code: string };

type WebOtpCredentials = CredentialsContainer & {
  get(options: SmsOtpRequest): Promise<SmsOtpCredential | null>;
};

export function OtpCodeInput({
  channel,
  value,
  onChange,
  disabled = false,
}: {
  channel: OtpChannel;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (channel !== "sms" || typeof window === "undefined" || !("OTPCredential" in window)) {
      return;
    }

    const controller = new AbortController();
    const credentials = navigator.credentials as WebOtpCredentials;

    void credentials
      .get({ otp: { transport: ["sms"] }, signal: controller.signal })
      .then((credential) => {
        if (credential) onChangeRef.current(credential.code.replace(/\D/g, "").slice(0, 6));
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.warn("[auth] WebOTP autofill unavailable", error);
        }
      });

    return () => controller.abort();
  }, [channel]);

  return (
    <InputOTP
      autoFocus
      autoComplete="one-time-code"
      inputMode="numeric"
      maxLength={6}
      pattern="[0-9]*"
      value={value}
      onChange={onChange}
      disabled={disabled}
      aria-label="6-digit verification code"
      containerClassName="justify-center gap-2"
    >
      <InputOTPGroup>
        {Array.from({ length: 6 }, (_, index) => (
          <InputOTPSlot key={index} index={index} className="h-12 w-11 rounded-md border" />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
