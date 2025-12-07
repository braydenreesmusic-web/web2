-- 2025-12-06-add-push-subscriptions.sql
-- Create a table to store web-push subscriptions per user and RLS policies
-- Run this in Supabase SQL Editor.

BEGIN;

-- Table for push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- Enable RLS
ALTER TABLE IF EXISTS public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow users to insert/select/delete their own subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_subscriptions' AND policyname = 'users_manage_own_push_subscriptions'
  ) THEN
    EXECUTE '
      CREATE POLICY users_manage_own_push_subscriptions
      ON public.push_subscriptions
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid())
    ';
  END IF;
END;
$$;

COMMIT;

-- Notes:
-- - Service processes that need to read all subscriptions (to send pushes) should use the service_role key.
-- - Keep subscription payloads limited to what the browser provides.
