ALTER TABLE public.order_items
  ADD COLUMN quantity_preparing integer NOT NULL DEFAULT 0,
  ADD COLUMN quantity_prepared integer NOT NULL DEFAULT 0;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_preparing_nonnegative CHECK (quantity_preparing >= 0),
  ADD CONSTRAINT order_items_prepared_nonnegative CHECK (quantity_prepared >= 0),
  ADD CONSTRAINT order_items_prep_within_quantity CHECK (quantity_preparing + quantity_prepared <= quantity);

-- Backfill: items of orders already past preparation count as prepared so they never re-enter the queue.
UPDATE public.order_items oi
SET quantity_prepared = oi.quantity
FROM public.orders o
WHERE o.id = oi.order_id AND o.status IN ('ready', 'completed');

-- Verifies the caller may operate the storefront that owns the given product.
CREATE OR REPLACE FUNCTION public.caller_owns_product(_product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.storefronts s ON s.id = p.storefront_id
    WHERE p.id = _product_id
      AND (public.is_platform_admin()
           OR p.storefront_id = public.current_storefront_id()
           OR s.owner_id = auth.uid())
  )
$$;

REVOKE ALL ON FUNCTION public.caller_owns_product(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.caller_owns_product(uuid) TO authenticated;

-- Start preparation for up to p_quantity units of a product, FIFO across the
-- oldest eligible order-item lines of the caller's storefront. Returns units started.
CREATE OR REPLACE FUNCTION public.start_item_preparation(p_product_id uuid, p_quantity integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining integer;
  line RECORD;
  take integer;
  started integer := 0;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be a positive integer';
  END IF;
  IF NOT public.caller_owns_product(p_product_id) THEN
    RAISE EXCEPTION 'Not authorized for this product';
  END IF;
  remaining := p_quantity;
  FOR line IN
    SELECT oi.id, oi.quantity - oi.quantity_preparing - oi.quantity_prepared AS outstanding
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.product_id = p_product_id
      AND o.status = 'preparing'
      AND o.archived_at IS NULL
      AND oi.quantity - oi.quantity_preparing - oi.quantity_prepared > 0
    ORDER BY o.created_at ASC, oi.created_at ASC
    FOR UPDATE OF oi
  LOOP
    EXIT WHEN remaining <= 0;
    take := LEAST(remaining, line.outstanding);
    UPDATE public.order_items SET quantity_preparing = quantity_preparing + take WHERE id = line.id;
    remaining := remaining - take;
    started := started + take;
  END LOOP;
  IF started = 0 THEN
    RAISE EXCEPTION 'No outstanding units to prepare for this item';
  END IF;
  RETURN started;
END;
$$;

REVOKE ALL ON FUNCTION public.start_item_preparation(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.start_item_preparation(uuid, integer) TO authenticated;

-- Mark up to p_quantity in-preparation units of a product as prepared, FIFO.
-- Orders whose every line is fully prepared become ready. Returns units marked.
CREATE OR REPLACE FUNCTION public.mark_item_prepared(p_product_id uuid, p_quantity integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining integer;
  line RECORD;
  take integer;
  marked integer := 0;
  v_storefront uuid;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be a positive integer';
  END IF;
  IF NOT public.caller_owns_product(p_product_id) THEN
    RAISE EXCEPTION 'Not authorized for this product';
  END IF;
  SELECT storefront_id INTO v_storefront FROM public.products WHERE id = p_product_id;
  remaining := p_quantity;
  FOR line IN
    SELECT oi.id, oi.quantity_preparing
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.product_id = p_product_id
      AND o.status = 'preparing'
      AND o.archived_at IS NULL
      AND oi.quantity_preparing > 0
    ORDER BY o.created_at ASC, oi.created_at ASC
    FOR UPDATE OF oi
  LOOP
    EXIT WHEN remaining <= 0;
    take := LEAST(remaining, line.quantity_preparing);
    UPDATE public.order_items
    SET quantity_preparing = quantity_preparing - take,
        quantity_prepared = quantity_prepared + take
    WHERE id = line.id;
    remaining := remaining - take;
    marked := marked + take;
  END LOOP;
  IF marked = 0 THEN
    RAISE EXCEPTION 'No in-preparation units to mark ready for this item';
  END IF;
  -- An order is ready only when every line is fully prepared.
  UPDATE public.orders o
  SET status = 'ready', ready_at = now(), updated_at = now()
  WHERE o.storefront_id = v_storefront
    AND o.status = 'preparing'
    AND NOT EXISTS (
      SELECT 1 FROM public.order_items oi
      WHERE oi.order_id = o.id AND oi.quantity_prepared < oi.quantity
    );
  RETURN marked;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_item_prepared(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_item_prepared(uuid, integer) TO authenticated;