-- Customer-data hardening for orders and support messages.
-- This replaces only policies on these two tables; it does not alter or delete rows.
-- Review on a staging Supabase project before applying to production.

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

CREATE POLICY orders_customer_insert_unpaid
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'email' IS NOT NULL
  AND lower(coalesce(email, '')) = lower(auth.jwt() ->> 'email')
  AND lower(coalesce(status::text, '')) IN ('pending', 'checkout', 'wire_pending')
);

CREATE POLICY orders_guest_insert_unpaid
ON public.orders
FOR INSERT
TO anon
WITH CHECK (
  lower(coalesce(email, '')) ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  AND lower(coalesce(status::text, '')) IN ('pending', 'checkout', 'wire_pending')
);

CREATE POLICY orders_customer_update_unpaid
ON public.orders
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'email' IS NOT NULL
  AND lower(coalesce(email, '')) = lower(auth.jwt() ->> 'email')
  AND lower(coalesce(status::text, '')) IN ('pending', 'checkout', 'wire_pending')
)
WITH CHECK (
  auth.jwt() ->> 'email' IS NOT NULL
  AND lower(coalesce(email, '')) = lower(auth.jwt() ->> 'email')
  AND lower(coalesce(status::text, '')) IN ('pending', 'checkout', 'wire_pending')
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

CREATE POLICY contact_messages_guest_insert
ON public.contact_messages
FOR INSERT
TO anon
WITH CHECK (
  length(trim(coalesce(name, ''))) BETWEEN 1 AND 200
  AND lower(coalesce(email, '')) ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  AND length(trim(coalesce(message, ''))) BETWEEN 1 AND 10000
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
