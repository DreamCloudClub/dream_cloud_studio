-- Migration: Scripts - Characters and Script Sections
-- Adds support for AI-assisted script writing with character definitions and content blocks

-- ============================================
-- SCRIPT CHARACTERS
-- Characters that can speak in dialogue blocks
-- ============================================

CREATE TABLE IF NOT EXISTS script_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,  -- Physical/personality description for AI context
  voice_description TEXT,  -- Voice characteristics for TTS generation
  voice_settings JSONB DEFAULT '{}'::jsonb,  -- ElevenLabs voice ID, settings, etc.
  avatar_url TEXT,  -- Optional character avatar
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_script_characters_project_id ON script_characters(project_id);

-- RLS Policies
ALTER TABLE script_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their project characters"
  ON script_characters FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create characters for their projects"
  ON script_characters FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their project characters"
  ON script_characters FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their project characters"
  ON script_characters FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Updated at trigger
CREATE TRIGGER update_script_characters_updated_at
  BEFORE UPDATE ON script_characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SCRIPT SECTIONS
-- Content blocks: descriptions and dialogue
-- ============================================

CREATE TABLE IF NOT EXISTS script_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('description', 'dialogue')),
  content TEXT NOT NULL DEFAULT '',
  character_id UUID REFERENCES script_characters(id) ON DELETE SET NULL,  -- For dialogue blocks
  notes TEXT,  -- Director notes, AI hints, generation guidance
  sort_order INTEGER NOT NULL DEFAULT 0,
  -- Metadata for generation
  is_new_scene BOOLEAN DEFAULT FALSE,  -- True = new storyboard panel later
  scene_context TEXT,  -- Additional context for this section (location, mood, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_script_sections_project_id ON script_sections(project_id);
CREATE INDEX IF NOT EXISTS idx_script_sections_character_id ON script_sections(character_id);
CREATE INDEX IF NOT EXISTS idx_script_sections_sort_order ON script_sections(project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_script_sections_type ON script_sections(type);

-- RLS Policies
ALTER TABLE script_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their project sections"
  ON script_sections FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sections for their projects"
  ON script_sections FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their project sections"
  ON script_sections FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their project sections"
  ON script_sections FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Updated at trigger
CREATE TRIGGER update_script_sections_updated_at
  BEFORE UPDATE ON script_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ENABLE REALTIME
-- For live updates as Bubble AI writes
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE script_characters;
ALTER PUBLICATION supabase_realtime ADD TABLE script_sections;

-- ============================================
-- MIGRATION NOTES
-- ============================================
--
-- Script workflow:
-- 1. User chats with Bubble AI about their video concept
-- 2. Bubble creates characters (if dialogue needed)
-- 3. Bubble writes script_sections (description + dialogue blocks)
-- 4. UI updates in real-time via Supabase subscriptions
-- 5. User can manually edit any block
-- 6. User can add new blocks or characters
--
-- Later in Workspace:
-- - description blocks with is_new_scene=true → Storyboard panels
-- - dialogue blocks → Voice generation (using character voice_settings)
--
