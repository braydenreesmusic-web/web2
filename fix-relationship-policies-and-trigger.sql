-- fix-relationship-policies-and-trigger.sql
-- Run this in the Supabase SQL editor as a project admin (service role)
-- Purpose:
-- 1) Add safe RLS policies for `relationships` and `user_presence` so users can read their own and partner rows and upsert their own presence/relationship rows.
-- 2) Add a trigger/function on `partner_requests` that will upsert `relationships` rows for both users when a request is accepted.

BEGIN;

-- 1) RELATIONSHIPS: Enable RLS and create policies
ALTER TABLE IF EXISTS public.relationships ENABLE ROW LEVEL SECURITY;

-- Allow selecting a relationship row if you're the owner or the recorded partner
DROP POLICY IF EXISTS rel_select_authenticated ON public.relationships;
CREATE POLICY rel_select_authenticated ON public.relationships
  FOR SELECT USING (
    auth.uid() = user_id OR auth.uid() = partner_user_id
  );

-- Allow inserts when auth.uid() equals the user_id in the new row
DROP POLICY IF EXISTS rel_insert_authenticated ON public.relationships;
CREATE POLICY rel_insert_authenticated ON public.relationships
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Allow updates by either owner or partner (use caution: partner updates should be limited by application logic)
DROP POLICY IF EXISTS rel_update_owner ON public.relationships;
CREATE POLICY rel_update_owner ON public.relationships
  FOR UPDATE USING (
    auth.uid() = user_id OR auth.uid() = partner_user_id
  ) WITH CHECK (
    auth.uid() = user_id OR auth.uid() = partner_user_id
  );

-- Allow delete only by owner
DROP POLICY IF EXISTS rel_delete_owner ON public.relationships;
CREATE POLICY rel_delete_owner ON public.relationships
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- 2) USER_PRESENCE: Enable RLS and create policies
ALTER TABLE IF EXISTS public.user_presence ENABLE ROW LEVEL SECURITY;

-- Allow selecting presence rows for yourself or for your partner(s).
-- This reads the relationships table to decide partner visibility.
DROP POLICY IF EXISTS presence_select_partner ON public.user_presence;
CREATE POLICY presence_select_partner ON public.user_presence
  FOR SELECT USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT partner_user_id FROM public.relationships WHERE user_id = auth.uid()
    )
    OR user_id IN (
      SELECT user_id FROM public.relationships WHERE partner_user_id = auth.uid()
    )
  );

-- Allow authenticated users to insert/update/delete their own presence row
DROP POLICY IF EXISTS presence_write_own ON public.user_presence;
CREATE POLICY presence_write_own ON public.user_presence
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3) Trigger: when a partner_request is accepted, upsert relationships for both parties
-- This function will try to resolve the `to_email` to an `auth.users` id. Run as admin.
CREATE OR REPLACE FUNCTION public.handle_partner_request_accept()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  from_id uuid;
  to_id uuid;
  from_name text;
  to_name text;
  today date := CURRENT_DATE;
BEGIN
  -- Only act on transitions to 'accepted'
  IF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    from_id := NEW.from_user_id;
    from_name := NEW.from_name;

    -- Try to resolve to_user id via auth.users (admin context required)
    SELECT id INTO to_id FROM auth.users WHERE email = NEW.to_email LIMIT 1;

    -- If we couldn't find by auth.users, try public.profiles (if exists)
    IF to_id IS NULL THEN
      BEGIN
        SELECT id::uuid INTO to_id FROM public.profiles WHERE email = NEW.to_email LIMIT 1;
      EXCEPTION WHEN others THEN
        -- ignore
      END;
    END IF;

    -- Upsert relationship for the requester (from_id)
    IF from_id IS NOT NULL THEN
      INSERT INTO public.relationships (user_id, partner_user_id, partner_a, partner_b, start_date, created_at, updated_at)
      VALUES (
        from_id,
        to_id,
        -- store human-friendly names when available (prefer public.profiles)
        (SELECT COALESCE(p.display_name, p.full_name, u.email, '')
         FROM auth.users u
         LEFT JOIN public.profiles p ON p.id = u.id
         WHERE u.id = from_id
         LIMIT 1),
        COALESCE(from_name, NEW.to_email),
        today,
        now(), now()
      )
      ON CONFLICT (user_id) DO UPDATE
      SET partner_user_id = EXCLUDED.partner_user_id,
          partner_b = EXCLUDED.partner_b,
          start_date = COALESCE(relationships.start_date, EXCLUDED.start_date),
          updated_at = now();
    END IF;

    -- Upsert relationship for the recipient (to_id) if we resolved them
    IF to_id IS NOT NULL THEN
      INSERT INTO public.relationships (user_id, partner_user_id, partner_a, partner_b, start_date, created_at, updated_at)
      VALUES (
        to_id,
        from_id,
        COALESCE(NEW.to_name, NEW.to_email),
        (SELECT COALESCE(p.display_name, p.full_name, u.email, '')
         FROM auth.users u
         LEFT JOIN public.profiles p ON p.id = u.id
         WHERE u.id = from_id
         LIMIT 1),
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

-- Attach trigger to partner_requests
DROP TRIGGER IF EXISTS partner_request_accept_trigger ON public.partner_requests;
CREATE TRIGGER partner_request_accept_trigger
AFTER UPDATE ON public.partner_requests
FOR EACH ROW
WHEN (NEW.status = 'accepted')
EXECUTE FUNCTION public.handle_partner_request_accept();

COMMIT;

-- Notes:
-- - Run this as a Supabase project admin (service role) in SQL Editor.
-- - Review column names in `relationships` table; adjust `partner_a`/`partner_b` fields used above if they differ in your schema.
-- - `auth.users` field `raw_user_meta->>'full_name'` may differ by project. If your project stores display name elsewhere (e.g., `public.profiles`), change the selection accordingly.
