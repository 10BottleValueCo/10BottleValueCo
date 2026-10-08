-- Merit checkout: an immutable, private payment attempt and three atomic RPCs.
-- Apply only after the exact target database and this migration have been tested.
-- No existing payment, order, credit, or affiliate-table policies are replaced.
--
-- A personal one-use promo is consumed when its attempt is reserved, BEFORE the
-- provider request. Retry the SAME checkout_key after a timeout. A reserved
-- attempt with no intent may represent a lost provider acknowledgement; never
-- create another intent automatically. There is intentionally no expiry/release
-- RPC until a provider-confirmed cancellation/nonpayable contract is available.
-- Partial Store Credit is not supported by this flow and must equal zero.
-- snapshot.paymentRules and snapshot.costSnapshot are private immutable
-- records, not public order metadata. A null costSnapshot means unknown costs.
-- Customer surcharge and merchant expense remain separate inside paymentRules;
-- SQL does not invent a merchant rate or turn a dashboard rate into settlement.
--
-- Only service_role can call the payment RPCs or read attempts. The application verifies
-- provider status=succeeded and the exact received amount before finalize; the
-- RPC independently compares every normalized binding field. Browser callbacks
-- and generic orders metadata are never payment evidence.

BEGIN;

CREATE TABLE public.merit_payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_key uuid NOT NULL,
  email text NOT NULL CHECK (email = lower(btrim(email)) AND email <> ''),
  customer_id uuid NOT NULL,
  order_id text NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  quote_fingerprint text NOT NULL CHECK (quote_fingerprint ~ '^[a-f0-9]{64}$'),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0 AND amount_cents <= 9007199254740991),
  currency text NOT NULL CHECK (currency = 'usd'),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  expected_account text NOT NULL CHECK (expected_account ~ '^acct_[A-Za-z0-9]+$'),
  expected_live boolean NOT NULL,
  user_promo_id text UNIQUE,
  state text NOT NULL DEFAULT 'reserved' CHECK (state IN ('reserved', 'ready', 'paid')),
  intent_id text UNIQUE,
  stripe_account text,
  livemode boolean,
  client_secret text,
  publishable_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  bound_at timestamptz,
  paid_at timestamptz,
  UNIQUE (customer_id, checkout_key),
  CHECK (order_id = 'INV-' || upper(replace(checkout_key::text, '-', ''))),
  CHECK (
    (state = 'reserved' AND intent_id IS NULL AND stripe_account IS NULL
      AND livemode IS NULL AND client_secret IS NULL AND publishable_key IS NULL
      AND bound_at IS NULL AND paid_at IS NULL)
    OR
    (state IN ('ready', 'paid') AND intent_id IS NOT NULL AND intent_id ~ '^pi_[A-Za-z0-9]+$'
      AND stripe_account IS NOT NULL AND stripe_account = expected_account
      AND livemode IS NOT NULL AND livemode = expected_live
      AND client_secret IS NOT NULL AND publishable_key IS NOT NULL
      AND bound_at IS NOT NULL
      AND ((state = 'ready' AND paid_at IS NULL) OR (state = 'paid' AND paid_at IS NOT NULL)))
  )
);

ALTER TABLE public.merit_payment_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.merit_payment_attempts FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.merit_payment_attempts TO service_role;
COMMENT ON TABLE public.merit_payment_attempts IS
  'Private canonical Merit attempts. No browser access. Mutations only through reserve/bind/finalize RPCs. Do not log client_secret.';

-- Existing permissive SELECT/ALL policies must not expose a new Merit's public
-- order projection (address, email, phone and items) to unrelated visitors. The
-- private attempt is the authority; browser-writable provider labels are not.
-- This predicate returns only a boolean and leaves non-Merit visibility to the
-- existing policies. A real, confirmed auth identity must match both the
-- attempt's customer id and email, or be the existing support identity.
CREATE FUNCTION public.can_read_merit_order(p_order_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_customer_id uuid;
  v_email text;
BEGIN
  SELECT customer_id, email INTO v_customer_id, v_email
  FROM public.merit_payment_attempts WHERE order_id = p_order_id;
  IF NOT FOUND THEN RETURN true; END IF;
  -- SECURITY DEFINER changes current_user; the session's selected role still
  -- identifies the actual PostgREST caller independently of an email claim.
  IF current_setting('role', true) IS DISTINCT FROM 'authenticated' THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL
      AND (lower(btrim(email)) = 'support@10bottlevalue.co'
        OR (id = v_customer_id AND lower(btrim(email)) = v_email))
  );
