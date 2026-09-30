BEGIN;

DO $$
BEGIN
  IF to_regclass('public.analytics_events') IS NULL THEN
    RAISE EXCEPTION 'public.analytics_events must exist before applying this permissions migration';
  END IF;
END
$$;

-- Analytics is written and read only by the server-side API. Do not grant the
-- browser anon/authenticated roles direct access to visitor event records.
REVOKE ALL ON TABLE public.analytics_events FROM anon, authenticated, PUBLIC;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT ON TABLE public.analytics_events TO service_role;

DO $$
DECLARE
  analytics_sequence text;
BEGIN
  analytics_sequence := pg_get_serial_sequence('public.analytics_events', 'id');
  IF analytics_sequence IS NOT NULL THEN
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO service_role', analytics_sequence);
  END IF;
END
$$;

COMMIT;