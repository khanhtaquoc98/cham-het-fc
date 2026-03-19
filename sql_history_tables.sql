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

-- Enable RLS
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- Allow public access
CREATE POLICY "Allow all match_history" ON match_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all player_stats" ON player_stats FOR ALL USING (true) WITH CHECK (true);
