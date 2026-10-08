-- Draft for the Store Credit server path. Do not apply until tested against an
-- explicitly identified staging Supabase project. It does not alter or delete rows.
-- user_credits.id is intentionally not referenced; the inspected schema has no such column.

BEGIN;

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Remove legacy table-level grants (including non-RLS privileges such as
-- TRUNCATE); row-level policies below decide which authenticated rows are usable.
REVOKE ALL ON TABLE public.user_credits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.user_credits TO authenticated;
GRANT ALL ON TABLE public.user_credits TO service_role;

DO $$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_credits'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.user_credits',
      policy_row.policyname
    );
  END LOOP;
END
$$;

CREATE POLICY user_credits_admin_all
ON public.user_credits
FOR ALL
TO authenticated
USING (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'support@10bottlevalue.co'
)
WITH CHECK (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'support@10bottlevalue.co'
);

CREATE POLICY user_credits_customer_read_own
ON public.user_credits
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'email' IS NOT NULL
  AND lower(coalesce(email, '')) = lower(auth.jwt() ->> 'email')
);

CREATE OR REPLACE FUNCTION public.checkout_store_credit(
  p_customer_email text,
  p_order jsonb,
  p_store_credit_used numeric,
  p_user_promo_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_customer_email, '')));
  v_order_id text := coalesce(p_order ->> 'id', '');
  v_fingerprint text := coalesce(p_order ->> 'checkoutFingerprint', '');
  v_credit record;
  v_credit_count integer := 0;
  v_balance numeric;
  v_new_balance numeric;
  v_existing record;
  v_promo_count integer;
  v_order jsonb;
BEGIN
  IF v_email = ''
     OR v_order_id !~ '^INV-[A-Fa-f0-9]{32}$'
     OR v_fingerprint !~ '^[A-Fa-f0-9]{64}$'
     OR p_store_credit_used IS NULL
     OR p_store_credit_used <= 0
     OR p_order ->> 'email' IS DISTINCT FROM v_email
     OR p_order ->> 'status' IS DISTINCT FROM 'paid'
     OR p_order ->> 'paymentProvider' IS DISTINCT FROM 'StoreCredit'
     OR round(coalesce((p_order ->> 'storeCreditUsed')::numeric, -1), 2)
        IS DISTINCT FROM round(p_store_credit_used, 2)
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_ORDER');
  END IF;

  -- Lock every matching row; fail closed if duplicates exist rather than
  -- guessing which balance is authoritative.
  FOR v_credit IN
    SELECT amount
    FROM public.user_credits
    WHERE lower(trim(coalesce(email, ''))) = v_email
    ORDER BY updated_at DESC NULLS LAST
    FOR UPDATE
  LOOP
    v_credit_count := v_credit_count + 1;
    IF v_credit_count = 1 THEN
      v_balance := coalesce(v_credit.amount, 0);
    END IF;
  END LOOP;

  IF v_credit_count <> 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'CREDIT_ROW_AMBIGUOUS');
  END IF;

  -- A retry with the same order id and payload returns the existing result
  -- without debiting credit again.
  SELECT id, email, status, metadata
  INTO v_existing
  FROM public.orders
  WHERE id::text = v_order_id
  FOR UPDATE;

  IF FOUND THEN
    IF lower(coalesce(v_existing.email, '')) = v_email
       AND lower(coalesce(v_existing.status::text, '')) = 'paid'
       AND v_existing.metadata ->> 'paymentProvider' = 'StoreCredit'
       AND v_existing.metadata ->> 'checkoutFingerprint' = v_fingerprint
    THEN
      RETURN jsonb_build_object(
        'ok', true,
        'orderId', v_order_id,
        'balance', v_balance,
        'order', v_existing.metadata,
        'replayed', true
      );
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'ORDER_ID_CONFLICT');
  END IF;

  IF v_balance < p_store_credit_used THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_CREDIT');
  END IF;

  IF p_user_promo_id IS NOT NULL THEN
    UPDATE public.user_promos
    SET used = true
    WHERE id::text = p_user_promo_id
      AND lower(trim(coalesce(email, ''))) = v_email
      AND used IS DISTINCT FROM true;
    GET DIAGNOSTICS v_promo_count = ROW_COUNT;
    IF v_promo_count <> 1 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'PROMO_ALREADY_USED');
    END IF;
  END IF;

  v_new_balance := round(v_balance - p_store_credit_used, 2);
  UPDATE public.user_credits
  SET amount = v_new_balance,
      updated_at = now()
  WHERE lower(trim(coalesce(email, ''))) = v_email;

  v_order := p_order || jsonb_build_object(
    'storeCreditBalanceAfter', v_new_balance
  );

  INSERT INTO public.orders (id, email, status, paid_at, total, metadata)
  VALUES (v_order_id, v_email, 'paid', now(), 0, v_order);

  RETURN jsonb_build_object(
    'ok', true,
    'orderId', v_order_id,
    'balance', v_new_balance,
    'order', v_order,
    'replayed', false
  );
END
$$;

REVOKE ALL
ON FUNCTION public.checkout_store_credit(text, jsonb, numeric, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.checkout_store_credit(text, jsonb, numeric, text)
TO service_role;

COMMIT;
