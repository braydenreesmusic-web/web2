-- ============================================
-- Simple Partner Linking System
-- Run this in your Supabase SQL Editor
-- ============================================

-- Add email-based linking helper function
CREATE OR REPLACE FUNCTION link_partner_by_email(user_email TEXT, partner_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  partner_user_id UUID;
BEGIN
  -- Get current user's ID
  SELECT id INTO current_user_id FROM auth.users WHERE email = user_email;
  
  -- Get partner's ID by email
  SELECT id INTO partner_user_id FROM auth.users WHERE email = partner_email;
  
  -- If partner exists, link them
  IF partner_user_id IS NOT NULL THEN
    UPDATE relationships 
    SET partner_user_id = partner_user_id 
    WHERE user_id = current_user_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create partner_requests table for pending requests
CREATE TABLE IF NOT EXISTS partner_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on partner_requests
ALTER TABLE partner_requests ENABLE ROW LEVEL SECURITY;

-- Policies for partner_requests
DROP POLICY IF EXISTS "Users can view requests they sent or received" ON partner_requests;
DROP POLICY IF EXISTS "Users can create partner requests" ON partner_requests;
DROP POLICY IF EXISTS "Users can update requests sent to them" ON partner_requests;

CREATE POLICY "Users can view requests they sent or received" 
ON partner_requests FOR SELECT 
USING (
  auth.uid() = from_user_id 
  OR 
  current_setting('jwt.claims.email', true) = to_email
);

CREATE POLICY "Users can create partner requests" 
ON partner_requests FOR INSERT 
WITH CHECK (auth.uid() = from_user_id);

-- Allow the recipient (by JWT email) or the original sender (by uid) to update the row.
-- Use the JWT email claim (available in Supabase auth tokens) rather than a non-standard auth.email() helper.
CREATE POLICY "Users can update requests sent to them" 
ON partner_requests FOR UPDATE 
USING (
  current_setting('jwt.claims.email', true) = to_email
  OR auth.uid() = from_user_id
);

-- Function to auto-link when request is accepted
CREATE OR REPLACE FUNCTION handle_partner_request_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  accepting_user_id UUID;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Get the accepting user's ID
    SELECT id INTO accepting_user_id FROM auth.users WHERE email = NEW.to_email;
    
    -- Link both users to each other
    UPDATE relationships 
    SET partner_user_id = accepting_user_id 
    WHERE user_id = NEW.from_user_id;
    
    UPDATE relationships 
    SET partner_user_id = NEW.from_user_id 
    WHERE user_id = accepting_user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_partner_request_accepted ON partner_requests;
CREATE TRIGGER on_partner_request_accepted
  AFTER UPDATE ON partner_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_partner_request_acceptance();

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_partner_requests_to_email ON partner_requests(to_email);
CREATE INDEX IF NOT EXISTS idx_partner_requests_from_user ON partner_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_partner_requests_status ON partner_requests(status);

DO $$
BEGIN
  RAISE NOTICE '✅ Simple partner linking system created!';
  RAISE NOTICE 'Users can now send/accept partner requests by email';
END $$;
