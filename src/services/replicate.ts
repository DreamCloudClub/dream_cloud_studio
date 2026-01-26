// Replicate Generation Service
// Uses Supabase Edge Function proxy to avoid CORS issues
// Using premium models for best quality

import { supabase } from "../lib/supabase"

// Get the Supabase URL for edge functions
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

interface ReplicatePrediction {
  id: string
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled"
  output?: unknown
  error?: string
}

async function callEdgeFunction(action: string, params: Record<string, unknown>): Promise<unknown> {
  // Get the current session for auth
  const { data: { session } } = await supabase.auth.getSession()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
  }

  // Add user's JWT if logged in
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/replicate-proxy`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action, ...params }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || error.error || error.message || "API request failed")
  }

  return response.json()
}

async function createPrediction(
  version: string,
  input: Record<string, unknown>
): Promise<ReplicatePrediction> {
  const data = await callEdgeFunction("create_prediction", { version, input })
  return data as ReplicatePrediction
}

async function pollPrediction(predictionId: string): Promise<unknown> {
  while (true) {
    const prediction = await callEdgeFunction("get_prediction", { predictionId }) as ReplicatePrediction

    if (prediction.status === "succeeded") {
      return prediction.output
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      throw new Error(prediction.error || "Generation failed")
    }

    // Wait before polling again (longer for video since it takes more time)
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
}

// ============================================
// IMAGE GENERATION - FLUX 1.1 Pro (Best Quality)
// ============================================

// Model versions (verified from Replicate)
const FLUX_11_PRO_VERSION = "609793a667ed94b210242837d3c3c9fc9a64ae93685f15d75002ba0ed9a97f2b"
const SDXL_VERSION = "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc"

export interface GenerateImageOptions {
  prompt: string
  negativePrompt?: string
  style?: string
  referenceImageUrl?: string
  width?: number
  height?: number
  numOutputs?: number
  model?: "flux-pro" | "sdxl"
}

export async function generateImages(options: GenerateImageOptions): Promise<string[]> {
  const {
    prompt,
    style,
    width = 1024,
    height = 1024,
    numOutputs = 4,
    model = "flux-pro",
  } = options

  // Build the full prompt with style
  let fullPrompt = prompt
  if (style && style !== "realistic") {
    fullPrompt = `${style} style. ${prompt}`
  }

  // FLUX 1.1 Pro - Best quality image generation ($0.04/image)
  if (model === "flux-pro") {
    console.log("Generating with FLUX 1.1 Pro...")

    // FLUX generates one image at a time - run sequentially to avoid rate limits
    const images: string[] = []

    for (let i = 0; i < numOutputs; i++) {
      try {
        console.log(`Generating image ${i + 1} of ${numOutputs}...`)

        const input: Record<string, unknown> = {
          prompt: fullPrompt,
          width,
          height,
          aspect_ratio: "custom",
          output_format: "webp",
          output_quality: 90,
          safety_tolerance: 2,
          prompt_upsampling: true,
        }

        const prediction = await createPrediction(FLUX_11_PRO_VERSION, input)
        const output = await pollPrediction(prediction.id) as string

        if (output) {
          images.push(output)
        }

        // Longer delay between requests to avoid rate limits
        if (i < numOutputs - 1) {
          console.log("Waiting 12 seconds before next request...")
          await new Promise(resolve => setTimeout(resolve, 12000))
        }
      } catch (error) {
        console.error(`Error generating image ${i + 1}:`, error)
        // Continue to next image instead of failing completely
      }
    }

    if (images.length > 0) {
      return images
    }

    console.log("FLUX Pro failed, falling back to SDXL...")
  }

  // Fallback: SDXL (still good, generates multiple at once)
  console.log("Generating with SDXL...")
  const input: Record<string, unknown> = {
    prompt: fullPrompt,
    negative_prompt: "blurry, low quality, distorted, ugly, bad anatomy, deformed",
    width,
    height,
    num_outputs: numOutputs,
    num_inference_steps: 50,
    guidance_scale: 7.5,
    scheduler: "K_EULER_ANCESTRAL",
    refine: "expert_ensemble_refiner",
    high_noise_frac: 0.8,
  }

  const prediction = await createPrediction(SDXL_VERSION, input)
  const output = await pollPrediction(prediction.id) as string[]

  if (!output || output.length === 0) {
    throw new Error("No images generated")
  }

  return output
}

// ============================================
// VIDEO GENERATION - Kling v2.1 / Minimax (Best Quality)
// ============================================

// Model versions
const KLING_V21_VERSION = "daad218feb714b03e2a1ac445986aebb9d05243cd00da2af17be2e4049f48f69"
const MINIMAX_VIDEO_VERSION = "5aa835260ff7f40f4069c41185f72036accf99e29957bb4a3b3a911f3b6c1912"

export interface GenerateVideoOptions {
  imageUrl: string
  prompt?: string
  duration?: 5 | 10  // seconds
  quality?: "standard" | "pro"  // standard=720p, pro=1080p
  model?: "kling" | "minimax"
}

export async function generateVideo(options: GenerateVideoOptions): Promise<string> {
  const {
    imageUrl,
    prompt = "",
    duration = 5,
    quality = "pro",
    model = "kling",
  } = options

  // Kling v2.1 - Best quality, 5 or 10 second videos
  if (model === "kling") {
    console.log(`Generating ${duration}s video with Kling v2.1 (${quality} mode)...`)

    const input: Record<string, unknown> = {
      prompt: prompt || "Smooth cinematic motion, professional cinematography, high quality",
      start_image: imageUrl,
      duration,
      mode: quality,  // "standard" = 720p, "pro" = 1080p
      negative_prompt: "blurry, low quality, distorted, glitchy",
    }

    const prediction = await createPrediction(KLING_V21_VERSION, input)
    const output = await pollPrediction(prediction.id) as string

    if (!output) {
      throw new Error("No video generated")
    }

    return output
  }

  // Minimax video-01 - Fixed ~6 second videos
  console.log("Generating video with Minimax Video-01...")

  const input: Record<string, unknown> = {
    prompt: prompt || "Smooth cinematic motion, gentle camera movement, natural movement, high quality video, professional cinematography",
    first_frame_image: imageUrl,
  }

  const prediction = await createPrediction(MINIMAX_VIDEO_VERSION, input)
  const output = await pollPrediction(prediction.id)

  // Minimax returns { video: "url" } or just the URL string
  if (typeof output === "object" && output !== null && "video" in output) {
    return (output as { video: string }).video
  }
  if (typeof output === "string") {
    return output
  }

  throw new Error("No video generated")
}

// ============================================
// AUDIO GENERATION
// ============================================

export interface GenerateMusicOptions {
  prompt: string
  duration?: number
}

export async function generateMusic(options: GenerateMusicOptions): Promise<string> {
  const { prompt, duration = 30 } = options

  const input = {
    prompt,
    duration,
    model_version: "stereo-melody-large",
    output_format: "mp3",
    normalization_strategy: "loudness",
  }

  // MusicGen Stereo Large
  const version = "671ac645ce5e552cc63a54a2bbff63fcf798043055f2e4ff1d6e6f87f85a7695"

  const prediction = await createPrediction(version, input)
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
  const { text, language = "en" } = options

  const input = {
    text,
    language,
    speaker: "https://replicate.delivery/pbxt/JlBRhoVKrcEjS1OFuISvlqB8xMSoLzJUkwLMrsVTuqLMpvM/male.wav",
  }

  // XTTS-v2 for voice synthesis
  const version = "684bc3855b37866c0c65add2ff39c78f3dea3f4ff103a436465326e0f438d55e"

  const prediction = await createPrediction(version, input)
  const output = await pollPrediction(prediction.id) as string

  if (!output) {
    throw new Error("No audio generated")
  }

  return output
}
