-- منصة "وتر الإحساس" — هجرة الإصدار 3: بوابة الشركاء (Vendor Portal)
-- شغّل هذا في Supabase SQL Editor

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS map_location text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS cover_image text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS login_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active'
    CHECK (subscription_status IN ('active','suspended','idle','hidden')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_vendors_login_token ON public.vendors(login_token);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendors(subscription_status);

-- منح صلاحيات تحديث ذاتي للشريك عبر رمز الدخول (Edge-safe — يبقى RLS مفعّلاً)
-- نسمح للقراءة العامة فقط للشركاء النشطين عبر سياسة محدّثة
DROP POLICY IF EXISTS "vendors public read" ON public.vendors;
CREATE POLICY "vendors public read active" ON public.vendors
  FOR SELECT USING (subscription_status IN ('active','idle'));

-- سياسة للأدمن: قراءة الكل (تستخدم service_role في الأدمن)
-- service_role يتجاوز RLS تلقائياً، لا حاجة لسياسة إضافية.

-- جدول معرض الشريك (صور وفيديوهات إضافية)
CREATE TABLE IF NOT EXISTS public.vendor_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT ON public.vendor_gallery TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_gallery TO authenticated;
GRANT ALL ON public.vendor_gallery TO service_role;
ALTER TABLE public.vendor_gallery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gallery public read" ON public.vendor_gallery;
CREATE POLICY "gallery public read" ON public.vendor_gallery FOR SELECT USING (true);
