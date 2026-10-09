-- Legacy credit claims are quarantined by the existing callback/write guards.
-- They are not spendable reservations and must not block a new authenticated checkout.
-- Preserve all ledger, balance, ownership, replay and provider-verification controls.
BEGIN;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.debit_legacy_order_credit(text,text,bigint,text)') AND md5(prosrc)='089d7311ea566e12fa9e1f9fadfd7a49')
 OR NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.guard_store_credit_order_write()') AND md5(prosrc)='09d1e7f164d15a58a2a4760d3f4b5845')
 OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') AND (has_table_privilege(oid,'public.user_credits','INSERT') OR has_table_privilege(oid,'public.user_credits','UPDATE') OR has_table_privilege(oid,'public.user_credits','DELETE'))) THEN
   RAISE EXCEPTION 'LEGACY_CREDIT_CONTAINMENT_PREREQUISITE_MISMATCH';
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.reserve_merit_checkout_with_credit(
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

CREATE OR REPLACE FUNCTION public.checkout_store_credit(p_customer_email text,p_order jsonb,p_store_credit_used numeric,p_user_promo_id text,p_customer_id uuid)
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

COMMIT;
