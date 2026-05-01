-- ============================================
-- 留言板回复功能
-- 请在 Supabase SQL Editor 中执行
-- ============================================

-- 添加 parent_id 支持相互回复
ALTER TABLE guestbook ADD COLUMN IF NOT EXISTS parent_id BIGINT REFERENCES guestbook(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_guestbook_parent ON guestbook(parent_id);

-- 管理员回复无需审核，且可编辑所有回复
-- （已有 chk_content_length, chk_no_html, chk_no_sql 约束自动适用）
