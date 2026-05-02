-- ============================================
-- 网站访问统计
-- 请在 Supabase SQL Editor 中执行
-- ============================================

-- 1. 统计表
CREATE TABLE IF NOT EXISTS site_stats (
  key TEXT PRIMARY KEY,
  count BIGINT NOT NULL DEFAULT 0
);

-- 2. 插入初始行
INSERT INTO site_stats (key, count) VALUES ('visits', 0)
ON CONFLICT (key) DO NOTHING;

-- 3. 递增函数（SECURITY DEFINER 绕过 RLS）
CREATE OR REPLACE FUNCTION increment_site_visits()
RETURNS BIGINT AS $$
DECLARE
  new_count BIGINT;
BEGIN
  UPDATE site_stats SET count = count + 1 WHERE key = 'visits'
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS
ALTER TABLE site_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_stats_public_read" ON site_stats FOR SELECT USING (true);
