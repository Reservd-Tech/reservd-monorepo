-- ============ helper: single-owner backfill ============
DO $$
DECLARE v_owner uuid;
BEGIN
  SELECT owner_id INTO v_owner FROM public.storefronts WHERE owner_id IS NOT NULL ORDER BY created_at LIMIT 1;
  IF v_owner IS NOT NULL THEN
    UPDATE public.storefronts SET owner_id = v_owner WHERE owner_id IS NULL;
    UPDATE public.vendors SET created_by = v_owner WHERE created_by IS NULL;
    UPDATE public.inventory_items SET created_by = v_owner WHERE created_by IS NULL;
    UPDATE public.purchase_orders SET created_by = v_owner WHERE created_by IS NULL;
    UPDATE public.vendor_purchases SET created_by = v_owner WHERE created_by IS NULL;
    UPDATE public.inventory_movements SET user_id = v_owner WHERE user_id IS NULL;
    UPDATE public.orders SET created_by = v_owner WHERE created_by IS NULL;
  END IF;
END $$;

-- customers gets an owner column
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
DO $$
DECLARE v_owner uuid;
BEGIN
  SELECT owner_id INTO v_owner FROM public.storefronts WHERE owner_id IS NOT NULL ORDER BY created_at LIMIT 1;
  IF v_owner IS NOT NULL THEN
    UPDATE public.customers SET created_by = v_owner WHERE created_by IS NULL;
  END IF;
END $$;

-- default ownership on insert
ALTER TABLE public.vendors ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.inventory_items ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.purchase_orders ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.vendor_purchases ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.inventory_movements ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.orders ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.categories ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.products ALTER COLUMN created_by SET DEFAULT auth.uid();

-- ============ vendors ============
DROP POLICY IF EXISTS "Authenticated can manage vendors" ON public.vendors;
CREATE POLICY "Owners manage own vendors" ON public.vendors FOR ALL TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- ============ inventory_items ============
DROP POLICY IF EXISTS "Authenticated can manage inventory items" ON public.inventory_items;
CREATE POLICY "Owners manage own inventory items" ON public.inventory_items FOR ALL TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- ============ inventory_movements ============
DROP POLICY IF EXISTS "Authenticated can manage inventory movements" ON public.inventory_movements;
CREATE POLICY "Owners manage own inventory movements" ON public.inventory_movements FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.inventory_items i WHERE i.id = inventory_movements.item_id AND i.created_by = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.inventory_items i WHERE i.id = inventory_movements.item_id AND i.created_by = auth.uid())
  );

-- ============ purchase_orders ============
DROP POLICY IF EXISTS "Authenticated can manage purchase orders" ON public.purchase_orders;
CREATE POLICY "Owners manage own purchase orders" ON public.purchase_orders FOR ALL TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- ============ vendor_purchases ============
DROP POLICY IF EXISTS "Authenticated can manage vendor purchases" ON public.vendor_purchases;
CREATE POLICY "Owners manage own vendor purchases" ON public.vendor_purchases FOR ALL TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- ============ customers ============
DROP POLICY IF EXISTS "auth all customers" ON public.customers;
CREATE POLICY "Owners manage own customers" ON public.customers FOR ALL TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- ============ categories ============
DROP POLICY IF EXISTS "auth read categories" ON public.categories;
DROP POLICY IF EXISTS "auth write categories" ON public.categories;
DROP POLICY IF EXISTS "auth update categories" ON public.categories;
DROP POLICY IF EXISTS "auth delete categories" ON public.categories;

CREATE POLICY "Owners read own categories" ON public.categories FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = categories.storefront_id AND s.owner_id = auth.uid()));
CREATE POLICY "Owners insert own categories" ON public.categories FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = categories.storefront_id AND s.owner_id = auth.uid()));
CREATE POLICY "Owners update own categories" ON public.categories FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = categories.storefront_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = categories.storefront_id AND s.owner_id = auth.uid()));
CREATE POLICY "Owners delete own categories" ON public.categories FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = categories.storefront_id AND s.owner_id = auth.uid()));

-- ============ products ============
DROP POLICY IF EXISTS "auth read products" ON public.products;
DROP POLICY IF EXISTS "auth insert products" ON public.products;
DROP POLICY IF EXISTS "auth update products" ON public.products;
DROP POLICY IF EXISTS "auth delete products" ON public.products;

CREATE POLICY "Owners read own products" ON public.products FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = products.storefront_id AND s.owner_id = auth.uid()));
CREATE POLICY "Owners insert own products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = products.storefront_id AND s.owner_id = auth.uid()));
CREATE POLICY "Owners update own products" ON public.products FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = products.storefront_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = products.storefront_id AND s.owner_id = auth.uid()));
CREATE POLICY "Owners delete own products" ON public.products FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = products.storefront_id AND s.owner_id = auth.uid()));

-- ============ orders ============
DROP POLICY IF EXISTS "auth all orders" ON public.orders;
CREATE POLICY "Owners manage own orders" ON public.orders FOR ALL TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = orders.storefront_id AND s.owner_id = auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = orders.storefront_id AND s.owner_id = auth.uid())
  );

-- ============ order_items ============
DROP POLICY IF EXISTS "auth all order_items" ON public.order_items;
CREATE POLICY "Owners manage own order items" ON public.order_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (o.created_by = auth.uid()
           OR EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = o.storefront_id AND s.owner_id = auth.uid()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (o.created_by = auth.uid()
           OR EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = o.storefront_id AND s.owner_id = auth.uid()))
  ));

-- ============ storefronts: drop NULL-owner loophole ============
DROP POLICY IF EXISTS "Owners view own storefront" ON public.storefronts;
DROP POLICY IF EXISTS "Owners update own storefront" ON public.storefronts;
CREATE POLICY "Owners view own storefront" ON public.storefronts FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "Owners update own storefront" ON public.storefronts FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
-- owner_id keeps its auth.uid() default; existing rows may predate ownership.

-- ============ storage: shop-media scoped to uploader folder ============
DROP POLICY IF EXISTS "Authenticated read shop media" ON storage.objects;
CREATE POLICY "Owners read own shop media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'shop-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============ SECURITY DEFINER function not callable via API ============
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;