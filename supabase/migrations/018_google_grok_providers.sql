-- Add Google AI (Nano Banana + Veo 3) and xAI Grok providers
-- These models are accessed via existing Replicate and FAL.ai proxies

-- Insert Google provider (via Replicate)
INSERT INTO api_providers (name, display_name, provider_type, base_url, models, capabilities) VALUES
  ('google', 'Google AI (via Replicate)', 'multi', 'https://replicate.com/google',
   '[
     {"id": "google/nano-banana", "name": "Nano Banana", "type": "image", "default": true, "proxy": "replicate"},
     {"id": "google/veo-3", "name": "Veo 3", "type": "video", "default": true, "proxy": "replicate"}
   ]'::jsonb,
   '["text-to-image", "text-to-video", "image-to-video"]'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  provider_type = EXCLUDED.provider_type,
  base_url = EXCLUDED.base_url,
  models = EXCLUDED.models,
  capabilities = EXCLUDED.capabilities,
  updated_at = NOW();

-- Insert xAI Grok provider (via FAL.ai)
INSERT INTO api_providers (name, display_name, provider_type, base_url, models, capabilities) VALUES
  ('grok', 'Grok (via FAL.ai)', 'multi', 'https://fal.ai/models/grok',
   '[
     {"id": "fal-ai/grok-2-image", "name": "Grok 2 Image", "type": "image", "default": true, "proxy": "fal"},
     {"id": "fal-ai/grok-video", "name": "Grok Video", "type": "video", "default": true, "proxy": "fal"}
   ]'::jsonb,
   '["text-to-image", "text-to-video"]'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  provider_type = EXCLUDED.provider_type,
  base_url = EXCLUDED.base_url,
  models = EXCLUDED.models,
  capabilities = EXCLUDED.capabilities,
  updated_at = NOW();
