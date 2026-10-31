ALTER TABLE public.storefronts ADD COLUMN IF NOT EXISTS archived_at timestamptz;

DROP POLICY IF EXISTS "Public can view open storefronts" ON public.storefronts;
CREATE POLICY "Public can view open storefronts"
ON public.storefronts FOR SELECT TO anon
USING (is_open = true AND archived_at IS NULL);

CREATE INDEX IF NOT EXISTS storefronts_owner_archived_idx ON public.storefronts (owner_id, archived_at);