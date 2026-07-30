-- ==========================================================
-- SUPABASE SCHEMA FOR YOUTUBE MULTI-CAM & REALTIME CAPTIONS
-- Execute this SQL script in your Supabase SQL Editor
-- ==========================================================

-- 1. Create table for Match YouTube Video Configs (max 2 slots per match)
CREATE TABLE IF NOT EXISTS public.match_youtube_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id TEXT NOT NULL DEFAULT 'default_match',
    slot SMALLINT NOT NULL CHECK (slot IN (1, 2)),
    youtube_url TEXT NOT NULL DEFAULT '',
    youtube_id TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT 'Video',
    start_offset_seconds INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_match_slot UNIQUE (match_id, slot)
);

-- 2. Create table for Realtime Timestamp Captions
CREATE TABLE IF NOT EXISTS public.match_captions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id TEXT NOT NULL DEFAULT 'default_match',
    slot SMALLINT NOT NULL CHECK (slot IN (1, 2)),
    youtube_id TEXT DEFAULT '',
    timestamp_seconds INTEGER NOT NULL DEFAULT 0,
    timestamp_str TEXT NOT NULL DEFAULT '00:00',
    caption TEXT NOT NULL,
    created_by TEXT DEFAULT 'User',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS) and allow public read/write/delete
ALTER TABLE public.match_youtube_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_captions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on match_youtube_config" ON public.match_youtube_config FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update on match_youtube_config" ON public.match_youtube_config FOR ALL USING (true);

CREATE POLICY "Allow public read on match_captions" ON public.match_captions FOR SELECT USING (true);
CREATE POLICY "Allow public insert/delete on match_captions" ON public.match_captions FOR ALL USING (true);

-- 4. Enable REPLICA IDENTITY FULL for realtime DELETE events (required for payload.old)
ALTER TABLE public.match_captions REPLICA IDENTITY FULL;

-- 5. Enable Supabase Realtime for realtime caption & config sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_youtube_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_captions;
