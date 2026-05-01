-- ============================================
-- 高级安全加固：防爬取、防滥用
-- 请在 Supabase SQL Editor 中执行
-- ============================================

-- 1. 滥用记录表（用于追踪和自动封禁）
CREATE TABLE IF NOT EXISTS abuse_log (
  id BIGSERIAL PRIMARY KEY,
  ip_address INET NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_abuse_log_ip ON abuse_log(ip_address, created_at DESC);

-- 2. 自动封禁函数：同一 IP 被拒绝 5 次后封禁 24 小时
CREATE OR REPLACE FUNCTION log_and_check_abuse(
  p_ip INET,
  p_reason TEXT
) RETURNS void AS $$
DECLARE
  recent_count INT;
BEGIN
  INSERT INTO abuse_log (ip_address, reason) VALUES (p_ip, p_reason);

  SELECT COUNT(*) INTO recent_count
  FROM abuse_log
  WHERE ip_address = p_ip
    AND created_at > now() - interval '24 hours';

  IF recent_count >= 5 THEN
    RAISE EXCEPTION '您的 IP 因异常行为已被临时限制，请24小时后再试';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 改进的留言频率检查（结合滥用记录）
CREATE OR REPLACE FUNCTION check_guestbook_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INT;
BEGIN
  -- 同 IP 30 秒内限一条
  SELECT COUNT(*) INTO recent_count
  FROM guestbook
  WHERE ip_address = NEW.ip_address
    AND created_at > now() - interval '30 seconds';

  IF recent_count > 0 THEN
    PERFORM log_and_check_abuse(NEW.ip_address, 'rate_limit_exceeded');
    RAISE EXCEPTION '操作太频繁，请30秒后再试';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_guestbook_rate_limit ON guestbook;
CREATE TRIGGER tg_guestbook_rate_limit
  BEFORE INSERT ON guestbook
  FOR EACH ROW EXECUTE FUNCTION check_guestbook_rate_limit();

-- 4. 限制每 IP 每小时最多 20 条留言
CREATE OR REPLACE FUNCTION check_guestbook_hourly_limit()
RETURNS TRIGGER AS $$
DECLARE
  hourly_count INT;
BEGIN
  SELECT COUNT(*) INTO hourly_count
  FROM guestbook
  WHERE ip_address = NEW.ip_address
    AND created_at > now() - interval '1 hour';

  IF hourly_count >= 20 THEN
    RAISE EXCEPTION '留言过于频繁，请稍后再试';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_guestbook_hourly_limit ON guestbook;
CREATE TRIGGER tg_guestbook_hourly_limit
  BEFORE INSERT ON guestbook
  FOR EACH ROW EXECUTE FUNCTION check_guestbook_hourly_limit();

-- 5. 禁止 SQL 注入关键词（额外防线）
ALTER TABLE guestbook DROP CONSTRAINT IF EXISTS chk_no_sql;
ALTER TABLE guestbook ADD CONSTRAINT chk_no_sql CHECK (
  content !~* '(DROP\s|DELETE\s|INSERT\s|UPDATE\s|ALTER\s|EXEC\s|UNION\s|SELECT\s)'
);

-- 6. 所有表禁止匿名修改（确保 RLS 无遗漏）
-- guestbook 已插入的数据不可由匿名用户修改
DROP POLICY IF EXISTS "guestbook_admin_update" ON guestbook;
CREATE POLICY "guestbook_admin_update" ON guestbook FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

DROP POLICY IF EXISTS "guestbook_admin_delete" ON guestbook;
CREATE POLICY "guestbook_admin_delete" ON guestbook FOR DELETE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
