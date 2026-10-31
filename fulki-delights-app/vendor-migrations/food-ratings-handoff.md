# Street OS food ratings handoff

Consumer integration is prepared, but this contract must be implemented and deployed in Street OS / QSSF OS before ratings can save. Do not apply a consumer database migration. Review and apply `20261020_product_ratings.sql` in the vendor project only; it assumes vendor products/orders have `storefront_id` and order items have `order_id` and `product_id`.

## Read contract

`GET /api/public/orders/:orderId` returns `rating_token` (a cryptographically random or signed, order-scoped capability, minimum 32 characters) only when the write endpoint is available and the order is completed, and `order_items[].rating` as an integer 1–5 or null plus `rating_comment` as string or null. Populate every historical line sharing the same product ID from the same saved product/order rating. Treat tokens and order IDs as bearer capabilities; do not log them or expose them in aggregate responses.

`GET /api/public/menu?slug=...` joins `public.product_rating_summary` by product ID and storefront ID, returning `products[].avg_rating` and `products[].rating_count` (null and 0 for no votes). Use the existing menu response, not another consumer query. Reservd hides stars without valid positive-count summaries and sorts Top rated by average, then count.

## Write contract

`POST /api/public/orders/:orderId/ratings`, authenticated by the existing `x-api-key`, receives `{ itemId, rating, token, comment? }`; success returns `{ itemId, rating, comment }` with the stored trimmed comment or null.

- Validate the scoped token server-side and the order UUID; accept only completed orders. An order ID and a membership check alone do not authenticate the customer, so do not allow direct anonymous inserts.
- Validate integer scores 1–5 and item membership in the order. Derive the product ID from that historical order item, never from its name or client input.
- Store one rating per product per order durably in `public.product_ratings`, enforced by `UNIQUE(order_id, product_id)`. Quantity and duplicate historical lines do not create additional votes. Derive storefront ID from the order and validate the product belongs to that storefront.
- Accept an optional trimmed comment of at most 500 characters; derive any optional customer phone from the authorized order, never client input. Do not expose the raw table or customer phone to public callers.
- Retries of the same score return the existing score; a different score on a rated item returns conflict. Enforce the write atomically to prevent concurrent duplicate votes.
- Include saved ratings in subsequent order reads. Return unavailable if support is not deployed; never issue a capability for a missing endpoint.
- Aggregate only real submitted scores for menu/product displays; no default ratings or fake counts. Do not return tokens, customer details or order IDs in aggregates.
- Apply schema changes in the vendor project, with explicit grants, RLS and privileged-service-only writes following its conventions. Never grant anonymous rating writes. Existing products, orders, order_items and storefronts tables/policies are untouched.

## Exact shared read contract

- Table `public.product_ratings`: `id uuid`, `product_id uuid`, `storefront_id uuid`, `order_id uuid`, `rating smallint`, `comment text`, `customer_phone text`, `created_at timestamptz`. Raw rows are service-only; public callers cannot update or delete.
- View `public.product_rating_summary`: `product_id uuid`, `storefront_id uuid`, `avg_rating numeric(2,1)`, `rating_count int`. Readable by anon/authenticated; no customer phones, comments, order IDs or tokens. Unrated products have no summary row; left join with zero count in the menu response.
- `public.read_product_rating_summary()` is a fixed, parameterless, security-definer aggregate with an empty search path; the view uses security-invoker. This permits safe summary reads without exposing base rows. Review ownership and permissions in the vendor project before applying.

## Acceptance

Verify an actual completed order → choose 1–5 stars and optional comment → save → refresh → read the same score/comment → menu displays updated aggregate and Top rated sorting. Test wrong token, unrelated item/storefront, every non-completed status, out-of-range/noninteger rating, 501-character comments, duplicate products/submissions and concurrent retries. Confirm anon/authenticated cannot read raw rows, insert directly, update or delete, but can read the aggregate view.