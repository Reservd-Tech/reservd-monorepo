-- Apply through Street OS's database migration process, not the consumer app.
-- The consumer catalog is served by Street OS; applying this to a different
-- database will not change the public menu API.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_veg boolean DEFAULT true;
ALTER TABLE public.products ALTER COLUMN is_veg SET DEFAULT true;
-- Public menu responses must include is_veg (including explicit null/false).
-- Public order responses must include order_items.product_id for safe reorder.