-- App Settings table (key-value store)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow public access
CREATE POLICY "Allow all app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- Insert default ticker row (empty = hidden)
INSERT INTO app_settings (key, value) VALUES ('announcement_ticker', '')
  ON CONFLICT (key) DO NOTHING;
