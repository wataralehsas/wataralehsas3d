-- =====================================================================
-- إصلاح صلاحيات وسياسات جدول products (و fashion_items احتياطاً)
-- السبب: الجدول لديه RLS مفعّل لكن بدون سياسة INSERT/UPDATE/DELETE،
-- لذا أي محاولة لإضافة منتج من الأدمن / استوديو الرفع الجماعي / بوابة
-- الشريك تفشل بـ: new row violates row-level security policy.
-- =====================================================================

-- منح صلاحيات Data API
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- قراءة عامة
DROP POLICY IF EXISTS "products public read" ON public.products;
CREATE POLICY "products public read" ON public.products FOR SELECT USING (true);

-- إدراج/تحديث/حذف مفتوحة (المنصة بدون نظام مصادقة عام —
-- لوحة الأدمن محمية محلياً ببوابة AdminGate)
DROP POLICY IF EXISTS "products open insert" ON public.products;
CREATE POLICY "products open insert" ON public.products FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "products open update" ON public.products;
CREATE POLICY "products open update" ON public.products FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "products open delete" ON public.products;
CREATE POLICY "products open delete" ON public.products FOR DELETE USING (true);

-- نفس المعالجة لـ fashion_items (نفس مصدر الخطأ المحتمل)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fashion_items TO anon, authenticated;
GRANT ALL ON public.fashion_items TO service_role;

DROP POLICY IF EXISTS "fashion open insert" ON public.fashion_items;
CREATE POLICY "fashion open insert" ON public.fashion_items FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "fashion open update" ON public.fashion_items;
CREATE POLICY "fashion open update" ON public.fashion_items FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "fashion open delete" ON public.fashion_items;
CREATE POLICY "fashion open delete" ON public.fashion_items FOR DELETE USING (true);

-- vendors: السماح بالإضافة/التعديل من لوحة الأدمن أيضاً
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO anon, authenticated;
GRANT ALL ON public.vendors TO service_role;
DROP POLICY IF EXISTS "vendors open insert" ON public.vendors;
CREATE POLICY "vendors open insert" ON public.vendors FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "vendors open update" ON public.vendors;
CREATE POLICY "vendors open update" ON public.vendors FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "vendors open delete" ON public.vendors;
CREATE POLICY "vendors open delete" ON public.vendors FOR DELETE USING (true);
