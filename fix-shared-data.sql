-- ============================================
-- Shared Data for Linked Partners
-- Run this in Supabase SQL Editor
-- ============================================

-- Helper function to get both partner user IDs
CREATE OR REPLACE FUNCTION get_partner_ids(current_user_id UUID)
RETURNS UUID[] AS $$
DECLARE
  partner_id UUID;
  result UUID[];
BEGIN
  -- Get the partner's ID from relationships
  SELECT partner_user_id INTO partner_id
  FROM relationships
  WHERE user_id = current_user_id;
  
  -- Return array of both user IDs
  IF partner_id IS NOT NULL THEN
    result := ARRAY[current_user_id, partner_id];
  ELSE
    result := ARRAY[current_user_id];
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to allow viewing partner's data

-- Check-ins: View yours AND partner's
DROP POLICY IF EXISTS "Users can view own check-ins" ON check_ins;
CREATE POLICY "Users can view own check-ins" ON check_ins 
FOR SELECT USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT partner_user_id FROM relationships WHERE user_id = auth.uid()
  )
);

-- Events: View yours AND partner's
DROP POLICY IF EXISTS "Users can view own events" ON events;
CREATE POLICY "Users can view own events" ON events 
FOR SELECT USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT partner_user_id FROM relationships WHERE user_id = auth.uid()
  )
);

-- Events: Update/Delete partner's events too
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Users can delete own events" ON events;
CREATE POLICY "Users can update own events" ON events 
FOR UPDATE USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT partner_user_id FROM relationships WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Users can delete own events" ON events 
FOR DELETE USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT partner_user_id FROM relationships WHERE user_id = auth.uid()
  )
);

-- Media: View yours AND partner's
DROP POLICY IF EXISTS "Users can view own media" ON media;
CREATE POLICY "Users can view own media" ON media 
FOR SELECT USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT partner_user_id FROM relationships WHERE user_id = auth.uid()
  )
);

-- Media: Update partner's media too (for favorites, captions)
DROP POLICY IF EXISTS "Users can update own media" ON media;
CREATE POLICY "Users can update own media" ON media 
FOR UPDATE USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT partner_user_id FROM relationships WHERE user_id = auth.uid()
  )
);

-- Notes: View yours AND partner's
DROP POLICY IF EXISTS "Users can view own notes" ON notes;
CREATE POLICY "Users can view own notes" ON notes 
FOR SELECT USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT partner_user_id FROM relationships WHERE user_id = auth.uid()
  )
);

-- Tasks: View yours AND partner's
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
CREATE POLICY "Users can view own tasks" ON tasks 
FOR SELECT USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT partner_user_id FROM relationships WHERE user_id = auth.uid()
  )
);

-- Tasks: Update partner's tasks too
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
CREATE POLICY "Users can update own tasks" ON tasks 
FOR UPDATE USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT partner_user_id FROM relationships WHERE user_id = auth.uid()
  )
);

-- Pins: View yours AND partner's
DROP POLICY IF EXISTS "Users can view own pins" ON pins;
CREATE POLICY "Users can view own pins" ON pins 
FOR SELECT USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT partner_user_id FROM relationships WHERE user_id = auth.uid()
  )
);

-- Bookmarks: View yours AND partner's
DROP POLICY IF EXISTS "Users can view own bookmarks" ON bookmarks;
CREATE POLICY "Users can view own bookmarks" ON bookmarks 
FOR SELECT USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT partner_user_id FROM relationships WHERE user_id = auth.uid()
  )
);

-- Bookmarks: Update partner's bookmarks
DROP POLICY IF EXISTS "Users can update own bookmarks" ON bookmarks;
CREATE POLICY "Users can update own bookmarks" ON bookmarks 
FOR UPDATE USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT partner_user_id FROM relationships WHERE user_id = auth.uid()
  )
);

-- Savings Goals: View yours AND partner's
DROP POLICY IF EXISTS "Users can view own savings goals" ON savings_goals;
CREATE POLICY "Users can view own savings goals" ON savings_goals 
FOR SELECT USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT partner_user_id FROM relationships WHERE user_id = auth.uid()
  )
);

-- Savings Goals: Update partner's too
DROP POLICY IF EXISTS "Users can update own savings goals" ON savings_goals;
CREATE POLICY "Users can update own savings goals" ON savings_goals 
FOR UPDATE USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT partner_user_id FROM relationships WHERE user_id = auth.uid()
  )
);

-- Savings Contributions: View yours AND partner's
DROP POLICY IF EXISTS "Users can view own contributions" ON savings_contributions;
CREATE POLICY "Users can view own contributions" ON savings_contributions 
FOR SELECT USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT partner_user_id FROM relationships WHERE user_id = auth.uid()
  )
);

-- Music Tracks: View yours AND partner's
DROP POLICY IF EXISTS "Users can view own tracks" ON music_tracks;
CREATE POLICY "Users can view own tracks" ON music_tracks 
FOR SELECT USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT partner_user_id FROM relationships WHERE user_id = auth.uid()
  )
);

-- Music Tracks: Delete partner's tracks
DROP POLICY IF EXISTS "Users can delete own tracks" ON music_tracks;
CREATE POLICY "Users can delete own tracks" ON music_tracks 
FOR DELETE USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT partner_user_id FROM relationships WHERE user_id = auth.uid()
  )
);

-- Playlists: View yours AND partner's
DROP POLICY IF EXISTS "Users can view own playlists" ON playlists;
CREATE POLICY "Users can view own playlists" ON playlists 
FOR SELECT USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT partner_user_id FROM relationships WHERE user_id = auth.uid()
  )
);

-- Playlists: Update partner's playlists
DROP POLICY IF EXISTS "Users can update own playlists" ON playlists;
CREATE POLICY "Users can update own playlists" ON playlists 
FOR UPDATE USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT partner_user_id FROM relationships WHERE user_id = auth.uid()
  )
);

-- Listening Sessions: View yours AND partner's
DROP POLICY IF EXISTS "Users can view own sessions" ON listening_sessions;
CREATE POLICY "Users can view own sessions" ON listening_sessions 
FOR SELECT USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT partner_user_id FROM relationships WHERE user_id = auth.uid()
  )
);

DO $$
BEGIN
  RAISE NOTICE '✅ Shared data access enabled!';
  RAISE NOTICE 'Both partners can now view each other''s:';
  RAISE NOTICE '- Check-ins, Events, Photos/Videos, Notes';
  RAISE NOTICE '- Tasks, Pins, Bookmarks';
  RAISE NOTICE '- Savings Goals & Contributions';
  RAISE NOTICE '- Music Tracks, Playlists, Listening Sessions';
  RAISE NOTICE '- Can also update/delete shared content';
END $$;
