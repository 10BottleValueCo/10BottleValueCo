-- Add editable scheduling and a private change history to the existing protected
-- promo records. No rates, audience, usage flags or historical orders are changed.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $$ BEGIN
  IF to_regprocedure('public.guard_user_promo_customer_update()') IS NULL
    OR to_regprocedure('public.guard_merit_reserved_promo()') IS NULL THEN
    RAISE EXCEPTION 'Existing promo access and reservation guards are required';
  END IF;
END $$;
ALTER TABLE public.user_promos
  ADD COLUMN active boolean NOT NULL DEFAULT true,
  ADD COLUMN title text NOT NULL DEFAULT '',
  ADD COLUMN starts_at timestamptz,
  ADD COLUMN ends_at timestamptz,
  ADD COLUMN minimum_subtotal_cents integer NOT NULL DEFAULT 0 CHECK(minimum_subtotal_cents>=0),
  ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD CONSTRAINT promo_schedule_order CHECK(starts_at IS NULL OR ends_at IS NULL OR ends_at>starts_at);
CREATE TABLE public.discount_change_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  promo_id uuid NOT NULL,
  actor_id uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  before_rule jsonb,
  after_rule jsonb NOT NULL
);
ALTER TABLE public.discount_change_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.discount_change_log FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.discount_change_log TO service_role;
CREATE FUNCTION public.record_discount_rule_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE old_rule jsonb; new_rule jsonb;
BEGIN
  IF TG_OP='UPDATE' THEN old_rule:=to_jsonb(OLD)-ARRAY['used','updated_at','revision']; END IF;
  new_rule:=to_jsonb(NEW)-ARRAY['used','updated_at','revision'];
  IF TG_OP='UPDATE' AND old_rule IS NOT DISTINCT FROM new_rule THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' THEN NEW.revision:=OLD.revision+1; NEW.updated_at:=now(); END IF;
  INSERT INTO public.discount_change_log(promo_id,actor_id,before_rule,after_rule)
    VALUES(NEW.id,coalesce(nullif(current_setting('app.discount_actor',true),'')::uuid,auth.uid()),
      CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,to_jsonb(NEW));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_discount_rule_change() FROM PUBLIC,anon,authenticated,service_role;
-- Customers may still only mark their own immutable promo used. That action
-- does not change revision/updated_at or interfere with the existing guard.
CREATE TRIGGER discount_rule_change_log BEFORE INSERT OR UPDATE ON public.user_promos
FOR EACH ROW EXECUTE FUNCTION public.record_discount_rule_change();

CREATE FUNCTION public.save_operations_discount(p_id uuid,p_expected_revision integer,p_actor_id uuid,p_code text,p_email text,
  p_rate numeric,p_active boolean,p_title text,p_starts_at timestamptz,p_ends_at timestamptz,p_minimum_subtotal_cents integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE r public.user_promos%ROWTYPE; saved public.user_promos%ROWTYPE;
BEGIN
  IF current_setting('role',true) IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED'; END IF;
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_actor_id AND email_confirmed_at IS NOT NULL)
    OR p_code IS NULL OR p_code !~ '^[A-Z0-9_-]{1,80}$' OR p_code IN ('REVIEW10','OWNERFREESHIP')
    OR p_email IS NULL OR (p_email<>'__PUBLIC__' AND (p_email<>lower(btrim(p_email)) OR p_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' OR length(p_email)>254))
    OR p_rate IS NULL OR p_rate<=0 OR p_rate>1 OR p_active IS NULL OR p_title IS NULL OR length(p_title)>120
    OR p_minimum_subtotal_cents IS NULL OR p_minimum_subtotal_cents<0 OR p_minimum_subtotal_cents>10000000
    OR (p_starts_at IS NOT NULL AND p_ends_at IS NOT NULL AND p_ends_at<=p_starts_at) THEN RAISE EXCEPTION 'DISCOUNT_INVALID'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('discount:'||p_email||':'||p_code,0));
  PERFORM set_config('app.discount_actor',p_actor_id::text,true);
  IF p_id IS NULL THEN
    IF p_expected_revision IS NOT NULL THEN RAISE EXCEPTION 'DISCOUNT_REVISION_CONFLICT'; END IF;
    IF EXISTS(SELECT 1 FROM public.user_promos WHERE upper(btrim(code))=p_code AND lower(btrim(email))=lower(p_email) AND used IS FALSE) THEN
      RAISE EXCEPTION 'DISCOUNT_ALREADY_EXISTS';
    END IF;
    INSERT INTO public.user_promos(email,code,rate,used,active,title,starts_at,ends_at,minimum_subtotal_cents)
      VALUES(p_email,p_code,p_rate,false,p_active,p_title,p_starts_at,p_ends_at,p_minimum_subtotal_cents) RETURNING * INTO saved;
  ELSE
    SELECT * INTO r FROM public.user_promos WHERE id=p_id FOR UPDATE;
    IF NOT FOUND OR r.revision IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'DISCOUNT_REVISION_CONFLICT'; END IF;
    IF r.code IS DISTINCT FROM p_code OR r.email IS DISTINCT FROM p_email OR r.used IS DISTINCT FROM false THEN RAISE EXCEPTION 'DISCOUNT_IDENTITY_OR_USAGE_LOCKED'; END IF;
    UPDATE public.user_promos SET rate=p_rate,active=p_active,title=p_title,starts_at=p_starts_at,ends_at=p_ends_at,minimum_subtotal_cents=p_minimum_subtotal_cents
      WHERE id=p_id RETURNING * INTO saved;
  END IF;
  IF saved.id IS NULL OR saved.code IS DISTINCT FROM p_code OR saved.email IS DISTINCT FROM p_email
    OR saved.rate IS DISTINCT FROM p_rate OR saved.active IS DISTINCT FROM p_active OR saved.title IS DISTINCT FROM p_title
    OR saved.starts_at IS DISTINCT FROM p_starts_at OR saved.ends_at IS DISTINCT FROM p_ends_at
    OR saved.minimum_subtotal_cents IS DISTINCT FROM p_minimum_subtotal_cents THEN RAISE EXCEPTION 'DISCOUNT_SAVE_UNACKNOWLEDGED'; END IF;
  RETURN to_jsonb(saved);
END $$;
REVOKE ALL ON FUNCTION public.save_operations_discount(uuid,integer,uuid,text,text,numeric,boolean,text,timestamptz,timestamptz,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_operations_discount(uuid,integer,uuid,text,text,numeric,boolean,text,timestamptz,timestamptz,integer) TO service_role;
COMMENT ON TABLE public.discount_change_log IS 'Private audit history. Discount rate is a fraction; minimum subtotal is USD cents. Existing rows remain the recorded operational baseline, not independently certified historical issuance.';
COMMIT;
NOTIFY pgrst,'reload schema';
