# OTP Verification for Reservd Welcome Screen

## Current state (verified)

- Email sender domain `notify.reservd.store` is configured but still in **DNS verification** (up to 72 hours). Emails cannot actually send until verification completes.
- No email templates or send helper exist in this project yet.
- The welcome screen (`WelcomeGate`) collects name/email/phone and saves locally + syncs to the backend, but **no OTP step exists**.

## Plan

1. **Scaffold app-email support** (safe to do now, before DNS finishes):
   - Create the template registry, server-only send helper, and a branded "Your Reservd code" email template (dark orange Reservd branding, large 6-digit code).

2. **OTP flow on the welcome screen:**
   - After the user enters name/email/phone and taps "Start ordering", a server function generates a 6-digit code, stores it hashed with a 10-minute expiry, and emails it to the entered address.
   - A second step appears on the welcome screen: 6-digit code input with auto-advance boxes, a Verify button, a Resend link (30s cooldown), and a "change email" back option.
   - A verify server function checks the code (max 5 attempts, then regenerate required). On success the profile is marked verified and the app unlocks.
   - Skip-on-failure guard: if the email cannot send (e.g. domain still verifying), show a clear error and let the user retry — no silent bypass.

3. **Security details:**
   - Codes stored server-side only, hashed, single-use, 10-minute TTL.
   - Rate limit: max 3 sends per email per 10 minutes.
   - Verification state tied to the profile so refresh doesn't force re-verification within the session's validity.

## Note on timing

Scaffolding and the OTP UI/logic can be built immediately, but **real OTP emails will only arrive once DNS verification for notify.reservd.store completes** (status visible in Cloud → Emails). Until then the flow will show the send error.

## Technical details

- Scaffold via the managed app-email tooling; templates live in `src/lib/email-templates/`.
- OTP generate/verify as `createServerFn` functions in `src/lib/otp.functions.ts`; code store in memory/cache server-side (no new database tables).
- No changes to the shared Street OS backend or its schema.
