-- 2025-12-06-add-bookmarks-delete-policy.sql
-- Enable RLS on bookmarks (if not already) and add a safe DELETE policy
-- Run this in Supabase SQL Editor.

BEGIN;

-- Enable row-level security (no-op if already enabled)
ALTER TABLE IF EXISTS public.bookmarks
  ENABLE ROW LEVEL SECURITY;

-- Create a safe DELETE policy that mirrors the existing SELECT/UPDATE relationship behavior.
-- This policy allows a user to delete their own bookmarks or bookmarks belonging to their partner
-- as determined by the `relationships` table. If you prefer only self-deletes, change the USING
-- clause to `(user_id = auth.uid())`.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookmarks' AND policyname = 'Users can delete own bookmarks'
  ) THEN
    EXECUTE '
      CREATE POLICY "Users can delete own bookmarks"
      ON public.bookmarks
      FOR DELETE
      USING (
        (user_id = auth.uid())
        OR (user_id IN (
          SELECT relationships.partner_user_id FROM relationships
          WHERE relationships.user_id = auth.uid()
        ))
      )
    ';
  END IF;
END;
$$;

COMMIT;

-- Notes:
-- 1) Run this in Supabase SQL Editor under a role that can modify policies (the SQL editor runs as an elevated user).
-- 2) If you prefer stricter rules (only allow the owner to delete), replace the USING clause with: (user_id = auth.uid()).
-- 3) After applying this migration, test delete from the app while logged in as the bookmark owner.
