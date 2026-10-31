<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Street OS remains the authoritative catalog and order source; vendor migrations are handoff SQL, not applied consumer-database migrations.
- Consumer product rails reuse existing menu query caches and receive kitchen data from their parent, so discovery and location behavior stay independent.
- Reorder joins historical product IDs to the current kitchen menu; never infer IDs or dietary classification from item names.
- Checkout validates current menu totals server-side and submits pending payment only; receipt-backed claims use Street OS reconciliation, while receipt-free showcase declarations are noted honestly without fabricating a UTR. Only vendor confirmation verifies payment.
- Named UPI app controls target Android packages; unsupported devices use QR rather than a generic handler that can open the wrong app.
- Customer presentation uses shared FoodPrimitives and shadcn variants with global semantic tokens so visual changes do not alter queries or ordering logic.
- Onboarding illustrations and CSS animations are isolated presentation demos; keep their completion key and mount contract independent from real cart, payments, and order status.
- Manual location choices overlay device coordinates without changing discovery calculations; Google Places calls require a signed HttpOnly location-access cookie issued only after custom OTP verification and cleared on logout.
- Dish-rating writes use a Street OS-issued order-scoped capability and order-item IDs; enable submissions only when Street OS provides the capability and persist no ratings in consumer storage. Shared rating tables and safe aggregates are vendor SQL handoffs, and menu summaries travel through the existing menu cache, so private raw ratings and discovery behavior stay isolated.
