-- ============================================
-- Supabase Database Setup Script
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CREATE TABLES
-- ============================================

-- Relationships table
CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_a TEXT NOT NULL,
  partner_b TEXT NOT NULL,
  start_date DATE NOT NULL,
  savings_goal DECIMAL(10,2) DEFAULT 0,
  savings_current DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Check-ins table
CREATE TABLE IF NOT EXISTS check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  emotion TEXT NOT NULL,
  energy INTEGER CHECK (energy >= 1 AND energy <= 10),
  love_language TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME,
  location TEXT,
  category TEXT,
  recurring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  list TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  added_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media table
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('photo', 'video')),
  caption TEXT,
  location TEXT,
  date DATE,
  favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pins table (map markers)
CREATE TABLE IF NOT EXISTS pins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date DATE,
  photo INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Location shares table
CREATE TABLE IF NOT EXISTS location_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  url TEXT,
  notes TEXT,
  visited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relationship insights table
CREATE TABLE IF NOT EXISTS relationship_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_insights ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- Relationships policies
DROP POLICY IF EXISTS "Users can view own relationships" ON relationships;
DROP POLICY IF EXISTS "Users can insert own relationships" ON relationships;
DROP POLICY IF EXISTS "Users can update own relationships" ON relationships;
CREATE POLICY "Users can view own relationships" ON relationships FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own relationships" ON relationships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own relationships" ON relationships FOR UPDATE USING (auth.uid() = user_id);

-- Check-ins policies
DROP POLICY IF EXISTS "Users can view own check-ins" ON check_ins;
DROP POLICY IF EXISTS "Users can insert own check-ins" ON check_ins;
CREATE POLICY "Users can view own check-ins" ON check_ins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own check-ins" ON check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Events policies
DROP POLICY IF EXISTS "Users can view own events" ON events;
DROP POLICY IF EXISTS "Users can insert own events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Users can delete own events" ON events;
CREATE POLICY "Users can view own events" ON events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON events FOR DELETE USING (auth.uid() = user_id);

-- Tasks policies
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);

-- Media policies
DROP POLICY IF EXISTS "Users can view own media" ON media;
DROP POLICY IF EXISTS "Users can insert own media" ON media;
DROP POLICY IF EXISTS "Users can update own media" ON media;
CREATE POLICY "Users can view own media" ON media FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own media" ON media FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own media" ON media FOR UPDATE USING (auth.uid() = user_id);

-- Notes policies
DROP POLICY IF EXISTS "Users can view own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON notes;
CREATE POLICY "Users can view own notes" ON notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Pins policies
DROP POLICY IF EXISTS "Users can view own pins" ON pins;
DROP POLICY IF EXISTS "Users can insert own pins" ON pins;
CREATE POLICY "Users can view own pins" ON pins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pins" ON pins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Location Shares policies
DROP POLICY IF EXISTS "Users can view own location" ON location_shares;
DROP POLICY IF EXISTS "Users can insert own location" ON location_shares;
DROP POLICY IF EXISTS "Users can update own location" ON location_shares;
CREATE POLICY "Users can view own location" ON location_shares FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own location" ON location_shares FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own location" ON location_shares FOR UPDATE USING (auth.uid() = user_id);

-- Bookmarks policies
DROP POLICY IF EXISTS "Users can view own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can insert own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can update own bookmarks" ON bookmarks;
CREATE POLICY "Users can view own bookmarks" ON bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bookmarks" ON bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bookmarks" ON bookmarks FOR UPDATE USING (auth.uid() = user_id);

-- Relationship Insights policies
DROP POLICY IF EXISTS "Users can view own insights" ON relationship_insights;
DROP POLICY IF EXISTS "Users can update own insights" ON relationship_insights;
CREATE POLICY "Users can view own insights" ON relationship_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own insights" ON relationship_insights FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database setup complete!';
  RAISE NOTICE 'All tables created with Row Level Security enabled.';
  RAISE NOTICE 'You can now use the app with authentication!';
END $$;
