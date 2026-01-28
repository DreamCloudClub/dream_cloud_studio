-- Migration: Animation Support
-- Adds animation as an asset type and effects layer to shots

-- ============================================
-- UPDATE ASSETS TABLE
-- ============================================

-- Drop the existing check constraint on type and add animation
-- First, find and drop the existing constraint
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_type_check;

-- Add new constraint including 'animation'
ALTER TABLE assets ADD CONSTRAINT assets_type_check
  CHECK (type IN ('image', 'video', 'audio', 'animation'));

-- ============================================
-- UPDATE SHOTS TABLE
-- ============================================

-- Add foreign key reference to animation asset (for standalone animation shots)
ALTER TABLE shots ADD COLUMN IF NOT EXISTS animation_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;

-- Add effects layer (JSONB array of overlay effects)
-- Each effect has: id, type, name, config (AnimationConfig), timing [start, end]
ALTER TABLE shots ADD COLUMN IF NOT EXISTS effects JSONB DEFAULT '[]'::jsonb;

-- Create index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_shots_animation_asset_id ON shots(animation_asset_id);

-- ============================================
-- MIGRATION NOTES
-- ============================================
--
-- After this migration:
-- 1. Assets can have type 'animation' for standalone animation segments
-- 2. Shots can link to animation assets via animation_asset_id
-- 3. Shots have an effects JSONB array for overlay effects
--
-- Animation asset metadata should be stored in generation_settings:
-- {
--   "config": {
--     "duration": 5,
--     "layers": [...],
--     "background": {...}
--   }
-- }
--
-- Effects array structure:
-- [
--   {
--     "id": "effect-uuid",
--     "type": "text|lower_third|watermark|custom",
--     "name": "Effect Name",
--     "config": { "duration": 2, "layers": [...] },
--     "timing": [0.5, 2.5]
--   }
-- ]
--
