export interface YouTubeVideoConfig {
  id?: string;
  match_id: string;
  slot: 1 | 2;
  youtube_url: string;
  youtube_id: string;
  title: string;
  start_offset_seconds: number; // Offset delay (seconds) relative to master time
  created_at?: string;
}

export interface MatchCaption {
  id: string;
  match_id: string;
  slot: 1 | 2;
  youtube_id: string;
  timestamp_seconds: number;
  timestamp_str: string; // HH:MM:SS
  caption: string;
  created_by?: string;
  created_at: string;
}
