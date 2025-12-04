-- ============================================
-- Enhanced Features Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- Savings Goals table
CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_amount DECIMAL(10,2) NOT NULL,
  current_amount DECIMAL(10,2) DEFAULT 0,
  category TEXT,
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Savings Contributions table
CREATE TABLE IF NOT EXISTS savings_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID REFERENCES savings_goals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Music Tracks table (for iTunes API results)
CREATE TABLE IF NOT EXISTS music_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_name TEXT,
  artwork_url TEXT,
  preview_url TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playlist Tracks junction table
CREATE TABLE IF NOT EXISTS playlist_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  track_id UUID REFERENCES music_tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(playlist_id, track_id)
);

-- Listening Sessions table
CREATE TABLE IF NOT EXISTS listening_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID REFERENCES music_tracks(id) ON DELETE CASCADE,
  is_playing BOOLEAN DEFAULT FALSE,
  playback_position DECIMAL(10,2) DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- User Presence table
CREATE TABLE IF NOT EXISTS user_presence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add author_id to check_ins for user attribution
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS author_email TEXT;

-- Add media type for audio
ALTER TABLE media DROP CONSTRAINT IF EXISTS media_type_check;
ALTER TABLE media ADD CONSTRAINT media_type_check CHECK (type IN ('photo', 'video', 'audio'));

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- Savings Goals policies
DROP POLICY IF EXISTS "Users can view own savings goals" ON savings_goals;
DROP POLICY IF EXISTS "Users can insert own savings goals" ON savings_goals;
DROP POLICY IF EXISTS "Users can update own savings goals" ON savings_goals;
DROP POLICY IF EXISTS "Users can delete own savings goals" ON savings_goals;
CREATE POLICY "Users can view own savings goals" ON savings_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own savings goals" ON savings_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own savings goals" ON savings_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own savings goals" ON savings_goals FOR DELETE USING (auth.uid() = user_id);

-- Savings Contributions policies
DROP POLICY IF EXISTS "Users can view own contributions" ON savings_contributions;
DROP POLICY IF EXISTS "Users can insert own contributions" ON savings_contributions;
CREATE POLICY "Users can view own contributions" ON savings_contributions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contributions" ON savings_contributions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Music Tracks policies
DROP POLICY IF EXISTS "Users can view own tracks" ON music_tracks;
DROP POLICY IF EXISTS "Users can insert own tracks" ON music_tracks;
DROP POLICY IF EXISTS "Users can delete own tracks" ON music_tracks;
CREATE POLICY "Users can view own tracks" ON music_tracks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tracks" ON music_tracks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tracks" ON music_tracks FOR DELETE USING (auth.uid() = user_id);

-- Playlists policies
DROP POLICY IF EXISTS "Users can view own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can insert own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can update own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can delete own playlists" ON playlists;
CREATE POLICY "Users can view own playlists" ON playlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own playlists" ON playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own playlists" ON playlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own playlists" ON playlists FOR DELETE USING (auth.uid() = user_id);

-- Playlist Tracks policies
DROP POLICY IF EXISTS "Users can view playlist tracks" ON playlist_tracks;
DROP POLICY IF EXISTS "Users can insert playlist tracks" ON playlist_tracks;
DROP POLICY IF EXISTS "Users can delete playlist tracks" ON playlist_tracks;
CREATE POLICY "Users can view playlist tracks" ON playlist_tracks FOR SELECT USING (
  EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_id AND playlists.user_id = auth.uid())
);
CREATE POLICY "Users can insert playlist tracks" ON playlist_tracks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_id AND playlists.user_id = auth.uid())
);
CREATE POLICY "Users can delete playlist tracks" ON playlist_tracks FOR DELETE USING (
  EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_id AND playlists.user_id = auth.uid())
);

-- Listening Sessions policies
DROP POLICY IF EXISTS "Users can view own sessions" ON listening_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON listening_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON listening_sessions;
CREATE POLICY "Users can view own sessions" ON listening_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON listening_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON listening_sessions FOR UPDATE USING (auth.uid() = user_id);

-- User Presence policies (allow viewing all users for presence tracking)
DROP POLICY IF EXISTS "All users can view presence" ON user_presence;
DROP POLICY IF EXISTS "Users can update own presence" ON user_presence;
DROP POLICY IF EXISTS "Users can insert own presence" ON user_presence;
CREATE POLICY "All users can view presence" ON user_presence FOR SELECT USING (true);
CREATE POLICY "Users can insert own presence" ON user_presence FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own presence" ON user_presence FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Enhanced features migration complete!';
  RAISE NOTICE 'Added: savings goals, music tracks, playlists, listening sessions, user presence';
END $$;
