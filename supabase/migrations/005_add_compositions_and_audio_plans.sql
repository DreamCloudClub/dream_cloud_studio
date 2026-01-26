-- Add project_compositions table for title cards, outros, transitions, overlays
-- Add audio_plans column to project_briefs for AI audio planning

-- ============================================
-- PROJECT COMPOSITIONS (title cards, overlays, transitions)
-- ============================================
CREATE TABLE IF NOT EXISTS project_compositions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Title card (opening)
  title_card JSONB DEFAULT NULL,
  -- { text, subtitle, font, animation, backgroundColor, duration }

  -- Outro card (closing)
  outro_card JSONB DEFAULT NULL,
  -- { text, subtitle, animation, backgroundColor, duration }

  -- Transitions
  default_transition TEXT DEFAULT 'fade',
  transition_duration REAL DEFAULT 0.5,

  -- Text overlays array
  text_overlays JSONB DEFAULT '[]'::jsonb,
  -- [{ id, text, position, animation, startTime, duration, shotId }]

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add audio_plans column to project_briefs
-- Stores: { voiceoverScript, musicStyle, soundEffects[] }
ALTER TABLE project_briefs
ADD COLUMN IF NOT EXISTS audio_plans JSONB DEFAULT '{}'::jsonb;

-- Enable RLS on project_compositions
ALTER TABLE project_compositions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_compositions
CREATE POLICY "Users can view own project compositions"
  ON project_compositions FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own project compositions"
  ON project_compositions FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own project compositions"
  ON project_compositions FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project compositions"
  ON project_compositions FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_project_compositions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_compositions_updated_at
  BEFORE UPDATE ON project_compositions
  FOR EACH ROW
  EXECUTE FUNCTION update_project_compositions_updated_at();
