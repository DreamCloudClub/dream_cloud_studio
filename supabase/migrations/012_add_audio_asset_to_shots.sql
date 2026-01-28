-- Migration: Add audio_asset_id to shots table
-- Allows shots to have linked audio assets (music, sound effects, voice)

-- Add foreign key reference to audio asset
ALTER TABLE shots ADD COLUMN IF NOT EXISTS audio_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;

-- Create index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_shots_audio_asset_id ON shots(audio_asset_id);
