-- 1. Compliance columns on storefronts
ALTER TABLE public.storefronts
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS pan_number text,
  ADD COLUMN IF NOT EXISTS gstin text,
  ADD COLUMN IF NOT EXISTS is_gst_registered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_address text,
  ADD COLUMN IF NOT EXISTS business_pincode text,
  ADD COLUMN IF NOT EXISTS fssai_number text,
  ADD COLUMN IF NOT EXISTS fssai_type text,
  ADD COLUMN IF NOT EXISTS fssai_certificate_url text,
  ADD COLUMN IF NOT EXISTS fssai_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS upi_vpa text,
  ADD COLUMN IF NOT EXISTS bank_alert_phone text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_ifsc text,
  ADD COLUMN IF NOT EXISTS bank_account_holder_name text,
  ADD COLUMN IF NOT EXISTS id_proof_type text,
  ADD COLUMN IF NOT EXISTS id_proof_url text,
  ADD COLUMN IF NOT EXISTS stall_photo_url text,
  ADD COLUMN IF NOT EXISTS self_declaration_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS listing_status text NOT NULL DEFAULT 'draft';

ALTER TABLE public.storefronts DROP CONSTRAINT IF EXISTS storefronts_entity_type_check;
ALTER TABLE public.storefronts ADD CONSTRAINT storefronts_entity_type_check
  CHECK (entity_type IS NULL OR entity_type IN ('proprietorship','partnership','llp','private_limited','unregistered'));

ALTER TABLE public.storefronts DROP CONSTRAINT IF EXISTS storefronts_fssai_type_check;
ALTER TABLE public.storefronts ADD CONSTRAINT storefronts_fssai_type_check
  CHECK (fssai_type IS NULL OR fssai_type IN ('basic_registration','state_licence','central_licence','deemed_street_vendor'));

ALTER TABLE public.storefronts DROP CONSTRAINT IF EXISTS storefronts_listing_status_check;
ALTER TABLE public.storefronts ADD CONSTRAINT storefronts_listing_status_check
  CHECK (listing_status IN ('draft','pending_review','live','suspended'));

ALTER TABLE public.storefronts DROP CONSTRAINT IF EXISTS storefronts_onboarding_step_check;
ALTER TABLE public.storefronts ADD CONSTRAINT storefronts_onboarding_step_check
  CHECK (onboarding_step BETWEEN 1 AND 6);

-- 2. Roles: platform admin + shop scoping
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_admin';

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS storefront_id uuid REFERENCES public.storefronts(id) ON DELETE CASCADE;

-- 3. Helper functions (text comparison keeps them valid in this transaction)
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role::text = 'platform_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.current_storefront_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT storefront_id FROM public.user_roles
  WHERE user_id = auth.uid() AND storefront_id IS NOT NULL
  ORDER BY created_at LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM public, anon;
REVOKE ALL ON FUNCTION public.current_storefront_id() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_storefront_id() TO authenticated, service_role;

-- 4. Public listing view (no PAN / bank / ID proof exposure)
DROP VIEW IF EXISTS public.public_vendor_listings;
CREATE VIEW public.public_vendor_listings
WITH (security_invoker = off) AS
  SELECT id, brand_name, slug, tagline, description, logo_url, cover_url,
         gallery_urls, address, opening_hours, phone, is_open, fssai_number,
         latitude, longitude, updated_at
  FROM public.storefronts
  WHERE listing_status = 'live' AND archived_at IS NULL;

GRANT SELECT ON public.public_vendor_listings TO anon, authenticated, service_role;

-- 5. RLS: storefronts
DROP POLICY IF EXISTS "Public can view open storefronts" ON public.storefronts;
DROP POLICY IF EXISTS "Owners view own storefront" ON public.storefronts;
DROP POLICY IF EXISTS "Owners create own storefront" ON public.storefronts;
DROP POLICY IF EXISTS "Owners update own storefront" ON public.storefronts;
DROP POLICY IF EXISTS "Owners delete own storefront" ON public.storefronts;

CREATE POLICY "storefronts_select" ON public.storefronts FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR owner_id = auth.uid() OR id = public.current_storefront_id());
CREATE POLICY "storefronts_insert" ON public.storefronts FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR owner_id = auth.uid());
CREATE POLICY "storefronts_update" ON public.storefronts FOR UPDATE TO authenticated
  USING (public.is_platform_admin() OR owner_id = auth.uid() OR id = public.current_storefront_id())
  WITH CHECK (public.is_platform_admin() OR owner_id = auth.uid() OR id = public.current_storefront_id());
CREATE POLICY "storefronts_delete" ON public.storefronts FOR DELETE TO authenticated
  USING (public.is_platform_admin() OR owner_id = auth.uid());

