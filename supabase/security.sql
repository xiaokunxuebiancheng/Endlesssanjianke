-- ============================================
-- 安全加固：留言板
-- 请在 Supabase SQL Editor 中执行
-- ============================================

-- 1. 内容长度限制（数据库层面兜底）
ALTER TABLE guestbook ADD CONSTRAINT chk_content_length CHECK (char_length(content) BETWEEN 1 AND 2000);

-- 2. 禁止 HTML 标签（防止 XSS）
ALTER TABLE guestbook ADD CONSTRAINT chk_no_html CHECK (content !~ '<[a-zA-Z/][^>]*>');

-- 3. 限制同一 IP 30 秒内只能发一条留言
CREATE OR REPLACE FUNCTION check_guestbook_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM guestbook
    WHERE ip_address = NEW.ip_address
      AND created_at > now() - interval '30 seconds'
    LIMIT 1
  ) THEN
    RAISE EXCEPTION '操作太频繁，请30秒后再试';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_guestbook_rate_limit ON guestbook;
CREATE TRIGGER tg_guestbook_rate_limit
  BEFORE INSERT ON guestbook
  FOR EACH ROW EXECUTE FUNCTION check_guestbook_rate_limit();

-- 4. 自动填充 IP 和 User-Agent
CREATE OR REPLACE FUNCTION set_guestbook_meta()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ip_address = COALESCE(NEW.ip_address, inet_client_addr());
  NEW.user_agent = COALESCE(NEW.user_agent, current_setting('request.headers', true)::json->>'user-agent');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_guestbook_meta ON guestbook;
CREATE TRIGGER tg_guestbook_meta
  BEFORE INSERT ON guestbook
  FOR EACH ROW EXECUTE FUNCTION set_guestbook_meta();

-- 5. 管理员可删除任何留言，留言者本人不可删除（防止被黑后批量删）
CREATE POLICY "guestbook_admin_delete" ON guestbook FOR DELETE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- 6. 防止修改已发布的留言
CREATE POLICY "guestbook_admin_update" ON guestbook FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
