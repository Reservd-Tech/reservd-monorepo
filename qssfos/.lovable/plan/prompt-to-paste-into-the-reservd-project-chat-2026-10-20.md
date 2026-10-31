# Prompt to paste into the reservd project chat

Copy the text below into reservd's Lovable chat. Once reservd starts saving real dish ratings, QSSF OS can read them and show stars on menu items.

```text
Add real customer food ratings (1-5 stars) per menu item. This app shares its backend with QSSF OS (the vendor app), so store ratings where both apps can read them.

1. Database (shared backend, public schema), table `public.product_ratings`:
   - id uuid primary key default gen_random_uuid()
   - product_id uuid not null references public.products(id) on delete cascade
   - storefront_id uuid not null references public.storefronts(id)
   - order_id uuid references public.orders(id)  (the order the rating came from)
   - rating smallint not null check (rating between 1 and 5)
   - comment text (optional, max 500 chars)
   - customer_phone text (optional, to stop duplicate ratings)
   - created_at timestamptz default now()
   - unique (order_id, product_id)  (one rating per dish per order)
   Enable RLS. Anonymous users may INSERT only for a product that was in that order (order_items row exists for order_id + product_id) and only when the order status is 'completed'. Nobody may UPDATE or DELETE from the public side. Do not expose customer_phone publicly.

2. Public summary view `public.product_rating_summary` (product_id, storefront_id, avg_rating numeric(2,1), rating_count int), readable by anon and authenticated. Show this on the menu instead of any fixed or placeholder rating like 4.8. Hide stars when rating_count = 0 and show "New" instead.

3. Customer UI:
   - After an order is completed, the order tracking page asks "Rate your food" with 1-5 stars per dish and an optional comment. Submit once; after that show "Thanks for rating".
   - Menu cards show average stars + count, e.g. "4.6 (23)", and allow sorting by "Top rated" so customers can choose more easily.

4. Do not change the products, orders, order_items or storefronts tables or their existing policies. Remove any hard-coded rating values.

When done, tell me the exact table and view names and columns so the vendor app (QSSF OS) can read them.
```

## After reservd confirms
Tell me here and I will add star ratings and a "Top rated" view to the QSSF OS menu and dashboard, reading from the same summary.
