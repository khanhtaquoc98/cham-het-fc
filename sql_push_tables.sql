-- Push Subscriptions table
-- Stores Web Push subscriptions from devices that installed the PWA
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Notification Logs table
-- Tracks sent notifications to prevent duplicate auto-notifications
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_key TEXT NOT NULL UNIQUE,
  title TEXT,
  body TEXT,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for checking duplicate notifications
CREATE INDEX IF NOT EXISTS idx_notification_logs_key ON notification_logs(notification_key);

-- Enable RLS (Row Level Security) but allow all operations via service role
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Allow public access (since we use anon key)
CREATE POLICY "Allow all push_subscriptions" ON push_subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all notification_logs" ON notification_logs FOR ALL USING (true) WITH CHECK (true);
