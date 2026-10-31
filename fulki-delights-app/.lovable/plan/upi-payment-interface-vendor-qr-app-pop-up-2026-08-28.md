# UPI Payment Interface (vendor QR + app pop-up)

## Goal
When a customer picks UPI, show a proper payment sheet: the vendor's own QR (uploaded by the vendor in Street OS) plus one-tap buttons that open the customer's UPI app (GPay / PhonePe / Paytm / any) with the amount and reference pre-filled.

## How the "scan via third-party app" works
There is no way for a web app to open a phone's camera *inside* another UPI app, and browsers cannot query which apps are installed. The reliable technique, used by Swiggy/Zomato style flows, is:

1. **Deep-link intents (phone):** tapping a UPI app button navigates to `upi://pay?...` (and app-specific schemes `tez://upi/pay`, `phonepe://pay`, `paytmmp://pay` on Android). The OS shows the app chooser / opens the chosen app with amount + payee pre-filled. This is a "pop-up" from the customer's perspective.
2. **QR (desktop or second phone):** show the vendor's uploaded QR image, or a QR generated from their UPI ID, to be scanned with any UPI app.
3. **Return + confirm:** apps do not report success back to the web page, so after returning the customer taps "I've paid" and the order sits as `payment pending` until the vendor marks it paid in Street OS. Nothing is auto-marked paid.

## What to build

**1. Vendor-uploaded QR support**
- Read a `upi_qr_url` field off the storefront row and, when present, render the vendor's uploaded QR image instead of the generated one (generated QR from `upi_id` stays as fallback).
- This requires one new nullable text column `upi_qr_url` on `storefronts` in the Street OS backend plus the vendor-side upload UI. That side is out of scope for this project; Fulki OS will read it if it exists and silently fall back if it does not.

**2. Payment sheet component (`src/components/UpiPaymentSheet.tsx`)**
- Replaces the current inline `UpiQr` block with a bottom-sheet style panel: amount, order code, vendor name.
- App buttons row: Google Pay, PhonePe, Paytm, "Other UPI app" — each with the right scheme, falling back to `upi://pay` .
- Vendor QR image (uploaded or generated), copyable UPI ID.
- "I've paid" button and "Pay at counter instead" link.
- Mobile shows app buttons first, QR collapsed; desktop shows QR first.

**3. Checkout integration (`src/routes/checkout.tsx`)**
- When payment method is UPI, after the order is accepted by Street OS open the payment sheet immediately on the order page (current behaviour already routes there) with the sheet expanded, instead of a plain QR card.

**4. Order tracking page (`src/routes/order.$orderId.tsx`)**
- Use the new sheet in place of the existing UPI section; keep the "pay at the counter" message when the vendor has neither a QR nor a UPI ID.
- Keep the existing rule: hide the payment block once `payment_status` is `paid` or the order is cancelled.

## Technical notes
- No backend/RLS/server-function changes in this project; storefront reads already return the row, so only the new optional column is read.
- Deep links must be plain `<a href>` navigations (not `window.open`) so mobile browsers hand off to the OS.
- Amount always formatted with 2 decimals; `tn` note carries the order code so the vendor can reconcile.
