// fal.ai Generation Service
// Docs: https://fal.ai/docs

const FAL_API_URL = "https://queue.fal.run"

async function getApiKey(): Promise<string> {
  const key = import.meta.env.VITE_FAL_API_KEY
  if (!key) {
    throw new Error("VITE_FAL_API_KEY is not set in environment variables")
  }
  return key
}

interface FalQueueResponse {
  request_id: string
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED"
  response_url?: string
}

interface FalStatusResponse {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED"
  response_url?: string
  error?: string
}

async function submitRequest(
  model: string,
  input: Record<string, unknown>
): Promise<string> {
  const key = await getApiKey()

  const response = await fetch(`${FAL_API_URL}/${model}`, {
    method: "POST",
    headers: {
      "Authorization": `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || error.message || "Failed to submit request")
  }

  const data: FalQueueResponse = await response.json()
  return data.request_id
}

async function pollStatus(model: string, requestId: string): Promise<unknown> {
  const key = await getApiKey()

  while (true) {
    const response = await fetch(
      `${FAL_API_URL}/${model}/requests/${requestId}/status`,
      {
        headers: {
          "Authorization": `Key ${key}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error("Failed to fetch status")
    }

    const status: FalStatusResponse = await response.json()

    if (status.status === "COMPLETED" && status.response_url) {
      // Fetch the actual result
      const resultResponse = await fetch(status.response_url, {
        headers: {
          "Authorization": `Key ${key}`,
        },
      })
      return resultResponse.json()
    }

    if (status.status === "FAILED") {
      throw new Error(status.error || "Generation failed")
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}

// ============================================
// IMAGE GENERATION
// ============================================

export interface GenerateImageOptions {
  prompt: string
  negativePrompt?: string
  style?: string
  referenceImageUrl?: string
  width?: number
  height?: number
  numOutputs?: number
}

export async function generateImages(options: GenerateImageOptions): Promise<string[]> {
  const {
    prompt,
    negativePrompt,
    style,
    referenceImageUrl,
    width = 1024,
    height = 1024,
    numOutputs = 4,
  } = options

  // Build the full prompt with style
  let fullPrompt = prompt
  if (style) {
    fullPrompt = `${prompt}, ${style} style`
  }

  const input: Record<string, unknown> = {
    prompt: fullPrompt,
    negative_prompt: negativePrompt || "blurry, low quality, distorted",
    image_size: { width, height },
    num_images: numOutputs,
    num_inference_steps: 30,
    guidance_scale: 7.5,
    enable_safety_checker: true,
  }

  // Add image-to-image if reference provided
  if (referenceImageUrl) {
    input.image_url = referenceImageUrl
    input.strength = 0.8
  }

  // Use SDXL or Flux for image generation
  const model = referenceImageUrl
    ? "fal-ai/sdxl" // img2img
    : "fal-ai/flux/schnell" // text2img (fast)

  const requestId = await submitRequest(model, input)
  const result = await pollStatus(model, requestId) as { images: { url: string }[] }

  if (!result.images || result.images.length === 0) {
    throw new Error("No images generated")
  }

  return result.images.map((img) => img.url)
}

// ============================================
// VIDEO GENERATION (img2video)
// ============================================

export interface GenerateVideoOptions {
  imageUrl: string
  motionBucketId?: number
  fps?: number
}

export async function generateVideo(options: GenerateVideoOptions): Promise<string> {
  const {
    imageUrl,
    motionBucketId = 127,
    fps = 8,
  } = options

  const input = {
    image_url: imageUrl,
    motion_bucket_id: motionBucketId,
    fps,
    cond_aug: 0.02,
  }

  const model = "fal-ai/stable-video"
  const requestId = await submitRequest(model, input)
  const result = await pollStatus(model, requestId) as { video: { url: string } }

  if (!result.video?.url) {
    throw new Error("No video generated")
  }

  return result.video.url
}

// ============================================
// AUDIO GENERATION
// ============================================

export interface GenerateMusicOptions {
  prompt: string
  duration?: number
}

export async function generateMusic(options: GenerateMusicOptions): Promise<string> {
  const { prompt, duration = 10 } = options

  const input = {
    prompt,
    duration_seconds: duration,
  }

  const model = "fal-ai/musicgen"
  const requestId = await submitRequest(model, input)
  const result = await pollStatus(model, requestId) as { audio: { url: string } }

  if (!result.audio?.url) {
    throw new Error("No audio generated")
  }

  return result.audio.url
}

export interface GenerateVoiceOptions {
  text: string
  referenceAudioUrl?: string
  language?: string
}

export async function generateVoice(options: GenerateVoiceOptions): Promise<string> {
  const { text } = options

  const input = {
    text,
    model: "eleven_multilingual_v2",
  }

  // Note: fal.ai has various TTS options, using a simple one here
  const model = "fal-ai/elevenlabs"
  const requestId = await submitRequest(model, input)
  const result = await pollStatus(model, requestId) as { audio: { url: string } }

  if (!result.audio?.url) {
    throw new Error("No audio generated")
  }

  return result.audio.url
}
