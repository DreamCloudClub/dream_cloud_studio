-- Add video_content JSONB column to project_briefs
-- Stores structured video content: characters, setting, timeOfDay, weather, action, props, dialogue

ALTER TABLE project_briefs
ADD COLUMN IF NOT EXISTS video_content JSONB DEFAULT '{}'::jsonb;