END
$$;
REVOKE ALL ON FUNCTION public.can_read_merit_order(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_read_merit_order(text) TO anon, authenticated;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY merit_order_read_privacy ON public.orders AS RESTRICTIVE
  FOR SELECT TO anon, authenticated
  USING (public.can_read_merit_order(id));

-- A caller-settable GUC is not a write capability. Only the SECURITY DEFINER
-- RPCs below can create this short-lived permit, inside their own transaction.
-- Even a caller that forges both request.jwt.claims and app.* settings cannot
-- manufacture the private row. Successful RPCs remove it before returning;
-- exceptions roll the whole transaction back. There is no lease/expiry retry.
CREATE TABLE public.merit_order_write_permits (
  transaction_id bigint NOT NULL,
  backend_pid integer NOT NULL,
  order_id text NOT NULL,
  PRIMARY KEY (transaction_id, backend_pid, order_id)
);
ALTER TABLE public.merit_order_write_permits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.merit_order_write_permits FROM PUBLIC, anon, authenticated, service_role;
COMMENT ON TABLE public.merit_order_write_permits IS
  'Internal transaction-only Merit order-write capability. No direct API or service-role privileges. Never expose a setter RPC.';

CREATE FUNCTION public.guard_merit_attempt_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'MERIT_ATTEMPT_IMMUTABLE' USING ERRCODE = '23514';
  END IF;
  IF (to_jsonb(NEW) - ARRAY['state', 'intent_id', 'stripe_account', 'livemode',
       'client_secret', 'publishable_key', 'updated_at', 'bound_at', 'paid_at'])
     IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['state', 'intent_id', 'stripe_account', 'livemode',
       'client_secret', 'publishable_key', 'updated_at', 'bound_at', 'paid_at']) THEN
    RAISE EXCEPTION 'MERIT_ATTEMPT_IMMUTABLE' USING ERRCODE = '23514';
  END IF;
  IF OLD.state = 'reserved' AND NEW.state = 'ready' THEN
    RETURN NEW;
  END IF;
  IF OLD.state = 'ready' AND NEW.state = 'paid'
     AND (to_jsonb(NEW) - ARRAY['state', 'updated_at', 'paid_at'])
       IS NOT DISTINCT FROM (to_jsonb(OLD) - ARRAY['state', 'updated_at', 'paid_at']) THEN
    RETURN NEW;
  END IF;
  IF to_jsonb(NEW) IS NOT DISTINCT FROM to_jsonb(OLD) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'MERIT_ATTEMPT_TRANSITION_INVALID' USING ERRCODE = '23514';
END
$$;

CREATE TRIGGER merit_attempt_immutable
BEFORE UPDATE OR DELETE ON public.merit_payment_attempts
FOR EACH ROW EXECUTE FUNCTION public.guard_merit_attempt_immutable();

-- This guard also runs for legacy service-role handlers, which bypass RLS.
-- It checks private attempt ownership, never the browser-writable provider label.
-- The exact order id must have a private permit in this transaction. JWT claims
-- remain only for the existing confirmed-support fulfillment exception below.
CREATE FUNCTION public.guard_merit_order_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_old_id text;
  v_new_id text;
  v_claims jsonb := '{}'::jsonb;
  v_role text;
  v_attempt public.merit_payment_attempts%ROWTYPE;
  v_bound boolean;
  v_support boolean := false;
  v_old_meta jsonb;
  v_new_meta jsonb;
  v_mutable_columns text[] := ARRAY[
    'status', 'metadata', 'updated_at', 'admin_note', 'tracking_number',
    'tracking_number_2', 'tracking_number_sent_at', 'affiliate_commission_adjustment'
  ];
  v_mutable_metadata text[] := ARRAY[
    'status', 'adminNote', 'orderNotes', 'trackingNumber', 'trackingNumber2',
    'trackingNumberSentAt', 'firstName', 'lastName', 'address', 'address2',
    'city', 'state', 'postalCode', 'country', 'phone', 'taxId',
    'affiliateCommissionAdjustment', 'affiliateCommissionDeduction',
    'refundCommissionDeduction'
  ];
