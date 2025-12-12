-- repair-create-relationships-for-accepted-requests.sql
-- Safe repair: for every accepted partner_request, ensure both users have a relationships row.
-- This script uses UPDATE then INSERT (if no rows updated) to avoid relying on ON CONFLICT
-- or a unique constraint on user_id.

DO $$
DECLARE
  rec RECORD;
  v_to_id UUID;
  rows INT;
BEGIN
  FOR rec IN SELECT * FROM public.partner_requests WHERE status = 'accepted' LOOP
    -- resolve recipient id (may be NULL if recipient not registered)
    SELECT id INTO v_to_id FROM auth.users WHERE email = rec.to_email LIMIT 1;

    -- Try to update requester row; if none updated, insert
    UPDATE public.relationships
      SET partner_user_id = v_to_id,
          partner_b = rec.to_email,
          start_date = COALESCE(relationships.start_date, CURRENT_DATE),
          updated_at = now()
    WHERE user_id = rec.from_user_id;

    GET DIAGNOSTICS rows = ROW_COUNT;
    IF rows = 0 THEN
      INSERT INTO public.relationships (
        user_id, partner_user_id, partner_a, partner_b, start_date, created_at, updated_at
      ) VALUES (
        rec.from_user_id,
        v_to_id,
        COALESCE(rec.from_name, rec.from_email),
        rec.to_email,
        CURRENT_DATE,
        now(), now()
      );
    END IF;

    -- For recipient side, only if we have a resolved user id
    IF v_to_id IS NOT NULL THEN
      UPDATE public.relationships
        SET partner_user_id = rec.from_user_id,
            partner_a = rec.to_email,
            start_date = COALESCE(relationships.start_date, CURRENT_DATE),
            updated_at = now()
      WHERE user_id = v_to_id;

      GET DIAGNOSTICS rows = ROW_COUNT;
      IF rows = 0 THEN
        INSERT INTO public.relationships (
          user_id, partner_user_id, partner_a, partner_b, start_date, created_at, updated_at
        ) VALUES (
          v_to_id,
          rec.from_user_id,
          rec.to_email,
          COALESCE(rec.from_name, rec.from_email),
          CURRENT_DATE,
          now(), now()
        );
      END IF;
    END IF;
  END LOOP;
END
$$;

-- Done. This script is safe to run as a Supabase project admin (service role).
-- It will create / update relationship rows for any partner_requests with status = 'accepted'.
