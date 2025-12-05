-- schedule-mark-stale-presence.sql
-- Safe script to create a function that marks stale `user_presence` rows offline
-- and schedule it with pg_cron if available. Run this in Supabase SQL Editor.

-- 1) Try to create pg_cron if allowed. If it's not available in your project this will
--    be caught and a NOTICE will be emitted; the rest of the script still creates
--    the function so you can schedule it manually (Studio, external cron, etc.).
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'pg_cron not available or cannot be created: %', SQLERRM;
  END;
END;
$$;

-- 2) Function that marks any presence row without a recent heartbeat as offline.
CREATE OR REPLACE FUNCTION public.mark_stale_presence_offline()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  UPDATE public.user_presence
  SET is_online = false,
      last_seen = COALESCE(last_seen, updated_at),
      updated_at = now()
  WHERE is_online = true
    AND (updated_at IS NULL OR updated_at < now() - interval '60 seconds');
END;
$$;

-- 3) If pg_cron is present, schedule the function to run every minute.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      -- unschedule any existing job with the same name (ignore if cron.job missing)
      BEGIN
        FOR r IN SELECT jobid FROM cron.job WHERE jobname = 'mark_stale_presence_offline' LOOP
          PERFORM cron.unschedule(r.jobid);
        END LOOP;
      EXCEPTION WHEN undefined_table THEN
        NULL; -- cron.job not present; continue
      END;

      -- schedule the job
      PERFORM cron.schedule(
        'mark_stale_presence_offline',
        '* * * * *',
        $$SELECT public.mark_stale_presence_offline();$$
      );
      RAISE NOTICE 'Scheduled mark_stale_presence_offline to run every minute (pg_cron).';
    END;
  ELSE
    RAISE NOTICE 'pg_cron not installed. The function public.mark_stale_presence_offline() was created. Please schedule it via Supabase Scheduled Triggers or an external cron.';
  END IF;
END;
$$;

-- Notes:
-- - If your Supabase project does not allow creating extensions, use the created function
--   (`public.mark_stale_presence_offline()`) with Supabase's Scheduled Triggers UI or an
--   external scheduler (GitHub Actions, Vercel Cron, etc.) to call the function periodically.
-- - To manually run the function now: `select public.mark_stale_presence_offline();`
