-- ============================================
-- 个人信息详情字段
-- 请在 Supabase SQL Editor 中执行
-- ============================================

-- 给 profiles 表添加 details JSONB 字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
