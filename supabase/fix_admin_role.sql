-- ============================================
-- 一键修复：文章权限 + 管理员
-- 请在 Supabase SQL Editor 中执行
-- ============================================

-- 1. 删掉旧的文章 RLS 策略
DROP POLICY IF EXISTS "posts_admin_all" ON posts;
DROP POLICY IF EXISTS "posts_published_read" ON posts;

-- 2. 重建 SELECT 策略（已发布公开看，管理员看全部，作者看自己）
CREATE POLICY "posts_published_read" ON posts FOR SELECT USING (
  is_published = true
  OR auth.email() = '1375937000@qq.com'
  OR (auth.uid() IS NOT NULL AND auth.uid() = author_id)
);

-- 3. 管理员可增删改（直接用邮箱判断，不依赖 profiles 表）
CREATE POLICY "posts_admin_write" ON posts FOR INSERT
WITH CHECK (auth.email() = '1375937000@qq.com');

CREATE POLICY "posts_admin_update" ON posts FOR UPDATE
USING (auth.email() = '1375937000@qq.com');

CREATE POLICY "posts_admin_delete" ON posts FOR DELETE
USING (auth.email() = '1375937000@qq.com');

-- 4. 确保你的 profiles 是管理员（有则改之，无则不管）
UPDATE profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = '1375937000@qq.com'
);
