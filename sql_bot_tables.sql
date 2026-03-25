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

-- Enable RLS
ALTER TABLE bench_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_state ENABLE ROW LEVEL SECURITY;

-- Allow public access (using anon key)
CREATE POLICY "Allow all bench_members" ON bench_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all team_assignments" ON team_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all match_state" ON match_state FOR ALL USING (true) WITH CHECK (true);
