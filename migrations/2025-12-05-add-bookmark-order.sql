-- 2025-12-05-add-bookmark-order.sql
-- Add an integer `order` column to `bookmarks` to persist UI ordering
-- and create a small index to accelerate ordered queries per user.

BEGIN;

-- Add column if it doesn't already exist. Use quoted identifier because
-- `order` is a reserved word in SQL.
ALTER TABLE IF EXISTS public.bookmarks
ADD COLUMN IF NOT EXISTS "order" integer;

-- Backfill existing rows with a deterministic order (0-based) based on created_at.
-- Newer bookmarks get lower index (0 = newest) to match typical UI ordering.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) - 1 AS rn
  FROM public.bookmarks
)
UPDATE public.bookmarks b
SET "order" = r.rn
FROM ranked r
WHERE b.id = r.id
  AND (b."order" IS NULL);

-- Create an index to support queries that order by user_id + order.
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_order ON public.bookmarks (user_id, "order");

COMMIT;

-- Notes:
-- - If your project uses a different schema, adjust `public` accordingly.
-- - After applying this migration you can update the client to persist order changes
--   by calling the bulk updater endpoint or using the provided client helper.
