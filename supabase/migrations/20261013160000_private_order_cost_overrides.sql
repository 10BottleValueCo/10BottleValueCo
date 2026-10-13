-- Run in Supabase project danpkqqzcptamojrnrmk.
-- Accounting corrections only: no orders, payment snapshots or guards are changed.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS public.order_cost_overrides (
  order_id text PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  line_cost_overrides jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(line_cost_overrides) = 'object'),
  supplier_shipping_override numeric(12, 2)
    CHECK (supplier_shipping_override BETWEEN 0 AND 1000000),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_cost_overrides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_cost_overrides FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.order_cost_overrides TO service_role;

CREATE OR REPLACE FUNCTION public.save_order_cost_override(
  p_order_id text,
  p_kind text,
  p_line_index integer,
  p_amount numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  v_items jsonb;
  v_saved public.order_cost_overrides%ROWTYPE;
BEGIN
  IF p_order_id IS NULL OR p_order_id !~ '^[a-zA-Z0-9_-]{1,120}$'
     OR p_kind IS NULL OR p_kind NOT IN ('line', 'shipping')
     OR p_amount IS NULL OR p_amount < 0 OR p_amount > 1000000
     OR p_amount <> round(p_amount, 2) THEN
    RAISE EXCEPTION 'INVALID_ORDER_COST_CHANGE' USING ERRCODE = '22023';
  END IF;

  SELECT CASE
    WHEN jsonb_typeof(o.metadata -> 'items') = 'array' THEN
      CASE WHEN jsonb_array_length(o.metadata -> 'items') > 0
        THEN o.metadata -> 'items' ELSE to_jsonb(o.items) END
    ELSE to_jsonb(o.items)
  END INTO v_items
  FROM public.orders AS o WHERE o.id = p_order_id FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_COST_ORDER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF p_kind = 'line' THEN
    IF p_line_index IS NULL OR p_line_index < 0 OR p_line_index > 9999
       OR jsonb_typeof(v_items) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'INVALID_ORDER_COST_LINE' USING ERRCODE = '22023';
    END IF;
    IF p_line_index >= jsonb_array_length(v_items) THEN
      RAISE EXCEPTION 'ORDER_COST_LINE_NOT_FOUND' USING ERRCODE = '22023';
    END IF;
  END IF;

  INSERT INTO public.order_cost_overrides AS existing (
    order_id, line_cost_overrides, supplier_shipping_override
  ) VALUES (
    p_order_id,
    CASE WHEN p_kind = 'line' THEN jsonb_build_object(p_line_index::text, p_amount)
      ELSE '{}'::jsonb END,
    CASE WHEN p_kind = 'shipping' THEN p_amount ELSE NULL END
  )
  ON CONFLICT (order_id) DO UPDATE SET
    line_cost_overrides = CASE WHEN p_kind = 'line'
      THEN existing.line_cost_overrides || EXCLUDED.line_cost_overrides
      ELSE existing.line_cost_overrides END,
    supplier_shipping_override = CASE WHEN p_kind = 'shipping'
      THEN EXCLUDED.supplier_shipping_override ELSE existing.supplier_shipping_override END,
    updated_at = now()
  RETURNING * INTO v_saved;

  RETURN to_jsonb(v_saved);
END;
$$;

REVOKE ALL ON FUNCTION public.save_order_cost_override(text, text, integer, numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_order_cost_override(text, text, integer, numeric)
  TO service_role;

COMMENT ON TABLE public.order_cost_overrides IS
  'Private accounting corrections. Never payment evidence or a customer-facing price.';
NOTIFY pgrst, 'reload schema';
COMMIT;

SELECT 'Order cost override storage is ready' AS result;
