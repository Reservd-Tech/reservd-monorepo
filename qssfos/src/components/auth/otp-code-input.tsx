import { useEffect, useRef } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface OtpCodeInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  useSmsAutofill?: boolean;
}

export function OtpCodeInput({
  id,
  value,
  onChange,
  disabled = false,
  useSmsAutofill = false,
}: OtpCodeInputProps) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!useSmsAutofill || !window.isSecureContext || !("OTPCredential" in window)) return;

    const controller = new AbortController();
    const readSmsCode = async () => {
      try {
        const credential = (await navigator.credentials.get({
          otp: { transport: ["sms"] },
          signal: controller.signal,
        } as CredentialRequestOptions)) as (Credential & { code?: string }) | null;
        const code = credential?.code?.replace(/\D/g, "").slice(0, 6);
        if (code) onChangeRef.current(code);
      } catch {
        // SMS consent may be dismissed or the request may be aborted when the form changes.
      }
    };

    void readSmsCode();
    return () => controller.abort();
  }, [useSmsAutofill]);

  return (
    <InputOTP
      id={id}
      maxLength={6}
      value={value}
      onChange={onChange}
      disabled={disabled}
      autoFocus
      autoComplete="one-time-code"
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label="6-digit one-time code"
      containerClassName="justify-between"
    >
      <InputOTPGroup className="w-full justify-between">
        {Array.from({ length: 6 }, (_, index) => (
          <InputOTPSlot
            key={index}
            index={index}
            className="h-12 w-11 rounded-md border text-lg first:rounded-md last:rounded-md"
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
