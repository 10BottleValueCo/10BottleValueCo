-- Explicitly apply after orders_access_containment. No existing payment records
-- are adopted: old PayLio callbacks lack a trusted order-to-payment binding.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
CREATE TABLE public.paylio_payment_attempts (
  id uuid PRIMARY KEY,
  order_id text UNIQUE NOT NULL REFERENCES public.orders(id),
  customer_id uuid NOT NULL,
  email text NOT NULL,
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  account_fingerprint text NOT NULL CHECK (account_fingerprint ~ '^[a-f0-9]{64}$'),
  payout_address text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents>0 AND amount_cents<=10000000),
  currency text NOT NULL CHECK (currency='USD'),
  quote jsonb NOT NULL CHECK (jsonb_typeof(quote)='object'),
  state text NOT NULL DEFAULT 'reserved' CHECK (state IN ('reserved','ready','paid')),
  payment_id text UNIQUE,
  ipn_token text,
  checkout_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  effects_applied_at timestamptz,
  effects_error text,
  CHECK ((state='reserved' AND payment_id IS NULL AND ipn_token IS NULL AND checkout_url IS NULL)
    OR (state IN ('ready','paid') AND payment_id IS NOT NULL AND ipn_token IS NOT NULL AND checkout_url IS NOT NULL)),
  CHECK ((state='paid')=(paid_at IS NOT NULL))
);
ALTER TABLE public.paylio_payment_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.paylio_payment_attempts FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.paylio_payment_attempts TO service_role;
CREATE TABLE public.paylio_order_write_permits (
  transaction_id bigint NOT NULL, backend_pid integer NOT NULL, order_id text NOT NULL,
  PRIMARY KEY(transaction_id,backend_pid,order_id)
);
REVOKE ALL ON public.paylio_order_write_permits FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.guard_paylio_order_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE a public.paylio_payment_attempts%ROWTYPE; v_id text; v_support boolean; allowed_columns text[];
BEGIN
  v_id:=CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END;
  SELECT * INTO a FROM public.paylio_payment_attempts WHERE order_id=v_id OR (TG_OP<>'INSERT' AND order_id=OLD.id) LIMIT 1;
  IF NOT FOUND THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
  IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM public.paylio_order_write_permits
    WHERE transaction_id=txid_current() AND backend_pid=pg_backend_pid() AND order_id=v_id) THEN RETURN NEW; END IF;
  IF TG_OP<>'UPDATE' OR NEW.id IS DISTINCT FROM OLD.id THEN RAISE EXCEPTION 'PAYLIO_ORDER_PROTECTED'; END IF;
  IF to_jsonb(NEW)=to_jsonb(OLD) THEN RETURN NEW; END IF;
  SELECT current_setting('role',true)='authenticated' AND EXISTS(SELECT 1 FROM auth.users
    WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL AND lower(btrim(email))='support@10bottlevalue.co') INTO v_support;
  IF NOT v_support OR a.state<>'paid' THEN RAISE EXCEPTION 'PAYLIO_ORDER_PROTECTED'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND (OLD.status IN ('paid','done','processing','shipped','delivered')
    AND NEW.status IN ('done','processing','shipped','delivered','refunded','cancelled')) IS NOT TRUE THEN RAISE EXCEPTION 'PAYLIO_ORDER_STATUS_PROTECTED'; END IF;
  allowed_columns:=ARRAY['status','metadata','updated_at','admin_note','tracking_number','tracking_number_2','tracking_number_sent_at','affiliate_commission_adjustment'];
  IF (to_jsonb(NEW)-allowed_columns) IS DISTINCT FROM (to_jsonb(OLD)-allowed_columns)
    OR (coalesce(NEW.metadata,'{}'::jsonb)-ARRAY['status','adminNote','orderNotes','trackingNumber','trackingNumber2','trackingNumberSentAt','firstName','lastName','address','address2','city','state','postalCode','country','phone','taxId','affiliateCommissionAdjustment','affiliateCommissionDeduction','refundCommissionDeduction'])
    IS DISTINCT FROM (coalesce(OLD.metadata,'{}'::jsonb)-ARRAY['status','adminNote','orderNotes','trackingNumber','trackingNumber2','trackingNumberSentAt','firstName','lastName','address','address2','city','state','postalCode','country','phone','taxId','affiliateCommissionAdjustment','affiliateCommissionDeduction','refundCommissionDeduction'])
    OR ((NEW.metadata->>'status') IS DISTINCT FROM (OLD.metadata->>'status') AND (NEW.metadata->>'status') IS DISTINCT FROM NEW.status)
    THEN RAISE EXCEPTION 'PAYLIO_ORDER_FINANCIAL_FIELDS_PROTECTED'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_paylio_order_write() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER paylio_order_write_guard BEFORE INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.guard_paylio_order_write();

