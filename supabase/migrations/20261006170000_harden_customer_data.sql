-- Customer-data hardening for orders and support messages.
-- This changes access rules and adds a nullable capability-hash column; it does
-- not alter or delete rows. Checkout writes use the server-side order endpoint.
-- The support inbox requires a verified account. Guest attachment uploads remain
-- separate and continue through the capability-scoped server API.
-- Do not apply to production without explicit approval and a staging rollout.

BEGIN;

DO $$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('orders', 'contact_messages')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      policy_row.policyname,
      policy_row.tablename
    );
  END LOOP;
END
$$;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checkout_access_hash text;

REVOKE ALL ON TABLE public.orders FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;

REVOKE ALL ON TABLE public.contact_messages
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.contact_messages TO authenticated;
GRANT ALL ON TABLE public.contact_messages TO service_role;

CREATE POLICY orders_admin_all
ON public.orders
FOR ALL
TO authenticated
USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'support@10bottlevalue.co')
WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) = 'support@10bottlevalue.co');

CREATE POLICY orders_customer_read_own
ON public.orders
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'email' IS NOT NULL
  AND lower(coalesce(email, '')) = lower(auth.jwt() ->> 'email')
);

CREATE POLICY contact_messages_admin_all
ON public.contact_messages
FOR ALL
TO authenticated
USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'support@10bottlevalue.co')
WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) = 'support@10bottlevalue.co');

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
  jwt_role text := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
  jwt_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF jwt_role = 'authenticated' AND jwt_email <> 'support@10bottlevalue.co' THEN
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

DROP TRIGGER IF EXISTS guard_customer_contact_message_update ON public.contact_messages;
CREATE TRIGGER guard_customer_contact_message_update
BEFORE UPDATE ON public.contact_messages
FOR EACH ROW
EXECUTE FUNCTION public.guard_customer_contact_message_update();

COMMIT;
