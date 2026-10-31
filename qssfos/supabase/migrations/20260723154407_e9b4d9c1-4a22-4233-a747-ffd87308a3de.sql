
-- Enums
CREATE TYPE public.order_type AS ENUM ('dine_in', 'takeaway', 'delivery');
CREATE TYPE public.order_status AS ENUM ('pending', 'preparing', 'ready', 'completed', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('cash', 'upi', 'card');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'cancelled');

-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update categories" ON public.categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete categories" ON public.categories FOR DELETE TO authenticated USING (true);

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url text,
  is_available boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update products" ON public.products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete products" ON public.products FOR DELETE TO authenticated USING (true);
CREATE INDEX products_category_idx ON public.products(category_id);

-- Customers
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  phone text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number bigserial NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  order_type public.order_type NOT NULL DEFAULT 'takeaway',
  status public.order_status NOT NULL DEFAULT 'pending',
  payment_method public.payment_method,
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  tax numeric(10,2) NOT NULL DEFAULT 0,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX orders_created_at_idx ON public.orders(created_at DESC);
CREATE INDEX orders_status_idx ON public.orders(status);

-- Order Items
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  line_total numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all order_items" ON public.order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);

-- updated_at triggers
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed demo data (Fulki starter menu)
INSERT INTO public.categories (name, sort_order) VALUES
  ('Pani Puri', 1),
  ('Chaat', 2),
  ('Beverages', 3),
  ('Desserts', 4);

INSERT INTO public.products (name, description, price, category_id, is_available)
SELECT * FROM (VALUES
  ('Classic Pani Puri', '6 crispy puris with spicy mint pani', 80.00, (SELECT id FROM public.categories WHERE name='Pani Puri'), true),
  ('Hajmi Pani Puri', 'Tangy digestive pani, 6 puris', 90.00, (SELECT id FROM public.categories WHERE name='Pani Puri'), true),
  ('Cheese Pani Puri', 'Loaded with mozzarella', 120.00, (SELECT id FROM public.categories WHERE name='Pani Puri'), true),
  ('Sev Puri', 'Crispy sev, chutneys, onions', 90.00, (SELECT id FROM public.categories WHERE name='Chaat'), true),
  ('Bhel Puri', 'Puffed rice tossed to order', 80.00, (SELECT id FROM public.categories WHERE name='Chaat'), true),
  ('Dahi Puri', 'Cool yogurt, sweet chutney', 100.00, (SELECT id FROM public.categories WHERE name='Chaat'), true),
  ('Masala Chaas', 'Spiced buttermilk', 40.00, (SELECT id FROM public.categories WHERE name='Beverages'), true),
  ('Kala Khatta Soda', 'Bombay street classic', 50.00, (SELECT id FROM public.categories WHERE name='Beverages'), true),
  ('Gulab Jamun (2 pc)', 'Warm, syrup-soaked', 60.00, (SELECT id FROM public.categories WHERE name='Desserts'), true)
) AS v(name, description, price, category_id, is_available);
