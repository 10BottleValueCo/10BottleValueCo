-- Run in Supabase SQL Editor. No existing accounts, orders or references change.
-- Email proves mailbox possession; a server-held native TOTP factor then issues
-- a genuine Supabase aal2 session. Secrets stay in Supabase Vault, never the UI.
BEGIN;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

CREATE TABLE IF NOT EXISTS public.email_login_factors (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  factor_id uuid NOT NULL UNIQUE,
  secret_id uuid NOT NULL REFERENCES vault.secrets(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.email_login_challenges (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('enable','disable','login')),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  delivered boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  checking boolean NOT NULL DEFAULT false,
  consumed boolean NOT NULL DEFAULT false,
  PRIMARY KEY(user_id, session_id, purpose)
);
CREATE TABLE IF NOT EXISTS public.email_login_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL DEFAULT now(),
  last_send timestamptz,
  sends integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 0
);
ALTER TABLE public.email_login_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_login_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_login_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_login_factors, public.email_login_challenges, public.email_login_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_login_factors, public.email_login_challenges, public.email_login_limits TO service_role;

CREATE OR REPLACE FUNCTION public.email_login_state(p_user uuid, p_session uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
 SELECT jsonb_build_object(
   'factor', (SELECT jsonb_build_object('id', factor_id) FROM public.email_login_factors WHERE user_id=p_user),
   'challenge', (SELECT jsonb_build_object('id',id,'purpose',purpose,'expiresAt',sent_at+interval '10 minutes','resendAt',sent_at+interval '60 seconds')
      FROM public.email_login_challenges WHERE user_id=p_user AND session_id=p_session
       AND delivered AND NOT consumed AND sent_at>now()-interval '10 minutes'
      ORDER BY sent_at DESC LIMIT 1)
 );
$$;

CREATE OR REPLACE FUNCTION public.email_login_store_factor(p_user uuid, p_factor uuid, p_secret text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE secret_uuid uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('email-login:'||p_user::text,0));
 IF EXISTS(SELECT 1 FROM public.email_login_factors WHERE user_id=p_user) THEN RAISE EXCEPTION 'Factor already configured'; END IF;
 IF p_secret !~ '^[A-Z2-7]{16,128}$' THEN RAISE EXCEPTION 'Invalid factor'; END IF;
 SELECT vault.create_secret(p_secret) INTO secret_uuid;
 INSERT INTO public.email_login_factors(user_id,factor_id,secret_id) VALUES(p_user,p_factor,secret_uuid);
END; $$;

CREATE OR REPLACE FUNCTION public.email_login_factor_secret(p_user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
 SELECT v.decrypted_secret FROM vault.decrypted_secrets v
 JOIN public.email_login_factors f ON f.secret_id=v.id WHERE f.user_id=p_user;
$$;

CREATE OR REPLACE FUNCTION public.email_login_remove_factor(p_user uuid, p_factor uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE secret_uuid uuid;
BEGIN
 DELETE FROM public.email_login_factors WHERE user_id=p_user AND factor_id=p_factor RETURNING secret_id INTO secret_uuid;
 IF secret_uuid IS NOT NULL THEN DELETE FROM vault.secrets WHERE id=secret_uuid; END IF;
 DELETE FROM public.email_login_challenges WHERE user_id=p_user;
END; $$;

-- All challenge transitions are atomic and service-only. A new session/resend
-- cannot reset the user's shared guessing/send limits.
CREATE OR REPLACE FUNCTION public.email_login_challenge(
 p_user uuid, p_session uuid, p_purpose text, p_step text, p_email text DEFAULT NULL, p_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE lim public.email_login_limits%ROWTYPE; ch public.email_login_challenges%ROWTYPE;
BEGIN
 IF p_purpose NOT IN ('enable','disable','login') THEN RAISE EXCEPTION 'Invalid purpose'; END IF;
 INSERT INTO public.email_login_limits(user_id) VALUES(p_user) ON CONFLICT DO NOTHING;
 SELECT * INTO lim FROM public.email_login_limits WHERE user_id=p_user FOR UPDATE;
 IF lim.window_start<now()-interval '15 minutes' THEN
   UPDATE public.email_login_limits SET window_start=now(),sends=0,attempts=0 WHERE user_id=p_user;
   lim.sends:=0; lim.attempts:=0;
 END IF;
 IF p_step='send' THEN
   IF lim.last_send>now()-interval '60 seconds' OR lim.sends>=5 OR lim.attempts>=10 THEN
     RETURN jsonb_build_object('error','rate_limited');
   END IF;
   UPDATE public.email_login_limits SET last_send=now(),sends=sends+1 WHERE user_id=p_user;
   INSERT INTO public.email_login_challenges(user_id,session_id,purpose,email)
     VALUES(p_user,p_session,p_purpose,p_email)
     ON CONFLICT(user_id,session_id,purpose) DO UPDATE
       SET id=gen_random_uuid(),email=EXCLUDED.email,sent_at=now(),delivered=false,attempts=0,checking=false,consumed=false
     RETURNING * INTO ch;
 ELSE
   SELECT * INTO ch FROM public.email_login_challenges
     WHERE user_id=p_user AND session_id=p_session AND purpose=p_purpose AND id=p_id FOR UPDATE;
   IF NOT FOUND OR ch.consumed OR ch.sent_at<now()-interval '10 minutes' OR ch.email IS DISTINCT FROM p_email THEN
     RETURN jsonb_build_object('error','expired');
   END IF;
   IF p_step='delivered' THEN
     UPDATE public.email_login_challenges SET delivered=true WHERE id=ch.id;
   ELSIF p_step='claim' THEN
     IF NOT ch.delivered OR ch.checking OR ch.attempts>=5 OR lim.attempts>=10 THEN RETURN jsonb_build_object('error','locked'); END IF;
     UPDATE public.email_login_limits SET attempts=attempts+1 WHERE user_id=p_user;
     UPDATE public.email_login_challenges SET attempts=attempts+1,checking=true WHERE id=ch.id;
   ELSIF p_step='failed' THEN
     UPDATE public.email_login_challenges SET checking=false WHERE id=ch.id;
   ELSIF p_step='consume' THEN
     IF NOT ch.checking THEN RETURN jsonb_build_object('error','locked'); END IF;
     UPDATE public.email_login_challenges SET checking=false,consumed=true WHERE id=ch.id;
   ELSE RAISE EXCEPTION 'Invalid step';
   END IF;
 END IF;
 RETURN jsonb_build_object('id',ch.id,'purpose',ch.purpose,'expiresAt',ch.sent_at+interval '10 minutes','resendAt',ch.sent_at+interval '60 seconds');
END; $$;

-- Restrictive policies supplement, never replace, existing ownership policies.
-- Only accounts with the new verified email factor require aal2.
CREATE OR REPLACE FUNCTION public.email_login_access_allowed()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
 SELECT (COALESCE(auth.jwt()->>'aal','aal1')='aal2' AND EXISTS(
  SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(auth.jwt()->'amr')='array'
   THEN auth.jwt()->'amr' ELSE '[]'::jsonb END) AS proof
  WHERE proof->>'method' IN('password','recovery')
 )) OR NOT EXISTS(
  SELECT 1 FROM auth.mfa_factors WHERE user_id=auth.uid()
   AND friendly_name='10BottleValueCo email login' AND status='verified'
 );
$$;
REVOKE ALL ON FUNCTION public.email_login_access_allowed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.email_login_access_allowed() TO anon,authenticated,service_role;
-- Gate Data API requests BEFORE security-definer RPCs execute as well.
-- Preserve an existing pre-request hook instead of silently replacing it.
DO $hook$
DECLARE prior text; previous_call text := ''; qualified_previous text;
BEGIN
 SELECT substring(setting FROM length('pgrst.db_pre_request=')+1) INTO prior
 FROM pg_db_role_setting s JOIN pg_roles r ON r.oid=s.setrole,
 LATERAL unnest(s.setconfig) setting
 WHERE r.rolname='authenticator' AND setting LIKE 'pgrst.db_pre_request=%'
  AND s.setdatabase IN (0,(SELECT oid FROM pg_database WHERE datname=current_database()))
 ORDER BY s.setdatabase DESC LIMIT 1;
 IF prior='public.email_login_pre_request' AND to_regprocedure('public.email_login_pre_request()') IS NOT NULL THEN RETURN; END IF;
 IF prior IS NOT NULL AND prior<>'' AND prior<>'public.email_login_pre_request' THEN
  IF to_regprocedure(prior||'()') IS NULL THEN RAISE EXCEPTION 'Existing Data API pre-request hook could not be resolved; no changes were applied'; END IF;
  SELECT format('%I.%I',n.nspname,p.proname) INTO qualified_previous
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.oid=to_regprocedure(prior||'()');
  previous_call := format('PERFORM %s();',qualified_previous);
 END IF;
 EXECUTE format($definition$
 CREATE OR REPLACE FUNCTION public.email_login_pre_request() RETURNS void
 LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $body$
 BEGIN
  IF NOT public.email_login_access_allowed() THEN
   RAISE EXCEPTION 'Email login verification required' USING ERRCODE='42501';
  END IF;
  %s
 END; $body$;
 $definition$,previous_call);
 ALTER ROLE authenticator SET pgrst.db_pre_request='public.email_login_pre_request';
END $hook$;
REVOKE ALL ON FUNCTION public.email_login_pre_request() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.email_login_pre_request() TO anon,authenticated,service_role;
DO $$
DECLARE tbl record; fn record;
BEGIN
 FOR fn IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN ('email_login_state','email_login_store_factor','email_login_factor_secret','email_login_remove_factor','email_login_challenge')
 LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',fn.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',fn.signature);
 END LOOP;
 FOR tbl IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relrowsecurity AND c.relkind IN ('r','p')
 LOOP
  EXECUTE format('DROP POLICY IF EXISTS email_login_mfa_guard ON public.%I',tbl.relname);
  EXECUTE format('CREATE POLICY email_login_mfa_guard ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING(public.email_login_access_allowed()) WITH CHECK(public.email_login_access_allowed())',tbl.relname);
 END LOOP;
 IF to_regclass('storage.objects') IS NOT NULL THEN
  DROP POLICY IF EXISTS email_login_mfa_guard ON storage.objects;
  CREATE POLICY email_login_mfa_guard ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
   USING(public.email_login_access_allowed()) WITH CHECK(public.email_login_access_allowed());
 END IF;
END $$;
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
COMMIT;
