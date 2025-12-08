-- Migration: add endpoint column to push_subscriptions and backfill
-- Date: 2025-12-08
-- This script will:
-- 1) add an `endpoint` text column if missing
-- 2) backfill `endpoint` from subscription->>'endpoint'
-- 3) provide a non-destructive preview of duplicates
-- 4) archive duplicate rows to `push_subscriptions_duplicates` (optional)
-- 5) delete duplicates keeping the most-recent
-- 6) create a unique index on lower(endpoint) and set NOT NULL

BEGIN;

-- 1) Add column if it doesn't already exist
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS endpoint text;

-- 2) Backfill endpoint from subscription JSON (where missing)
UPDATE public.push_subscriptions
SET endpoint = trim(subscription ->> 'endpoint')
WHERE (endpoint IS NULL OR trim(endpoint) = '')
  AND (subscription ->> 'endpoint') IS NOT NULL;

-- 3) Non-destructive preview: show rows that would be considered duplicates
--    (run this SELECT in your SQL editor to inspect rows before deleting)
-- WITH ranked AS (
--   SELECT
--     *,
--     ROW_NUMBER() OVER (
--       PARTITION BY lower(COALESCE(endpoint, subscription->>'endpoint'))
--       ORDER BY COALESCE(last_seen, created_at) DESC
--     ) AS rn
--   FROM public.push_subscriptions
--   WHERE COALESCE(endpoint, subscription->>'endpoint') IS NOT NULL
-- )
-- SELECT * FROM ranked WHERE rn > 1;

-- 4) Optional: archive duplicates before deletion (uncomment to enable)
-- CREATE TABLE IF NOT EXISTS public.push_subscriptions_duplicates AS TABLE public.push_subscriptions WITH NO DATA;
-- INSERT INTO public.push_subscriptions_duplicates
-- SELECT ps.* FROM (
--   WITH ranked AS (
--     SELECT *, ROW_NUMBER() OVER (
--       PARTITION BY lower(COALESCE(endpoint, subscription->>'endpoint'))
--       ORDER BY COALESCE(last_seen, created_at) DESC
--     ) AS rn
--     FROM public.push_subscriptions
--     WHERE COALESCE(endpoint, subscription->>'endpoint') IS NOT NULL
--   )
--   SELECT * FROM ranked WHERE rn > 1
-- ) ps;

-- 5) Delete duplicate rows, keeping the most recent by last_seen/created_at
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY lower(COALESCE(endpoint, subscription->>'endpoint'))
      ORDER BY COALESCE(last_seen, created_at) DESC
    ) AS rn
  FROM public.push_subscriptions
  WHERE COALESCE(endpoint, subscription->>'endpoint') IS NOT NULL
)
DELETE FROM public.push_subscriptions
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 6) Create unique index on lower(endpoint) and make endpoint NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions ((lower(endpoint)));

ALTER TABLE public.push_subscriptions
  ALTER COLUMN endpoint SET NOT NULL;

COMMIT;

-- Notes:
-- - Run the preview SELECT (commented) first to inspect duplicates.
-- - Consider enabling the archive step to move duplicates to a safe table before deletion.
-- - Backup/export `public.push_subscriptions` before running the destructive DELETE.
