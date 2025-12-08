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


-- 3) Archive and dedupe: create archive table inside DO block and then run archive/delete
-- Some deployments may not have `last_seen`; detect that and order accordingly.
DO $$
DECLARE
  has_last boolean;
  order_by_clause text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'push_subscriptions' AND column_name = 'last_seen'
  ) INTO has_last;

  IF has_last THEN
    order_by_clause := 'COALESCE(last_seen, created_at) DESC';
  ELSE
    order_by_clause := 'created_at DESC';
  END IF;

  -- Ensure the archive table exists with the same structure before inserting
  EXECUTE 'CREATE TABLE IF NOT EXISTS public.push_subscriptions_duplicates (LIKE public.push_subscriptions INCLUDING ALL)';

  -- Insert duplicates into archive (keep all duplicate rows)
  EXECUTE format($sql$
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY lower(endpoint)
        ORDER BY %s
      ) AS rn
      FROM public.push_subscriptions
      WHERE endpoint IS NOT NULL AND trim(endpoint) <> ''
    )
    INSERT INTO public.push_subscriptions_duplicates
    SELECT p.*
    FROM public.push_subscriptions p
    JOIN ranked r ON p.id = r.id
    WHERE r.rn > 1;
  $sql$, order_by_clause);

  -- Delete duplicates from main table, keeping the most recent row
  EXECUTE format($sql$
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY lower(endpoint)
        ORDER BY %s
      ) AS rn
      FROM public.push_subscriptions
      WHERE endpoint IS NOT NULL AND trim(endpoint) <> ''
    )
    DELETE FROM public.push_subscriptions
    WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
  $sql$, order_by_clause);
END$$;

-- 6) Create unique index on lower(endpoint) and make endpoint NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions ((lower(endpoint)));

ALTER TABLE public.push_subscriptions
  ALTER COLUMN endpoint SET NOT NULL;

COMMIT;

-- Notes:
-- - Run the preview SELECT (commented) first to inspect duplicates.
-- - Consider enabling the archive step to move duplicates to a safe table before deletion.
-- - Backup/export `public.push_subscriptions` before running the destructive DELETE.
