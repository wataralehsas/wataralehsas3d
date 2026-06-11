-- =====================================================================
-- منصة "وتر الإحساس" — إعادة بناء كاملة للمخطط (Reset Schema)
-- يحل خطأ: column "region_id" does not exist
-- انسخ كامل هذا السكربت والصقه في: Supabase → SQL Editor → New query → Run
-- ⚠️ هذا السكربت يحذف الجداول الموجودة بالكامل قبل إعادة إنشائها.
-- =====================================================================

-- =====================================================================
-- 1) DROP OLD TABLES (CASCADE)
-- =====================================================================
DROP TABLE IF EXISTS public.tryon_logs       CASCADE;
DROP TABLE IF EXISTS public.fashion_items    CASCADE;
DROP TABLE IF EXISTS public.products         CASCADE;
DROP TABLE IF EXISTS public.vendor_gallery   CASCADE;
DROP TABLE IF EXISTS public.orders           CASCADE;
DROP TABLE IF EXISTS public.vendors          CASCADE;
DROP TABLE IF EXISTS public.pricing_config   CASCADE;
DROP TABLE IF EXISTS public.regions          CASCADE;

-- =====================================================================
-- 2) CREATE TABLES (بالترتيب الصحيح للعلاقات)
-- =====================================================================

-- ---------- 2.1 regions ----------
CREATE TABLE public.regions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL UNIQUE,
  whatsapp_number text NOT NULL DEFAULT '',
  assistant_name  text,
  distance_km     numeric DEFAULT 15,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------- 2.2 pricing_config (singleton) ----------
CREATE TABLE public.pricing_config (
  id                    int PRIMARY KEY DEFAULT 1,
  price_per_meter       numeric NOT NULL DEFAULT 25,
  embossed_premium_rate numeric NOT NULL DEFAULT 0.3,
  currency              text NOT NULL DEFAULT '$',
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pricing_config_singleton CHECK (id = 1)
);

-- ---------- 2.3 vendors (يشير إلى regions) ----------
CREATE TABLE public.vendors (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name            text NOT NULL,
  name                     text,
  category                 text NOT NULL DEFAULT 'other'
                            CHECK (category IN ('curtains','sofa','furniture','fashion','haircut','decor','other')),
  whatsapp_number          text NOT NULL DEFAULT '',
  phone                    text,
  logo_url                 text,
  cover_image              text,
  video_url                text,
  map_location             text,
  bio                      text,
  is_premium               boolean DEFAULT false,
  region_id                uuid REFERENCES public.regions(id) ON DELETE SET NULL,
  login_token              text UNIQUE,
  subscription_status      text DEFAULT 'active'
                            CHECK (subscription_status IN ('active','suspended','idle','hidden')),
  subscription_expires_at  timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vendors_login_token ON public.vendors(login_token);
CREATE INDEX idx_vendors_status      ON public.vendors(subscription_status);
CREATE INDEX idx_vendors_region      ON public.vendors(region_id);

-- ---------- 2.4 products (ديكور/عام — يشير إلى vendors) ----------
CREATE TABLE public.products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  image_url   text NOT NULL,
  type        text,                                -- decor | fashion | haircut ...
  category    text,
  price       numeric,                             -- توافق عكسي مع الكود الحالي
  price_usd   numeric,                             -- ✨ ازدواجية العملات
  price_try   numeric,                             -- ✨ ازدواجية العملات
  vendor_id   uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_vendor ON public.products(vendor_id);
CREATE INDEX idx_products_type   ON public.products(type);

-- ---------- 2.5 fashion_items (يشير إلى vendors) ----------
CREATE TABLE public.fashion_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id        uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  item_name        text NOT NULL,
  image_url        text NOT NULL,
  mask_url         text,
  price            numeric,                        -- توافق عكسي
  price_usd        numeric,                        -- ✨ ازدواجية العملات
  price_try        numeric,                        -- ✨ ازدواجية العملات
  vendor_whatsapp  text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fashion_vendor ON public.fashion_items(vendor_id);

-- ---------- 2.6 orders (يشير إلى regions + vendors) ----------
CREATE TABLE public.orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id       uuid REFERENCES public.regions(id) ON DELETE SET NULL,
  region_name     text,
  vendor_id       uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  design_id       uuid,
  design_name     text,
  design_url      text,
  width           numeric NOT NULL DEFAULT 0,
  height          numeric NOT NULL DEFAULT 0,
  embossed        boolean NOT NULL DEFAULT false,
  total           numeric NOT NULL DEFAULT 0,
  total_usd       numeric,
  total_try       numeric,
  shipping_mode   text,
  shipping_cost   numeric DEFAULT 0,
  customer_phone  text,
  status          text NOT NULL DEFAULT 'new',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_region ON public.orders(region_id);
CREATE INDEX idx_orders_vendor ON public.orders(vendor_id);

-- ---------- 2.7 tryon_logs (يشير إلى fashion_items) ----------
CREATE TABLE public.tryon_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone  text,
  person_url  text,
  garment_id  uuid REFERENCES public.fashion_items(id) ON DELETE SET NULL,
  result_url  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------- 2.8 vendor_gallery (يشير إلى vendors) ----------
CREATE TABLE public.vendor_gallery (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  image_url   text NOT NULL,
  caption     text,
  sort_order  int DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_gallery_vendor ON public.vendor_gallery(vendor_id);

-- =====================================================================
-- 3) GRANTS — Data API (PostgREST)
-- =====================================================================
GRANT SELECT ON public.regions           TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.regions TO anon, authenticated;
GRANT ALL    ON public.regions           TO service_role;

GRANT SELECT ON public.pricing_config    TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pricing_config TO anon, authenticated;
GRANT ALL    ON public.pricing_config    TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors        TO anon, authenticated;
GRANT ALL ON public.vendors        TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products       TO anon, authenticated;
GRANT ALL ON public.products       TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fashion_items  TO anon, authenticated;
GRANT ALL ON public.fashion_items  TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders         TO anon, authenticated;
GRANT ALL ON public.orders         TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tryon_logs     TO anon, authenticated;
GRANT ALL ON public.tryon_logs     TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_gallery TO anon, authenticated;
GRANT ALL ON public.vendor_gallery TO service_role;

-- =====================================================================
-- 4) ENABLE RLS
-- =====================================================================
ALTER TABLE public.regions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fashion_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryon_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_gallery  ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 5) RLS POLICIES — كاملة (SELECT/INSERT/UPDATE/DELETE)
--    ملاحظة: المنصة لا تستخدم Supabase Auth حالياً؛ لوحة الأدمن محمية محلياً
--    عبر AdminGate، لذلك السياسات مفتوحة. يمكن لاحقاً تقييدها بـ has_role(auth.uid(),'admin').
-- =====================================================================

