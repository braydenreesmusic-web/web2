-- Migration: create meetups table
-- Run this in Supabase SQL editor or via psql/your DB tooling.
-- Date: 2025-12-14

BEGIN;

-- Table: public.meetups
CREATE TABLE IF NOT EXISTS public.meetups (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL,
  target_at timestamptz,
  milestones jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure one row per user when desired (unique index)
CREATE UNIQUE INDEX IF NOT EXISTS meetups_user_id_idx ON public.meetups(user_id);

-- Trigger to keep updated_at current on updates
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_updated_at ON public.meetups;
CREATE TRIGGER trg_set_updated_at
BEFORE UPDATE ON public.meetups
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security: enable and example policy
ALTER TABLE public.meetups ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own meetup row
-- Assumes `auth.uid()` returns the current user's id (string)
CREATE POLICY "meetups_user_policy" ON public.meetups
  FOR ALL
  -- Cast auth.uid() to text to avoid uuid = text operator errors
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

COMMIT;

-- Notes:
-- - `milestones` is expected to be a JSON array of numbers (seconds before the event), e.g. [604800,259200,172800,86400,0].
-- - If you'd rather allow multiple events per user, drop the unique index and use an `id`-based PK only.
-- - If your auth user ids are UUIDs, ensure `user_id` column type and stored values match `auth.uid()`.
