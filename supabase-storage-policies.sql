-- ============================================
-- Supabase Storage & Media Table Setup
-- ============================================

-- STEP 1: Create storage bucket via UI
-- Go to Storage > New Bucket > Name: media, Public: Yes

-- STEP 2: Set storage bucket policies via UI
-- Storage > media bucket > Policies tab > Add these policies:
--
-- Policy: "Allow authenticated uploads"
-- Operation: INSERT
-- Roles: authenticated  
-- Definition: bucket_id = 'media'
--
-- Policy: "Allow public reads"
-- Operation: SELECT
-- Roles: public
-- Definition: bucket_id = 'media'

-- STEP 3: Verify media table RLS is working
-- Run this to check if the table exists and RLS is enabled:

SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'media';

-- If rowsecurity is false, run:
-- ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- STEP 4: Verify the RLS policies exist on the media table
-- You should see these policies already created from supabase-setup.sql:
-- - "Users can view own media"
-- - "Users can insert own media"  
-- - "Users can update own media"

-- If they don't exist, run these:

DROP POLICY IF EXISTS "Users can view own media" ON media;
DROP POLICY IF EXISTS "Users can insert own media" ON media;
DROP POLICY IF EXISTS "Users can update own media" ON media;

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
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Media table RLS policies verified/created!';
  RAISE NOTICE 'Storage bucket should be set to Public via UI.';
END $$;