-- 6. RLS: products
DROP POLICY IF EXISTS "Public can view available products" ON public.products;
DROP POLICY IF EXISTS "Owners read own products" ON public.products;
DROP POLICY IF EXISTS "Owners insert own products" ON public.products;
DROP POLICY IF EXISTS "Owners update own products" ON public.products;
DROP POLICY IF EXISTS "Owners delete own products" ON public.products;

CREATE POLICY "products_public_read" ON public.products FOR SELECT TO anon
  USING (is_available = true AND storefront_id IN (SELECT id FROM public.public_vendor_listings));
CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR storefront_id = public.current_storefront_id()
    OR EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = products.storefront_id AND s.owner_id = auth.uid()));
CREATE POLICY "products_insert" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR storefront_id = public.current_storefront_id()
    OR EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = products.storefront_id AND s.owner_id = auth.uid()));
CREATE POLICY "products_update" ON public.products FOR UPDATE TO authenticated
  USING (public.is_platform_admin() OR storefront_id = public.current_storefront_id()
    OR EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = products.storefront_id AND s.owner_id = auth.uid()))
  WITH CHECK (public.is_platform_admin() OR storefront_id = public.current_storefront_id()
    OR EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = products.storefront_id AND s.owner_id = auth.uid()));
CREATE POLICY "products_delete" ON public.products FOR DELETE TO authenticated
  USING (public.is_platform_admin() OR storefront_id = public.current_storefront_id()
    OR EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = products.storefront_id AND s.owner_id = auth.uid()));

-- 7. RLS: categories
DROP POLICY IF EXISTS "Public can view menu categories" ON public.categories;
DROP POLICY IF EXISTS "Owners read own categories" ON public.categories;
DROP POLICY IF EXISTS "Owners insert own categories" ON public.categories;
DROP POLICY IF EXISTS "Owners update own categories" ON public.categories;
DROP POLICY IF EXISTS "Owners delete own categories" ON public.categories;

CREATE POLICY "categories_public_read" ON public.categories FOR SELECT TO anon
  USING (storefront_id IN (SELECT id FROM public.public_vendor_listings));
CREATE POLICY "categories_select" ON public.categories FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR storefront_id = public.current_storefront_id()
    OR EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = categories.storefront_id AND s.owner_id = auth.uid()));
CREATE POLICY "categories_insert" ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR storefront_id = public.current_storefront_id()
    OR EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = categories.storefront_id AND s.owner_id = auth.uid()));
CREATE POLICY "categories_update" ON public.categories FOR UPDATE TO authenticated
  USING (public.is_platform_admin() OR storefront_id = public.current_storefront_id()
    OR EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = categories.storefront_id AND s.owner_id = auth.uid()))
  WITH CHECK (public.is_platform_admin() OR storefront_id = public.current_storefront_id()
    OR EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = categories.storefront_id AND s.owner_id = auth.uid()));
CREATE POLICY "categories_delete" ON public.categories FOR DELETE TO authenticated
  USING (public.is_platform_admin() OR storefront_id = public.current_storefront_id()
    OR EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = categories.storefront_id AND s.owner_id = auth.uid()));

-- 8. RLS: orders and order_items
DROP POLICY IF EXISTS "Owners manage own orders" ON public.orders;
CREATE POLICY "orders_all" ON public.orders FOR ALL TO authenticated
  USING (public.is_platform_admin() OR created_by = auth.uid() OR storefront_id = public.current_storefront_id()
    OR EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = orders.storefront_id AND s.owner_id = auth.uid()))
  WITH CHECK (public.is_platform_admin() OR created_by = auth.uid() OR storefront_id = public.current_storefront_id()
    OR EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = orders.storefront_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners manage own order items" ON public.order_items;
CREATE POLICY "order_items_all" ON public.order_items FOR ALL TO authenticated
  USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id))
  WITH CHECK (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id));

-- 9. user_roles: admins can read/manage every role row
DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
CREATE POLICY "user_roles_admin_manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- 10. Compliance document storage (private bucket)
DROP POLICY IF EXISTS "vendor docs read own" ON storage.objects;
DROP POLICY IF EXISTS "vendor docs write own" ON storage.objects;
DROP POLICY IF EXISTS "vendor docs update own" ON storage.objects;
DROP POLICY IF EXISTS "vendor docs delete own" ON storage.objects;

CREATE POLICY "vendor docs read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vendor-documents'
    AND (public.is_platform_admin() OR (storage.foldername(name))[1] = auth.uid()::text));
CREATE POLICY "vendor docs write own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vendor-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "vendor docs update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vendor-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'vendor-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "vendor docs delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vendor-documents' AND (storage.foldername(name))[1] = auth.uid()::text);