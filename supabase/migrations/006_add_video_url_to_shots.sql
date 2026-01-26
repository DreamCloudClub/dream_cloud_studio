-- Add video_url column to shots table for storing generated videos
-- The media_url stores the source image, video_url stores the animated version

ALTER TABLE shots ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT;
