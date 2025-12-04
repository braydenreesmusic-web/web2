-- ============================================
-- Fix User Presence System
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Add partner_user_id to relationships table to link partners
ALTER TABLE relationships 
ADD COLUMN IF NOT EXISTS partner_user_id UUID REFERENCES auth.users(id);

-- 2. Create index for faster presence queries
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_is_online ON user_presence(is_online);
CREATE INDEX IF NOT EXISTS idx_relationships_partner ON relationships(partner_user_id);

-- 3. Ensure user_presence table has all required columns
-- (This should already exist from supabase-enhanced-features.sql, but let's verify)
CREATE TABLE IF NOT EXISTS user_presence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Ensure RLS policies allow proper access
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All users can view presence" ON user_presence;
DROP POLICY IF EXISTS "Users can insert own presence" ON user_presence;
DROP POLICY IF EXISTS "Users can update own presence" ON user_presence;

-- Everyone can see who's online (needed for partners to see each other)
CREATE POLICY "All users can view presence" 
ON user_presence FOR SELECT 
USING (true);

-- Users can insert their own presence
CREATE POLICY "Users can insert own presence" 
ON user_presence FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own presence
CREATE POLICY "Users can update own presence" 
ON user_presence FOR UPDATE 
USING (auth.uid() = user_id);

-- 5. Create a function to automatically update last_seen
CREATE OR REPLACE FUNCTION update_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.is_online = true THEN
    NEW.last_seen = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to auto-update timestamps
DROP TRIGGER IF EXISTS set_presence_timestamp ON user_presence;
CREATE TRIGGER set_presence_timestamp
  BEFORE UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_presence_timestamp();

-- ============================================
-- Verification
-- ============================================

SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'user_presence';

DO $$
BEGIN
  RAISE NOTICE '✅ Presence system fixed!';
  RAISE NOTICE 'Next: Update your relationship record with your partner''s user_id';
  RAISE NOTICE 'Run: UPDATE relationships SET partner_user_id = ''<partner-uuid>'' WHERE user_id = auth.uid();';
END $$;
