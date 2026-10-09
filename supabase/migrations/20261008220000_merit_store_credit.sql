-- Store Credit + Merit: reserve credit and the remaining cash total atomically.
-- Self-contained against the inspected live schema; never edit the prior live migration.
-- Unknown provider attempts retain their hold. No timeout implies cancellation.
BEGIN;
ALTER TABLE public.merit_payment_attempts
  ADD COLUMN credit_reserved_cents bigint NOT NULL DEFAULT 0 CHECK (credit_reserved_cents BETWEEN 0 AND 9007199254740991),
  ADD COLUMN credit_request_snapshot jsonb;

CREATE TABLE public.store_credit_ledger (
  order_id text PRIMARY KEY REFERENCES public.orders(id) ON DELETE RESTRICT,
  customer_id uuid,
  email text NOT NULL CHECK(email = lower(btrim(email)) AND email <> ''),
  credit_cents bigint NOT NULL CHECK(credit_cents > 0 AND credit_cents <= 9007199254740991),
  provider text NOT NULL CHECK(provider IN ('merit','storecredit','stripe','nowpayments','catalystpay','paylio')),
  state text NOT NULL CHECK(state IN ('held','consumed')),
  fingerprint text,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  CHECK(provider NOT IN ('merit','storecredit') OR customer_id IS NOT NULL)
);
ALTER TABLE public.store_credit_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_credit_ledger FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.store_credit_ledger TO service_role;

-- All mutations use the ledger RPCs. In-flight legacy absolute upserts lose
-- direct write permission, so a stale read cannot restore reserved credit.
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_credits FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.user_credits TO service_role;
GRANT SELECT ON public.user_credits TO authenticated;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='user_credits' LOOP
    EXECUTE format('DROP POLICY %I ON public.user_credits',r.policyname);
  END LOOP;
