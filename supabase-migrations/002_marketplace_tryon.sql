-- منصة "وتر الإحساس" — هجرة الإصدار 2: السوق + غرفة التجربة + مسافات الشحن
-- شغّل هذا في Supabase SQL Editor

ALTER TABLE public.regions
  ADD COLUMN IF NOT EXISTS distance_km numeric DEFAULT 15;

CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('curtains','sofa','furniture','fashion','other')),
  whatsapp_number text NOT NULL,
  logo_url text,
  is_premium boolean DEFAULT false,
  region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT ON public.vendors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vendors public read" ON public.vendors;
CREATE POLICY "vendors public read" ON public.vendors FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.fashion_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  image_url text NOT NULL,
  mask_url text,
  price numeric,
  vendor_whatsapp text,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT ON public.fashion_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fashion_items TO authenticated;
GRANT ALL ON public.fashion_items TO service_role;
ALTER TABLE public.fashion_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fashion public read" ON public.fashion_items;
CREATE POLICY "fashion public read" ON public.fashion_items FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.tryon_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone text,
  person_url text,
  garment_id uuid REFERENCES public.fashion_items(id) ON DELETE SET NULL,
  result_url text,
  created_at timestamptz DEFAULT now()
);
GRANT INSERT ON public.tryon_logs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tryon_logs TO authenticated;
GRANT ALL ON public.tryon_logs TO service_role;
ALTER TABLE public.tryon_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tryon insert open" ON public.tryon_logs;
CREATE POLICY "tryon insert open" ON public.tryon_logs FOR INSERT WITH CHECK (true);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shipping_mode text,
  ADD COLUMN IF NOT EXISTS shipping_cost numeric DEFAULT 0;