BEGIN
  IF TG_OP <> 'INSERT' THEN v_old_id := OLD.id::text; END IF;
  IF TG_OP <> 'DELETE' THEN v_new_id := NEW.id::text; END IF;
  BEGIN
    v_claims := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  EXCEPTION WHEN invalid_text_representation THEN
    v_claims := '{}'::jsonb;
  END;
  v_role := coalesce(v_claims ->> 'role', current_setting('request.jwt.claim.role', true), '');

  SELECT * INTO v_attempt
  FROM public.merit_payment_attempts
  WHERE order_id = v_old_id OR order_id = v_new_id
  LIMIT 1;
  v_bound := FOUND;

  IF TG_OP <> 'DELETE'
     AND EXISTS (
       SELECT 1 FROM public.merit_order_write_permits
       WHERE transaction_id = txid_current() AND backend_pid = pg_backend_pid()
         AND order_id = v_new_id
     )
     AND (TG_OP = 'INSERT' OR v_old_id = v_new_id) THEN
    RETURN NEW;
  END IF;

  IF NOT v_bound THEN
    IF TG_OP <> 'DELETE'
       AND (lower(coalesce(to_jsonb(NEW) ->> 'payment_provider', '')) = 'merit'
         OR lower(coalesce(NEW.metadata ->> 'paymentProvider', '')) = 'merit') THEN
      RAISE EXCEPTION 'MERIT_ORDER_REQUIRES_PRIVATE_ATTEMPT' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP <> 'UPDATE' OR v_old_id IS DISTINCT FROM v_new_id THEN
    RAISE EXCEPTION 'MERIT_ORDER_PROTECTED' USING ERRCODE = '23514';
  END IF;
  IF to_jsonb(NEW) IS NOT DISTINCT FROM to_jsonb(OLD) THEN RETURN NEW; END IF;

  -- Preserve the existing browser admin's fulfillment edits, but require its
  -- real confirmed support identity. A service-role legacy callback is NOT an
  -- administrator for this exception. No admin may rewrite the charge snapshot.
  IF v_role = 'authenticated' THEN
    SELECT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id::text = coalesce(v_claims ->> 'sub', '')
        AND lower(email) = 'support@10bottlevalue.co'
        AND email_confirmed_at IS NOT NULL
    ) INTO v_support;
  END IF;
  IF NOT v_support OR v_attempt.state <> 'paid' THEN
    RAISE EXCEPTION 'MERIT_ORDER_PROTECTED' USING ERRCODE = '23514';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT (OLD.status IN ('paid', 'done', 'processing', 'shipped', 'delivered')
       AND NEW.status IN ('done', 'processing', 'shipped', 'delivered', 'refunded', 'cancelled')) THEN
    RAISE EXCEPTION 'MERIT_ORDER_STATUS_PROTECTED' USING ERRCODE = '23514';
  END IF;
  IF (to_jsonb(NEW) - v_mutable_columns)
     IS DISTINCT FROM (to_jsonb(OLD) - v_mutable_columns) THEN
    RAISE EXCEPTION 'MERIT_ORDER_FINANCIAL_FIELDS_PROTECTED' USING ERRCODE = '23514';
  END IF;
  v_old_meta := coalesce(OLD.metadata, '{}'::jsonb);
  v_new_meta := coalesce(NEW.metadata, '{}'::jsonb);
  IF jsonb_typeof(v_new_meta) <> 'object'
     OR (v_new_meta - v_mutable_metadata) IS DISTINCT FROM (v_old_meta - v_mutable_metadata)
     OR ((v_new_meta ->> 'status') IS DISTINCT FROM (v_old_meta ->> 'status')
       AND (v_new_meta ->> 'status') IS DISTINCT FROM NEW.status) THEN
    RAISE EXCEPTION 'MERIT_ORDER_SNAPSHOT_PROTECTED' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER merit_order_write_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.guard_merit_order_write();

