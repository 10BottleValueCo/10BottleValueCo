-- Paylio quotes freeze existing referral attribution before reserving payment.
-- The API reads with service_role; BYPASSRLS does not confer a SELECT grant.
-- Preserve all existing customer privileges, policies and financial records.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $preflight$
BEGIN
  IF to_regclass('public.affiliate_customers') IS NULL THEN
    RAISE EXCEPTION 'Existing affiliate attribution table is required';
  END IF;
END
$preflight$;
GRANT SELECT ON TABLE public.affiliate_customers TO service_role;
COMMIT;
