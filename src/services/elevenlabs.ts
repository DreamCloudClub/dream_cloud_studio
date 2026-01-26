// ElevenLabs Generation Service
// Docs: https://elevenlabs.io/docs/api-reference

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1"

function getApiKey(): string {
  const key = import.meta.env.VITE_ELEVENLABS_API_KEY
  if (!key) {
    throw new Error("VITE_ELEVENLABS_API_KEY is not set in environment variables")
  }
  return key
}

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
  const key = getApiKey()

  const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
    headers: {
      "xi-api-key": key,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail?.message || error.message || "Failed to fetch voices")
  }

  const data = await response.json()
  return data.voices
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

  const key = getApiKey()

  const settings: VoiceSettings = {
    stability: voiceSettings.stability ?? 0.5,
    similarity_boost: voiceSettings.similarity_boost ?? 0.75,
    style: voiceSettings.style ?? 0,
    use_speaker_boost: voiceSettings.use_speaker_boost ?? true,
  }

  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: settings,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      error.detail?.message || error.message || "Failed to generate voice"
    )
  }

  // Convert audio blob to data URL
  const audioBlob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(audioBlob)
  })
}

// ============================================
// TEXT-TO-SPEECH WITH STREAMING
// ============================================

export interface StreamVoiceOptions extends GenerateVoiceOptions {
  onAudioChunk?: (chunk: Uint8Array) => void
}

export async function streamVoice(options: StreamVoiceOptions): Promise<string> {
  const {
    text,
    voiceId = DEFAULT_VOICES.rachel,
    modelId = "eleven_multilingual_v2",
    voiceSettings = {},
    onAudioChunk,
  } = options

  const key = getApiKey()

  const settings: VoiceSettings = {
    stability: voiceSettings.stability ?? 0.5,
    similarity_boost: voiceSettings.similarity_boost ?? 0.75,
    style: voiceSettings.style ?? 0,
    use_speaker_boost: voiceSettings.use_speaker_boost ?? true,
  }

  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: settings,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      error.detail?.message || error.message || "Failed to stream voice"
    )
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error("No response body")
  }

  const chunks: Uint8Array[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    chunks.push(value)
    onAudioChunk?.(value)
  }

  // Combine chunks into a single blob and return as data URL
  const audioBlob = new Blob(chunks as BlobPart[], { type: "audio/mpeg" })
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(audioBlob)
  })
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

  const key = getApiKey()

  const body: Record<string, unknown> = {
    text,
    prompt_influence,
  }

  if (duration_seconds) {
    body.duration_seconds = duration_seconds
  }

  const response = await fetch(`${ELEVENLABS_API_URL}/sound-generation`, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      error.detail?.message || error.message || "Failed to generate sound effect"
    )
  }

  // Convert audio blob to data URL
  const audioBlob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(audioBlob)
  })
}

// ============================================
// VOICE CLONING (requires professional tier)
// ============================================

export interface CloneVoiceOptions {
  name: string
  files: File[]
  description?: string
  labels?: Record<string, string>
}

export async function cloneVoice(options: CloneVoiceOptions): Promise<Voice> {
  const { name, files, description, labels } = options

  const key = getApiKey()

  const formData = new FormData()
  formData.append("name", name)

  if (description) {
    formData.append("description", description)
  }

  if (labels) {
    formData.append("labels", JSON.stringify(labels))
  }

  files.forEach((file) => {
    formData.append("files", file)
  })

  const response = await fetch(`${ELEVENLABS_API_URL}/voices/add`, {
    method: "POST",
    headers: {
      "xi-api-key": key,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      error.detail?.message || error.message || "Failed to clone voice"
    )
  }

  return response.json()
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
  const key = getApiKey()

  const response = await fetch(`${ELEVENLABS_API_URL}/user`, {
    headers: {
      "xi-api-key": key,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      error.detail?.message || error.message || "Failed to fetch user info"
    )
  }

  return response.json()
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