-- A personal promo reserved by Merit cannot be reset/re-keyed/deleted through a
-- permissive legacy table policy or another service-role endpoint. This affects
-- only the exact promo ids already held by private Merit attempts.
CREATE FUNCTION public.guard_merit_reserved_promo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_attempt public.merit_payment_attempts%ROWTYPE;
  v_new_id text;
BEGIN
  IF TG_OP <> 'DELETE' THEN v_new_id := NEW.id::text; END IF;
  SELECT * INTO v_attempt FROM public.merit_payment_attempts
  WHERE user_promo_id = OLD.id::text OR user_promo_id = v_new_id
  LIMIT 1;
  IF NOT FOUND THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.id IS NOT DISTINCT FROM OLD.id
     AND NEW.used IS TRUE
     AND (to_jsonb(NEW) - ARRAY['used', 'updated_at'])
       IS NOT DISTINCT FROM (to_jsonb(OLD) - ARRAY['used', 'updated_at']) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'MERIT_PROMO_RESERVED' USING ERRCODE = '23514';
END
$$;

CREATE TRIGGER merit_reserved_promo_guard
BEFORE UPDATE OR DELETE ON public.user_promos
FOR EACH ROW EXECUTE FUNCTION public.guard_merit_reserved_promo();

CREATE FUNCTION public.reserve_merit_checkout(
  p_checkout_key uuid,
  p_email text,
  p_customer_id uuid,
  p_fingerprint text,
  p_amount_cents bigint,
  p_currency text,
  p_snapshot jsonb,
  p_expected_account text,
  p_expected_live boolean,
  p_user_promo_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_order_id text := 'INV-' || upper(replace(p_checkout_key::text, '-', ''));
  v_attempt public.merit_payment_attempts%ROWTYPE;
  v_saved_order public.orders%ROWTYPE;
  v_promo record;
  v_now timestamptz := now();
  v_order jsonb;
  v_count integer;
BEGIN
  IF p_checkout_key IS NULL OR p_customer_id IS NULL OR v_email = '' OR p_email IS DISTINCT FROM v_email
     OR length(v_email) > 254 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     OR p_fingerprint IS NULL OR p_fingerprint !~ '^[a-f0-9]{64}$'
     OR p_amount_cents IS NULL OR p_amount_cents <= 0 OR p_amount_cents > 9007199254740991
     OR p_currency IS DISTINCT FROM 'usd'
     OR p_expected_account IS NULL OR p_expected_account !~ '^acct_[A-Za-z0-9]+$'
     OR p_expected_live IS NULL OR jsonb_typeof(p_snapshot) IS DISTINCT FROM 'object'
     OR p_snapshot ->> 'email' IS DISTINCT FROM v_email
     OR (p_snapshot ? 'id' AND p_snapshot ->> 'id' IS DISTINCT FROM v_order_id)
     OR jsonb_typeof(p_snapshot -> 'total') IS DISTINCT FROM 'number'
     OR jsonb_typeof(p_snapshot -> 'items') IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_snapshot -> 'paymentRules') IS DISTINCT FROM 'object'
     OR (p_snapshot ? 'costSnapshot' AND jsonb_typeof(p_snapshot -> 'costSnapshot') NOT IN ('object', 'null'))
     OR (p_snapshot ? 'storeCreditUsed' AND jsonb_typeof(p_snapshot -> 'storeCreditUsed') IS DISTINCT FROM 'number')
     OR p_snapshot ?| ARRAY['status', 'paymentProvider', 'paymentId', 'paidAt', 'clientSecret', 'publishableKey']
     OR p_user_promo_id = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_MERIT_QUOTE');
  END IF;
  IF (p_snapshot ->> 'total')::numeric * 100 IS DISTINCT FROM p_amount_cents::numeric
     OR coalesce((p_snapshot ->> 'storeCreditUsed')::numeric, 0) <> 0
     OR jsonb_array_length(p_snapshot -> 'items') < 1
     OR jsonb_array_length(p_snapshot -> 'items') > 100 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_MERIT_QUOTE');
  END IF;

  -- Serializes concurrent calls even before the first attempt row exists. The
  -- UUID also determines the order id, so different-email collisions serialize.
  PERFORM pg_advisory_xact_lock(hashtextextended('merit-checkout:' || p_checkout_key::text, 0));
  SELECT * INTO v_attempt FROM public.merit_payment_attempts
  WHERE customer_id = p_customer_id AND checkout_key = p_checkout_key
  FOR UPDATE;
  IF FOUND THEN
    IF v_attempt.customer_id IS DISTINCT FROM p_customer_id
       OR v_attempt.email IS DISTINCT FROM v_email
       OR v_attempt.quote_fingerprint IS DISTINCT FROM p_fingerprint
       OR v_attempt.amount_cents IS DISTINCT FROM p_amount_cents
       OR v_attempt.currency IS DISTINCT FROM p_currency
       OR v_attempt.snapshot IS DISTINCT FROM p_snapshot
       OR v_attempt.expected_account IS DISTINCT FROM p_expected_account
       OR v_attempt.expected_live IS DISTINCT FROM p_expected_live
       OR v_attempt.user_promo_id IS DISTINCT FROM p_user_promo_id THEN
      RETURN jsonb_build_object('ok', false, 'error', 'MERIT_CHECKOUT_KEY_REUSED');
    END IF;
    RETURN jsonb_build_object('ok', true, 'created', false, 'attempt', to_jsonb(v_attempt));
  END IF;
  IF EXISTS (SELECT 1 FROM public.orders WHERE id = v_order_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'MERIT_ORDER_ID_CONFLICT');
  END IF;

  IF p_user_promo_id IS NOT NULL THEN
    SELECT * INTO v_promo FROM public.user_promos
    WHERE id::text = p_user_promo_id
    FOR UPDATE;
    IF NOT FOUND OR lower(btrim(coalesce(v_promo.email, ''))) <> v_email
       OR v_promo.used IS DISTINCT FROM false
       OR upper(btrim(coalesce(v_promo.code, ''))) IS DISTINCT FROM p_snapshot ->> 'promoCode'
       OR v_promo.rate IS NULL OR v_promo.rate <= 0 OR v_promo.rate > 1
       OR jsonb_typeof(p_snapshot -> 'subtotal') IS DISTINCT FROM 'number'
       OR jsonb_typeof(p_snapshot -> 'promoDiscount') IS DISTINCT FROM 'number' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'MERIT_PROMO_UNAVAILABLE');
    END IF;
    IF round((p_snapshot ->> 'subtotal')::numeric * v_promo.rate, 2)
       IS DISTINCT FROM (p_snapshot ->> 'promoDiscount')::numeric THEN
      RETURN jsonb_build_object('ok', false, 'error', 'MERIT_PROMO_QUOTE_CHANGED');
    END IF;
    IF EXISTS (SELECT 1 FROM public.merit_payment_attempts WHERE user_promo_id = p_user_promo_id) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'MERIT_PROMO_RESERVED');
    END IF;
  END IF;

  v_order := (p_snapshot - ARRAY['paymentRules', 'costSnapshot', 'affiliateOwnerEmail']) || jsonb_build_object(
    'id', v_order_id, 'email', v_email, 'status', 'checkout',
    'paymentProvider', 'Merit', 'paymentId', '', 'createdAt', v_now,
    'paidAt', '', 'confirmationEmailSentAt', ''
  );
  INSERT INTO public.merit_order_write_permits(transaction_id, backend_pid, order_id)
  VALUES (txid_current(), pg_backend_pid(), v_order_id);
  INSERT INTO public.orders (id, email, status, total, metadata, created_at, items, payment_provider)
  VALUES (v_order_id, v_email, 'checkout', p_amount_cents::numeric / 100,
    v_order, v_now, p_snapshot -> 'items', 'Merit');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'MERIT_ORDER_RESERVATION_NOT_ACKNOWLEDGED' USING ERRCODE = '23514';
  END IF;
  INSERT INTO public.merit_payment_attempts (
    checkout_key, email, customer_id, order_id, quote_fingerprint, amount_cents, currency,
    snapshot, expected_account, expected_live, user_promo_id
  ) VALUES (
    p_checkout_key, v_email, p_customer_id, v_order_id, p_fingerprint, p_amount_cents, p_currency,
    p_snapshot, p_expected_account, p_expected_live, p_user_promo_id
  ) RETURNING * INTO v_attempt;
  IF p_user_promo_id IS NOT NULL THEN
    UPDATE public.user_promos SET used = true
    WHERE id::text = p_user_promo_id
      AND lower(btrim(coalesce(email, ''))) = v_email AND used IS FALSE;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      -- Raise, rather than return an error after writes: every mutation above
      -- must roll back if the reservation cannot consume exactly this promo.
      RAISE EXCEPTION 'MERIT_PROMO_RESERVATION_FAILED' USING ERRCODE = '23514';
    END IF;
  END IF;
  DELETE FROM public.merit_order_write_permits
  WHERE transaction_id = txid_current() AND backend_pid = pg_backend_pid()
    AND order_id = v_order_id;
  -- RETURNING alone would miss an AFTER trigger that rewrites the stored row.
  -- A fresh read after all writes must acknowledge the exact public projection
  -- before the caller can create a provider intent. Raise to roll back the
  -- attempt, promo consumption and permit as well as a malformed order.
  SELECT * INTO v_saved_order FROM public.orders WHERE id = v_order_id FOR UPDATE;
  IF NOT FOUND
     OR v_saved_order.id IS DISTINCT FROM v_order_id
     OR v_saved_order.email IS DISTINCT FROM v_email
     OR v_saved_order.status IS DISTINCT FROM 'checkout'
     OR v_saved_order.total IS DISTINCT FROM p_amount_cents::numeric / 100
     OR v_saved_order.items IS DISTINCT FROM p_snapshot -> 'items'
     OR v_saved_order.metadata IS DISTINCT FROM v_order
     OR v_saved_order.created_at IS DISTINCT FROM v_now
     OR v_saved_order.payment_provider IS DISTINCT FROM 'Merit'
     OR coalesce(v_saved_order.payment_id, '') <> ''
     OR v_saved_order.paid_at IS NOT NULL THEN
    RAISE EXCEPTION 'MERIT_ORDER_RESERVATION_NOT_ACKNOWLEDGED' USING ERRCODE = '23514';
  END IF;
  RETURN jsonb_build_object('ok', true, 'created', true, 'attempt', to_jsonb(v_attempt));
