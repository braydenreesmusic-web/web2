-- ============================================
-- Fix Media Table RLS Policies
-- Run this in your Supabase SQL Editor
-- ============================================

-- First, ensure RLS is enabled on the media table
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view own media" ON media;
DROP POLICY IF EXISTS "Users can insert own media" ON media;
DROP POLICY IF EXISTS "Users can update own media" ON media;

-- Recreate policies
CREATE POLICY "Users can view own media" 
ON media FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own media" 
ON media FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media" 
ON media FOR UPDATE 
USING (auth.uid() = user_id);

-- ============================================
-- Storage Bucket Policies (Set via UI)
-- ============================================
-- Go to Storage > media bucket > Policies tab
-- 
-- If the bucket doesn't exist, create it:
-- 1. Storage > New Bucket
-- 2. Name: media
-- 3. Public: Yes
--
-- Then add these policies via the UI:
--
-- Policy 1: "Allow authenticated uploads"
-- - Operation: INSERT
-- - Target roles: authenticated
-- - Policy definition: bucket_id = 'media'
--
-- Policy 2: "Allow public reads"  
-- - Operation: SELECT
-- - Target roles: public
-- - Policy definition: bucket_id = 'media'
--
-- Policy 3: "Allow authenticated updates"
-- - Operation: UPDATE
-- - Target roles: authenticated
-- - Policy definition: bucket_id = 'media' AND (auth.uid())::text = (storage.foldername(name))[1]
--
-- Policy 4: "Allow authenticated deletes"
-- - Operation: DELETE
-- - Target roles: authenticated
-- - Policy definition: bucket_id = 'media' AND (auth.uid())::text = (storage.foldername(name))[1]

-- ============================================
-- Verification
-- ============================================

-- Check that RLS is enabled and policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'media';

-- Should return 3 policies (SELECT, INSERT, UPDATE)

SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'media';

-- rowsecurity should be TRUE

DO $$
BEGIN
  RAISE NOTICE '✅ Media RLS policies fixed!';
  RAISE NOTICE 'Next step: Configure storage bucket policies via the Supabase UI';
  RAISE NOTICE 'Go to: Storage > media bucket > Policies tab';
END $$;
