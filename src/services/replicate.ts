// Replicate Generation Service
// Docs: https://replicate.com/docs

const REPLICATE_API_URL = "https://api.replicate.com/v1"

async function getApiKey(): Promise<string> {
  const key = import.meta.env.VITE_REPLICATE_API_KEY
  if (!key) {
    throw new Error("VITE_REPLICATE_API_KEY is not set in environment variables")
  }
  return key
}

interface ReplicatePrediction {
  id: string
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled"
  output?: unknown
  error?: string
}

async function createPrediction(
  model: string,
  version: string,
  input: Record<string, unknown>
): Promise<ReplicatePrediction> {
  const key = await getApiKey()

  const response = await fetch(`${REPLICATE_API_URL}/predictions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version,
      input,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || error.message || "Failed to create prediction")
  }

  return response.json()
}

async function pollPrediction(predictionId: string): Promise<unknown> {
  const key = await getApiKey()

  while (true) {
    const response = await fetch(
      `${REPLICATE_API_URL}/predictions/${predictionId}`,
      {
        headers: {
          "Authorization": `Bearer ${key}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error("Failed to fetch prediction status")
    }

    const prediction: ReplicatePrediction = await response.json()

    if (prediction.status === "succeeded") {
      return prediction.output
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      throw new Error(prediction.error || "Generation failed")
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
    width,
    height,
    num_outputs: numOutputs,
    num_inference_steps: 30,
    guidance_scale: 7.5,
  }

  // Add image-to-image if reference provided
  if (referenceImageUrl) {
    input.image = referenceImageUrl
    input.prompt_strength = 0.8
  }

  // SDXL model on Replicate
  const version = referenceImageUrl
    ? "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b" // SDXL img2img
    : "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b" // SDXL

  const prediction = await createPrediction("stability-ai/sdxl", version, input)
  const output = await pollPrediction(prediction.id) as string[]

  if (!output || output.length === 0) {
    throw new Error("No images generated")
  }

  return output
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
    input_image: imageUrl,
    motion_bucket_id: motionBucketId,
    fps,
  }

  // Stable Video Diffusion on Replicate
  const version = "3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438"

  const prediction = await createPrediction("stability-ai/stable-video-diffusion", version, input)
  const output = await pollPrediction(prediction.id) as string

  if (!output) {
    throw new Error("No video generated")
  }

  return output
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
    duration,
    model_version: "stereo-melody-large",
  }

  // MusicGen on Replicate
  const version = "671ac645ce5e552cc63a54a2bbff63fcf798043055f2e4ff1d6e6f87f85a7695"

  const prediction = await createPrediction("meta/musicgen", version, input)
  const output = await pollPrediction(prediction.id) as string

  if (!output) {
    throw new Error("No audio generated")
  }

  return output
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
    speaker: "https://replicate.delivery/pbxt/JlBRhoVKrcEjS1OFuISvlqB8xMSoLzJUkwLMrsVTuqLMpvM/male.wav",
  }

  // XTTS-v2 on Replicate for voice cloning/TTS
  const version = "684bc3855b37866c0c65add2ff39c78f3dea3f4ff103a436465326e0f438d55e"

  const prediction = await createPrediction("lucataco/xtts-v2", version, input)
  const output = await pollPrediction(prediction.id) as string

  if (!output) {
    throw new Error("No audio generated")
  }

  return output
}
