-- ===========================================================
-- 006 — مكتبة طبقات التصاميم (Design Layers)
-- يُنشئ سطل تخزين عام للصور (حتى ٥٠٠٠+ صورة) مع سياسات رفع/قراءة مفتوحة
-- نفّذه مرة واحدة داخل Supabase SQL Editor
-- ===========================================================

-- 1) إنشاء السطل العام (إن لم يكن موجوداً)
INSERT INTO storage.buckets (id, name, public)
VALUES ('design-layers', 'design-layers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2) السياسات على storage.objects للسطل
DROP POLICY IF EXISTS "design-layers read"   ON storage.objects;
DROP POLICY IF EXISTS "design-layers insert" ON storage.objects;
DROP POLICY IF EXISTS "design-layers update" ON storage.objects;
DROP POLICY IF EXISTS "design-layers delete" ON storage.objects;

CREATE POLICY "design-layers read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'design-layers');

CREATE POLICY "design-layers insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'design-layers');

CREATE POLICY "design-layers update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'design-layers')
  WITH CHECK (bucket_id = 'design-layers');

CREATE POLICY "design-layers delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'design-layers');
