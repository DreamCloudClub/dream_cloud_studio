-- Timeline clips table - replaces scenes/shots hierarchy
-- Each clip references an asset and defines its placement on the timeline

CREATE TABLE timeline_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL DEFAULT 'video-main',

  -- Placement on timeline
  start_time FLOAT NOT NULL DEFAULT 0,      -- seconds from timeline start
  duration FLOAT NOT NULL DEFAULT 5,        -- how long clip plays
  in_point FLOAT NOT NULL DEFAULT 0,        -- offset into source asset

  -- Visual transform (video/image)
  transform JSONB DEFAULT '{}',

  -- Animation (Ken Burns for images)
  animation JSONB DEFAULT '{}',

  -- Audio
  volume FLOAT DEFAULT 1.0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_timeline_clips_project ON timeline_clips(project_id);
CREATE INDEX idx_timeline_clips_asset ON timeline_clips(asset_id);
CREATE INDEX idx_timeline_clips_order ON timeline_clips(project_id, track_id, start_time);

-- Row Level Security
ALTER TABLE timeline_clips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project clips" ON timeline_clips
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert clips to own projects" ON timeline_clips
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own project clips" ON timeline_clips
  FOR UPDATE USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own project clips" ON timeline_clips
  FOR DELETE USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Update timestamp trigger
CREATE TRIGGER update_timeline_clips_updated_at
  BEFORE UPDATE ON timeline_clips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
