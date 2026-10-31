ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS orders_archived_at_idx ON public.orders (archived_at);

CREATE TABLE public.order_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL UNIQUE,
  label text NOT NULL,
  order_count integer NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  csv text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.order_archives TO authenticated;
GRANT ALL ON public.order_archives TO service_role;

ALTER TABLE public.order_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_archives_select ON public.order_archives
  FOR SELECT TO authenticated USING (true);