-- Migration: Local Assets & Asset-Shot Linking
-- This migration restructures how assets are stored and linked to shots
-- Assets become first-class citizens with local file storage support

-- ============================================
-- UPDATE ASSETS TABLE
-- ============================================

-- Add storage type (local vs cloud)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS storage_type TEXT DEFAULT 'local'
  CHECK (storage_type IN ('local', 'cloud'));

-- Add local file path for local storage
ALTER TABLE assets ADD COLUMN IF NOT EXISTS local_path TEXT;

-- Add user description (what the user asked for)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS user_description TEXT;

-- Add AI-generated prompt (the actual prompt sent to the API, editable)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS ai_prompt TEXT;

-- Add generation model info
ALTER TABLE assets ADD COLUMN IF NOT EXISTS generation_model TEXT;

-- Add generation settings (model-specific settings)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS generation_settings JSONB DEFAULT '{}'::jsonb;

-- Make url nullable (local assets won't have URLs until uploaded/shared)
ALTER TABLE assets ALTER COLUMN url DROP NOT NULL;

-- Add updated_at column if it doesn't exist (for tracking asset edits)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create updated_at trigger for assets
DROP TRIGGER IF EXISTS update_assets_updated_at ON assets;
CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- UPDATE SHOTS TABLE
-- ============================================

-- Add foreign key reference to image asset
ALTER TABLE shots ADD COLUMN IF NOT EXISTS image_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;

-- Add foreign key reference to video asset
ALTER TABLE shots ADD COLUMN IF NOT EXISTS video_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;

-- Create indexes for the new foreign keys
CREATE INDEX IF NOT EXISTS idx_shots_image_asset_id ON shots(image_asset_id);
CREATE INDEX IF NOT EXISTS idx_shots_video_asset_id ON shots(video_asset_id);

-- ============================================
-- INDEXES FOR NEW COLUMNS
-- ============================================

-- Index for finding assets by storage type
CREATE INDEX IF NOT EXISTS idx_assets_storage_type ON assets(storage_type);

-- Index for finding assets by generation model
CREATE INDEX IF NOT EXISTS idx_assets_generation_model ON assets(generation_model);

-- ============================================
-- MIGRATION NOTES
-- ============================================
--
-- After this migration:
-- 1. Assets can be stored locally (storage_type = 'local', local_path set)
--    or in the cloud (storage_type = 'cloud', url set)
-- 2. Shots link to assets via image_asset_id and video_asset_id
-- 3. The old media_url/video_url columns remain for backwards compatibility
--    but new code should use the asset references
-- 4. Assets track both user_description (intent) and ai_prompt (actual prompt)
-- 5. generation_model and generation_settings track how the asset was created
--
