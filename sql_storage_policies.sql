-- =============================================
-- FIX SUPABASE STORAGE RLS POLICY FOR 'players' BUCKET
-- Run this script in Supabase Dashboard -> SQL Editor
-- =============================================

-- 1. Ensure the 'players' bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('players', 'players', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop old policies if they exist to avoid conflict
DROP POLICY IF EXISTS "Allow public read access on players" ON storage.objects;
DROP POLICY IF EXISTS "Allow public insert on players" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update on players" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete on players" ON storage.objects;

-- 3. Policy: Allow anyone (public/anon) to VIEW files in 'players' bucket
CREATE POLICY "Allow public read access on players"
ON storage.objects FOR SELECT
USING (bucket_id = 'players');

-- 4. Policy: Allow anyone (public/anon) to UPLOAD files to 'players' bucket
CREATE POLICY "Allow public insert on players"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'players');

-- 5. Policy: Allow anyone (public/anon) to UPDATE / OVERWRITE files in 'players' bucket
CREATE POLICY "Allow public update on players"
ON storage.objects FOR UPDATE
USING (bucket_id = 'players')
WITH CHECK (bucket_id = 'players');

-- 6. Policy: Allow anyone (public/anon) to DELETE files in 'players' bucket
CREATE POLICY "Allow public delete on players"
ON storage.objects FOR DELETE
USING (bucket_id = 'players');
