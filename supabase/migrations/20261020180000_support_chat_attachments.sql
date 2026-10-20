-- Run in the Supabase SQL Editor for the project used by the storefront.
-- Creates the private support-attachment metadata table and bucket if missing.
-- Existing bucket settings and stored objects are left unchanged.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS public.support_chat_attachments (
  object_path text PRIMARY KEY,
  guest_capability_hash text
    CHECK (guest_capability_hash IS NULL OR guest_capability_hash ~ '^[0-9a-f]{64}$'),
  content_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size BETWEEN 1 AND 104857600),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_chat_attachments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_chat_attachments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.support_chat_attachments TO service_role;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) VALUES (
  'chat-images',
  'chat-images',
  false,
  104857600,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/rtf',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.text',
    'image/avif',
    'image/bmp',
    'image/gif',
    'image/heic',
    'image/heif',
    'image/jpeg',
    'image/png',
    'image/svg+xml',
    'image/tiff',
    'image/webp',
    'text/csv',
    'text/plain',
    'video/3gpp',
    'video/mp4',
    'video/mpeg',
    'video/ogg',
    'video/quicktime',
    'video/webm',
    'video/x-m4v',
    'video/x-matroska',
    'video/x-msvideo'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
COMMIT;
