-- Monthly plan template data storage
-- One row per user per month, JSON blob stores all sections
CREATE TABLE IF NOT EXISTS monthly_plan_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month_key)
);

CREATE INDEX idx_monthly_plan_user ON monthly_plan_data(user_id);
CREATE INDEX idx_monthly_plan_month ON monthly_plan_data(month_key);

ALTER TABLE monthly_plan_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own monthly plans"
  ON monthly_plan_data FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_monthly_plan_updated_at
  BEFORE UPDATE ON monthly_plan_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
