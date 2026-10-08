-- Additive prerequisite for deploying api/order-checkout.js.
-- This is not a security cutover: it does not change grants or RLS policies.
-- Test against staging first. Do not apply to production without separate approval.

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checkout_access_hash text;

COMMIT;
