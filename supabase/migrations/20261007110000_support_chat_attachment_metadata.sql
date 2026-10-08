-- Prerequisite schema for the private support-attachment API.
-- This does not change the chat-images bucket's public setting or access policies.
-- Apply before deploying code that writes attachment metadata.

BEGIN;

CREATE TABLE IF NOT EXISTS public.support_chat_attachments (
  object_path text PRIMARY KEY
    CHECK (
      length(object_path) BETWEEN 1 AND 200
      AND position(chr(92) in object_path) = 0
      AND object_path !~ '(^/|(^|/)\.\.?(/|$))'
    ),
  guest_capability_hash text
    CHECK (
      guest_capability_hash IS NULL
      OR guest_capability_hash ~ '^[a-f0-9]{64}$'
    ),
  content_type text NOT NULL
    CHECK (length(content_type) BETWEEN 1 AND 120),
  byte_size bigint NOT NULL
    CHECK (byte_size BETWEEN 1 AND 104857600),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_chat_attachments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.support_chat_attachments
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.support_chat_attachments TO service_role;

COMMIT;
