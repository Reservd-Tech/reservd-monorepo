# Reservd UX Redesign — Cream/Maroon Theme

## Goal

Reskin the consumer app to match the warm, clean reference UI: cream background, maroon accents, rounded cards, minimal typography, and a cohesive "Reservd" brand feel. Keep the existing feature set exactly as it works today (pickup only, UPI payment, OTP welcome gate, 15-minute IST slots).

## Scope

Reskin only. No backend, schema, auth, or server-function changes.

- Welcome gate (name/email/phone + OTP verification)
- Home screen
- Menu screen
- Cart screen
- Checkout screen
- Order tracking screen + UPI payment sheet
- Orders history screen
- Profile screen
- Bottom navigation

## Out of scope

- Table reservations
- Delivery / address book
- Receipt download
- Post-order rating screen
- New payment methods beyond UPI

## Visual system

```text
Background    warm cream        #FAF8F5  (oklch light)
Surface       off-white         #FFFFFF / #FDFBF7
Primary       deep maroon       #6B1F2A
Primary-foreground  cream/white
Secondary     light cream       #F5F0E8
Muted         warm gray         #8C837D
Border        soft taupe        #E8E2D9
Success       muted green       #3D6B4F
Destructive   brick red         #B23A3A

Radius: keep 2xl/3xl rounded language.
Typography: keep Plus Jakarta Sans body, switch display/headings to a clean rounded sans (e.g., Bricolage Grotesque or similar) and use a script/wordmark treatment for the Reservd logo.
Shadows: replace dark lift/glow with soft warm shadows on light surfaces.
```

## Screen changes

### 1. Theme foundation
- Update `src/styles.css` tokens to the cream/maroon palette.
- Replace dark utilities (`ember-bg`, `glass-panel`, `heat-text`) with light-theme equivalents.
- Remove or disable dark-mode variant so the app is light-only.

### 2. Brand logo
- Generate or create a Reservd script wordmark logo (maroon, with the location-pin motif from the reference) and place it in `public/` or `src/assets/`.
- Use the logo on the welcome gate and home screen; fall back to styled text if unavailable.

### 3. Welcome gate
- Light cream background with the Reservd logo centered at top.
- Details step: clean card with warm input fields and a maroon CTA.
- OTP step: 6-digit code input restyled to match the reference's minimal look.

### 4. Home
- Greeting card: "Hi, [name]" in large friendly type.
- Featured restaurant card: cream surface, maroon accents, vendor cover/ logo, "View menu" action.
- Keep single-restaurant focus for Fulki / the live storefront.

### 5. Menu
- Hero with vendor cover image and logo, overlaid on cream background.
- Menu item cards: horizontal layout with product image on the right, maroon "+" add button, stepper appears after add (per current behaviour).
- Floating cart bar restyled to cream/maroon.

### 6. Cart
- Clean item list with product thumbnails.
- Stepper and remove actions restyled.
- Bill breakdown in a light card with maroon total.
- Sticky "Order now" bar at bottom.

### 7. Checkout
- Reskin the slot selector, day chips, and time grid in cream/maroon.
- Customer fields and order-type toggle restyled.
- UPI-only payment notice as a simple selected row (no cash option).
- Error/retry block kept, visually calmer.

### 8. Order tracking + UPI payment sheet
- Success confirmation with maroon checkmark.
- Timeline restyled for light theme.
- UPI payment sheet: cream card, maroon app buttons, vendor QR image, UTR input.
- Payment confirmation block uses the new palette.

### 9. Orders history
- Order list cards on cream surface with status badges.
- Maroon chevron and live-pulse indicator.

### 10. Profile
- Avatar block with maroon accent background.
- Input fields and save action in cream/maroon.
- Logout button as a subtle text action.

### 11. Bottom navigation
- Cream pill bar with maroon active state and soft shadow.
- Cart badge uses maroon background.

## Technical details

- All color changes go through `src/styles.css` semantic tokens; no hardcoded hex values in components.
- Preserve `WelcomeGate` OTP logic, `useCustomer` state, cart logic, slot generation, and Street OS order placement.
- Keep `UpiPaymentSheet` deep-link and UTR behaviour; only update visuals.
- Ensure bottom nav remains hidden on cart/checkout.
- Generate the logo as a transparent PNG if needed.
- Verify the build after the theme switch and run a quick preview check on home, menu, and checkout.
