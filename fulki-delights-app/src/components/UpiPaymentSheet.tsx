import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Check, ChevronDown, Copy, ShieldCheck, Smartphone } from "lucide-react";

import {
  buildUpiIntent,
  logUpiDiagnostic,
  maskVpa,
  transactionRefForOrder,
  targetedUpiLink,
  upiPlatform,
  UPI_APPS,
} from "@/lib/upi";
import { Button } from "@/components/ui/button";

type Props = {
  beforeOrder?: boolean;
  /** Order this payment attempt belongs to — used to derive a stable `tr`. */
  orderId: string;
  upiId: string | null;
  payeeName?: string | null;
  /** Vendor-uploaded QR image from the backend, if any. */
  qrImageUrl?: string | null;
  amount: number;
  /** Order code, sent as the UPI note so the vendor can reconcile. */
  note?: string;
  brandName: string;
  /** Fired when the customer taps "I've paid" — used to refresh order status. */
  onMarkedPaid?: () => void;
  /** UTR / UPI reference already saved for this order. */
  savedReference?: string | null;
  /** Persist the reference; a rejected promise shows an inline error and keeps the input filled. */
  onSaveReference?: (reference: string) => void | Promise<void>;
  /** Temporary showcase continuation; a declaration is not payment verification. */
  onPaidWithoutReference?: () => void | Promise<void>;
  /** Fired with the UPI app name when the customer opens a deep link. */
  onAppSelected?: (app: string) => void;
};

const BUILD_ERRORS: Record<string, string> = {
  missing_vpa: "hasn't published a UPI ID yet",
  invalid_vpa: "has an invalid UPI ID saved",
  invalid_amount: "order amount looks invalid",
};

