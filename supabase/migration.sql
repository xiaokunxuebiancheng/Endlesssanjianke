-- ============================================
-- 宋佳坤个人博客 - 数据库初始化
-- Supabase PostgreSQL
-- ============================================

-- 1. 用户资料表（关联 Supabase auth.users）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  nickname TEXT,
  avatar_url TEXT,
  website TEXT,
  bio TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 2. 文章表
CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_url TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT DEFAULT '未分类',
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  author_id UUID REFERENCES profiles(id),
  view_count INT NOT NULL DEFAULT 0,
  like_count INT NOT NULL DEFAULT 0,
  bookmark_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_published ON posts(is_published);
CREATE INDEX idx_posts_created ON posts(created_at DESC);

-- 3. 评论表（支持登录用户和游客）
CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id),
  guest_name TEXT,
  guest_email TEXT,
  guest_website TEXT,
  content TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  is_spam BOOLEAN NOT NULL DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  like_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_post ON comments(post_id, created_at ASC);
CREATE INDEX idx_comments_approved ON comments(is_approved);

-- 4. 点赞表
CREATE TABLE IF NOT EXISTS likes (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  guest_fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id),
  UNIQUE(post_id, guest_fingerprint)
);
CREATE INDEX idx_likes_post ON likes(post_id);

-- 5. 收藏表
CREATE TABLE IF NOT EXISTS bookmarks (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);

-- 6. 友链表
CREATE TABLE IF NOT EXISTS friends_links (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  avatar_url TEXT,
  description TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. 留言板
CREATE TABLE IF NOT EXISTS guestbook (
  id BIGSERIAL PRIMARY KEY,
  author_id UUID REFERENCES profiles(id),
  guest_name TEXT,
  guest_email TEXT,
  content TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_guestbook_approved ON guestbook(is_approved);

-- ============================================
-- 触发器：自动更新 updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tg_posts_updated_at
  BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 触发器：更新文章的计数
-- ============================================
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_likes_count
  AFTER INSERT OR DELETE ON likes FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

CREATE OR REPLACE FUNCTION update_post_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET bookmark_count = bookmark_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET bookmark_count = bookmark_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_bookmarks_count
  AFTER INSERT OR DELETE ON bookmarks FOR EACH ROW EXECUTE FUNCTION update_post_bookmark_count();

CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_approved THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.is_approved THEN
    UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.is_approved <> OLD.is_approved THEN
    IF NEW.is_approved THEN
      UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    ELSE
      UPDATE posts SET comment_count = comment_count - 1 WHERE id = NEW.post_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_comments_count
  AFTER INSERT OR DELETE OR UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- ============================================
-- 触发器：新用户自动创建 profile
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, nickname, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN split_part(NEW.email, '@', 1) = 'admin' THEN 'admin' ELSE 'user' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 函数：递增文章浏览量（绕过 RLS 供匿名用户调用）
-- ============================================
CREATE OR REPLACE FUNCTION increment_view(row_id BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE posts SET view_count = view_count + 1 WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 行级安全策略 (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE guestbook ENABLE ROW LEVEL SECURITY;

-- profiles: 公开读取，本人可修改
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_self_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_self_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- posts: 已发布文章公开读取，admin 可全部管理
CREATE POLICY "posts_published_read" ON posts FOR SELECT USING (is_published = true OR (auth.uid() IS NOT NULL AND auth.uid() = author_id));
CREATE POLICY "posts_admin_all" ON posts FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- comments: 已审核的公开读取，任何人可创建，admin 可管理
CREATE POLICY "comments_approved_read" ON comments FOR SELECT USING (is_approved = true OR (auth.uid() IS NOT NULL AND auth.uid() = author_id));
CREATE POLICY "comments_create" ON comments FOR INSERT WITH CHECK (true);
CREATE POLICY "comments_admin_manage" ON comments FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- likes: 公开读取，登录用户可操作
CREATE POLICY "likes_public_read" ON likes FOR SELECT USING (true);
CREATE POLICY "likes_user_create" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_user_delete" ON likes FOR DELETE USING (auth.uid() = user_id);

-- bookmarks: 仅本人可读写
CREATE POLICY "bookmarks_self_all" ON bookmarks FOR ALL USING (auth.uid() = user_id);

-- friends_links: 已审核的公开读取
CREATE POLICY "friends_links_approved_read" ON friends_links FOR SELECT USING (is_approved = true);

-- guestbook: 已审核的公开可读，任何人可创建
CREATE POLICY "guestbook_approved_read" ON guestbook FOR SELECT USING (is_approved = true);
CREATE POLICY "guestbook_create" ON guestbook FOR INSERT WITH CHECK (true);
