# QSSF Lite: shared Rush Mode integration

## Goal
Make QSSF Lite (Orderly Eats) a fast, mobile-first companion to StreetVend OS. Both apps handle the **same orders**, use the same vendor accounts and shop permissions, and show changes made on either device. Keep the Lite experience focused on orders, not a menu catalog or cart.

## Where the work happens
- Implement the mobile screens and integration in **QSSF Lite’s project chat**. This chat can inspect its source but cannot push changes into that project.
- Reuse the shared Lovable Cloud backend. Do not copy orders, create another role system, or request a service-role key.
- Change StreetVend OS/shared backend only if the integration checks identify a missing safeguard or permission. Preserve reservd’s existing public customer access.

## Confirmed gaps in QSSF Lite today
- Lite already signs in to the shared backend and displays New, Preparing and Ready sections, so this is an upgrade—not a rebuild.
- Its current `useTodaysOrders` excludes older active orders. Replace the date cutoff with the active, unarchived query.
- Its “Mark Ready” directly changes order status without item preparation accounting. Replace that action with the preparation RPC workflow.
- Existing status actions update optimistically without checking the prior stage or returned affected row. Add validated, race-safe acceptance/rejection/pickup handling; if current shared permissions cannot guarantee this, add a narrow authenticated RPC in StreetVend OS first.
- Current subscriptions are unfiltered. Add shop scoping, cleanup and connection-recovery feedback.
- Lite has a separate QSSF client as well as generated backend clients, and its local migrations describe a different order schema. Keep order/auth calls on the confirmed shared client; do not apply incompatible local migrations to the shared backend or assume generated server helpers use the same session.
- Lite currently displays payment details but does not change payments. Add receipt-review controls only through the existing authorized shared payment flow after confirming its permissions.

## Mobile workflow
Use three sticky stage tabs with live counts, showing one stage at a time:

1. **Incoming** — customer/order number, pickup slot, waiting time and concise ordered-item summary. Normal mode supports individual acceptance/rejection; Rush Mode groups incoming demand by item.
2. **Production Queue** — accepted items grouped by product, showing units waiting, cooking and prepared. Large quantity controls support batch **Start** and **Mark prepared**. Keep order details available without cluttering the queue.
3. **Ready for Pickup** — complete customer orders only, with a prominent pickup/completion action. Completed orders leave the active queue and remain in existing history/archive storage.

Keep tabs reachable during scrolling, preserve the current tab after updates, prevent overlapping submissions and use touch targets of at least 44px. Retain the Lite app’s visual identity, with light/dark choices and dark default.

## Safe Rush Mode
- Group pending demand by menu item without treating it as accepted production.
- Enter a capacity and request the existing **server-generated oldest-first preview**. Show selected orders, all their items and any unused capacity.
- Accept **whole customer orders only**. A mixed order brings its other items into production too; never split it or alter its quantities, totals or payment state.
- Commit using the exact preview snapshot. If another device changes an order, reject the stale confirmation, refresh and request a new preview; do not silently accept a different set.
- Acceptance moves orders into production but does **not** mean cooking has started. Preparation is a separate quantity-based action.
- Mark an order Ready only once every ordered unit is prepared. Do not use a shortcut that bypasses production accounting.
- Rush Mode is a per-device display preference, not a shared shop status.

## Shared state, payments and connectivity
- Load every unarchived active order, including orders from previous days; never limit the queue to today.
- Scope reads, subscriptions and actions to the selected authorized shop. Clear old-shop data and selection when switching shops.
- Subscribe to order and order-item changes; also observe shop intake state. Refetch after mutations, on focus/reconnection and periodically as a fallback. Remove subscriptions on unmount/shop changes.
- Show connection state and stale data clearly. Offline users may inspect cached orders, but cannot submit queued accept/preparation/payment actions that could replay later.
- Preserve the existing UPI claim review: confirming receipt is separate from cooking and pickup. Do not infer payment from a customer claim or a stage change.
- Pause/resume intake updates the shared shop `is_open` value; this affects both apps and customer ordering. Start with manual resume only—timed auto-resume is not currently implemented.

## Technical integration
### Existing contracts to reuse
- Tables: `orders`, `order_items`, `products`, `storefronts`, existing `profiles` and `user_roles`.
- Active statuses: `pending`, `preparing`, `ready`; terminal statuses remain `completed` and `cancelled`.
- Item counters: `quantity`, `quantity_preparing`, `quantity_prepared`.
- `bulk_accept_item_orders(p_product_id, p_capacity, p_expected?)`: omit the expected snapshot for preview; commit with the returned `snapshot`. Parse the typed result: `snapshot`, `orders`, `quantity`, `remaining`, `committed`.
- `start_item_preparation(p_product_id, p_quantity)` and `mark_item_prepared(p_product_id, p_quantity)`: use existing authorized FIFO allocation and automatic full-order readiness. Display actual allocated quantity returned by the call.
- Reuse typed production aggregation and acceptance schemas from StreetVend OS in a small Lite module; keep the shared backend authoritative rather than recreating allocation in the browser.

### Authentication and authorization
- Keep username/password sign-in and the existing deterministic username mapping; preserve any established compatibility for email input. No new signup or sign-in provider.
- Use the shared public client configuration plus the signed-in user’s session. No privileged key in either browser.
- Verify active account, assigned role and selected-shop access through existing server/RLS enforcement, not only visible controls.
- Regenerate/check Lite’s database types against the shared schema before introducing the new fields/RPC calls. Validate RPC responses and show recoverable errors rather than a blank screen.

## Delivery order
1. Check Lite’s current authentication, order query, status actions and subscriptions against the shared contracts; verify actual hosted access and RPC availability. Extend its current role check with inactive-account enforcement, and confirm server helpers use the shared user session before reusing them.
2. Add typed active-order and production/Rush integration; replace any incompatible legacy stage writes.
3. Build the three compact mobile views, confirmation sheets, live counts and payment/intake controls.
4. Verify with authorized test orders across **Lite and StreetVend OS**; publish each changed app only after validation and explicit permission.

## Acceptance checks
- Older active orders appear; completed/archived orders do not.
- Preview → accept → start quantity → mark prepared → Ready → pickup works and reads back correctly in both apps.
- Mixed orders remain whole; acceptance/preparation leave totals and payment unchanged.
- Two devices committing the same preview yield one valid acceptance and a stale-preview error, not duplicate acceptance.
- Concurrent preparation never exceeds ordered quantity; partially prepared mixed orders never enter Ready.
- Wrong-shop, roleless and inactive users cannot act on orders.
- Live counts update after changes from either app and recover after connection loss.
- Mobile widths from 360px through the current 550px view have no overlapping controls or horizontal scrolling.
- Run focused logic tests and repeated peak-load/concurrent-session checks; report measured results rather than claiming unlimited capacity.

## Limits
The existing three-stage structure is feasible, but sustained peak-load capacity and complete two-device coverage are **not yet verified**. Timed intake resume and food ratings are outside this integration. No app changes or publication are included in this planning step.