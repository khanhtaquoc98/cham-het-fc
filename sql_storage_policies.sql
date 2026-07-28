-- =============================================
-- FIX SUPABASE STORAGE RLS POLICY & PLAYERS TABLE RLS
-- Run this script in Supabase Dashboard -> SQL Editor
-- =============================================

-- 1. Ensure the 'players' bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('players', 'players', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop old storage policies if they exist to avoid conflict
DROP POLICY IF EXISTS "Allow public read access on players" ON storage.objects;
DROP POLICY IF EXISTS "Allow public insert on players" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update on players" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete on players" ON storage.objects;

-- 3. Storage Policies: Allow anyone to READ, INSERT, UPDATE, DELETE files in 'players' bucket
CREATE POLICY "Allow public read access on players" ON storage.objects FOR SELECT USING (bucket_id = 'players');
CREATE POLICY "Allow public insert on players" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'players');
CREATE POLICY "Allow public update on players" ON storage.objects FOR UPDATE USING (bucket_id = 'players') WITH CHECK (bucket_id = 'players');
CREATE POLICY "Allow public delete on players" ON storage.objects FOR DELETE USING (bucket_id = 'players');

-- 4. Fix players table constraints (Allow empty/null jersey_number & add avatar_version column)
ALTER TABLE IF EXISTS public.players ALTER COLUMN jersey_number DROP NOT NULL;
ALTER TABLE IF EXISTS public.players ADD COLUMN IF NOT EXISTS avatar_version BIGINT;

-- 5. Fix RLS read/write permissions on public.players table
ALTER TABLE IF EXISTS public.players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to players" ON public.players;
CREATE POLICY "Allow all access to players" ON public.players FOR ALL TO public USING (true) WITH CHECK (true);
