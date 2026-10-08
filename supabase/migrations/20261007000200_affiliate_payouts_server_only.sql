-- LOCAL DRAFT, NOT APPLIED. Stage 2: remove direct browser payout reads.
-- Apply only AFTER 20261007000100_affiliate_payouts_insert_containment.sql.
--
-- RELEASE PRECONDITIONS (evidence from the intended environment is required):
-- 1. Save a NEW pre-stage-2 result of ../review/affiliate_payouts_acl_snapshot.sql
--    outside the database, including exact ACLs, grantors/options and policies.
--    Stage 1's snapshot is not the rollback baseline for Stage 2.
-- 2. Deploy authenticated GET /api/affiliate-payout-summary AND replace the
--    frontend's anonymous affiliate_payouts reads. The endpoint must derive the
--    verified email from the session, return only its affiliate's aggregate,
--    reject ambiguous/inactive ownership and correctly page the complete ledger.
-- 3. VERIFY THE OWNERSHIP SOURCE: arbitrary browser identities cannot forge or
--    reassign affiliates.email/code/active through tables, columns, views or
--    functions. Review fresh affiliates grants AND RLS, uniqueness and all write
--    paths, or use an independently server-owned mapping. A valid session plus
--    browser-writable affiliation is not trusted ownership. This draft adds no
--    affiliate write rights and does not repair affiliates policies.
-- 4. Reconcile historical payout rows against independently trusted payout
--    records. The former public INSERT path may have admitted fabricated
--    amounts; shape validation and new grants do not prove ledger provenance.
--    Do not present unverified totals as confirmed paid balances.
-- 5. Staging: A cannot read B; missing/expired auth and ambiguous mapping fail;
--    owner summary plus admin list/insert succeed with the planned grants;
--    frontend reload/error states work with direct payout SELECT denied.
--    Deploy replacement code before revoking reads; old tabs may need reload.
-- 6. Only after reviewing the saved exact snapshot and release evidence, the
--    release operator sets these session settings before running this file:
--      SET tbv.payout_read_snapshot_reviewed = 'yes';
--      SET tbv.payout_summary_cutover_verified = 'yes';
--      SET tbv.payout_ownership_source_verified = 'yes';
--      SET tbv.payout_history_reconciled = 'yes';
--    These are draft rollout stops, not application authorization controls.
--
-- ROLLBACK PRECONDITIONS AND SCOPE:
-- Before COMMIT: ROLLBACK. After COMMIT: prefer a backend/frontend forward fix.
-- If the reviewed release rollback requires legacy reads, restore ONLY exact
-- pre-stage-2 browser SELECT ACL entries (table AND column, with original
-- grantor/grantee/grant option) and the dropped SELECT policy from that snapshot.
-- Replay under the recorded authorized grantor; an effective privilege boolean
-- cannot tell whether a privilege was direct or inherited.
-- Preserve Stage 1 INSERT denial. Never grant INSERT, UPDATE, DELETE, ALL or
-- authenticated SELECT merely to repair a legacy screen. Retain service grants
-- that predate this stage. Remove a new service grant only if the snapshot proves
-- it was absent AND the rolled-back backend no longer requires it. Do not alter
-- ownership or unrelated memberships. Save/compare restored state and retest.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
  IF current_setting('tbv.payout_read_snapshot_reviewed', true) IS DISTINCT FROM 'yes'
     OR current_setting('tbv.payout_summary_cutover_verified', true) IS DISTINCT FROM 'yes'
     OR current_setting('tbv.payout_ownership_source_verified', true) IS DISTINCT FROM 'yes'
     OR current_setting('tbv.payout_history_reconciled', true) IS DISTINCT FROM 'yes' THEN
    RAISE EXCEPTION 'Draft stopped: snapshot, summary/frontend, ownership and payout history must be verified';
  END IF;
  IF to_regclass('public.affiliate_payouts') IS NULL OR to_regclass('public.affiliates') IS NULL THEN
    RAISE EXCEPTION 'affiliate_payouts and affiliates must exist';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.affiliate_payouts'::regclass) THEN
    RAISE EXCEPTION 'Unexpected payout RLS state; review a fresh snapshot';
  END IF;
  IF has_any_column_privilege('anon', 'public.affiliate_payouts', 'INSERT')
     OR has_any_column_privilege('authenticated', 'public.affiliate_payouts', 'INSERT') THEN
    RAISE EXCEPTION 'Stage 1 browser INSERT containment has not been verified';
  END IF;
END
$$;

LOCK TABLE public.affiliate_payouts IN ACCESS EXCLUSIVE MODE;

DROP POLICY IF EXISTS "Anyone can read payouts" ON public.affiliate_payouts;
REVOKE SELECT ON TABLE public.affiliate_payouts FROM anon, authenticated, PUBLIC;

-- Revoke independently granted column SELECT as well as table SELECT.
DO $$
DECLARE
  payout_columns text;
BEGIN
  SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum) INTO payout_columns
  FROM pg_attribute WHERE attrelid = 'public.affiliate_payouts'::regclass
    AND attnum > 0 AND NOT attisdropped;
  EXECUTE format(
    'REVOKE SELECT (%s) ON TABLE public.affiliate_payouts FROM anon, authenticated, PUBLIC',
    payout_columns
  );
END
$$;

GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT (code, email, active) ON TABLE public.affiliates TO service_role;
GRANT SELECT, INSERT ON TABLE public.affiliate_payouts TO service_role;

DO $$
DECLARE
  payout_sequence text;
BEGIN
  payout_sequence := pg_get_serial_sequence('public.affiliate_payouts', 'id');
  IF payout_sequence IS NOT NULL THEN
    EXECUTE format('GRANT USAGE ON SEQUENCE %s TO service_role', payout_sequence);
  END IF;
  -- Abort on inherited/owner rights; never broaden changes to force a result.
  IF has_any_column_privilege('anon', 'public.affiliate_payouts', 'SELECT')
     OR has_any_column_privilege('authenticated', 'public.affiliate_payouts', 'SELECT')
     OR has_any_column_privilege('anon', 'public.affiliate_payouts', 'INSERT')
     OR has_any_column_privilege('authenticated', 'public.affiliate_payouts', 'INSERT') THEN
    RAISE EXCEPTION 'Browser payout read/insert rights remain via inheritance/ownership; rollback and review';
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

-- Release follow-up: save after-state; verify direct browser SELECT/INSERT fail,
-- owner summary and admin list/record work, and no cross-owner data is exposed.
