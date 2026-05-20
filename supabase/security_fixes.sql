-- ============================================
-- 安全修复：防刷量 + slug去重 + 约束优化
-- 请在 Supabase SQL Editor 中执行
-- ============================================

-- ============================================
-- 1. 创建访客日志表（IP + 时间，用于去重）
-- ============================================
CREATE TABLE IF NOT EXISTS visit_log (
  id BIGSERIAL PRIMARY KEY,
  ip_address INET NOT NULL,
  page_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_visit_log_ip ON visit_log(ip_address, page_key, created_at DESC);

-- ============================================
-- 2. 改进站点访问计数：同 IP + 同天只计一次
-- ============================================
CREATE OR REPLACE FUNCTION increment_site_visits()
RETURNS BIGINT AS $$
DECLARE
  client_ip INET;
  new_count BIGINT;
BEGIN
  client_ip := inet_client_addr();

  -- 同 IP 当天只计一次
  IF EXISTS (
    SELECT 1 FROM visit_log
    WHERE ip_address = client_ip
      AND page_key = 'site_visit'
      AND created_at > date_trunc('day', now())
    LIMIT 1
  ) THEN
    SELECT count INTO new_count FROM site_stats WHERE key = 'visits';
    RETURN new_count;
  END IF;

  -- 记录本次访问
  INSERT INTO visit_log (ip_address, page_key) VALUES (client_ip, 'site_visit');

  -- 递增计数
  UPDATE site_stats SET count = count + 1 WHERE key = 'visits'
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. 改进文章阅读计数：同 IP + 同文章 + 1小时冷却
-- ============================================
CREATE OR REPLACE FUNCTION increment_view(row_id BIGINT)
RETURNS void AS $$
DECLARE
  client_ip INET;
BEGIN
  client_ip := inet_client_addr();

  -- 同 IP + 同文章 1 小时内不重复计数
  IF EXISTS (
    SELECT 1 FROM visit_log
    WHERE ip_address = client_ip
      AND page_key = 'post_' || row_id::TEXT
      AND created_at > now() - interval '1 hour'
    LIMIT 1
  ) THEN
    RETURN;
  END IF;

  -- 记录访问
  INSERT INTO visit_log (ip_address, page_key) VALUES (client_ip, 'post_' || row_id::TEXT);

  -- 更新计数
  UPDATE posts SET view_count = view_count + 1 WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. 移除过于激进的 SQL 关键词检查
--    （原有的 chk_no_html 已经足够防 XSS）
-- ============================================
ALTER TABLE guestbook DROP CONSTRAINT IF EXISTS chk_no_sql;

-- ============================================
-- 5. 定期清理旧的访问日志（只保留最近 7 天）
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_visit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM visit_log WHERE created_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 可选：创建 pg_cron 定时任务（需要启用 pg_cron 扩展）
-- SELECT cron.schedule('cleanup-visit-logs', '0 3 * * *', 'SELECT cleanup_old_visit_logs();');
