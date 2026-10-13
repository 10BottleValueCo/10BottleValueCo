-- Run once in the existing Supabase SQL Editor before publishing the
-- eight-character invoice generators. No orders/receipts are renamed.
BEGIN;

CREATE OR REPLACE FUNCTION public.short_invoice_number(p_key uuid)
RETURNS text LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE
SET search_path = pg_catalog AS $$
DECLARE
  hex_key text := replace(p_key::text, '-', '');
  alphabet text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  number numeric := 0;
  suffix text := '';
  i integer;
BEGIN
  FOR i IN 1..32 LOOP
    number := number * 16 + strpos('0123456789abcdef', substr(hex_key, i, 1)) - 1;
  END LOOP;
  number := mod(number, 2821109907456::numeric); -- 36^8
  FOR i IN 1..8 LOOP
    suffix := substr(alphabet, mod(number, 36)::integer + 1, 1) || suffix;
    number := trunc(number / 36);
  END LOOP;
  RETURN 'INV-' || suffix;
END;
$$;

REVOKE ALL ON FUNCTION public.short_invoice_number(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.short_invoice_number(uuid) TO service_role;

-- Preserve the key/order binding: accept its deterministic short number OR
-- the original UUID number for existing attempts. Other constraints, unique
-- indexes, payment guards, ACLs and snapshots stay untouched.
DO $$
DECLARE
  constraint_row record;
  found_count integer := 0;
BEGIN
  FOR constraint_row IN
    SELECT c.conname FROM pg_constraint c
    WHERE c.conrelid = 'public.merit_payment_attempts'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%order_id%'
      AND pg_get_constraintdef(c.oid) LIKE '%checkout_key%'
  LOOP
    found_count := found_count + 1;
    EXECUTE format('ALTER TABLE public.merit_payment_attempts DROP CONSTRAINT %I', constraint_row.conname);
    EXECUTE format(
      'ALTER TABLE public.merit_payment_attempts ADD CONSTRAINT %I CHECK (order_id = ''INV-'' || upper(replace(checkout_key::text, ''-'', '''')) OR order_id = public.short_invoice_number(checkout_key))',
      constraint_row.conname
    );
  END LOOP;
  IF found_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one Merit checkout key/order binding; changes rolled back';
  END IF;
END $$;

-- Patch only the generator/format checks inside existing function definitions.
-- CREATE OR REPLACE preserves their owners, grants and transaction behavior.
DO $$
DECLARE
  function_row record;
  original_definition text;
  next_definition text;
  reserve_count integer := 0;
  credit_reserve_count integer := 0;
  credit_count integer := 0;
BEGIN
  FOR function_row IN
    SELECT p.oid, p.proname FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('reserve_merit_checkout', 'reserve_merit_checkout_with_credit', 'checkout_store_credit')
  LOOP
    original_definition := pg_get_functiondef(function_row.oid);
    IF function_row.proname IN ('reserve_merit_checkout', 'reserve_merit_checkout_with_credit') THEN
      next_definition := replace(original_definition,
        '''INV-'' || upper(replace(p_checkout_key::text, ''-'', ''''))',
        'public.short_invoice_number(p_checkout_key)');
      IF next_definition = original_definition
        AND strpos(original_definition, 'public.short_invoice_number(p_checkout_key)') = 0 THEN
        RAISE EXCEPTION 'Unknown invoice generator in %; changes rolled back', function_row.proname;
      END IF;
      IF function_row.proname = 'reserve_merit_checkout' THEN
        reserve_count := reserve_count + 1;
      ELSE
        credit_reserve_count := credit_reserve_count + 1;
      END IF;
    ELSE
      next_definition := replace(original_definition,
        '^INV-[A-Fa-f0-9]{32}$', '^INV-([A-Za-z0-9]{8}|[A-Fa-f0-9]{32})$');
      IF next_definition = original_definition
        AND strpos(original_definition, '^INV-([A-Za-z0-9]{8}|[A-Fa-f0-9]{32})$') = 0 THEN
        RAISE EXCEPTION 'Unknown Store Credit invoice check; changes rolled back';
      END IF;
      credit_count := credit_count + 1;
    END IF;
    EXECUTE next_definition;
  END LOOP;
  IF reserve_count <> 1 OR credit_reserve_count <> 1 OR credit_count < 1 THEN
    RAISE EXCEPTION 'Required checkout functions are missing; changes rolled back';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT 'Eight-character invoices ready; old payment references preserved' AS result;
