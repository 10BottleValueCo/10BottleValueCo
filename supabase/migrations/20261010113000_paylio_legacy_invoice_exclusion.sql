-- Preserve the current function body/owner/grants and add one atomic exclusion.
-- The order row is already locked FOR UPDATE before this check. A legacy invoice
-- that wins that lock must prevent a later Paylio claim from erasing its marker.
BEGIN;
DO $migration$
DECLARE
  definition text;
  anchor text := $anchor$OR lower(coalesce(o.payment_provider,''))='merit'$anchor$;
  guard text := $guard$OR o.metadata->>'legacyInvoiceAttempt' IS NOT NULL
    OR o.metadata->>'catalystpay_invoice_id' IS NOT NULL$guard$;
BEGIN
  definition := pg_get_functiondef('public.reserve_paylio_checkout(uuid,text,uuid,text,text,text,text,bigint,jsonb)'::regprocedure);
  IF position(guard IN definition) > 0 THEN RETURN; END IF;
  IF (length(definition)-length(replace(definition,anchor,'')))/length(anchor) <> 1 THEN
    RAISE EXCEPTION 'PAYLIO_RESERVATION_GUARD_ANCHOR_CHANGED';
  END IF;
  EXECUTE replace(definition,anchor,anchor || E'\n    ' || guard);
END
$migration$;
COMMIT;
