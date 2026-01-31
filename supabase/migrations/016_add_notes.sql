-- Drop the wrong table if it exists
DROP TABLE IF EXISTS project_notes;

-- Create simple notes table for users
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Users can only access their own notes
CREATE POLICY "Users can manage their own notes" ON notes
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
