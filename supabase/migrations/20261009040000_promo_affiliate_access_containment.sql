-- Contain future public-role access without rewriting historical financial
-- records or treating their prior contents as verified issuance/settlement.
-- Existing payment guards and private RPCs remain authoritative and unchanged.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $preflight$
DECLARE table_name text;
BEGIN
  IF to_regprocedure('public.can_access_order_record(uuid,text,boolean)') IS NULL THEN
    RAISE EXCEPTION 'Verified order identity helper is required';
  END IF;
  FOREACH table_name IN ARRAY ARRAY['user_promos','affiliates','affiliate_orders','affiliate_payouts'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid=to_regclass('public.'||table_name) AND relkind='r') THEN
      RAISE EXCEPTION 'Existing public.% table is required',table_name;
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid='public.user_promos'::regclass
    AND attname='email' AND NOT attisdropped AND atttypid IN ('text'::regtype,'varchar'::regtype))
    OR NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid='public.user_promos'::regclass
      AND attname='used' AND NOT attisdropped AND atttypid='boolean'::regtype) THEN
    RAISE EXCEPTION 'Existing user_promos email and used columns are required';
  END IF;
END
$preflight$;

ALTER TABLE public.user_promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_promos,public.affiliates,public.affiliate_orders,public.affiliate_payouts
  FROM PUBLIC,anon,authenticated;
-- REVOKE on a table does not remove an independently granted column privilege.
DO $columns$
DECLARE c record;
BEGIN
  FOR c IN SELECT n.nspname,t.relname,a.attname
    FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace
      JOIN pg_attribute a ON a.attrelid=t.oid
    WHERE n.nspname='public' AND t.relname IN ('user_promos','affiliates','affiliate_orders','affiliate_payouts')
      AND a.attnum>0 AND NOT a.attisdropped
  LOOP
    EXECUTE format('REVOKE ALL (%I) ON TABLE %I.%I FROM PUBLIC,anon,authenticated',c.attname,c.nspname,c.relname);
  END LOOP;
END
$columns$;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.user_promos,public.affiliates,public.affiliate_orders,public.affiliate_payouts
  TO authenticated;
-- Preserve service access used by authenticated APIs and verified legacy
-- callbacks. Do not revoke service privileges or change any existing RPC ACL.
GRANT SELECT,INSERT,UPDATE ON TABLE public.user_promos,public.affiliate_orders TO service_role;
GRANT SELECT ON TABLE public.affiliates TO service_role;
GRANT SELECT,INSERT ON TABLE public.affiliate_payouts TO service_role;

-- The existing helper checks the actual confirmed auth.users identity, not
-- browser-supplied metadata or an email claim. NULL UUID uses verified email.
-- Paired permissive policies keep intended flows working; restrictive ones
-- prevent any pre-existing permissive ALL policy from broadening access.
CREATE POLICY user_promos_verified_read ON public.user_promos AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.can_access_order_record(NULL,email,false));
CREATE POLICY user_promos_verified_read_boundary ON public.user_promos AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.can_access_order_record(NULL,email,false));
CREATE POLICY user_promos_verified_insert ON public.user_promos AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_access_order_record(NULL,NULL,true));
CREATE POLICY user_promos_verified_insert_boundary ON public.user_promos AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_access_order_record(NULL,NULL,true));
CREATE POLICY user_promos_verified_update ON public.user_promos AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.can_access_order_record(NULL,NULL,true)
    OR (used IS FALSE AND public.can_access_order_record(NULL,email,false)))
  WITH CHECK (public.can_access_order_record(NULL,NULL,true)
    OR (used IS TRUE AND public.can_access_order_record(NULL,email,false)));
CREATE POLICY user_promos_verified_update_boundary ON public.user_promos AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.can_access_order_record(NULL,NULL,true)
    OR (used IS FALSE AND public.can_access_order_record(NULL,email,false)))
  WITH CHECK (public.can_access_order_record(NULL,NULL,true)
    OR (used IS TRUE AND public.can_access_order_record(NULL,email,false)));
CREATE POLICY user_promos_verified_delete ON public.user_promos AS PERMISSIVE FOR DELETE TO authenticated
  USING (public.can_access_order_record(NULL,email,false));
CREATE POLICY user_promos_verified_delete_boundary ON public.user_promos AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.can_access_order_record(NULL,email,false));

-- Deliberately SECURITY INVOKER: direct customer updates execute as
-- authenticated; service callbacks and owner-executed payment RPCs retain
-- their existing authority. A forged JWT role does not change current_user.
-- Existing merit_reserved_promo_guard still protects held promo rows even
-- against support/service edits. Used=NULL is not silently treated as unused.
CREATE FUNCTION public.guard_user_promo_customer_update()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
BEGIN
  IF current_user='authenticated' THEN
    IF public.can_access_order_record(NULL,NULL,true) THEN RETURN NEW; END IF;
    IF NOT public.can_access_order_record(NULL,OLD.email,false)
      OR OLD.used IS DISTINCT FROM false OR NEW.used IS DISTINCT FROM true
      OR (to_jsonb(NEW)-'used') IS DISTINCT FROM (to_jsonb(OLD)-'used') THEN
      RAISE EXCEPTION 'CUSTOMER_PROMO_UPDATE_REQUIRES_IMMUTABLE_MARK_USED' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION public.guard_user_promo_customer_update() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER user_promos_verified_update_guard
BEFORE UPDATE ON public.user_promos
FOR EACH ROW EXECUTE FUNCTION public.guard_user_promo_customer_update();

-- Current customer affiliate views use the authenticated server API. The
-- browser's direct affiliate-management and ledger operations are support-only.
CREATE POLICY affiliates_verified_admin ON public.affiliates AS PERMISSIVE FOR ALL TO authenticated
  USING (public.can_access_order_record(NULL,NULL,true))
  WITH CHECK (public.can_access_order_record(NULL,NULL,true));
CREATE POLICY affiliates_verified_admin_boundary ON public.affiliates AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.can_access_order_record(NULL,NULL,true))
  WITH CHECK (public.can_access_order_record(NULL,NULL,true));
CREATE POLICY affiliate_orders_verified_admin ON public.affiliate_orders AS PERMISSIVE FOR ALL TO authenticated
  USING (public.can_access_order_record(NULL,NULL,true))
  WITH CHECK (public.can_access_order_record(NULL,NULL,true));
CREATE POLICY affiliate_orders_verified_admin_boundary ON public.affiliate_orders AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.can_access_order_record(NULL,NULL,true))
  WITH CHECK (public.can_access_order_record(NULL,NULL,true));
CREATE POLICY affiliate_payouts_verified_admin ON public.affiliate_payouts AS PERMISSIVE FOR ALL TO authenticated
  USING (public.can_access_order_record(NULL,NULL,true))
  WITH CHECK (public.can_access_order_record(NULL,NULL,true));
CREATE POLICY affiliate_payouts_verified_admin_boundary ON public.affiliate_payouts AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.can_access_order_record(NULL,NULL,true))
  WITH CHECK (public.can_access_order_record(NULL,NULL,true));

COMMENT ON FUNCTION public.guard_user_promo_customer_update() IS
  'Direct confirmed customers may only mark their own unused promo used without changing any other field. Does not certify historical issuance or reserve promos across payment attempts.';
COMMIT;
