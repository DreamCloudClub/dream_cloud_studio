-- Add embedded_asset column to timeline_clips
-- This stores a snapshot of the asset data with each clip,
-- making clips self-contained and not dependent on external asset lookups

ALTER TABLE timeline_clips
ADD COLUMN embedded_asset JSONB DEFAULT NULL;

-- Comment for documentation
COMMENT ON COLUMN timeline_clips.embedded_asset IS 'Snapshot of asset data at time of clip creation. Contains: id, name, type, category, url, localPath, storageType, duration';