export function UpiPaymentSheet({
  beforeOrder = false,
  orderId,
  upiId,
  payeeName,
  qrImageUrl,
  amount,
  note,
  brandName,
  onMarkedPaid,
  savedReference,
  onSaveReference,
  onPaidWithoutReference,
  onAppSelected,
}: Props) {

  const [generated, setGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [claimedPaid, setClaimedPaid] = useState(Boolean(savedReference));
  const [qrOpen, setQrOpen] = useState(false);
  const [reference, setReference] = useState(savedReference ?? "");
  const [refSaved, setRefSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [noAppFound, setNoAppFound] = useState(false);
  const handoffTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const built = useMemo(
    () =>
      buildUpiIntent({
        vpa: upiId ?? "",
        payeeName: payeeName ?? brandName,
        amount,
        transactionRef: transactionRefForOrder(orderId),
        note,
      }),
    [upiId, payeeName, brandName, amount, orderId, note],
  );

  const query = built.ok ? built.query : null;
  const buildError = built.ok ? null : built.reason;

  useEffect(() => {
    if (!built.ok) return;
    logUpiDiagnostic("intent_built", {
      orderId,
      vpa: maskVpa(upiId ?? ""),
      amount: amount.toFixed(2),
      transactionRef: built.transactionRef,
      uri: `upi://pay?${built.query.replace(/pa=[^&]+/, "pa=***")}`,
    });
  }, [built, orderId, upiId, amount]);

  useEffect(() => () => {
    if (handoffTimer.current) clearTimeout(handoffTimer.current);
  }, []);

  /** If the page never loses focus after a deep link, no UPI app handled it. */
  const watchHandoff = () => {
    setNoAppFound(false);
    if (handoffTimer.current) clearTimeout(handoffTimer.current);
    let handed = false;
    const onHide = () => {
      handed = true;
      document.removeEventListener("visibilitychange", onHide);
    };
    document.addEventListener("visibilitychange", onHide);
    handoffTimer.current = setTimeout(() => {
      document.removeEventListener("visibilitychange", onHide);
      if (!handed) {
        setNoAppFound(true);
        setQrOpen(true);
      }
    }, 2500);
  };

  useEffect(() => {
    if (!query) {
      setGenerated(null);
      return;
    }
    let alive = true;
    QRCode.toDataURL(`upi://pay?${query}`, {
      width: 512,
      margin: 1,
      color: { dark: "#0b0b0f", light: "#ffffff" },
    })
      .then((url) => alive && setGenerated(url))
      .catch(() => alive && setGenerated(null));
    return () => {
      alive = false;
    };
  }, [query]);

  // A generated QR carries this checkout's amount and reference, unlike a static vendor image.
  const qrSrc = generated || qrImageUrl;

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-normal text-muted-foreground">
            Pay {brandName}
          </h2>
          <p className="heat-text mt-1 text-3xl font-extrabold tracking-normal">₹{amount.toFixed(2)}</p>
          {note ? <p className="text-xs text-muted-foreground">Ref {note}</p> : null}
        </div>
        <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold text-secondary-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> UPI
        </span>
      </div>

      {query ? (
        <>
          <p className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Smartphone className="h-3.5 w-3.5" /> Open in your UPI app
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {UPI_APPS.map((app) => (
              <Button
                variant="secondary"
                key={app.key}
                 // Android targets the app package, iOS the app's UPI scheme; other devices use QR.
                onClick={() => {
                  const href = targetedUpiLink(query, app.key, upiPlatform());
                  if (!href) {
                    setNoAppFound(true);
                    setQrOpen(true);
                    return;
                  }
                  onAppSelected?.(app.label);
                  logUpiDiagnostic("intent_launched", { orderId, app: app.label });
                  watchHandoff();
                  window.location.assign(href);
                }}
                className="press h-auto whitespace-normal rounded-lg px-3 py-3.5 text-center text-sm font-bold"
              >
                {app.label}
              </Button>
            ))}
          </div>

          {noAppFound ? (
            <p className="mt-3 rounded-lg bg-accent px-4 py-3 text-xs font-semibold text-muted-foreground">
              We couldn't open a UPI app on this device. Scan the QR code below with your
              phone's UPI app instead.
            </p>
          ) : null}

          <Button
            type="button"
            onClick={() => setQrOpen((v) => !v)}
            className="press mt-4 flex h-auto w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-sm font-semibold"
            aria-expanded={qrOpen}
          >
            <span>Or scan the QR code</span>
            <ChevronDown className={"h-4 w-4 transition-transform " + (qrOpen ? "rotate-180" : "")} />
          </Button>

          {qrOpen ? (
            <div className="mt-4 flex flex-col items-center">
              <div className="rounded-lg bg-card p-3">
                {qrSrc ? (
                  <img
                    src={qrSrc}
                    alt={`UPI QR code to pay ${payeeName ?? upiId}`}
                    className="h-48 w-48 object-contain" loading="lazy" decoding="async"
                  />
                ) : (
                  <div className="h-48 w-48 animate-pulse rounded-lg bg-muted" />
                )}
              </div>
              <p className="mt-3 text-sm font-bold">{payeeName ?? brandName}</p>
              {upiId ? (
                <Button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(upiId);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1600);
                  }}
                  variant="ghost" className="press mt-1 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                >
                  {upiId}
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      ) : qrImageUrl ? (
        <div className="mt-5 flex flex-col items-center">
          <div className="rounded-lg bg-card p-3">
            <img src={qrImageUrl} alt={`UPI QR code for ${brandName}`} className="h-48 w-48 object-contain" loading="lazy" decoding="async" />
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Scan with any UPI app and pay ₹{amount.toFixed(2)}.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          {brandName} {BUILD_ERRORS[buildError ?? "missing_vpa"]}. Online payment is unavailable. Please contact the kitchen.
        </p>
      )}

      {query || qrImageUrl ? (
        <>
          <Button
            type="button"
            onClick={async () => {
              if (beforeOrder && onPaidWithoutReference) {
                if (saving) return;
                setSaving(true);
                setSaveError(null);
                try {
                  await onPaidWithoutReference();
                } catch (error) {
                  setSaveError(error instanceof Error ? error.message : "Couldn't place your order. Please try again.");
                } finally {
                  setSaving(false);
                }
                return;
              }
              setClaimedPaid(true);
              onMarkedPaid?.();
            }}
            disabled={claimedPaid || saving}
            className="press mt-5 h-auto w-full rounded-lg bg-primary py-3.5 text-sm font-extrabold text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Placing order…" : claimedPaid ? "Payment verification pending" : "I've paid"}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {claimedPaid
              ? `${brandName} will confirm your payment.${beforeOrder ? " Enter your UPI reference to submit your order." : " Do not pay again."}`
              : beforeOrder && onPaidWithoutReference ? "UTR optional for now. Your payment stays pending until the kitchen confirms it." : "Complete the payment in your UPI app, then enter the reference from your receipt."}
          </p>
          {saveError && !claimedPaid ? <p role="alert" className="mt-2 text-xs font-semibold text-destructive">{saveError}</p> : null}

          {claimedPaid ? (
            <form
              className="mt-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const value = reference.trim();
                if (!value || saving) return;
                setSaving(true);
                setSaveError(null);
                try {
                  await onSaveReference?.(value);
                  setRefSaved(true);
                  setTimeout(() => setRefSaved(false), 2000);
                  onMarkedPaid?.();
                } catch (error) {
                  setSaveError(
                    error instanceof Error && error.message
                      ? error.message
                      : "Couldn't save your reference. Please try again.",
                  );
                } finally {
                  setSaving(false);
                }
              }}
            >
              <label
                htmlFor="upi-utr"
                className="text-xs font-bold uppercase tracking-normal text-muted-foreground"
              >
                UPI reference / UTR
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="upi-utr"
                  value={reference}
                  onChange={(e) => {
                    setReference(e.target.value);
                    setSaveError(null);
                  }}
                  inputMode="numeric"
                  maxLength={32}
                  placeholder="e.g. 412345678901"
                  className="min-w-0 flex-1 rounded-lg bg-accent px-4 py-3 text-sm font-semibold outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40"
                />
                <Button
                  variant="secondary"
                  type="submit"
                  disabled={!reference.trim() || saving}
                  className="press h-auto shrink-0 rounded-lg px-4 py-3 text-sm font-bold disabled:opacity-50"
                >
                  {saving ? "…" : refSaved ? <Check className="h-4 w-4" /> : beforeOrder ? "Confirm & order" : "Save"}
                </Button>
              </div>
              {saveError ? (
                <p className="mt-2 text-xs font-semibold text-destructive">{saveError}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                Found in your UPI app's payment receipt. Helps {brandName} match your payment faster.
              </p>
            </form>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
