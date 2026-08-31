-- Add vehicle cost columns to match_payments
ALTER TABLE match_payments ADD COLUMN IF NOT EXISTS vehicle_cost INTEGER DEFAULT 0;
ALTER TABLE match_payments ADD COLUMN IF NOT EXISTS vehicle_players JSONB DEFAULT '[]'::jsonb;

-- Add vehicle_amount column to player_payments
ALTER TABLE player_payments ADD COLUMN IF NOT EXISTS vehicle_amount INTEGER DEFAULT 0;
