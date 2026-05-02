-- ============================================
-- 用户管理：存储邮箱到 profiles
-- 请在 Supabase SQL Editor 中执行
-- ============================================

-- 1. 添加邮箱字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. 更新触发器，自动填充邮箱
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, nickname, avatar_url, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN split_part(NEW.email, '@', 1) = 'admin' THEN 'admin' ELSE 'user' END,
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 更新现有 profiles 的邮箱（从 auth.users 同步）
UPDATE profiles p SET email = u.email
FROM auth.users u WHERE p.id = u.id AND p.email IS NULL;
