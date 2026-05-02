-- ============================================
-- 画廊功能
-- 请在 Supabase SQL Editor 中执行
-- ============================================

-- 1. 创建存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

-- 2. 存储桶 RLS：公开读取
CREATE POLICY "gallery_public_read" ON storage.objects FOR SELECT
USING (bucket_id = 'gallery');

-- 3. 存储桶 RLS：只有 admin 可以上传
CREATE POLICY "gallery_admin_insert" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'gallery'
  AND auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- 4. 存储桶 RLS：只有 admin 可以删除
CREATE POLICY "gallery_admin_delete" ON storage.objects FOR DELETE
USING (
  bucket_id = 'gallery'
  AND auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
