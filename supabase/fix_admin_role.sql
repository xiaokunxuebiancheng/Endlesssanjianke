-- ============================================
-- 修复：将指定邮箱设为管理员
-- 请在 Supabase SQL Editor 中执行
-- ============================================

-- 1. 更新已有用户为 admin
UPDATE profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = '1375937000@qq.com'
);

-- 2. 修复触发器：新用户根据邮箱判断 admin
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, nickname, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN NEW.email = '1375937000@qq.com' THEN 'admin' ELSE 'user' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 创建 upsert_posts 函数（绕过 RLS，仅 admin 可调用）
CREATE OR REPLACE FUNCTION upsert_post(
  p_title TEXT,
  p_slug TEXT,
  p_content TEXT,
  p_excerpt TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT '{}',
  p_cover_url TEXT DEFAULT NULL,
  p_is_published BOOLEAN DEFAULT false,
  p_author_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_id BIGINT;
  v_result JSONB;
BEGIN
  -- 仅管理员可调用
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT id INTO v_existing_id FROM posts WHERE slug = p_slug;

  IF v_existing_id IS NOT NULL THEN
    UPDATE posts SET
      title = p_title,
      content = p_content,
      excerpt = p_excerpt,
      tags = p_tags,
      cover_url = p_cover_url,
      is_published = p_is_published,
      updated_at = now()
    WHERE id = v_existing_id
    RETURNING to_jsonb(posts.*) INTO v_result;
  ELSE
    INSERT INTO posts (title, slug, content, excerpt, tags, cover_url, is_published, author_id)
    VALUES (p_title, p_slug, p_content, p_excerpt, p_tags, p_cover_url, p_is_published, p_author_id)
    RETURNING to_jsonb(posts.*) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;
