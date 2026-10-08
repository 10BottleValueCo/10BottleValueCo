-- LOCAL DRAFT, NOT APPLIED. Stage 1: contain browser payout INSERT only.
-- Preserve existing payout SELECT grants and SELECT/ALL policies for the current
-- affiliate dashboard. This known public-read exposure is closed in Stage 2.
-- The saved 2026-10-07 evidence shows anon SELECT/INSERT, no authenticated
-- SELECT/INSERT, and service_role SELECT/INSERT. It does NOT show exact ACL
-- grantors/options, column/sequence rights or affiliates permissions.
--
-- RELEASE PRECONDITIONS:
-- 1. Separately run ../review/affiliate_payouts_acl_snapshot.sql in the intended
--    environment and SAVE THE FULL RESULT outside the database before mutation.
--    Record environment/release revision. Preserve exact schema/table/column/
--    sequence ACL entries, grantors, grant options, RLS, policies and membership.
--    An effective privilege boolean is not enough to reconstruct an ACL.
-- 2. Verify the deployed /api/affiliate-payouts authenticates admin on the server
--    and uses service_role. In staging, prove admin list/record work after these
--    grants, while anon and ordinary-account direct INSERT fail. Check existing
--    dashboard reads still work. No checkout/customer table is changed here.
-- 3. Review that evidence and the exact rollback delta. The release operator
--    must then set this session setting before running this file:
--      SET tbv.payout_insert_snapshot_reviewed = 'yes';
--    This is a draft rollout stop, not an authorization mechanism.
--
-- ROLLBACK PRECONDITIONS AND SCOPE:
-- Before COMMIT, ROLLBACK restores this transaction. After COMMIT, prefer a
-- forward fix of backend/configuration. This stage did not revoke reads; a read
-- failure is not grounds to reopen INSERT. Any separately reviewed rollback
-- must use ONLY exact affected entries/policy definitions from the pre-stage-1
-- snapshot, under the recorded authorized grantor, preserving grant options.
-- Do not use GRANT ALL or add authenticated rights absent from the snapshot.
-- Restoring anonymous INSERT recreates the known defect and is not a proposed
-- availability workaround. Keep containment unless that specific security
-- regression is explicitly accepted by the release owner. Remove new service
-- grants only when the snapshot proves they were absent AND the rolled-back
-- backend no longer needs them. Never change ownership or unrelated membership.
-- Save/compare the restored catalog state and retest before claiming rollback.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
  IF current_setting('tbv.payout_insert_snapshot_reviewed', true) IS DISTINCT FROM 'yes' THEN
    RAISE EXCEPTION 'Draft stopped: save/review exact payout ACL and policy snapshot first';
  END IF;
  IF to_regclass('public.affiliate_payouts') IS NULL OR to_regclass('public.affiliates') IS NULL THEN
    RAISE EXCEPTION 'affiliate_payouts and affiliates must exist';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.affiliate_payouts'::regclass) THEN
    RAISE EXCEPTION 'Unexpected payout RLS state; review a fresh snapshot';
  END IF;
END
$$;

LOCK TABLE public.affiliate_payouts IN ACCESS EXCLUSIVE MODE;

-- These temporary checks do not replace the externally saved exact snapshot.
CREATE TEMP TABLE tbv_payout_read_before ON COMMIT DROP AS
SELECT role_name,
       has_table_privilege(role_name, 'public.affiliate_payouts', 'SELECT') AS table_select,
       (SELECT jsonb_object_agg(a.attname, has_column_privilege(role_name, a.attrelid, a.attnum, 'SELECT'))
        FROM pg_attribute a WHERE a.attrelid = 'public.affiliate_payouts'::regclass
          AND a.attnum > 0 AND NOT a.attisdropped) AS column_select
FROM (VALUES ('anon'::name), ('authenticated'::name)) AS roles(role_name);

CREATE TEMP TABLE tbv_payout_read_policies_before ON COMMIT DROP AS
SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.policyname), '[]'::jsonb) AS policies
FROM pg_policies p
WHERE p.schemaname = 'public' AND p.tablename = 'affiliate_payouts'
  AND p.cmd IN ('SELECT', 'ALL');

