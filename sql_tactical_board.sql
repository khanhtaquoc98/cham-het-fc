-- SQL for initializing Tactical Board App Settings
INSERT INTO app_settings (key, value) VALUES 
  ('tactical_board_enabled', 'true'),
  ('tactical_board_hlv_pass', 'coach'),
  ('tactical_board_player_pass', 'chamhet'),
  ('tactical_board_state', '')
ON CONFLICT (key) DO NOTHING;
