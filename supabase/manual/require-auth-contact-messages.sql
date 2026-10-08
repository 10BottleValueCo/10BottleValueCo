-- Narrow emergency draft for the live anonymous-message insertion issue.
-- The current support message UI requires sign-in. This does not disable
-- capability-scoped guest attachment uploads, which use the separate server API.
-- It does not replace the comprehensive policy reset in
-- contact-messages-hardening.sql if any other permissive policies are present.

BEGIN;

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contact_messages_guest_insert
  ON public.contact_messages;
REVOKE ALL PRIVILEGES
  ON TABLE public.contact_messages
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.contact_messages TO authenticated;
GRANT ALL ON TABLE public.contact_messages TO service_role;

COMMIT;
