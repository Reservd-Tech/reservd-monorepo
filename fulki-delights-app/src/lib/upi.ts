/**
 * UPI deep-link construction (NPCI UPI Linking Specification).
 *
 * Nothing here proves payment. A UPI link only *requests* a payment from the
 * customer's PSP app; the vendor app (Street OS) remains the only authority on
 * whether money actually arrived.
 */

export type UpiIntentInput = {
  /** Vendor's VPA, e.g. name@bank. Comes from vendor configuration, never hard-coded. */
  vpa: string;
  /** Vendor's registered payee name. */
  payeeName?: string | null;
  /** Payable amount in INR. */
  amount: number;
  /** Stable, unique reference for this payment attempt. */
  transactionRef: string;
  /** Human-readable note (order code). */
  note?: string | undefined;
};

/** Loose VPA shape check: local@psp, no spaces. */
export function isValidVpa(vpa: string | null | undefined): vpa is string {
  return typeof vpa === "string" && /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z][a-zA-Z0-9.]{1,32}$/.test(vpa.trim());
}

/** UPI tr/tn fields accept a restricted character set; strip anything else. */
function sanitize(value: string, max: number) {
  return value.replace(/[^\w .-]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * Deterministic transaction reference for an order: the same order always
 * yields the same `tr`, so a retry is recognised as the *same* payment attempt
 * by the PSP rather than a second charge.
 */
export function transactionRefForOrder(orderId: string): string {
  return `RSVD${orderId.replace(/-/g, "").toUpperCase()}`.slice(0, 35);
}

/** RFC3986 encoding — URLSearchParams encodes spaces as "+", which some PSP apps mis-parse. */
function enc(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

export type UpiBuildResult =
  | { ok: true; query: string; uri: string; transactionRef: string }
  | { ok: false; reason: "missing_vpa" | "invalid_vpa" | "invalid_amount" };

export function buildUpiIntent(input: UpiIntentInput): UpiBuildResult {
  const vpa = input.vpa?.trim() ?? "";
  if (!vpa) return { ok: false, reason: "missing_vpa" };
  if (!isValidVpa(vpa)) return { ok: false, reason: "invalid_vpa" };
  if (!Number.isFinite(input.amount) || input.amount <= 0) return { ok: false, reason: "invalid_amount" };

  const parts = [
    `pa=${enc(vpa)}`,
    ...(input.payeeName ? [`pn=${enc(sanitize(input.payeeName, 50))}`] : []),
    `tr=${enc(sanitize(input.transactionRef, 35))}`,
    ...(input.note ? [`tn=${enc(sanitize(input.note, 50))}`] : []),
    `am=${input.amount.toFixed(2)}`,
    `cu=INR`,
  ];
  const query = parts.join("&");
  return { ok: true, query, uri: `upi://pay?${query}`, transactionRef: input.transactionRef };
}

/**
 * Android-only chooser-friendly link for a specific PSP app. On other platforms
 * the plain `upi://pay` URI is used so the OS shows every installed UPI app.
 */
export function androidIntentUri(query: string, androidPackage?: string) {
  const pkg = androidPackage ? `package=${androidPackage};` : "";
  return `intent://pay?${query}#Intent;scheme=upi;${pkg}end`;
}

export const UPI_APPS = [
  { key: "gpay", label: "Google Pay", pkg: "com.google.android.apps.nbu.paisa.user", ios: "tez://upi/pay" },
  { key: "phonepe", label: "PhonePe", pkg: "com.phonepe.app", ios: "phonepe://pay" },
  { key: "paytm", label: "Paytm", pkg: "net.one97.paytm", ios: "paytmmp://pay" },
] as const;

export type UpiPlatform = "android" | "ios" | "other";

export function upiPlatform(): UpiPlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  return "other";
}

/**
 * Named app buttons must never hit the generic UPI handler (which may be
 * WhatsApp). Android targets the app package; iOS uses the app's own UPI
 * scheme; other devices fall back to the QR code.
 */
export function targetedUpiLink(query: string, app: typeof UPI_APPS[number]["key"], platform: UpiPlatform): string | null {
  const selected = UPI_APPS.find((candidate) => candidate.key === app);
  if (!selected) return null;
  if (platform === "android") return androidIntentUri(query, selected.pkg);
  if (platform === "ios") return `${selected.ios}?${query}`;
  return null;
}

export function isAndroid() {
  return upiPlatform() === "android";
}

/** Masked VPA for logs: ab***@bank. */
export function maskVpa(vpa: string) {
  const [local = "", psp = ""] = vpa.split("@");
  return `${local.slice(0, 2)}***@${psp}`;
}

/** Dev-only diagnostics. Never logs credentials, PIN, OTP or full VPA in production. */
export function logUpiDiagnostic(event: string, fields: Record<string, unknown>) {
  if (!import.meta.env.DEV) return;
  // eslint-disable-next-line no-console
  console.info(`[upi] ${event}`, fields);
}
