ALTER TABLE public.storefronts
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS opening_hours text,
  ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS storefronts_owner_id_idx ON public.storefronts (owner_id);

ALTER TABLE public.storefronts
  ALTER COLUMN owner_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "Authenticated can manage storefronts" ON public.storefronts;

CREATE POLICY "Owners view own storefront" ON public.storefronts
  FOR SELECT TO authenticated
  USING (owner_id IS NULL OR owner_id = auth.uid());

CREATE POLICY "Owners create own storefront" ON public.storefronts
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners update own storefront" ON public.storefronts
  FOR UPDATE TO authenticated
  USING (owner_id IS NULL OR owner_id = auth.uid())
  WITH CHECK (owner_id IS NULL OR owner_id = auth.uid());

CREATE POLICY "Owners delete own storefront" ON public.storefronts
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());