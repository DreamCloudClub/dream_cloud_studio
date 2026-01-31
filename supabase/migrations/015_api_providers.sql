-- API Providers configuration table
-- Allows dynamic provider management without app updates

CREATE TABLE api_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,           -- 'anthropic', 'elevenlabs', 'fal', 'replicate', 'google', 'grok'
  display_name TEXT NOT NULL,          -- 'Claude (Anthropic)', 'ElevenLabs', etc.
  provider_type TEXT NOT NULL,         -- 'text', 'image', 'video', 'audio', 'voice', 'multi'
  base_url TEXT NOT NULL,              -- API base URL for reference
  is_enabled BOOLEAN DEFAULT true,     -- Toggle providers on/off
  models JSONB DEFAULT '[]',           -- Available models: [{id, name, type, default}]
  capabilities JSONB DEFAULT '[]',     -- ['text-to-image', 'image-to-video', 'tts', etc.]
  rate_limits JSONB,                   -- Optional rate limit config
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Read-only for authenticated users (admin updates via dashboard)
ALTER TABLE api_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read providers"
  ON api_providers FOR SELECT
  TO authenticated
  USING (true);

-- Seed initial providers
INSERT INTO api_providers (name, display_name, provider_type, base_url, models, capabilities) VALUES
  ('anthropic', 'Claude (Anthropic)', 'text', 'https://api.anthropic.com/v1',
   '[{"id": "claude-sonnet-4-20250514", "name": "Claude Sonnet 4", "default": true}]'::jsonb,
   '["chat", "tool-use", "assistant"]'::jsonb),
  ('elevenlabs', 'ElevenLabs', 'voice', 'https://api.elevenlabs.io/v1',
   '[{"id": "eleven_multilingual_v2", "name": "Multilingual v2", "default": true}]'::jsonb,
   '["text-to-speech", "voice-clone", "sound-effects"]'::jsonb),
  ('fal', 'FAL.ai', 'multi', 'https://queue.fal.run',
   '[{"id": "fal-ai/flux/schnell", "name": "FLUX Schnell", "type": "image", "default": true}]'::jsonb,
   '["text-to-image", "image-to-video", "music-gen"]'::jsonb),
  ('replicate', 'Replicate', 'multi', 'https://api.replicate.com/v1',
   '[]'::jsonb,
   '["text-to-image", "image-to-video", "music-gen", "voice"]'::jsonb);

-- Updated_at trigger (reuses existing function from 001_initial_schema.sql)
CREATE TRIGGER update_api_providers_updated_at
  BEFORE UPDATE ON api_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
