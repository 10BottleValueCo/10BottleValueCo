-- Final access cutover for support attachments.
-- Do not apply until the new upload and signed-read API is deployed and tested.
-- This makes chat-images private and blocks direct anon/authenticated access even
-- if older permissive storage.objects policies exist. Service-role API requests
-- and Supabase signed upload/read URLs continue to work. Guest uploads remain
-- capability-scoped through the server API; direct anonymous Storage uploads do not.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'chat-images'
  ) THEN
    RAISE EXCEPTION 'Required Storage bucket chat-images does not exist';
  END IF;
END
$$;

UPDATE storage.buckets
SET public = false,
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY[
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
      'video/3gpp',
      'video/mp4',
      'video/mpeg',
      'video/ogg',
      'video/quicktime',
      'video/webm',
      'video/x-m4v',
      'video/x-matroska',
      'video/x-msvideo',
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/rtf',
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.spreadsheet'
    ]::text[]
WHERE id = 'chat-images';

-- Remove the known public upload policy found on production. The restrictive
-- policy below is a second barrier against any other leftover direct-access rule.
DROP POLICY IF EXISTS "Allow public uploads 6odaj1_0"
  ON storage.objects;

DROP POLICY IF EXISTS support_chat_images_deny_direct_access
  ON storage.objects;

CREATE POLICY support_chat_images_deny_direct_access
ON storage.objects
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (bucket_id <> 'chat-images')
WITH CHECK (bucket_id <> 'chat-images');

COMMIT;
