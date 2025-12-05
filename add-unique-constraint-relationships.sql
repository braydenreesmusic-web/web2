-- add-unique-constraint-relationships.sql
-- Safely add a unique index/constraint on relationships(user_id).
-- Usage: run in Supabase SQL Editor as a project admin.

-- 1) Preview duplicates (run this first to see any conflicts):
-- SELECT user_id, COUNT(*) FROM public.relationships GROUP BY user_id HAVING COUNT(*) > 1;

DO $$
DECLARE
  dup_count INT;
BEGIN
  -- Count duplicate user_id rows
  SELECT COUNT(*) INTO dup_count FROM (
    SELECT user_id FROM public.relationships GROUP BY user_id HAVING COUNT(*) > 1
  ) t;

  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Found % users with multiple relationships rows. Resolve duplicates before adding the unique index.', dup_count;
  END IF;

  -- Create unique index if it doesn't exist. This enforces uniqueness for user_id.
  CREATE UNIQUE INDEX IF NOT EXISTS relationships_user_id_key ON public.relationships (user_id);
END$$;

-- Note: If the script raises an exception about duplicates, run the preview query above to inspect
-- and decide how to merge or remove duplicates before retrying this script.
