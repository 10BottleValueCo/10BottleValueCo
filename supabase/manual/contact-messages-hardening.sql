-- Production incident fix draft for public.contact_messages only.
-- Replaces permissive public read/update policies with scoped customer/admin
-- policies. Only verified account holders may send support messages.
-- This does not delete or rewrite message rows.
-- Anonymous message-row insertion is disabled, but capability-scoped guest
-- attachment uploads remain a separate server API and are not retired here.
--
-- Run manually in the Supabase SQL Editor for the production project.
-- Do not run supabase/migrations/20261006170000_harden_customer_data.sql as a
-- substitute: that file also changes orders and remains gated by checkout
-- writes that are not yet fully server-side.

BEGIN;

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES
  ON TABLE public.contact_messages
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.contact_messages TO authenticated;
GRANT ALL ON TABLE public.contact_messages TO service_role;

DO $$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_messages'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.contact_messages',
      policy_row.policyname
    );
  END LOOP;
END;
$$;

CREATE POLICY contact_messages_admin_all
ON public.contact_messages
FOR ALL
TO authenticated
USING (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'support@10bottlevalue.co'
)
WITH CHECK (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'support@10bottlevalue.co'
);

CREATE POLICY contact_messages_customer_read_own
ON public.contact_messages
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'email' IS NOT NULL
  AND lower(coalesce(email, '')) = lower(auth.jwt() ->> 'email')
);

CREATE POLICY contact_messages_customer_insert_own
ON public.contact_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'email' IS NOT NULL
  AND lower(coalesce(email, '')) = lower(auth.jwt() ->> 'email')
  AND admin_reply IS NULL
  AND replied_at IS NULL
  AND user_read_at IS NULL
);

CREATE POLICY contact_messages_customer_update_own
ON public.contact_messages
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'email' IS NOT NULL
  AND lower(coalesce(email, '')) = lower(auth.jwt() ->> 'email')
)
WITH CHECK (
  auth.jwt() ->> 'email' IS NOT NULL
  AND lower(coalesce(email, '')) = lower(auth.jwt() ->> 'email')
);

CREATE POLICY contact_messages_customer_delete_own
ON public.contact_messages
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'email' IS NOT NULL
  AND lower(coalesce(email, '')) = lower(auth.jwt() ->> 'email')
);

CREATE OR REPLACE FUNCTION public.guard_customer_contact_message_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  jwt_role text := coalesce(
    auth.jwt() ->> 'role',
    current_setting('request.jwt.claim.role', true),
    ''
  );
  jwt_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF jwt_role = 'authenticated'
     AND jwt_email <> 'support@10bottlevalue.co' THEN
    IF (to_jsonb(NEW) - ARRAY['message', 'user_read_at', 'updated_at'])
       IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY['message', 'user_read_at', 'updated_at']) THEN
      RAISE EXCEPTION 'Customers may only edit their message and read status'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS guard_customer_contact_message_update
  ON public.contact_messages;

CREATE TRIGGER guard_customer_contact_message_update
BEFORE UPDATE ON public.contact_messages
FOR EACH ROW
EXECUTE FUNCTION public.guard_customer_contact_message_update();

COMMIT;
