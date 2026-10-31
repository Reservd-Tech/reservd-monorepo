-- HANDOFF ONLY: review and apply in Street OS / QSSF OS, never in Reservd.
-- Assumes products.storefront_id, orders.storefront_id and
-- order_items(order_id, product_id) exist in the vendor schema.
-- No existing catalog/order tables or policies are modified.
BEGIN;

CREATE TABLE public.product_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  storefront_id uuid NOT NULL REFERENCES public.storefronts(id),
  order_id uuid REFERENCES public.orders(id),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (char_length(comment) <= 500),
  customer_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_ratings_order_product_unique UNIQUE (order_id, product_id)
);
GRANT SELECT, INSERT ON public.product_ratings TO service_role;
REVOKE ALL ON public.product_ratings FROM PUBLIC, anon, authenticated;
ALTER TABLE public.product_ratings ENABLE ROW LEVEL SECURITY;
-- No public raw-row policies: neither customer phones nor comments/order IDs
-- are readable publicly. No public INSERT, UPDATE or DELETE permissions.

CREATE FUNCTION public.validate_product_rating_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.order_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    JOIN public.products p ON p.id = oi.product_id
    WHERE o.id = NEW.order_id AND o.status = 'completed'
      AND oi.product_id = NEW.product_id
      AND o.storefront_id = NEW.storefront_id
      AND p.storefront_id = NEW.storefront_id
  ) THEN
    RAISE EXCEPTION 'Rating requires a completed order containing this product';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_product_rating_insert() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER validate_product_rating_insert BEFORE INSERT ON public.product_ratings
FOR EACH ROW EXECUTE FUNCTION public.validate_product_rating_insert();

-- Only this fixed, parameterless aggregate function can read private rows for
-- public summaries. No caller-supplied SQL or private columns are returned.
-- The view is security_invoker; the narrowly scoped function is the explicit
-- privileged boundary, not a view that accidentally exposes base-table rows.
CREATE FUNCTION public.read_product_rating_summary()
RETURNS TABLE (product_id uuid, storefront_id uuid, avg_rating numeric(2,1), rating_count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT r.product_id, r.storefront_id,
    round(avg(r.rating), 1)::numeric(2,1), count(*)::int
  FROM public.product_ratings r
  GROUP BY r.product_id, r.storefront_id;
$$;
REVOKE ALL ON FUNCTION public.read_product_rating_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_product_rating_summary() TO anon, authenticated, service_role;

CREATE VIEW public.product_rating_summary WITH (security_invoker = true) AS
SELECT product_id, storefront_id, avg_rating, rating_count
FROM public.read_product_rating_summary();
GRANT SELECT ON public.product_rating_summary TO anon, authenticated, service_role;

COMMIT;