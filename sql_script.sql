-- ==========================================
-- 1. MAIN TABLES (match_data, players)
-- ==========================================
CREATE TABLE IF NOT EXISTS match_data (
  id TEXT PRIMARY KEY,
  teams JSONB DEFAULT '[]'::jsonb,
  venue JSONB DEFAULT '{}'::jsonb,
  raw_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sub_names JSONB DEFAULT '[]'::jsonb,
  telegram_handle TEXT DEFAULT '',
  jersey_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 2. BOT TABLES (bench_members, team_assignments, match_state)
-- ==========================================
-- Bench Members table
-- Stores the current bench/roster (replaces in-memory members Map)
CREATE TABLE IF NOT EXISTS bench_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name TEXT NOT NULL,
  telegram_user_id BIGINT,          -- from msg.from.id (only for /addme)
  telegram_username TEXT,            -- from msg.from.username
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: prevent duplicate by telegram_user_id (when present)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bench_members_tele_user
  ON bench_members(telegram_user_id) WHERE telegram_user_id IS NOT NULL;

-- Team Assignments table
-- Stores team splits (replaces teamA/B/team3A/B/C Maps)
CREATE TABLE IF NOT EXISTS team_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bench_member_id UUID REFERENCES bench_members(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  team_group TEXT NOT NULL,  -- 'teamA', 'teamB', 'team3A', 'team3B', 'team3C'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_assignments_group ON team_assignments(team_group);

-- Match State table
-- Stores ephemeral match config (tiensan, tiennuoc, teamthua, san)
CREATE TABLE IF NOT EXISTS match_state (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  tiensan INTEGER DEFAULT 580000,
  tiennuoc INTEGER DEFAULT 60000,
  team_thua TEXT,                     -- 'HOME' or 'AWAY' or null
  san TEXT,                           -- venue string
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row
INSERT INTO match_state (id, tiensan, tiennuoc, team_thua, san)
VALUES ('singleton', 580000, 60000, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 3. HISTORY TABLES (match_history, player_stats)
-- ==========================================
-- Match History table
-- Stores completed match results with scores
CREATE TABLE IF NOT EXISTS match_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_date TEXT,
  match_time TEXT,
  venue TEXT,
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  extra_score INTEGER,
  result TEXT NOT NULL, -- 'home_win', 'away_win', 'extra_win', 'draw'
  teams JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player Stats table
-- Tracks individual player results per match
CREATE TABLE IF NOT EXISTS player_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_history_id UUID REFERENCES match_history(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_id TEXT, -- nullable, links to registered players table
  team_name TEXT NOT NULL, -- HOME, AWAY, EXTRA
  result TEXT NOT NULL, -- 'win', 'lose', 'draw'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_match_history_created ON match_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_match ON player_stats(match_history_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_stats(player_name);
CREATE INDEX IF NOT EXISTS idx_player_stats_player_id ON player_stats(player_id);

-- ==========================================
-- 4. PUSH TABLES (push_subscriptions, notification_logs)
-- ==========================================
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

-- ==========================================
-- 5. ROW LEVEL SECURITY (RLS) & POLICIES
-- ==========================================

-- Enable Row Level Security
ALTER TABLE match_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE bench_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Allow public access (using anon key)
CREATE POLICY "Allow all access to match_data" ON match_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to players" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all bench_members" ON bench_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all team_assignments" ON team_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all match_state" ON match_state FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all match_history" ON match_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all player_stats" ON player_stats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all push_subscriptions" ON push_subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all notification_logs" ON notification_logs FOR ALL USING (true) WITH CHECK (true);
