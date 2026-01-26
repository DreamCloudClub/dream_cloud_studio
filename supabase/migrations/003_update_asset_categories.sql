-- Migration: Update asset categories
-- Changes audio categories from (audio, voiceover, soundtrack, sfx) to (music, sound_effect, voice)

-- First, update any existing assets with old categories to new ones
UPDATE assets SET category = 'music' WHERE category = 'soundtrack';
UPDATE assets SET category = 'sound_effect' WHERE category = 'sfx';
UPDATE assets SET category = 'voice' WHERE category = 'voiceover';
UPDATE assets SET category = 'music' WHERE category = 'audio' AND type = 'audio';

-- Drop the old constraint
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_category_check;

-- Add the new constraint with updated categories
-- Visual categories: scene, stage, character, weather, prop, effect
-- Audio categories: music, sound_effect, voice
ALTER TABLE assets ADD CONSTRAINT assets_category_check
  CHECK (category IN ('scene', 'stage', 'character', 'weather', 'prop', 'effect', 'music', 'sound_effect', 'voice'));
