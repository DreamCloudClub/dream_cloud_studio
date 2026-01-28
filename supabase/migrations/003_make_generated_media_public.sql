-- Make generated-media bucket public for permanent URLs
-- Run this in Supabase SQL Editor

UPDATE storage.buckets
SET public = true
WHERE id = 'generated-media';

-- Verify the change
SELECT id, name, public FROM storage.buckets WHERE id = 'generated-media';