END
$$;

CREATE FUNCTION public.bind_merit_checkout(
  p_attempt_id uuid,
  p_intent_id text,
  p_stripe_account text,
  p_livemode boolean,
  p_client_secret text,
  p_publishable_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_attempt public.merit_payment_attempts%ROWTYPE;
BEGIN
  IF p_attempt_id IS NULL OR p_intent_id IS NULL OR p_intent_id !~ '^pi_[A-Za-z0-9]+$'
     OR p_client_secret IS NULL OR length(p_client_secret) > 4096
     OR left(p_client_secret, length(p_intent_id) + 8) <> p_intent_id || '_secret_'
     OR length(p_client_secret) <= length(p_intent_id) + 8
     OR p_publishable_key IS NULL OR p_publishable_key !~ '^pk_(test|live)_[A-Za-z0-9]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_MERIT_BINDING');
  END IF;
  SELECT * INTO v_attempt FROM public.merit_payment_attempts WHERE id = p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'MERIT_ATTEMPT_NOT_FOUND'); END IF;
  IF p_stripe_account IS DISTINCT FROM v_attempt.expected_account
     OR p_livemode IS DISTINCT FROM v_attempt.expected_live
     OR (p_livemode AND p_publishable_key NOT LIKE 'pk_live_%')
     OR (NOT p_livemode AND p_publishable_key NOT LIKE 'pk_test_%') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'MERIT_BINDING_MISMATCH');
  END IF;
  IF v_attempt.state IN ('ready', 'paid') THEN
    IF v_attempt.intent_id IS DISTINCT FROM p_intent_id
       OR v_attempt.stripe_account IS DISTINCT FROM p_stripe_account
       OR v_attempt.livemode IS DISTINCT FROM p_livemode
       OR v_attempt.client_secret IS DISTINCT FROM p_client_secret
       OR v_attempt.publishable_key IS DISTINCT FROM p_publishable_key THEN
      RETURN jsonb_build_object('ok', false, 'error', 'MERIT_INTENT_ALREADY_BOUND');
    END IF;
    RETURN jsonb_build_object('ok', true, 'replayed', true, 'attempt', to_jsonb(v_attempt));
  END IF;
  IF EXISTS (SELECT 1 FROM public.merit_payment_attempts WHERE intent_id = p_intent_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'MERIT_INTENT_ALREADY_BOUND');
  END IF;
  UPDATE public.merit_payment_attempts
  SET state = 'ready', intent_id = p_intent_id, stripe_account = p_stripe_account,
      livemode = p_livemode, client_secret = p_client_secret,
      publishable_key = p_publishable_key, bound_at = now(), updated_at = now()
  WHERE id = p_attempt_id
  RETURNING * INTO v_attempt;
  RETURN jsonb_build_object('ok', true, 'replayed', false, 'attempt', to_jsonb(v_attempt));
