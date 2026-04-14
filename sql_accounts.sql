-- accounts.sql: Bảng lưu trữ thông tin đăng nhập và số dư bóng
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user', -- 'admin', 'user'
  player_id TEXT, -- Link tới bảng players hiện tại (nullable)
  balance INTEGER DEFAULT 0, -- Số bóng hiện tại (1000 VNĐ = 1000 Bóng)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL
);

-- transactions.sql: Bảng lưu trữ lịch sử nạp/trừ bóng
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Số lượng bóng biến động (dương là nạp, âm là trừ)
  type TEXT NOT NULL, -- 'deposit', 'payment', 'admin_adjustment'
  status TEXT DEFAULT 'pending', -- 'pending', 'success', 'failed'
  payment_source TEXT, -- 'App', 'QR_Bank', 'Khác'
  note TEXT,
  match_payment_id UUID, -- Nếu là thanh toán tiền đá bóng
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bổ sung cột cho player_payments (nếu chưa có)
-- ALTER TABLE player_payments ADD COLUMN payment_source TEXT DEFAULT 'Chưa rõ';
-- ALTER TABLE player_payments ADD COLUMN source_note TEXT;

-- Bổ sung RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy (Tạm thời cho phép public để dễ tích hợp từ code server-side)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all accounts" ON accounts;
  DROP POLICY IF EXISTS "Allow all transactions" ON transactions;
END $$;
CREATE POLICY "Allow all accounts" ON accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);
