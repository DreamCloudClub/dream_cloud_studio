-- Add audio MIME types to generated-media bucket
-- This allows audio files to be uploaded alongside images and videos

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/aac',
  'audio/flac',
  'audio/webm'
]
WHERE id = 'generated-media';

-- Verify the change
SELECT id, name, allowed_mime_types FROM storage.buckets WHERE id = 'generated-media';