-- ---------- regions ----------
CREATE POLICY "regions select" ON public.regions FOR SELECT USING (true);
CREATE POLICY "regions insert" ON public.regions FOR INSERT WITH CHECK (true);
CREATE POLICY "regions update" ON public.regions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "regions delete" ON public.regions FOR DELETE USING (true);

-- ---------- pricing_config ----------
CREATE POLICY "pricing select" ON public.pricing_config FOR SELECT USING (true);
CREATE POLICY "pricing insert" ON public.pricing_config FOR INSERT WITH CHECK (true);
CREATE POLICY "pricing update" ON public.pricing_config FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "pricing delete" ON public.pricing_config FOR DELETE USING (true);

-- ---------- vendors ----------
CREATE POLICY "vendors select" ON public.vendors FOR SELECT USING (true);
CREATE POLICY "vendors insert" ON public.vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "vendors update" ON public.vendors FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "vendors delete" ON public.vendors FOR DELETE USING (true);

-- ---------- products ----------
CREATE POLICY "products select" ON public.products FOR SELECT USING (true);
CREATE POLICY "products insert" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "products update" ON public.products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "products delete" ON public.products FOR DELETE USING (true);

-- ---------- fashion_items ----------
CREATE POLICY "fashion select" ON public.fashion_items FOR SELECT USING (true);
CREATE POLICY "fashion insert" ON public.fashion_items FOR INSERT WITH CHECK (true);
CREATE POLICY "fashion update" ON public.fashion_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "fashion delete" ON public.fashion_items FOR DELETE USING (true);

-- ---------- orders ----------
CREATE POLICY "orders select" ON public.orders FOR SELECT USING (true);
CREATE POLICY "orders insert" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders update" ON public.orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "orders delete" ON public.orders FOR DELETE USING (true);

-- ---------- tryon_logs ----------
CREATE POLICY "tryon select" ON public.tryon_logs FOR SELECT USING (true);
CREATE POLICY "tryon insert" ON public.tryon_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "tryon update" ON public.tryon_logs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "tryon delete" ON public.tryon_logs FOR DELETE USING (true);

-- ---------- vendor_gallery ----------
CREATE POLICY "gallery select" ON public.vendor_gallery FOR SELECT USING (true);
CREATE POLICY "gallery insert" ON public.vendor_gallery FOR INSERT WITH CHECK (true);
CREATE POLICY "gallery update" ON public.vendor_gallery FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "gallery delete" ON public.vendor_gallery FOR DELETE USING (true);

-- =====================================================================
-- 6) SEED DATA — قيم افتراضية لتشغيل المنصة فوراً
-- =====================================================================
INSERT INTO public.pricing_config (id, price_per_meter, embossed_premium_rate, currency)
  VALUES (1, 25, 0.3, '$')
  ON CONFLICT (id) DO NOTHING;

INSERT INTO public.regions (name, whatsapp_number, assistant_name, distance_km) VALUES
  ('الدانا',     '963933000000', 'مساعد الدانا',     8),
  ('سرمدا',     '963933000001', 'مساعد سرمدا',     15),
  ('إدلب',      '963933000002', 'مساعد إدلب',      30),
  ('أرياف حلب', '963933000003', 'مساعد حلب',       45)
  ON CONFLICT (name) DO NOTHING;

-- =====================================================================
-- ✅ تم. أعد تحميل المنصة وستعمل جميع الأقسام (الأدمن، الشركاء،
--    السوق، المحاكي، غرفة التجربة، الرفع الجماعي) بدون أخطاء RLS.
-- =====================================================================
