-- fix-relationship-policies-tailored.sql
-- Tailored for your `relationships` table schema
-- Columns assumed (from user):
-- id uuid, user_id uuid, partner_a text, partner_b text, start_date date,
-- savings_goal numeric, savings_current numeric, created_at, updated_at, partner_user_id uuid

-- Run this script in the Supabase SQL Editor as a project admin (service role).
-- It will:
-- 1) Enable RLS on `relationships` and `user_presence` and create safe policies matching your schema.
-- 2) Add a trigger that upserts relationship rows for both parties when a partner_request is accepted.

BEGIN;

-- === RELATIONSHIPS RLS ===
ALTER TABLE IF EXISTS public.relationships ENABLE ROW LEVEL SECURITY;

-- Allow select when you're the owner or the recorded partner
DROP POLICY IF EXISTS relationships_select_owner_or_partner ON public.relationships;
CREATE POLICY relationships_select_owner_or_partner
  ON public.relationships
  FOR SELECT USING (
    auth.uid() = user_id OR auth.uid() = partner_user_id
  );

-- Allow inserts only for rows that set user_id = auth.uid()
DROP POLICY IF EXISTS relationships_insert_owner ON public.relationships;
CREATE POLICY relationships_insert_owner
  ON public.relationships
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Allow updates by the owner (or partner) with checks ensuring auth matches
DROP POLICY IF EXISTS relationships_update_owner ON public.relationships;
CREATE POLICY relationships_update_owner
  ON public.relationships
  FOR UPDATE USING (
    auth.uid() = user_id OR auth.uid() = partner_user_id
  ) WITH CHECK (
    auth.uid() = user_id OR auth.uid() = partner_user_id
  );

-- Allow deletes only by owner
DROP POLICY IF EXISTS relationships_delete_owner ON public.relationships;
CREATE POLICY relationships_delete_owner
  ON public.relationships
  FOR DELETE USING (auth.uid() = user_id);

-- === USER_PRESENCE RLS ===
ALTER TABLE IF EXISTS public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_presence_select_partner ON public.user_presence;
CREATE POLICY user_presence_select_partner
  ON public.user_presence
  FOR SELECT USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT partner_user_id FROM public.relationships WHERE user_id = auth.uid()
    )
    OR user_id IN (
      SELECT user_id FROM public.relationships WHERE partner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS user_presence_write_own ON public.user_presence;
CREATE POLICY user_presence_write_own
  ON public.user_presence
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- === Trigger/function to upsert relationships on partner_requests.accepted ===
-- This function must be created and the trigger attached by a project admin.
CREATE OR REPLACE FUNCTION public.handle_partner_request_accept_tailored()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  from_id uuid := NEW.from_user_id;
  to_id uuid;
  from_name text := NEW.from_name;
  to_name text := NEW.to_name;
  today date := CURRENT_DATE;
BEGIN
  -- Only handle transitions to 'accepted'
  IF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    -- Resolve to_id via auth.users
    SELECT id INTO to_id FROM auth.users WHERE email = NEW.to_email LIMIT 1;

    -- Fallback: try public.profiles if auth.users isn't available
    IF to_id IS NULL THEN
      BEGIN
        SELECT id::uuid INTO to_id FROM public.profiles WHERE email = NEW.to_email LIMIT 1;
      EXCEPTION WHEN others THEN
        to_id := NULL;
      END;
    END IF;

    -- Upsert relationship for requester (from_id)
    IF from_id IS NOT NULL THEN
      INSERT INTO public.relationships (user_id, partner_user_id, partner_a, partner_b, start_date, created_at, updated_at)
      VALUES (
        from_id,
        to_id,
        COALESCE(NEW.from_name, (SELECT COALESCE(user_metadata->>'full_name', email) FROM auth.users WHERE id = from_id LIMIT 1)),
        COALESCE(NEW.to_name, NEW.to_email),
        today,
        now(), now()
      )
      ON CONFLICT (user_id) DO UPDATE
      SET partner_user_id = EXCLUDED.partner_user_id,
          partner_b = EXCLUDED.partner_b,
          start_date = COALESCE(relationships.start_date, EXCLUDED.start_date),
          updated_at = now();
    END IF;

    -- Upsert relationship for recipient (to_id)
    IF to_id IS NOT NULL THEN
      INSERT INTO public.relationships (user_id, partner_user_id, partner_a, partner_b, start_date, created_at, updated_at)
      VALUES (
        to_id,
        from_id,
        COALESCE(NEW.to_name, NEW.to_email),
        COALESCE(NEW.from_name, (SELECT COALESCE(user_metadata->>'full_name', email) FROM auth.users WHERE id = from_id LIMIT 1)),
        today,
        now(), now()
      )
      ON CONFLICT (user_id) DO UPDATE
      SET partner_user_id = EXCLUDED.partner_user_id,
          partner_a = EXCLUDED.partner_a,
          start_date = COALESCE(relationships.start_date, EXCLUDED.start_date),
          updated_at = now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS partner_request_accept_trigger_tailored ON public.partner_requests;
CREATE TRIGGER partner_request_accept_trigger_tailored
AFTER UPDATE ON public.partner_requests
FOR EACH ROW
WHEN (NEW.status = 'accepted')
EXECUTE FUNCTION public.handle_partner_request_accept_tailored();

COMMIT;

-- Notes:
-- - Run this as a Supabase project admin in the SQL editor.
-- - Adjust `user_metadata->>'full_name'` selector if your auth.users metadata uses a different key.
-- - Test in a staging environment first. Review RLS policies after applying to ensure your app can still perform intended operations.
