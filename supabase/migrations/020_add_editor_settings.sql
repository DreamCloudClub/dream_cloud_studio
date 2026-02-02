-- Add editor settings columns to export_settings table
-- These persist per-project editor preferences

ALTER TABLE export_settings
ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT false;

ALTER TABLE export_settings
ADD COLUMN IF NOT EXISTS editor_volume INTEGER DEFAULT 100;
