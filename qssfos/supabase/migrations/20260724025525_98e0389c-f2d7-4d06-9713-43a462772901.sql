
-- Enums
CREATE TYPE public.inventory_status AS ENUM ('active', 'inactive', 'discontinued');
CREATE TYPE public.inventory_action AS ENUM ('add', 'reduce', 'adjust', 'waste', 'transfer');
CREATE TYPE public.purchase_order_status AS ENUM ('draft', 'ordered', 'received', 'cancelled');

-- Vendors
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  gst_number TEXT,
  address TEXT,
  payment_terms TEXT,
  avg_delivery_days INTEGER DEFAULT 0,
  rating NUMERIC(2,1) DEFAULT 0,
  outstanding_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_purchase_date TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX vendors_business_name_idx ON public.vendors (business_name);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage vendors" ON public.vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inventory items
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'unit',
  current_quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
  minimum_quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
  maximum_quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC(12,2) NOT NULL DEFAULT 0,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  storage_location TEXT,
  status public.inventory_status NOT NULL DEFAULT 'active',
  expiry_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX inventory_items_name_idx ON public.inventory_items (name);
CREATE INDEX inventory_items_category_idx ON public.inventory_items (category);
CREATE INDEX inventory_items_vendor_idx ON public.inventory_items (vendor_id);
CREATE INDEX inventory_items_expiry_idx ON public.inventory_items (expiry_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage inventory items" ON public.inventory_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inventory movements
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action public.inventory_action NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  from_location TEXT,
  to_location TEXT,
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX inventory_movements_item_idx ON public.inventory_movements (item_id, created_at DESC);
CREATE INDEX inventory_movements_created_idx ON public.inventory_movements (created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage inventory movements" ON public.inventory_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Purchase orders
CREATE SEQUENCE IF NOT EXISTS public.purchase_order_number_seq START 1000;
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  order_number BIGINT NOT NULL DEFAULT nextval('public.purchase_order_number_seq'),
  status public.purchase_order_status NOT NULL DEFAULT 'draft',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ordered_at TIMESTAMPTZ,
  expected_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX purchase_orders_vendor_idx ON public.purchase_orders (vendor_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage purchase orders" ON public.purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vendor purchases (line-level history)
CREATE TABLE public.vendor_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  unit_cost NUMERIC(12,2) NOT NULL,
  total_cost NUMERIC(12,2) NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX vendor_purchases_vendor_idx ON public.vendor_purchases (vendor_id, purchased_at DESC);
CREATE INDEX vendor_purchases_item_idx ON public.vendor_purchases (item_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_purchases TO authenticated;
GRANT ALL ON public.vendor_purchases TO service_role;
ALTER TABLE public.vendor_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage vendor purchases" ON public.vendor_purchases FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for live dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
