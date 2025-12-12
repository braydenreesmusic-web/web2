-- Migration: enable RLS and add policies for push_subscriptions
-- Date: 2025-12-12

-- Enable Row Level Security
ALTER TABLE IF EXISTS public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT their own subscriptions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'push_subscriptions' AND p.polname = 'push_subscriptions_select_owner'
  ) THEN
    CREATE POLICY push_subscriptions_select_owner ON public.push_subscriptions
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END$$;

-- Allow insert only when the incoming user_id matches auth.uid()
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'push_subscriptions' AND p.polname = 'push_subscriptions_insert_owner'
  ) THEN
    CREATE POLICY push_subscriptions_insert_owner ON public.push_subscriptions
      FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;
END$$;

-- Allow update/delete only for the owner
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'push_subscriptions' AND p.polname = 'push_subscriptions_modify_owner'
  ) THEN
    -- Create separate policies for UPDATE and DELETE (Postgres does not accept comma-separated actions)
    CREATE POLICY push_subscriptions_modify_owner_update ON public.push_subscriptions
      FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    CREATE POLICY push_subscriptions_modify_owner_delete ON public.push_subscriptions
      FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END$$;

-- Note: Service role and REST API requests using the service role key bypass RLS.
