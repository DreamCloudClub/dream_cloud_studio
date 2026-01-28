-- Add foundation_id column to mood_boards table
-- This links a mood board to a visual style foundation

ALTER TABLE mood_boards
ADD COLUMN foundation_id UUID REFERENCES foundations(id) ON DELETE SET NULL;

-- Index for faster lookups
CREATE INDEX idx_mood_boards_foundation_id ON mood_boards(foundation_id);
