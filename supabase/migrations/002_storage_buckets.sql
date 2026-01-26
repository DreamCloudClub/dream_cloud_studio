-- Dream Cloud Studio Storage Buckets
-- Run this in your Supabase SQL Editor AFTER the initial schema

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('platform-logos', 'platform-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('project-assets', 'project-assets', false, 104857600, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime', 'audio/mpeg', 'audio/wav', 'audio/ogg']),
  ('mood-board-images', 'mood-board-images', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('generated-media', 'generated-media', false, 524288000, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']),
  ('exports', 'exports', false, 1073741824, ARRAY['video/mp4', 'video/webm', 'video/quicktime'])
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Avatars: public read, authenticated users can upload their own
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Platform logos: public read, owner can manage
CREATE POLICY "Anyone can view platform logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'platform-logos');

CREATE POLICY "Users can upload platform logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'platform-logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own platform logos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'platform-logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own platform logos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'platform-logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Project assets: private, owner only
CREATE POLICY "Users can view own project assets" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload project assets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own project assets" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'project-assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own project assets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Mood board images: private, owner only
CREATE POLICY "Users can view own mood board images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'mood-board-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload mood board images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'mood-board-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own mood board images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'mood-board-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own mood board images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'mood-board-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Generated media: private, owner only
CREATE POLICY "Users can view own generated media" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'generated-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload generated media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'generated-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own generated media" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'generated-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own generated media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'generated-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Exports: private, owner only
CREATE POLICY "Users can view own exports" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'exports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload exports" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'exports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own exports" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'exports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own exports" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'exports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
