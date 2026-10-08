-- Restrict affiliate and promotion records to their owners or the admin.
-- This migration changes policies/triggers only; it does not alter or delete rows.
-- Public promo validation uses an exact-code API lookup, not direct table reads.
-- Apply to staging first. Do not apply to production without explicit approval.

BEGIN;

DO $$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'user_promos',
        'affiliates',
        'affiliate_orders',
        'affiliate_payouts'
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      policy_row.policyname,
      policy_row.tablename
    );
  END LOOP;
END
$$;

ALTER TABLE public.user_promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- RLS does not replace SQL privileges: remove legacy anonymous grants and
-- non-RLS privileges, then grant only row-level operations to signed-in users.
REVOKE ALL ON TABLE public.user_promos
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.affiliates
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.affiliate_orders
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.affiliate_payouts
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_promos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.affiliates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.affiliate_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.affiliate_payouts TO authenticated;

GRANT ALL ON TABLE public.user_promos TO service_role;
GRANT ALL ON TABLE public.affiliates TO service_role;
GRANT ALL ON TABLE public.affiliate_orders TO service_role;
GRANT ALL ON TABLE public.affiliate_payouts TO service_role;

CREATE POLICY user_promos_admin_all
ON public.user_promos
FOR ALL
TO authenticated
USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'support@10bottlevalue.co')
WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) = 'support@10bottlevalue.co');

CREATE POLICY user_promos_customer_read_own
ON public.user_promos
FOR SELECT
TO authenticated
USING (
  email <> '__PUBLIC__'
  AND auth.jwt() ->> 'email' IS NOT NULL
  AND lower(coalesce(email, '')) = lower(auth.jwt() ->> 'email')
);

CREATE POLICY user_promos_customer_delete_own
ON public.user_promos
FOR DELETE
TO authenticated
USING (
  email <> '__PUBLIC__'
  AND auth.jwt() ->> 'email' IS NOT NULL
  AND lower(coalesce(email, '')) = lower(auth.jwt() ->> 'email')
);

CREATE POLICY user_promos_customer_mark_used
ON public.user_promos
FOR UPDATE
TO authenticated
USING (
  email <> '__PUBLIC__'
  AND auth.jwt() ->> 'email' IS NOT NULL
  AND lower(coalesce(email, '')) = lower(auth.jwt() ->> 'email')
  AND used IS DISTINCT FROM true
)
WITH CHECK (
  email <> '__PUBLIC__'
  AND auth.jwt() ->> 'email' IS NOT NULL
  AND lower(coalesce(email, '')) = lower(auth.jwt() ->> 'email')
  AND used IS TRUE
);

CREATE OR REPLACE FUNCTION public.guard_customer_user_promo_update()
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
  IF jwt_role = 'authenticated' AND jwt_email <> 'support@10bottlevalue.co' THEN
    IF (to_jsonb(NEW) - ARRAY['used', 'updated_at'])
         IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY['used', 'updated_at'])
       OR OLD.used IS TRUE
       OR NEW.used IS DISTINCT FROM true
    THEN
      RAISE EXCEPTION 'Customers may only mark their own unused promo as used'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS guard_customer_user_promo_update ON public.user_promos;
CREATE TRIGGER guard_customer_user_promo_update
BEFORE UPDATE ON public.user_promos
FOR EACH ROW
EXECUTE FUNCTION public.guard_customer_user_promo_update();

CREATE POLICY affiliates_admin_all
ON public.affiliates
FOR ALL
TO authenticated
USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'support@10bottlevalue.co')
WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) = 'support@10bottlevalue.co');

CREATE POLICY affiliates_customer_read_own
ON public.affiliates
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'email' IS NOT NULL
  AND lower(coalesce(email, '')) = lower(auth.jwt() ->> 'email')
);

CREATE POLICY affiliate_orders_admin_all
ON public.affiliate_orders
FOR ALL
TO authenticated
USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'support@10bottlevalue.co')
WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) = 'support@10bottlevalue.co');

CREATE POLICY affiliate_orders_owner_read
ON public.affiliate_orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.affiliates AS affiliate
    WHERE upper(trim(coalesce(affiliate.code, ''))) =
          upper(trim(coalesce(affiliate_orders.affiliate_code, '')))
      AND lower(trim(coalesce(affiliate.email, ''))) =
          lower(auth.jwt() ->> 'email')
  )
);

CREATE POLICY affiliate_payouts_admin_all
ON public.affiliate_payouts
FOR ALL
TO authenticated
USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'support@10bottlevalue.co')
WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) = 'support@10bottlevalue.co');

CREATE POLICY affiliate_payouts_owner_read
ON public.affiliate_payouts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.affiliates AS affiliate
    WHERE upper(trim(coalesce(affiliate.code, ''))) =
          upper(trim(coalesce(affiliate_payouts.affiliate_code, '')))
      AND lower(trim(coalesce(affiliate.email, ''))) =
          lower(auth.jwt() ->> 'email')
  )
);

COMMIT;