CREATE FUNCTION public.reserve_paylio_checkout(p_id uuid,p_order_id text,p_customer_id uuid,p_email text,p_fingerprint text,p_account_fingerprint text,p_payout_address text,p_amount_cents bigint,p_quote jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE a public.paylio_payment_attempts%ROWTYPE; o public.orders%ROWTYPE; snapshot jsonb;
BEGIN
  IF current_setting('role',true) IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED'; END IF;
  SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND OR lower(btrim(o.email)) IS DISTINCT FROM p_email
    OR (o.user_id IS NOT NULL AND o.user_id IS DISTINCT FROM p_customer_id)
    OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_customer_id AND email_confirmed_at IS NOT NULL AND lower(btrim(email))=p_email)
    THEN RAISE EXCEPTION 'PAYLIO_ORDER_OWNER_MISMATCH'; END IF;
  SELECT * INTO a FROM public.paylio_payment_attempts WHERE order_id=p_order_id FOR UPDATE;
  IF FOUND THEN
    IF a.customer_id IS DISTINCT FROM p_customer_id OR a.email IS DISTINCT FROM p_email OR a.fingerprint IS DISTINCT FROM p_fingerprint OR a.account_fingerprint IS DISTINCT FROM p_account_fingerprint
      OR a.payout_address IS DISTINCT FROM p_payout_address OR a.amount_cents IS DISTINCT FROM p_amount_cents THEN RAISE EXCEPTION 'PAYLIO_ATTEMPT_CHANGED'; END IF;
    IF o.status IS NULL OR o.status NOT IN ('pending','checkout','checkout (clicked pay)','wire_pending') THEN RAISE EXCEPTION 'PAYLIO_ORDER_NOT_PAYABLE'; END IF;
    RETURN jsonb_build_object('created',false,'attempt',to_jsonb(a));
  END IF;
  IF o.status IS NULL OR o.status NOT IN ('pending','checkout','checkout (clicked pay)','wire_pending')
    OR coalesce(o.metadata->>'storeCreditUsed','0')::numeric<>0
    OR lower(coalesce(o.payment_provider,''))='merit'
    OR EXISTS(SELECT 1 FROM public.merit_payment_attempts WHERE order_id=p_order_id)
    OR EXISTS(SELECT 1 FROM public.store_credit_ledger WHERE order_id=p_order_id)
    THEN RAISE EXCEPTION 'PAYLIO_ORDER_NOT_PAYABLE'; END IF;
  IF p_amount_cents IS NULL OR p_amount_cents<=0 OR p_amount_cents>10000000 OR jsonb_typeof(p_quote) IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_quote->'items') IS DISTINCT FROM 'array' OR jsonb_array_length(p_quote->'items')=0
    OR coalesce(p_quote->>'storeCreditUsed','0')::numeric<>0
    OR (p_quote->>'total')::numeric*100 IS DISTINCT FROM p_amount_cents::numeric THEN RAISE EXCEPTION 'PAYLIO_INVALID_QUOTE'; END IF;
  snapshot:=p_quote||jsonb_build_object('id',p_order_id,'orderId',p_order_id,'email',p_email,'status','checkout (clicked pay)','paymentProvider','Paylio Card');
  INSERT INTO public.paylio_payment_attempts(id,order_id,customer_id,email,fingerprint,account_fingerprint,payout_address,amount_cents,currency,quote)
    VALUES(p_id,p_order_id,p_customer_id,p_email,p_fingerprint,p_account_fingerprint,p_payout_address,p_amount_cents,'USD',snapshot) RETURNING * INTO a;
  INSERT INTO public.paylio_order_write_permits VALUES(txid_current(),pg_backend_pid(),p_order_id);
  UPDATE public.orders SET user_id=p_customer_id,total=p_amount_cents::numeric/100,metadata=snapshot,items=snapshot->'items',status='checkout (clicked pay)',payment_provider='Paylio Card' WHERE id=p_order_id;
  SELECT * INTO o FROM public.orders WHERE id=p_order_id;
  IF o.user_id IS DISTINCT FROM p_customer_id OR o.email IS DISTINCT FROM p_email OR o.total*100 IS DISTINCT FROM p_amount_cents::numeric
    OR o.metadata IS DISTINCT FROM snapshot OR o.items IS DISTINCT FROM snapshot->'items' OR o.status<>'checkout (clicked pay)' OR o.payment_provider<>'Paylio Card'
    THEN RAISE EXCEPTION 'PAYLIO_RESERVATION_NOT_ACKNOWLEDGED'; END IF;
  DELETE FROM public.paylio_order_write_permits WHERE transaction_id=txid_current() AND backend_pid=pg_backend_pid() AND order_id=p_order_id;
  RETURN jsonb_build_object('created',true,'attempt',to_jsonb(a));
