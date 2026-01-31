// ElevenLabs Generation Service
// API calls are proxied through Supabase edge functions for security
// Docs: https://elevenlabs.io/docs/api-reference

import { elevenlabsProxy } from '../lib/api-proxy'

// ============================================
// TYPES
// ============================================

export interface Voice {
  voice_id: string
  name: string
  category: string
  description?: string
  preview_url?: string
  labels?: Record<string, string>
}

export interface VoiceSettings {
  stability: number
  similarity_boost: number
  style?: number
  use_speaker_boost?: boolean
}

// ============================================
// VOICE LISTING
// ============================================

export async function getVoices(): Promise<Voice[]> {
  const data = await elevenlabsProxy.listVoices()
  return data.voices as Voice[]
}

// Popular default voices for quick access
export const DEFAULT_VOICES = {
  rachel: "21m00Tcm4TlvDq8ikWAM", // Rachel - Calm, warm female voice
  drew: "29vD33N1CtxCmqQRPOHJ",   // Drew - Well-rounded male voice
  clyde: "2EiwWnXFnvU5JabPnv8n",  // Clyde - War veteran, deep male
  paul: "5Q0t7uMcjvnagumLfvZi",   // Paul - Ground reporter, male
  domi: "AZnzlk1XvdvUeBnXmlld",   // Domi - Strong, assertive female
  bella: "EXAVITQu4vr4xnSDxMaL",  // Bella - Soft, friendly female
  antoni: "ErXwobaYiN019PkySvjV", // Antoni - Well-rounded male
  elli: "MF3mGyEYCl7XYWbV9V6O",   // Elli - Emotional, young female
  josh: "TxGEqnHWrfWFTfGW9XjX",   // Josh - Deep, narrative male
  arnold: "VR6AewLTigWG4xSOukaG", // Arnold - Strong, crisp male
  adam: "pNInz6obpgDQGcFmaJgB",   // Adam - Deep, authoritative male
  sam: "yoZ06aMxZJJ28mfd3POQ",    // Sam - Raspy, dynamic male
} as const

// ============================================
// TEXT-TO-SPEECH
// ============================================

export interface GenerateVoiceOptions {
  text: string
  voiceId?: string
  modelId?: string
  voiceSettings?: Partial<VoiceSettings>
}

export async function generateVoice(options: GenerateVoiceOptions): Promise<string> {
  const {
    text,
    voiceId = DEFAULT_VOICES.rachel,
    modelId = "eleven_multilingual_v2",
    voiceSettings = {},
  } = options

  const data = await elevenlabsProxy.generateVoice({
    text,
    voiceId,
    modelId,
    voiceSettings: {
      stability: voiceSettings.stability ?? 0.5,
      similarity_boost: voiceSettings.similarity_boost ?? 0.75,
      style: voiceSettings.style ?? 0,
      use_speaker_boost: voiceSettings.use_speaker_boost ?? true,
    },
  })

  return data.audioDataUrl
}

// ============================================
// TEXT-TO-SPEECH WITH STREAMING
// Note: Streaming is handled by the edge function, returns complete audio
// ============================================

export interface StreamVoiceOptions extends GenerateVoiceOptions {
  onAudioChunk?: (chunk: Uint8Array) => void
}

export async function streamVoice(options: StreamVoiceOptions): Promise<string> {
  // For now, streaming goes through the same endpoint
  // The edge function returns the complete audio as base64
  // Real streaming would require WebSocket or Server-Sent Events
  const {
    text,
    voiceId = DEFAULT_VOICES.rachel,
    modelId = "eleven_multilingual_v2",
    voiceSettings = {},
  } = options

  const data = await elevenlabsProxy.generateVoice({
    text,
    voiceId,
    modelId,
    voiceSettings: {
      stability: voiceSettings.stability ?? 0.5,
      similarity_boost: voiceSettings.similarity_boost ?? 0.75,
      style: voiceSettings.style ?? 0,
      use_speaker_boost: voiceSettings.use_speaker_boost ?? true,
    },
  })

  return data.audioDataUrl
}

// ============================================
// SOUND EFFECTS GENERATION
// ============================================

export interface GenerateSoundEffectOptions {
  text: string
  duration_seconds?: number
  prompt_influence?: number
}

export async function generateSoundEffect(
  options: GenerateSoundEffectOptions
): Promise<string> {
  const { text, duration_seconds, prompt_influence = 0.3 } = options

  const data = await elevenlabsProxy.generateSoundEffect({
    text,
    duration_seconds,
    prompt_influence,
  })

  return data.audioDataUrl
}

// ============================================
// VOICE CLONING (requires professional tier)
// Note: This would need a separate edge function endpoint for file upload
// ============================================

export interface CloneVoiceOptions {
  name: string
  files: File[]
  description?: string
  labels?: Record<string, string>
}

export async function cloneVoice(_options: CloneVoiceOptions): Promise<Voice> {
  // Voice cloning requires file upload which is more complex
  // For now, throw an error indicating it's not yet supported via proxy
  throw new Error(
    "Voice cloning via proxy is not yet implemented. " +
    "This feature requires file upload support in the edge function."
  )
}

// ============================================
// USER INFO & SUBSCRIPTION
// ============================================

export interface UserSubscription {
  tier: string
  character_count: number
  character_limit: number
  can_extend_character_limit: boolean
  allowed_to_extend_character_limit: boolean
  next_character_count_reset_unix: number
  voice_limit: number
  professional_voice_limit: number
  can_extend_voice_limit: boolean
  can_use_instant_voice_cloning: boolean
  can_use_professional_voice_cloning: boolean
  currency: string
  status: string
}

export interface UserInfo {
  subscription: UserSubscription
  is_new_user: boolean
  first_name?: string
}

export async function getUserInfo(): Promise<UserInfo> {
  const data = await elevenlabsProxy.getUserInfo()
  return data as UserInfo
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Estimate audio duration from text (rough estimate)
export function estimateAudioDuration(text: string): number {
  // Average speaking rate is about 150 words per minute
  const words = text.split(/\s+/).length
  const minutes = words / 150
  return Math.ceil(minutes * 60) // Return seconds
}

// Get usage percentage
export async function getUsagePercentage(): Promise<number> {
  const info = await getUserInfo()
  const { character_count, character_limit } = info.subscription
  return Math.round((character_count / character_limit) * 100)
}
