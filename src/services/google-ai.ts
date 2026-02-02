// Google AI Generation Service (via Replicate)
// Supports Nano Banana (image generation) and Veo 3 (video generation)
// Uses existing Replicate proxy infrastructure

import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

// Replicate model versions for Google models
// From: https://replicate.com/google/nano-banana and https://replicate.com/google/veo-3
const NANO_BANANA_VERSION = "google/nano-banana"  // Use model name, Replicate resolves latest
const VEO_3_VERSION = "google/veo-3"

interface ReplicatePrediction {
  id: string
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled"
  output?: unknown
  error?: string
}

async function callEdgeFunction(action: string, params: Record<string, unknown>): Promise<unknown> {
  const { data: { session } } = await supabase.auth.getSession()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
  }

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

    // Wait before polling again (longer for video)
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }
}

// ============================================
// NANO BANANA - Image Generation
// ============================================

export interface GenerateImagesNanoBananaOptions {
  prompt: string
  negativePrompt?: string
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | 'match_input_image'
  numberOfImages?: number
  seed?: number
  referenceImageUrls?: string[]  // Input images to transform or use as reference
}

/**
 * Generate images using Google's Nano Banana model via Replicate
 * https://replicate.com/google/nano-banana
 */
export async function generateImagesNanoBanana(
  options: GenerateImagesNanoBananaOptions
): Promise<string[]> {
  const {
    prompt,
    negativePrompt,
    aspectRatio = '16:9',
    numberOfImages = 1,
    seed,
    referenceImageUrls,
  } = options

  console.log(`Generating ${numberOfImages} image(s) with Nano Banana...`)
  if (referenceImageUrls?.length) {
    console.log(`Using ${referenceImageUrls.length} reference image(s)`)
  }

  const images: string[] = []

  for (let i = 0; i < numberOfImages; i++) {
    const input: Record<string, unknown> = {
      prompt,
      aspect_ratio: aspectRatio,
      output_format: "png",  // Nano Banana only supports "jpg" or "png"
    }

    // Add reference images if provided
    if (referenceImageUrls && referenceImageUrls.length > 0) {
      input.image_input = referenceImageUrls
    }

    if (negativePrompt) {
      input.negative_prompt = negativePrompt
    }

    if (seed !== undefined) {
      input.seed = seed + i  // Different seed for each image
    }

    try {
      const prediction = await createPrediction(NANO_BANANA_VERSION, input)
      const output = await pollPrediction(prediction.id)

      if (typeof output === "string") {
        images.push(output)
      } else if (Array.isArray(output) && output.length > 0) {
        images.push(output[0])
      }

      // Delay between requests
      if (i < numberOfImages - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    } catch (error) {
      console.error(`Error generating image ${i + 1}:`, error)
    }
  }

  if (images.length === 0) {
    throw new Error("No images generated")
  }

  return images
}

// ============================================
// VEO 3 - Video Generation
// ============================================

export interface GenerateVideoVeoOptions {
  prompt: string
  imageUrl?: string  // Optional reference image for image-to-video
  aspectRatio?: '16:9' | '9:16' | '1:1'
  duration?: number  // Duration in seconds
  seed?: number
}

/**
 * Generate video using Google's Veo 3 model via Replicate
 * https://replicate.com/google/veo-3
 */
export async function generateVideoVeo(options: GenerateVideoVeoOptions): Promise<string> {
  const {
    prompt,
    imageUrl,
    aspectRatio = '16:9',
    duration,
    seed,
  } = options

  console.log(`Generating video with Veo 3...`)

  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
  }

  if (imageUrl) {
    input.image = imageUrl
  }

  if (duration) {
    input.duration = duration
  }

  if (seed !== undefined) {
    input.seed = seed
  }

  const prediction = await createPrediction(VEO_3_VERSION, input)
  const output = await pollPrediction(prediction.id)

  if (typeof output === "string") {
    return output
  }

  if (Array.isArray(output) && output.length > 0) {
    return output[0]
  }

  if (typeof output === "object" && output !== null) {
    const obj = output as Record<string, unknown>
    if (obj.video) return obj.video as string
    if (obj.url) return obj.url as string
  }

  throw new Error("No video generated")
}

// ============================================
// UPSCALE - Image Upscaling with Imagen 3
// ============================================

export interface UpscaleImageOptions {
  imageUrl: string           // Source image to upscale
  scaleFactor?: 2 | 4        // 2x or 4x upscaling
  enhancementStrength?: 'low' | 'medium' | 'high'  // Detail enhancement level
  preserveFaces?: boolean    // Preserve facial details
}

/**
 * Upscale an image using Google's Imagen 3 model via Replicate
 * Preserves the original image content while increasing resolution
 */
export async function upscaleImage(options: UpscaleImageOptions): Promise<string> {
  const {
    imageUrl,
    scaleFactor = 2,
    enhancementStrength = 'medium',
    preserveFaces = false,
  } = options

  console.log(`Upscaling image ${scaleFactor}x with Imagen 3...`)

  // Build a prompt that instructs the model to enhance without changing content
  const enhancementPrompts: Record<string, string> = {
    low: "Subtle enhancement, preserve original details exactly",
    medium: "Balanced enhancement, sharpen details while preserving original content",
    high: "Strong enhancement, maximize clarity and sharpness",
  }

  const basePrompt = `Upscale this image to ${scaleFactor}x resolution. ${enhancementPrompts[enhancementStrength]}. Do not add, remove, or change any content - only increase resolution and clarity.`
  const facePrompt = preserveFaces ? " Pay special attention to preserving facial features and expressions with maximum fidelity." : ""

  const prompt = basePrompt + facePrompt

  const input: Record<string, unknown> = {
    prompt,
    image_input: [imageUrl],
    aspect_ratio: "match_input_image",
    output_format: "png",
  }

  const prediction = await createPrediction(NANO_BANANA_VERSION, input)
  const output = await pollPrediction(prediction.id)

  if (typeof output === "string") {
    return output
  }

  if (Array.isArray(output) && output.length > 0) {
    return output[0]
  }

  throw new Error("Upscaling failed - no output received")
}