END
$$;

CREATE FUNCTION public.finalize_merit_checkout(
  p_attempt_id uuid,
  p_intent_id text,
  p_amount_cents bigint,
  p_currency text,
  p_email text,
  p_order_id text,
  p_stripe_account text,
  p_livemode boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_attempt public.merit_payment_attempts%ROWTYPE;
  v_existing public.orders%ROWTYPE;
  v_saved_order public.orders%ROWTYPE;
  v_order jsonb;
  v_now timestamptz := now();
  v_count integer;
BEGIN
  SELECT * INTO v_attempt FROM public.merit_payment_attempts WHERE id = p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'MERIT_ATTEMPT_NOT_FOUND'); END IF;
  IF v_attempt.state NOT IN ('ready', 'paid')
     OR p_intent_id IS DISTINCT FROM v_attempt.intent_id
     OR p_amount_cents IS DISTINCT FROM v_attempt.amount_cents
     OR p_currency IS DISTINCT FROM v_attempt.currency
     OR p_email IS DISTINCT FROM v_attempt.email
     OR p_order_id IS DISTINCT FROM v_attempt.order_id
     OR p_stripe_account IS DISTINCT FROM v_attempt.expected_account
     OR p_stripe_account IS DISTINCT FROM v_attempt.stripe_account
     OR p_livemode IS DISTINCT FROM v_attempt.expected_live
     OR p_livemode IS DISTINCT FROM v_attempt.livemode THEN
    RETURN jsonb_build_object('ok', false, 'error', 'MERIT_PAYMENT_PROOF_MISMATCH');
  END IF;
  SELECT * INTO v_existing FROM public.orders WHERE id = v_attempt.order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'MERIT_ORDER_NOT_FOUND'); END IF;
  IF v_attempt.state = 'paid' THEN
    -- Do not resurrect a refunded/cancelled order or undo admin fulfillment on
    -- provider retries. Payment receipt and current fulfillment are separate.
    v_order := (coalesce(v_existing.metadata, '{}'::jsonb) - ARRAY['paymentRules', 'costSnapshot', 'affiliateOwnerEmail']) || jsonb_build_object(
      'id', v_existing.id, 'email', v_existing.email, 'status', v_existing.status,
      'paymentProvider', 'Merit', 'paymentId', v_attempt.intent_id,
      'paidAt', v_attempt.paid_at, 'total', v_attempt.amount_cents::numeric / 100
    );
    RETURN jsonb_build_object('ok', true, 'paid', true, 'alreadyPaid', true, 'order', v_order);
  END IF;
  IF v_existing.email IS DISTINCT FROM v_attempt.email
     OR v_existing.status IS DISTINCT FROM 'checkout'
     OR v_existing.total IS DISTINCT FROM v_attempt.amount_cents::numeric / 100
     OR coalesce(v_existing.payment_id, '') <> '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'MERIT_ORDER_BINDING_MISMATCH');
  END IF;
  v_order := (v_attempt.snapshot - ARRAY['paymentRules', 'costSnapshot', 'affiliateOwnerEmail']) || jsonb_build_object(
    'id', v_attempt.order_id, 'email', v_attempt.email, 'status', 'paid',
    'paymentProvider', 'Merit', 'paymentId', v_attempt.intent_id,
    'createdAt', v_attempt.created_at, 'paidAt', v_now,
    'confirmationEmailSentAt', '', 'total', v_attempt.amount_cents::numeric / 100
  );
  INSERT INTO public.merit_order_write_permits(transaction_id, backend_pid, order_id)
  VALUES (txid_current(), pg_backend_pid(), v_attempt.order_id);
  UPDATE public.orders
  SET email = v_attempt.email, status = 'paid', payment_provider = 'Merit',
      payment_id = v_attempt.intent_id, paid_at = v_now,
      total = v_attempt.amount_cents::numeric / 100,
      items = v_attempt.snapshot -> 'items', metadata = v_order
  WHERE id = v_attempt.order_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'MERIT_ORDER_FINALIZATION_NOT_ACKNOWLEDGED' USING ERRCODE = '23514';
  END IF;
  UPDATE public.merit_payment_attempts
  SET state = 'paid', paid_at = v_now, updated_at = v_now
  WHERE id = v_attempt.id;
  DELETE FROM public.merit_order_write_permits
  WHERE transaction_id = txid_current() AND backend_pid = pg_backend_pid()
    AND order_id = v_attempt.order_id;
  -- Check the stored row after every write/ordinary AFTER trigger, not the
  -- intended payload or a pre-trigger RETURNING tuple. Any mismatch must undo
  -- the private paid transition in this same transaction.
  SELECT * INTO v_saved_order FROM public.orders WHERE id = v_attempt.order_id FOR UPDATE;
  IF NOT FOUND
     OR v_saved_order.id IS DISTINCT FROM v_attempt.order_id
     OR v_saved_order.email IS DISTINCT FROM v_attempt.email
     OR v_saved_order.status IS DISTINCT FROM 'paid'
     OR v_saved_order.total IS DISTINCT FROM v_attempt.amount_cents::numeric / 100
     OR v_saved_order.items IS DISTINCT FROM v_attempt.snapshot -> 'items'
     OR v_saved_order.metadata IS DISTINCT FROM v_order
     OR v_saved_order.created_at IS DISTINCT FROM v_attempt.created_at
     OR v_saved_order.payment_provider IS DISTINCT FROM 'Merit'
     OR v_saved_order.payment_id IS DISTINCT FROM v_attempt.intent_id
     OR v_saved_order.paid_at IS DISTINCT FROM v_now THEN
    RAISE EXCEPTION 'MERIT_ORDER_FINALIZATION_NOT_ACKNOWLEDGED' USING ERRCODE = '23514';
  END IF;
  RETURN jsonb_build_object('ok', true, 'paid', true, 'alreadyPaid', false, 'order', v_order);
END
$$;

REVOKE ALL ON FUNCTION public.guard_merit_attempt_immutable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_merit_order_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_merit_reserved_promo() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_merit_checkout(uuid, text, uuid, text, bigint, text, jsonb, text, boolean, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bind_merit_checkout(uuid, text, text, boolean, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_merit_checkout(uuid, text, bigint, text, text, text, text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_merit_checkout(uuid, text, uuid, text, bigint, text, jsonb, text, boolean, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.bind_merit_checkout(uuid, text, text, boolean, text, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_merit_checkout(uuid, text, bigint, text, text, text, text, boolean)
  TO service_role;

COMMIT;
