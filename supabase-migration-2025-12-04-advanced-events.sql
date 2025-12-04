-- Migration: Add advanced event fields for couple scheduling app
-- Run this in Supabase SQL Editor

ALTER TABLE events ADD COLUMN IF NOT EXISTS owner TEXT; -- 'hers', 'yours', 'together'
ALTER TABLE events ADD COLUMN IF NOT EXISTS note TEXT; -- Love notes
ALTER TABLE events ADD COLUMN IF NOT EXISTS photo_url TEXT; -- Photo memory
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE; -- Shared/couple event

-- Optionally, add a shared_with field for more advanced sharing
-- ALTER TABLE events ADD COLUMN IF NOT EXISTS shared_with TEXT[];
