-- Foundations table for storing visual style templates
CREATE TABLE foundations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color_palette JSONB DEFAULT '[]'::jsonb,
  style TEXT,
  mood TEXT,
  typography TEXT,
  tone TEXT,
  mood_images JSONB DEFAULT '[]'::jsonb,
  project_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE foundations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own foundations"
  ON foundations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own foundations"
  ON foundations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own foundations"
  ON foundations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own foundations"
  ON foundations FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX foundations_user_id_idx ON foundations(user_id);
