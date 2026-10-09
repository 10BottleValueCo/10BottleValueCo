-- Orders access containment. Apply explicitly after read-only preflight and
-- compatible authenticated checkout code. This preserves every existing
-- Merit/credit policy, trigger, function and private financial record.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $preflight$
BEGIN
  IF to_regclass('public.orders') IS NULL
    OR to_regprocedure('public.can_read_merit_order(text)') IS NULL
    OR to_regprocedure('public.can_read_store_credit_order(text)') IS NULL THEN
    RAISE EXCEPTION 'Existing orders, Merit and credit protections are required';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid='public.orders'::regclass
    AND attname='user_id' AND NOT attisdropped AND atttypid <> 'uuid'::regtype) THEN
    RAISE EXCEPTION 'orders.user_id must be uuid or absent; inspect schema first';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='orders'
    AND policyname IN ('merit_order_read_privacy','store_credit_order_read_privacy')
    AND permissive='RESTRICTIVE') <> 2 THEN
    RAISE EXCEPTION 'Both existing restrictive payment privacy policies are required';
  END IF;
END
$preflight$;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.can_access_order_record(p_user_id uuid, p_email text, p_admin_only boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT current_setting('role',true) = 'authenticated' AND EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id=auth.uid() AND u.email_confirmed_at IS NOT NULL
      AND (lower(btrim(u.email))='support@10bottlevalue.co'
        OR (NOT p_admin_only AND
          ((p_user_id IS NOT NULL AND p_user_id=u.id)
            OR (p_user_id IS NULL AND lower(btrim(u.email))=lower(btrim(p_email))))))
  )
$$;
REVOKE ALL ON FUNCTION public.can_access_order_record(uuid,text,boolean) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.can_access_order_record(uuid,text,boolean) TO authenticated;

REVOKE ALL ON TABLE public.orders FROM PUBLIC,anon,authenticated;
-- Column grants survive table-level REVOKE. Remove both access paths.
DO $columns$
DECLARE c record;
BEGIN
  FOR c IN SELECT attname FROM pg_attribute WHERE attrelid='public.orders'::regclass AND attnum>0 AND NOT attisdropped LOOP
    EXECUTE format('REVOKE ALL (%I) ON TABLE public.orders FROM PUBLIC,anon,authenticated',c.attname);
  END LOOP;
END
$columns$;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;
-- Restrictive policies AND with any old permissive policy. Explicit permissive
-- companions permit the intended flows even if old policies were narrower.
CREATE POLICY orders_verified_read ON public.orders AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.can_access_order_record(user_id,email,false));
CREATE POLICY orders_verified_read_boundary ON public.orders AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.can_access_order_record(user_id,email,false));
CREATE POLICY orders_verified_admin_write ON public.orders AS PERMISSIVE FOR ALL TO authenticated
  USING (public.can_access_order_record(user_id,email,true))
  WITH CHECK (public.can_access_order_record(user_id,email,true));
CREATE POLICY orders_verified_insert_boundary ON public.orders AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_access_order_record(user_id,email,true));
CREATE POLICY orders_verified_update_boundary ON public.orders AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.can_access_order_record(user_id,email,true))
  WITH CHECK (public.can_access_order_record(user_id,email,true));
CREATE POLICY orders_verified_delete_boundary ON public.orders AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.can_access_order_record(user_id,email,true));
COMMENT ON FUNCTION public.can_access_order_record(uuid,text,boolean) IS
  'Orders containment: real confirmed auth.users identity, UUID owner first, legacy confirmed-email fallback only without UUID. Does not bypass scoped payment protections.';
COMMIT;
