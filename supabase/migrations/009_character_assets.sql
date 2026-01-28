-- Migration: Link script characters to image assets
-- Characters can have an avatar asset (image with category='character')

-- Add avatar_asset_id to script_characters
ALTER TABLE script_characters
  ADD COLUMN avatar_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;

-- Create index for the foreign key
CREATE INDEX IF NOT EXISTS idx_script_characters_avatar_asset_id ON script_characters(avatar_asset_id);

-- Note: The avatar_url field is kept for backwards compatibility
-- New workflow: generate image asset -> link to character via avatar_asset_id
-- The UI can display the asset's url/thumbnail from the linked asset
