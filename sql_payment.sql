-- Bảng lưu thông tin thanh toán cho từng trận đấu
CREATE TABLE IF NOT EXISTS match_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_data_id TEXT NOT NULL,              -- link với match_data hiện tại
  field_cost INTEGER DEFAULT 0,             -- tiền sân (VND), vd: 580000
  drink_cost INTEGER DEFAULT 0,             -- tiền nước (VND), vd: 160000
  losing_teams JSONB DEFAULT '[]'::jsonb,   -- [{team_name, score, drink_percent}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng lưu trạng thái thanh toán của từng cầu thủ
CREATE TABLE IF NOT EXISTS player_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_payment_id UUID REFERENCES match_payments(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_id TEXT,                            -- link với bảng players (nullable)
  team_name TEXT NOT NULL,                   -- HOME, AWAY, EXTRA
  field_amount INTEGER DEFAULT 0,            -- tiền sân phải trả (VND)
  drink_amount INTEGER DEFAULT 0,            -- tiền nước phải trả (VND)
  total_amount INTEGER DEFAULT 0,            -- tổng tiền
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  payment_method TEXT DEFAULT 'unpaid',      -- 'payos', 'manual', 'cash', 'unpaid'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_match_payments_match ON match_payments(match_data_id);
CREATE INDEX IF NOT EXISTS idx_player_payments_match ON player_payments(match_payment_id);
CREATE INDEX IF NOT EXISTS idx_player_payments_player ON player_payments(player_id);

-- Enable RLS
ALTER TABLE match_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_payments ENABLE ROW LEVEL SECURITY;

-- Allow public access
CREATE POLICY "Allow all match_payments" ON match_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all player_payments" ON player_payments FOR ALL USING (true) WITH CHECK (true);