DROP POLICY IF EXISTS "Anyone can insert payouts" ON public.affiliate_payouts;
REVOKE INSERT ON TABLE public.affiliate_payouts FROM anon, authenticated, PUBLIC;

-- Table REVOKE alone does not remove independently granted column INSERT.
DO $$
DECLARE
  payout_columns text;
BEGIN
  SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum) INTO payout_columns
  FROM pg_attribute WHERE attrelid = 'public.affiliate_payouts'::regclass
    AND attnum > 0 AND NOT attisdropped;
  EXECUTE format(
    'REVOKE INSERT (%s) ON TABLE public.affiliate_payouts FROM anon, authenticated, PUBLIC',
    payout_columns
  );
END
$$;

GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT ON TABLE public.affiliate_payouts TO service_role;
-- Only the ownership lookup columns needed by the upcoming summary endpoint.
-- This grants backend reads, never permission to assign/change affiliation.
GRANT SELECT (code, email, active) ON TABLE public.affiliates TO service_role;

DO $$
DECLARE
  payout_sequence text;
  read_policies_after jsonb;
BEGIN
  payout_sequence := pg_get_serial_sequence('public.affiliate_payouts', 'id');
  IF payout_sequence IS NOT NULL THEN
    -- USAGE permits generated IDs; SELECT on the sequence is not needed.
    EXECUTE format('GRANT USAGE ON SEQUENCE %s TO service_role', payout_sequence);
  END IF;

  IF has_any_column_privilege('anon', 'public.affiliate_payouts', 'INSERT')
     OR has_any_column_privilege('authenticated', 'public.affiliate_payouts', 'INSERT') THEN
    RAISE EXCEPTION 'Browser INSERT remains through inheritance/ownership; rollback and review';
  END IF;
  IF EXISTS (
    SELECT 1 FROM tbv_payout_read_before b
    WHERE b.table_select IS DISTINCT FROM has_table_privilege(b.role_name, 'public.affiliate_payouts', 'SELECT')
       OR b.column_select IS DISTINCT FROM (
         SELECT jsonb_object_agg(a.attname, has_column_privilege(b.role_name, a.attrelid, a.attnum, 'SELECT'))
         FROM pg_attribute a WHERE a.attrelid = 'public.affiliate_payouts'::regclass
           AND a.attnum > 0 AND NOT a.attisdropped
       )
  ) THEN
    RAISE EXCEPTION 'Stage 1 unexpectedly changed browser SELECT privileges';
  END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.policyname), '[]'::jsonb)
    INTO read_policies_after FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'affiliate_payouts'
      AND p.cmd IN ('SELECT', 'ALL');
  IF read_policies_after IS DISTINCT FROM (SELECT policies FROM tbv_payout_read_policies_before) THEN
    RAISE EXCEPTION 'Stage 1 unexpectedly changed SELECT/ALL policies';
  END IF;
  IF NOT has_table_privilege('service_role', 'public.affiliate_payouts', 'SELECT')
     OR NOT has_table_privilege('service_role', 'public.affiliate_payouts', 'INSERT')
     OR NOT has_column_privilege('service_role', 'public.affiliates', 'code', 'SELECT')
     OR NOT has_column_privilege('service_role', 'public.affiliates', 'email', 'SELECT')
     OR NOT has_column_privilege('service_role', 'public.affiliates', 'active', 'SELECT') THEN
    RAISE EXCEPTION 'Required backend payout/ownership lookup privileges are missing';
  END IF;
  IF payout_sequence IS NOT NULL AND NOT has_sequence_privilege('service_role', payout_sequence, 'USAGE') THEN
    RAISE EXCEPTION 'Required payout sequence USAGE is missing';
  END IF;
END
$$;

COMMIT;

-- Release follow-up: save after-state with the same catalog query. Compare the
-- exact delta, prove browser INSERT denial and unchanged browser SELECT, then
-- prove the verified admin API still lists/records a synthetic staging payout.