END $$;
CREATE FUNCTION public.can_access_store_credit(p_email text, p_admin_only boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT current_setting('role',true)='authenticated' AND EXISTS (
    SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL
      AND (lower(btrim(email))='support@10bottlevalue.co'
        OR (NOT p_admin_only AND lower(btrim(email))=lower(btrim(p_email))))
  );
$$;
CREATE POLICY user_credits_verified_admin ON public.user_credits FOR ALL TO authenticated
 USING(public.can_access_store_credit(email,true)) WITH CHECK(public.can_access_store_credit(email,true));
CREATE POLICY user_credits_verified_owner ON public.user_credits FOR SELECT TO authenticated
 USING(public.can_access_store_credit(email,false));

CREATE FUNCTION public.lock_store_credit_balance(p_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE r record; n integer:=0; v_balance numeric; v_key text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('store-credit:'||p_email,0));
  FOR r IN SELECT email,amount FROM public.user_credits WHERE lower(btrim(email))=p_email ORDER BY email FOR UPDATE LOOP
    n:=n+1; v_balance:=r.amount; v_key:=r.email;
  END LOOP;
  IF n<>1 OR v_balance IS NULL OR v_balance::text IN ('NaN','Infinity','-Infinity')
     OR v_balance<0 OR v_balance*100<>trunc(v_balance*100) OR v_balance*100>9007199254740991 THEN
    RETURN jsonb_build_object('ok',false,'error','MERIT_CREDIT_BALANCE_UNAVAILABLE');
  END IF;
  RETURN jsonb_build_object('ok',true,'email',v_key,'balanceCents',(v_balance*100)::bigint);
END $$;

CREATE FUNCTION public.apply_store_credit_debit(p_email text,p_cents bigint,p_locked jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE n integer; v_after numeric;
BEGIN
  IF p_cents<=0 OR p_cents>(p_locked->>'balanceCents')::bigint THEN RAISE EXCEPTION 'STORE_CREDIT_DEBIT_INVALID'; END IF;
  v_after:=((p_locked->>'balanceCents')::bigint-p_cents)::numeric/100;
  UPDATE public.user_credits SET amount=v_after,updated_at=now()
    WHERE email=p_locked->>'email' AND lower(btrim(email))=p_email;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 OR (SELECT amount FROM public.user_credits WHERE email=p_locked->>'email') IS DISTINCT FROM v_after THEN
    RAISE EXCEPTION 'STORE_CREDIT_DEBIT_NOT_ACKNOWLEDGED' USING ERRCODE='23514';
  END IF;
END $$;

-- Historical callbacks used Number(metadata.storeCreditUsed), including numeric
-- strings. Treat those as claims for containment without granting them authority.
CREATE FUNCTION public.store_credit_claim(p_metadata jsonb)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v text:=btrim(coalesce(p_metadata->>'storeCreditUsed','')); v_amount numeric;
BEGIN
 IF jsonb_typeof(p_metadata->'storeCreditUsed') NOT IN('number','string') OR length(v)>100
   OR v !~ '^[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+-]?[0-9]+)?$' THEN RETURN 0; END IF;
 BEGIN v_amount:=v::numeric; EXCEPTION WHEN numeric_value_out_of_range OR invalid_text_representation THEN RETURN 0; END;
 RETURN v_amount;
END $$;
REVOKE ALL ON FUNCTION public.store_credit_claim(jsonb) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.has_pending_legacy_credit(p_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.orders o
  WHERE lower(btrim(o.email))=p_email AND o.paid_at IS NULL
    AND lower(coalesce(o.status,'')) NOT IN ('paid','shipped','delivered','completed','done','refunded')
    AND public.store_credit_claim(o.metadata)>0
    AND NOT EXISTS(SELECT 1 FROM public.merit_payment_attempts a WHERE a.order_id=o.id)
    AND NOT EXISTS(SELECT 1 FROM public.store_credit_ledger l WHERE l.order_id=o.id AND l.state='consumed')
 );
$$;

CREATE FUNCTION public.guard_store_credit_admin_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_email text;
BEGIN
  -- service_role has no direct DML privilege. RPCs run as the table owner.
  IF current_setting('role',true)='authenticated' THEN
    v_email:=lower(btrim(CASE WHEN TG_OP='DELETE' THEN OLD.email ELSE NEW.email END));
    PERFORM pg_advisory_xact_lock(hashtextextended('store-credit:'||v_email,0));
    IF NOT public.can_access_store_credit(v_email,true) THEN RAISE EXCEPTION 'STORE_CREDIT_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
    IF EXISTS(SELECT 1 FROM public.store_credit_ledger WHERE email=v_email AND state='held')
       OR (TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM public.store_credit_ledger WHERE email=lower(btrim(OLD.email)) AND state='held')) THEN
      RAISE EXCEPTION 'STORE_CREDIT_RESERVATION_PENDING' USING ERRCODE='23514';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER store_credit_admin_write_guard BEFORE INSERT OR UPDATE OR DELETE ON public.user_credits
 FOR EACH ROW EXECUTE FUNCTION public.guard_store_credit_admin_write();

CREATE TABLE public.store_credit_adjustments (
 request_id uuid PRIMARY KEY, email text NOT NULL, admin_id uuid NOT NULL,
 mode text NOT NULL CHECK(mode IN ('set','add','subtract')), amount_cents bigint NOT NULL CHECK(amount_cents>=0),
 note text, before_cents bigint NOT NULL, balance_cents bigint NOT NULL CHECK(balance_cents>=0),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_credit_adjustments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_credit_adjustments FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.store_credit_adjustments TO service_role;
CREATE FUNCTION public.adjust_store_credit(p_request_id uuid,p_email text,p_mode text,p_amount_cents bigint,p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_email text:=lower(btrim(coalesce(p_email,''))); v_note text:=nullif(btrim(coalesce(p_note,'')),'');
 v_credit jsonb; v_before bigint; v_after bigint; v_adjustment public.store_credit_adjustments%ROWTYPE; n integer;
BEGIN
 IF NOT public.can_access_store_credit(v_email,true) THEN RAISE EXCEPTION 'STORE_CREDIT_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR v_email='' OR p_email IS DISTINCT FROM v_email OR length(v_email)>254
   OR v_email!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
   OR p_mode IS NULL OR p_mode NOT IN ('set','add','subtract')
   OR p_amount_cents IS NULL OR p_amount_cents<0 OR p_amount_cents>9007199254740991 OR length(v_note)>2000 THEN
   RETURN jsonb_build_object('ok',false,'error','CREDIT_ADJUSTMENT_INVALID');
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('store-credit:'||v_email,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('credit-adjustment:'||p_request_id::text,0));
 SELECT * INTO v_adjustment FROM public.store_credit_adjustments WHERE request_id=p_request_id;
 IF FOUND THEN
   IF v_adjustment.admin_id IS DISTINCT FROM auth.uid() OR v_adjustment.email IS DISTINCT FROM v_email
     OR v_adjustment.mode IS DISTINCT FROM p_mode OR v_adjustment.amount_cents IS DISTINCT FROM p_amount_cents
     OR v_adjustment.note IS DISTINCT FROM v_note THEN
     RETURN jsonb_build_object('ok',false,'error','CREDIT_ADJUSTMENT_KEY_REUSED');
   END IF;
   RETURN jsonb_build_object('ok',true,'requestId',p_request_id,'email',v_email,'mode',p_mode,'amountCents',p_amount_cents,
     'balanceCents',v_adjustment.balance_cents,'note',v_note,'replayed',true);
 END IF;
 IF EXISTS(SELECT 1 FROM public.store_credit_ledger WHERE email=v_email AND state='held') THEN
   RETURN jsonb_build_object('ok',false,'error','STORE_CREDIT_RESERVATION_PENDING');
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_credits WHERE lower(btrim(email))=v_email) THEN
   INSERT INTO public.user_credits(email,amount,note,updated_at) VALUES(v_email,0,NULL,now());
 END IF;
 v_credit:=public.lock_store_credit_balance(v_email);
 IF v_credit->>'ok' IS DISTINCT FROM 'true' THEN RETURN v_credit; END IF;
 v_before:=(v_credit->>'balanceCents')::bigint;
 v_after:=CASE p_mode WHEN 'set' THEN p_amount_cents WHEN 'add' THEN v_before+p_amount_cents ELSE greatest(0,v_before-p_amount_cents) END;
 IF v_after>9007199254740991 THEN RETURN jsonb_build_object('ok',false,'error','CREDIT_ADJUSTMENT_INVALID'); END IF;
 UPDATE public.user_credits SET amount=v_after::numeric/100,note=v_note,updated_at=now() WHERE email=v_credit->>'email';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 OR NOT EXISTS(SELECT 1 FROM public.user_credits WHERE email=v_credit->>'email' AND amount=v_after::numeric/100 AND note IS NOT DISTINCT FROM v_note) THEN
   RAISE EXCEPTION 'CREDIT_ADJUSTMENT_NOT_ACKNOWLEDGED' USING ERRCODE='23514';
 END IF;
 INSERT INTO public.store_credit_adjustments(request_id,email,admin_id,mode,amount_cents,note,before_cents,balance_cents)
 VALUES(p_request_id,v_email,auth.uid(),p_mode,p_amount_cents,v_note,v_before,v_after);
 IF NOT EXISTS(SELECT 1 FROM public.store_credit_adjustments WHERE request_id=p_request_id AND email=v_email
   AND admin_id=auth.uid() AND mode=p_mode AND amount_cents=p_amount_cents AND note IS NOT DISTINCT FROM v_note
   AND before_cents=v_before AND balance_cents=v_after AND created_at=now()) THEN
   RAISE EXCEPTION 'CREDIT_ADJUSTMENT_RECEIPT_NOT_ACKNOWLEDGED' USING ERRCODE='23514';
 END IF;
 RETURN jsonb_build_object('ok',true,'requestId',p_request_id,'email',v_email,'mode',p_mode,'amountCents',p_amount_cents,
   'balanceCents',v_after,'note',v_note,'replayed',false);
END $$;
REVOKE ALL ON FUNCTION public.adjust_store_credit(uuid,text,text,bigint,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.adjust_store_credit(uuid,text,text,bigint,text) TO authenticated;

CREATE FUNCTION public.assert_store_credit_receipt(p_order_id text,p_customer_id uuid,p_email text,p_cents bigint,p_provider text,p_state text,p_fingerprint text,p_snapshot jsonb,p_consumed_at timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.store_credit_ledger WHERE order_id=p_order_id
   AND customer_id IS NOT DISTINCT FROM p_customer_id AND email=p_email AND credit_cents=p_cents
   AND provider=p_provider AND state=p_state AND fingerprint IS NOT DISTINCT FROM p_fingerprint
   AND snapshot=p_snapshot AND created_at=now() AND consumed_at IS NOT DISTINCT FROM p_consumed_at) THEN
   RAISE EXCEPTION 'STORE_CREDIT_RECEIPT_NOT_ACKNOWLEDGED' USING ERRCODE='23514';
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.assert_store_credit_receipt(text,uuid,text,bigint,text,text,text,jsonb,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.reserve_merit_checkout_with_credit(
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
  v_credit jsonb;
  v_base bigint;
  v_credit_cents bigint;
  v_cash bigint;
  v_fee bigint;
  v_bps integer;
  v_request_snapshot jsonb := p_snapshot;
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

  -- All credit paths lock the same normalized owner before any checkout/order.
  PERFORM pg_advisory_xact_lock(hashtextextended('store-credit:' || v_email, 0));
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
       OR v_attempt.currency IS DISTINCT FROM p_currency
       OR v_attempt.credit_request_snapshot IS DISTINCT FROM p_snapshot
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

  v_credit := public.lock_store_credit_balance(v_email);
  IF v_credit ->> 'ok' IS DISTINCT FROM 'true' THEN RETURN v_credit; END IF;
  IF public.has_pending_legacy_credit(v_email) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'MERIT_CREDIT_PENDING');
  END IF;
  IF jsonb_typeof(p_snapshot -> 'customerCardSurcharge') IS DISTINCT FROM 'number'
     OR jsonb_typeof(p_snapshot -> 'customerCardSurchargeBps') IS DISTINCT FROM 'number'
     OR (p_snapshot ->> 'customerCardSurchargeBps')::numeric <> trunc((p_snapshot ->> 'customerCardSurchargeBps')::numeric)
     OR (p_snapshot ->> 'customerCardSurchargeBps')::numeric NOT BETWEEN 0 AND 10000
     OR (p_snapshot ->> 'customerCardSurcharge')::numeric * 100 <> trunc((p_snapshot ->> 'customerCardSurcharge')::numeric * 100) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_MERIT_QUOTE');
  END IF;
  v_bps := (p_snapshot ->> 'customerCardSurchargeBps')::integer;
  v_base := p_amount_cents - ((p_snapshot ->> 'customerCardSurcharge')::numeric * 100)::bigint;
  IF v_base <= 0 OR round(v_base::numeric * v_bps / 10000) IS DISTINCT FROM (p_snapshot ->> 'customerCardSurcharge')::numeric * 100 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_MERIT_QUOTE');
  END IF;
  v_credit_cents := (v_credit ->> 'balanceCents')::bigint;
  IF v_credit_cents <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'MERIT_CREDIT_BALANCE_UNAVAILABLE');
  END IF;
  IF v_credit_cents >= v_base THEN
    RETURN jsonb_build_object('ok', false, 'error', 'MERIT_FULL_CREDIT_AVAILABLE');
  END IF;
  v_cash := v_base - v_credit_cents;
  v_fee := round(v_base::numeric * v_bps / 10000)::bigint;
  p_amount_cents := v_cash + v_fee;
  p_snapshot := p_snapshot || jsonb_build_object(
    'storeCreditUsed', v_credit_cents::numeric / 100, 'storeCreditUsedCents', v_credit_cents,
    'orderBaseAmountCents', v_base, 'cardBaseAmountCents', v_cash,
    'customerCardSurchargeBasis', 'order_before_credit',
    'customerCardSurcharge', v_fee::numeric / 100, 'total', p_amount_cents::numeric / 100
  );

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
    snapshot, expected_account, expected_live, user_promo_id, credit_reserved_cents, credit_request_snapshot
  ) VALUES (
    p_checkout_key, v_email, p_customer_id, v_order_id, p_fingerprint, p_amount_cents, p_currency,
    p_snapshot, p_expected_account, p_expected_live, p_user_promo_id, v_credit_cents, v_request_snapshot
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
  PERFORM public.apply_store_credit_debit(v_email, v_credit_cents, v_credit);
  INSERT INTO public.store_credit_ledger(order_id,customer_id,email,credit_cents,provider,state,fingerprint,snapshot)
    VALUES(v_order_id,p_customer_id,v_email,v_credit_cents,'merit','held',p_fingerprint,p_snapshot);
  PERFORM public.assert_store_credit_receipt(v_order_id,p_customer_id,v_email,v_credit_cents,'merit','held',p_fingerprint,p_snapshot,NULL);
  RETURN jsonb_build_object('ok', true, 'created', true, 'attempt', to_jsonb(v_attempt));
END
$$;

CREATE FUNCTION public.debit_legacy_order_credit(p_order_id text,p_email text,p_credit_cents bigint,p_provider text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_email text:=lower(btrim(coalesce(p_email,''))); v_credit jsonb; v_order public.orders%ROWTYPE; v_ledger public.store_credit_ledger%ROWTYPE; v_existing boolean;
BEGIN
  IF v_email='' OR p_email IS DISTINCT FROM v_email OR p_order_id IS NULL OR p_order_id=''
     OR p_credit_cents IS NULL OR p_credit_cents<=0 OR p_credit_cents>9007199254740991
     OR p_provider IS NULL OR p_provider NOT IN ('stripe','nowpayments','catalystpay','paylio') THEN
    RETURN jsonb_build_object('ok',false,'error','CREDIT_DEBIT_INVALID');
  END IF;
  v_credit:=public.lock_store_credit_balance(v_email);
  IF v_credit->>'ok' IS DISTINCT FROM 'true' THEN RETURN v_credit; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND OR lower(btrim(v_order.email)) IS DISTINCT FROM v_email
     OR EXISTS(SELECT 1 FROM public.merit_payment_attempts WHERE order_id=p_order_id)
     OR jsonb_typeof(v_order.metadata->'storeCreditUsed') IS DISTINCT FROM 'number' THEN
    RETURN jsonb_build_object('ok',false,'error','CREDIT_ORDER_MISMATCH');
  END IF;
  IF (v_order.metadata->>'storeCreditUsed')::numeric*100 IS DISTINCT FROM p_credit_cents::numeric THEN
    RETURN jsonb_build_object('ok',false,'error','CREDIT_ORDER_MISMATCH');
  END IF;
  SELECT * INTO v_ledger FROM public.store_credit_ledger WHERE order_id=p_order_id;
  v_existing:=FOUND;
  IF v_existing THEN
    IF v_ledger.email IS DISTINCT FROM v_email OR v_ledger.credit_cents IS DISTINCT FROM p_credit_cents
      OR v_ledger.provider IS DISTINCT FROM p_provider OR v_ledger.state IS DISTINCT FROM 'consumed' THEN
      RETURN jsonb_build_object('ok',false,'error','CREDIT_LEDGER_CONFLICT');
    END IF;
  ELSE
    -- Legacy provider creation accepted browser-claimed email/credit. A paid
    -- provider intent alone does not prove the owner authorized this balance.
    -- Existing orders require verified owner reconciliation before a private
    -- consumed receipt can exist; never manufacture ownership here.
    RETURN jsonb_build_object('ok',false,'error','CREDIT_LEGACY_IDENTITY_UNVERIFIED');
  END IF;
  RETURN jsonb_build_object('ok',true,'orderId',p_order_id,'email',v_email,'creditCents',p_credit_cents,
    'provider',p_provider,'alreadyDebited',v_existing,'balanceCents',(v_credit->>'balanceCents')::bigint-CASE WHEN v_existing THEN 0 ELSE p_credit_cents END);
END $$;

DROP FUNCTION IF EXISTS public.checkout_store_credit(text,jsonb,numeric,text);
CREATE FUNCTION public.checkout_store_credit(p_customer_email text,p_order jsonb,p_store_credit_used numeric,p_user_promo_id text,p_customer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_email text:=lower(btrim(coalesce(p_customer_email,''))); v_id text:=p_order->>'id';
 v_fingerprint text:=p_order->>'checkoutFingerprint'; v_credit jsonb; v_cents bigint;
 v_ledger public.store_credit_ledger%ROWTYPE; v_order jsonb; v_saved public.orders%ROWTYPE; n integer;
BEGIN
 IF p_customer_id IS NULL OR v_email='' OR p_customer_email IS DISTINCT FROM v_email OR v_id IS NULL OR v_id!~'^INV-[A-Fa-f0-9]{32}$'
   OR v_fingerprint IS NULL OR v_fingerprint!~'^[A-Fa-f0-9]{64}$'
   OR p_store_credit_used IS NULL OR p_store_credit_used::text IN ('NaN','Infinity','-Infinity')
   OR p_store_credit_used<=0 OR p_store_credit_used*100<>trunc(p_store_credit_used*100) OR p_store_credit_used*100>9007199254740991
   OR p_order->>'email' IS DISTINCT FROM v_email OR p_order->>'status' IS DISTINCT FROM 'paid'
   OR p_order->>'paymentProvider' IS DISTINCT FROM 'StoreCredit'
   OR jsonb_typeof(p_order->'storeCreditUsed') IS DISTINCT FROM 'number'
   OR jsonb_typeof(p_order->'total') IS DISTINCT FROM 'number'
   OR jsonb_typeof(p_order->'items') IS DISTINCT FROM 'array'
   OR p_user_promo_id IS NOT NULL THEN
   RETURN jsonb_build_object('ok',false,'error','INVALID_ORDER');
 END IF;
 IF (p_order->>'storeCreditUsed')::numeric IS DISTINCT FROM p_store_credit_used
   OR (p_order->>'total')::numeric<>0 OR jsonb_array_length(p_order->'items')<1 THEN
   RETURN jsonb_build_object('ok',false,'error','INVALID_ORDER');
 END IF;
 v_cents:=(p_store_credit_used*100)::bigint;
 v_credit:=public.lock_store_credit_balance(v_email);
 IF v_credit->>'ok' IS DISTINCT FROM 'true' THEN RETURN v_credit; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('credit-order:'||v_id,0));
 SELECT * INTO v_ledger FROM public.store_credit_ledger WHERE order_id=v_id;
 IF FOUND THEN
   IF v_ledger.provider IS DISTINCT FROM 'storecredit' OR v_ledger.state IS DISTINCT FROM 'consumed'
     OR v_ledger.customer_id IS DISTINCT FROM p_customer_id OR v_ledger.email IS DISTINCT FROM v_email OR v_ledger.credit_cents IS DISTINCT FROM v_cents
     OR v_ledger.fingerprint IS DISTINCT FROM v_fingerprint THEN
     RETURN jsonb_build_object('ok',false,'error','ORDER_ID_CONFLICT');
   END IF;
   RETURN jsonb_build_object('ok',true,'orderId',v_id,'balance',(v_credit->>'balanceCents')::numeric/100,'order',v_ledger.snapshot,'replayed',true);
 END IF;
 IF EXISTS(SELECT 1 FROM public.orders WHERE id=v_id) THEN RETURN jsonb_build_object('ok',false,'error','ORDER_ID_CONFLICT'); END IF;
 IF public.has_pending_legacy_credit(v_email) THEN RETURN jsonb_build_object('ok',false,'error','MERIT_CREDIT_PENDING'); END IF;
 IF (v_credit->>'balanceCents')::bigint<v_cents THEN RETURN jsonb_build_object('ok',false,'error','INSUFFICIENT_CREDIT'); END IF;
 v_order:=p_order||jsonb_build_object('storeCreditBalanceAfter',((v_credit->>'balanceCents')::bigint-v_cents)::numeric/100);
 INSERT INTO public.merit_order_write_permits(transaction_id,backend_pid,order_id) VALUES(txid_current(),pg_backend_pid(),v_id);
 INSERT INTO public.orders(id,email,status,paid_at,total,metadata,items,payment_provider)
  VALUES(v_id,v_email,'paid',now(),0,v_order,p_order->'items','StoreCredit');
 GET DIAGNOSTICS n=ROW_COUNT;
 SELECT * INTO v_saved FROM public.orders WHERE id=v_id FOR UPDATE;
 IF n<>1 OR NOT FOUND OR v_saved.email IS DISTINCT FROM v_email OR v_saved.status IS DISTINCT FROM 'paid'
   OR v_saved.total IS DISTINCT FROM 0 OR v_saved.metadata IS DISTINCT FROM v_order OR v_saved.items IS DISTINCT FROM p_order->'items'
   OR v_saved.payment_provider IS DISTINCT FROM 'StoreCredit' OR v_saved.paid_at IS NULL THEN
   RAISE EXCEPTION 'STORE_CREDIT_ORDER_NOT_ACKNOWLEDGED' USING ERRCODE='23514';
 END IF;
 PERFORM public.apply_store_credit_debit(v_email,v_cents,v_credit);
 INSERT INTO public.store_credit_ledger(order_id,customer_id,email,credit_cents,provider,state,fingerprint,snapshot,consumed_at)
  VALUES(v_id,p_customer_id,v_email,v_cents,'storecredit','consumed',v_fingerprint,v_order,now());
 PERFORM public.assert_store_credit_receipt(v_id,p_customer_id,v_email,v_cents,'storecredit','consumed',v_fingerprint,v_order,now());
 DELETE FROM public.merit_order_write_permits WHERE transaction_id=txid_current() AND backend_pid=pg_backend_pid() AND order_id=v_id;
 RETURN jsonb_build_object('ok',true,'orderId',v_id,'balance',((v_credit->>'balanceCents')::bigint-v_cents)::numeric/100,'order',v_order,'replayed',false);
END $$;

-- New full-credit orders have the same narrow privacy boundary as Merit.
-- Existing unrelated legacy orders retain their existing policy behavior.
CREATE FUNCTION public.can_read_store_credit_order(p_order_id text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_customer uuid; v_email text;
BEGIN
 SELECT customer_id,email INTO v_customer,v_email FROM public.store_credit_ledger WHERE order_id=p_order_id AND provider='storecredit';
 IF NOT FOUND THEN RETURN true; END IF;
 IF current_setting('role',true) IS DISTINCT FROM 'authenticated' THEN RETURN false; END IF;
 RETURN EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL
   AND (lower(btrim(email))='support@10bottlevalue.co' OR (id=v_customer AND lower(btrim(email))=v_email)));
END $$;
REVOKE ALL ON FUNCTION public.can_read_store_credit_order(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.can_read_store_credit_order(text) TO anon,authenticated;
CREATE POLICY store_credit_order_read_privacy ON public.orders AS RESTRICTIVE FOR SELECT TO anon,authenticated
 USING(public.can_read_store_credit_order(id));

CREATE FUNCTION public.guard_store_credit_order_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_old_id text;v_new_id text;v_bound boolean;v_old_credit numeric:=0;v_new_credit numeric:=0;v_provider text;
 v_columns text[]:=ARRAY['status','metadata','updated_at','admin_note','tracking_number','tracking_number_2','tracking_number_sent_at','affiliate_commission_adjustment'];
 v_metadata text[]:=ARRAY['status','adminNote','orderNotes','trackingNumber','trackingNumber2','trackingNumberSentAt','firstName','lastName','address','address2','city','state','postalCode','country','phone','taxId','affiliateCommissionAdjustment','affiliateCommissionDeduction','refundCommissionDeduction'];
BEGIN
 IF TG_OP<>'INSERT' THEN v_old_id:=OLD.id; END IF;
 IF TG_OP<>'DELETE' THEN v_new_id:=NEW.id; END IF;
 IF TG_OP<>'DELETE' AND EXISTS(SELECT 1 FROM public.merit_order_write_permits
   WHERE transaction_id=txid_current() AND backend_pid=pg_backend_pid() AND order_id=v_new_id)
   AND (TG_OP='INSERT' OR v_old_id=v_new_id) THEN RETURN NEW; END IF;
 -- Protect existing credit claims before their callback, including a two-step
 -- attempt to erase the credit first and mark the invoice paid later.
 IF TG_OP<>'INSERT' THEN v_old_credit:=public.store_credit_claim(OLD.metadata); END IF;
 IF TG_OP<>'DELETE' THEN v_new_credit:=public.store_credit_claim(NEW.metadata); END IF;
 IF v_new_credit>0 AND (TG_OP='INSERT' OR v_old_credit<=0) THEN
   -- Only the private Merit/full-credit reservation permit can introduce a
   -- positive claim. Public orders must not create holds against another email.
   RAISE EXCEPTION 'STORE_CREDIT_CLAIM_REQUIRES_PRIVATE_RESERVATION' USING ERRCODE='23514';
 END IF;
 IF v_old_credit>0 AND TG_OP IN('UPDATE','DELETE') THEN
   IF TG_OP='DELETE' OR v_old_id IS DISTINCT FROM v_new_id OR OLD.email IS DISTINCT FROM NEW.email
     OR v_old_credit IS DISTINCT FROM v_new_credit THEN
     RAISE EXCEPTION 'LEGACY_CREDIT_CLAIM_PROTECTED' USING ERRCODE='23514';
   END IF;
 END IF;
 IF TG_OP<>'DELETE' AND greatest(v_old_credit,v_new_credit)>0
   AND (TG_OP='INSERT' OR (OLD.paid_at IS NULL AND lower(coalesce(OLD.status,'')) NOT IN('paid','done','shipped','delivered','completed','refunded')))
   AND (NEW.paid_at IS NOT NULL OR lower(coalesce(NEW.status,'')) IN('paid','done','processing','shipped','delivered','completed','refunded')) THEN
   v_provider:=lower(coalesce(nullif(NEW.payment_provider,''),NEW.metadata->>'paymentProvider',''));
   v_provider:=CASE WHEN v_provider ~ '^stripe($| )' THEN 'stripe' WHEN v_provider ~ '^nowpayments($| )' THEN 'nowpayments'
     WHEN v_provider ~ '^catalystpay($| )' THEN 'catalystpay' WHEN v_provider ~ '^paylio($| )' THEN 'paylio' ELSE v_provider END;
   IF NOT EXISTS(SELECT 1 FROM public.store_credit_ledger WHERE order_id=v_new_id AND email=lower(btrim(NEW.email))
      AND credit_cents=greatest(v_old_credit,v_new_credit)*100 AND state='consumed' AND provider=v_provider) THEN
      RAISE EXCEPTION 'LEGACY_CREDIT_DEBIT_REQUIRED_BEFORE_PAID' USING ERRCODE='23514';
   END IF;
 END IF;
 SELECT EXISTS(SELECT 1 FROM public.store_credit_ledger WHERE provider='storecredit' AND order_id IN(v_old_id,v_new_id)) INTO v_bound;
 IF NOT v_bound THEN
   IF TG_OP<>'DELETE' AND (lower(coalesce(NEW.payment_provider,''))='storecredit' OR lower(coalesce(NEW.metadata->>'paymentProvider',''))='storecredit') THEN
     RAISE EXCEPTION 'STORE_CREDIT_ORDER_REQUIRES_PRIVATE_LEDGER' USING ERRCODE='23514';
   END IF;
   IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
 END IF;
 IF TG_OP<>'UPDATE' OR v_old_id IS DISTINCT FROM v_new_id THEN RAISE EXCEPTION 'STORE_CREDIT_ORDER_PROTECTED' USING ERRCODE='23514'; END IF;
 IF to_jsonb(NEW) IS NOT DISTINCT FROM to_jsonb(OLD) THEN RETURN NEW; END IF;
 IF NOT public.can_access_store_credit('',true) THEN RAISE EXCEPTION 'STORE_CREDIT_ORDER_PROTECTED' USING ERRCODE='23514'; END IF;
 IF NEW.status IS DISTINCT FROM OLD.status AND NOT (OLD.status IN('paid','done','processing','shipped','delivered') AND NEW.status IN('done','processing','shipped','delivered','refunded','cancelled')) THEN
   RAISE EXCEPTION 'STORE_CREDIT_ORDER_STATUS_PROTECTED' USING ERRCODE='23514';
 END IF;
 IF (to_jsonb(NEW)-v_columns) IS DISTINCT FROM (to_jsonb(OLD)-v_columns)
   OR jsonb_typeof(NEW.metadata) IS DISTINCT FROM 'object'
   OR (NEW.metadata-v_metadata) IS DISTINCT FROM (OLD.metadata-v_metadata)
   OR ((NEW.metadata->>'status') IS DISTINCT FROM (OLD.metadata->>'status') AND (NEW.metadata->>'status') IS DISTINCT FROM NEW.status) THEN
   RAISE EXCEPTION 'STORE_CREDIT_ORDER_FINANCIAL_FIELDS_PROTECTED' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_store_credit_order_write() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER store_credit_order_write_guard BEFORE INSERT OR UPDATE OR DELETE ON public.orders
 FOR EACH ROW EXECUTE FUNCTION public.guard_store_credit_order_write();

CREATE FUNCTION public.consume_merit_credit_hold()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE n integer;
BEGIN
 IF OLD.state='ready' AND NEW.state='paid' AND NEW.credit_reserved_cents>0 THEN
  UPDATE public.store_credit_ledger SET state='consumed',consumed_at=NEW.paid_at
   WHERE order_id=NEW.order_id AND email=NEW.email AND credit_cents=NEW.credit_reserved_cents
     AND provider='merit' AND state='held' AND fingerprint=NEW.quote_fingerprint AND snapshot=NEW.snapshot;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 OR NOT EXISTS(SELECT 1 FROM public.store_credit_ledger WHERE order_id=NEW.order_id
     AND customer_id=NEW.customer_id AND email=NEW.email AND credit_cents=NEW.credit_reserved_cents
     AND provider='merit' AND state='consumed' AND fingerprint=NEW.quote_fingerprint AND snapshot=NEW.snapshot AND consumed_at=NEW.paid_at) THEN
    RAISE EXCEPTION 'MERIT_CREDIT_CONSUMPTION_NOT_ACKNOWLEDGED' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER merit_credit_hold_paid AFTER UPDATE ON public.merit_payment_attempts
 FOR EACH ROW EXECUTE FUNCTION public.consume_merit_credit_hold();

REVOKE ALL ON FUNCTION public.can_access_store_credit(text,boolean) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.can_access_store_credit(text,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.lock_store_credit_balance(text),public.apply_store_credit_debit(text,bigint,jsonb),
 public.has_pending_legacy_credit(text),public.guard_store_credit_admin_write(),public.consume_merit_credit_hold()
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.reserve_merit_checkout_with_credit(uuid,text,uuid,text,bigint,text,jsonb,text,boolean,text),
 public.debit_legacy_order_credit(text,text,bigint,text),public.checkout_store_credit(text,jsonb,numeric,text,uuid)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.reserve_merit_checkout_with_credit(uuid,text,uuid,text,bigint,text,jsonb,text,boolean,text),
 public.debit_legacy_order_credit(text,text,bigint,text),public.checkout_store_credit(text,jsonb,numeric,text,uuid) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
