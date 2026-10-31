CREATE TABLE public.storefronts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  brand_name text NOT NULL,
  tagline text,
  upi_id text,
  upi_payee_name text,
  is_open boolean NOT NULL DEFAULT true,
  owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.storefronts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.storefronts TO authenticated;
GRANT ALL ON public.storefronts TO service_role;

ALTER TABLE public.storefronts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view open storefronts" ON public.storefronts
  FOR SELECT TO anon USING (is_open = true);
CREATE POLICY "Authenticated can manage storefronts" ON public.storefronts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_storefronts_updated_at BEFORE UPDATE ON public.storefronts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.categories ADD COLUMN storefront_id uuid REFERENCES public.storefronts(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD COLUMN storefront_id uuid REFERENCES public.storefronts(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN storefront_id uuid REFERENCES public.storefronts(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN customer_name text;
ALTER TABLE public.orders ADD COLUMN customer_phone text;
ALTER TABLE public.orders ADD COLUMN source text NOT NULL DEFAULT 'pos';

CREATE INDEX idx_categories_storefront ON public.categories(storefront_id);
CREATE INDEX idx_products_storefront ON public.products(storefront_id);
CREATE INDEX idx_orders_storefront ON public.orders(storefront_id, created_at DESC);

INSERT INTO public.storefronts (slug, brand_name, tagline, upi_payee_name)
VALUES ('fulki', 'Fulki', 'Premium pani puri, made to order.', 'Fulki');

UPDATE public.categories SET storefront_id = (SELECT id FROM public.storefronts WHERE slug = 'fulki') WHERE storefront_id IS NULL;
UPDATE public.products SET storefront_id = (SELECT id FROM public.storefronts WHERE slug = 'fulki') WHERE storefront_id IS NULL;
UPDATE public.orders SET storefront_id = (SELECT id FROM public.storefronts WHERE slug = 'fulki') WHERE storefront_id IS NULL;

GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.products TO anon;

CREATE POLICY "Public can view menu categories" ON public.categories
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = categories.storefront_id AND s.is_open)
  );

CREATE POLICY "Public can view available products" ON public.products
  FOR SELECT TO anon USING (
    is_available = true AND EXISTS (SELECT 1 FROM public.storefronts s WHERE s.id = products.storefront_id AND s.is_open)
  );