END $$;

CREATE FUNCTION public.bind_paylio_checkout(p_id uuid,p_payment_id text,p_ipn_token text,p_checkout_url text,p_amount_cents bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE a public.paylio_payment_attempts%ROWTYPE;
BEGIN
  IF current_setting('role',true) IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED'; END IF;
  SELECT * INTO a FROM public.paylio_payment_attempts WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR a.amount_cents IS DISTINCT FROM p_amount_cents OR p_payment_id IS NULL OR p_payment_id !~ '^[A-Za-z0-9_-]{1,160}$'
    OR p_ipn_token IS NULL OR length(p_ipn_token) NOT BETWEEN 8 AND 512 OR p_checkout_url IS NULL OR p_checkout_url !~ '^https://paylio[.]org/(pay|p)/[A-Za-z0-9_-]+$'
    THEN RAISE EXCEPTION 'PAYLIO_BINDING_INVALID'; END IF;
  IF a.state<>'reserved' THEN
    IF a.payment_id=p_payment_id AND a.ipn_token=p_ipn_token AND a.checkout_url=p_checkout_url THEN RETURN to_jsonb(a); END IF;
    RAISE EXCEPTION 'PAYLIO_BINDING_CONFLICT';
  END IF;
  UPDATE public.paylio_payment_attempts SET state='ready',payment_id=p_payment_id,ipn_token=p_ipn_token,checkout_url=p_checkout_url WHERE id=p_id RETURNING * INTO a;
  RETURN to_jsonb(a);
END $$;

CREATE FUNCTION public.finalize_paylio_checkout(p_id uuid,p_payment_id text,p_amount_cents bigint,p_currency text,p_account_fingerprint text,p_paid_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE a public.paylio_payment_attempts%ROWTYPE; o public.orders%ROWTYPE; snapshot jsonb; changed boolean:=false;
BEGIN
  IF current_setting('role',true) IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED'; END IF;
  -- Order-first lock ordering matches reservation and ordinary order writes.
  SELECT * INTO a FROM public.paylio_payment_attempts WHERE id=p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAYLIO_BINDING_NOT_FOUND'; END IF;
  SELECT * INTO o FROM public.orders WHERE id=a.order_id FOR UPDATE;
  SELECT * INTO a FROM public.paylio_payment_attempts WHERE id=p_id FOR UPDATE;
  IF a.state NOT IN ('ready','paid') OR a.payment_id IS DISTINCT FROM p_payment_id OR a.amount_cents IS DISTINCT FROM p_amount_cents
    OR a.currency IS DISTINCT FROM p_currency OR a.account_fingerprint IS DISTINCT FROM p_account_fingerprint
    OR p_paid_at IS NULL OR p_paid_at>now()+interval '5 minutes'
    OR o.user_id IS DISTINCT FROM a.customer_id OR lower(btrim(o.email)) IS DISTINCT FROM a.email
    OR o.total*100 IS DISTINCT FROM a.amount_cents::numeric OR o.payment_provider IS DISTINCT FROM 'Paylio Card'
    THEN RAISE EXCEPTION 'PAYLIO_VERIFICATION_MISMATCH'; END IF;
  IF a.state='paid' THEN
    IF o.status IS NULL OR o.status NOT IN ('paid','done','processing','shipped','delivered') OR o.payment_id IS DISTINCT FROM a.payment_id THEN RAISE EXCEPTION 'PAYLIO_TERMINAL_ORDER'; END IF;
    RETURN jsonb_build_object('ok',true,'transitioned',false,'orderId',a.order_id,'paymentId',a.payment_id,'status',o.status,'quote',a.quote,'paidAt',a.paid_at);
  END IF;
  IF o.status IS NULL OR o.status NOT IN ('pending','checkout','checkout (clicked pay)','wire_pending') OR o.metadata IS DISTINCT FROM a.quote OR o.items IS DISTINCT FROM a.quote->'items' THEN RAISE EXCEPTION 'PAYLIO_ORDER_CHANGED'; END IF;
  snapshot:=a.quote||jsonb_build_object('status','paid','paymentId',a.payment_id,'paidAt',p_paid_at);
  INSERT INTO public.paylio_order_write_permits VALUES(txid_current(),pg_backend_pid(),a.order_id);
  UPDATE public.orders SET status='paid',payment_id=a.payment_id,paid_at=p_paid_at,metadata=snapshot WHERE id=a.order_id;
  SELECT * INTO o FROM public.orders WHERE id=a.order_id;
  IF o.status IS DISTINCT FROM 'paid' OR o.payment_id IS DISTINCT FROM a.payment_id OR o.paid_at IS DISTINCT FROM p_paid_at
    OR o.user_id IS DISTINCT FROM a.customer_id OR o.email IS DISTINCT FROM a.email OR o.total*100 IS DISTINCT FROM a.amount_cents::numeric
    OR o.metadata IS DISTINCT FROM snapshot OR o.items IS DISTINCT FROM a.quote->'items' OR o.payment_provider IS DISTINCT FROM 'Paylio Card'
    THEN RAISE EXCEPTION 'PAYLIO_PAID_NOT_ACKNOWLEDGED'; END IF;
  UPDATE public.paylio_payment_attempts SET state='paid',paid_at=p_paid_at WHERE id=p_id;
  DELETE FROM public.paylio_order_write_permits WHERE transaction_id=txid_current() AND backend_pid=pg_backend_pid() AND order_id=a.order_id;
  RETURN jsonb_build_object('ok',true,'transitioned',true,'orderId',a.order_id,'paymentId',a.payment_id,'status','paid','quote',a.quote,'paidAt',p_paid_at);
END $$;
-- The paid transition is already durable. Retry these database-only effects
-- atomically from the frozen quote, independently of uncertain email delivery.
CREATE FUNCTION public.apply_paylio_order_effects(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE a public.paylio_payment_attempts%ROWTYPE; o public.orders%ROWTYPE;
  v_code text; v_promo text; v_commission numeric; v_count bigint; v_error text;
BEGIN
  IF current_setting('role',true) IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED'; END IF;
  SELECT * INTO a FROM public.paylio_payment_attempts WHERE id=p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAYLIO_BINDING_NOT_FOUND'; END IF;
  SELECT * INTO o FROM public.orders WHERE id=a.order_id FOR UPDATE;
  SELECT * INTO a FROM public.paylio_payment_attempts WHERE id=p_id FOR UPDATE;
  IF a.state IS DISTINCT FROM 'paid' OR o.status IS NULL OR o.status NOT IN ('paid','done','processing','shipped','delivered')
    OR o.payment_id IS DISTINCT FROM a.payment_id OR o.user_id IS DISTINCT FROM a.customer_id
    OR lower(btrim(o.email)) IS DISTINCT FROM a.email OR o.total*100 IS DISTINCT FROM a.amount_cents::numeric
    THEN RAISE EXCEPTION 'PAYLIO_EFFECTS_NOT_ELIGIBLE'; END IF;
  IF a.effects_applied_at IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'applied',false,'orderId',a.order_id); END IF;
  BEGIN
    v_code:=upper(btrim(coalesce(a.quote->>'affiliateAttributionCode','')));
    IF v_code<>'' THEN
      -- Serialize first attribution for this email across PayLio orders. A
      -- conflicting mapping is reconciled explicitly, never silently replaced.
      PERFORM pg_advisory_xact_lock(hashtextextended('paylio-affiliate:'||a.email,0));
      INSERT INTO public.affiliate_customers(email,affiliate_code) VALUES(a.email,v_code) ON CONFLICT DO NOTHING;
      SELECT count(*) INTO v_count FROM public.affiliate_customers WHERE lower(btrim(email))=a.email;
      IF v_count<>1 OR NOT EXISTS(SELECT 1 FROM public.affiliate_customers WHERE lower(btrim(email))=a.email AND upper(btrim(affiliate_code))=v_code)
        THEN RAISE EXCEPTION 'PAYLIO_ATTRIBUTION_NOT_ACKNOWLEDGED'; END IF;
      v_commission:=(a.quote->>'affiliateCommission')::numeric;
      IF v_commission IS NULL OR v_commission<0 OR v_commission IS DISTINCT FROM round((a.quote->>'subtotal')::numeric*0.1,2)
        THEN RAISE EXCEPTION 'PAYLIO_COMMISSION_INVALID'; END IF;
      IF NOT EXISTS(SELECT 1 FROM public.affiliate_orders WHERE order_id=a.order_id) THEN
        INSERT INTO public.affiliate_orders(order_id,affiliate_code,commission_amount,shipping_type,created_at)
          VALUES(a.order_id,v_code,v_commission,a.quote->>'shippingType',a.paid_at);
      END IF;
      SELECT count(*) INTO v_count FROM public.affiliate_orders WHERE order_id=a.order_id;
      IF v_count<>1 OR NOT EXISTS(SELECT 1 FROM public.affiliate_orders WHERE order_id=a.order_id AND affiliate_code=v_code
        AND commission_amount=v_commission AND shipping_type=a.quote->>'shippingType') THEN RAISE EXCEPTION 'PAYLIO_COMMISSION_NOT_ACKNOWLEDGED'; END IF;
    END IF;
    IF coalesce((a.quote->>'promoUsageRequired')::boolean,false) THEN
      v_promo:=a.quote->>'promoCode';
      IF v_promo IS NULL OR v_promo='' OR (a.quote->>'promoDiscount')::numeric>0 IS NOT TRUE THEN RAISE EXCEPTION 'PAYLIO_PROMO_INVALID'; END IF;
      UPDATE public.user_promos SET used=true WHERE lower(btrim(email))=a.email AND code=v_promo AND used IS DISTINCT FROM true;
      SELECT count(*) INTO v_count FROM public.user_promos WHERE lower(btrim(email))=a.email AND code=v_promo;
      IF v_count<>1 OR NOT EXISTS(SELECT 1 FROM public.user_promos WHERE lower(btrim(email))=a.email AND code=v_promo AND used=true)
        THEN RAISE EXCEPTION 'PAYLIO_PROMO_NOT_ACKNOWLEDGED'; END IF;
    END IF;
    UPDATE public.paylio_payment_attempts SET effects_applied_at=now(),effects_error=NULL WHERE id=p_id;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error=RETURNED_SQLSTATE;
    UPDATE public.paylio_payment_attempts SET effects_error=v_error WHERE id=p_id;
    RETURN jsonb_build_object('ok',false,'applied',false,'orderId',a.order_id);
  END;
  RETURN jsonb_build_object('ok',true,'applied',true,'orderId',a.order_id);
END $$;
REVOKE ALL ON FUNCTION public.reserve_paylio_checkout(uuid,text,uuid,text,text,text,text,bigint,jsonb),public.bind_paylio_checkout(uuid,text,text,text,bigint),public.finalize_paylio_checkout(uuid,text,bigint,text,text,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.reserve_paylio_checkout(uuid,text,uuid,text,text,text,text,bigint,jsonb),public.bind_paylio_checkout(uuid,text,text,text,bigint),public.finalize_paylio_checkout(uuid,text,bigint,text,text,timestamptz) TO service_role;
REVOKE ALL ON FUNCTION public.apply_paylio_order_effects(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.apply_paylio_order_effects(uuid) TO service_role;
COMMIT;
