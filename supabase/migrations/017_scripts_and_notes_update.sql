-- Create scripts table (project-specific)
CREATE TABLE scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One script per project
CREATE UNIQUE INDEX idx_scripts_project_id ON scripts(project_id);

-- Index for user lookups
CREATE INDEX idx_scripts_user_id ON scripts(user_id);

-- Add RLS policies
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own scripts" ON scripts
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add sort_order to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Drop unused script_sections table
DROP TABLE IF EXISTS script_sections CASCADE;
