// xAI Grok Generation Service (via FAL.ai)
// Supports image and video generation
// Uses existing FAL.ai proxy infrastructure

import { falProxy } from '../lib/api-proxy'

// FAL.ai model IDs for Grok Imagine (xAI namespace)
// See: https://fal.ai/models/xai/grok-imagine-image/api
const GROK_IMAGE_MODEL = "xai/grok-imagine-image"
const GROK_VIDEO_TEXT_TO_VIDEO = "xai/grok-imagine-video/text-to-video"
const GROK_VIDEO_IMAGE_TO_VIDEO = "xai/grok-imagine-video/image-to-video"

interface FalStatusResponse {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED"
  response_url?: string
  error?: string
}

async function submitRequest(
  model: string,
  input: Record<string, unknown>
): Promise<string> {
  const data = await falProxy.submit({ model, input })
  return data.request_id
}

async function pollStatus(model: string, requestId: string): Promise<unknown> {
  // For models with subpaths like "xai/grok-imagine-video/text-to-video",
  // FAL.ai might need the base model path for status checks
  // Try the full path first, fall back to base path if it fails
  let statusModel = model

  while (true) {
    try {
      const status = await falProxy.status({ model: statusModel, requestId }) as FalStatusResponse

      if (status.status === "COMPLETED" && status.response_url) {
        const result = await falProxy.result({ responseUrl: status.response_url })
        return result
      }

      if (status.status === "FAILED") {
        throw new Error(status.error || "Generation failed")
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, 2000))
    } catch (error) {
      // If status check fails and we haven't tried base model path yet, try it
      if (statusModel === model && model.includes('/')) {
        const basePath = model.split('/').slice(0, -1).join('/')
        console.log(`Status check failed with full path, trying base path: ${basePath}`)
        statusModel = basePath
        continue
      }
      throw error
    }
  }
}

// ============================================
// IMAGE GENERATION
// ============================================

export interface GenerateImagesGrokOptions {
  prompt: string
  negativePrompt?: string
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
  numberOfImages?: number
  seed?: number
}

/**
 * Generate images using xAI's Grok model via FAL.ai
 *
 * Pricing (via FAL.ai):
 * - Check FAL.ai pricing for current rates
 */
export async function generateImagesGrok(
  options: GenerateImagesGrokOptions
): Promise<string[]> {
  const {
    prompt,
    negativePrompt,
    aspectRatio = '16:9',
    numberOfImages = 1,
    seed,
  } = options

  console.log(`Generating ${numberOfImages} image(s) with Grok...`)

  const input: Record<string, unknown> = {
    prompt,
    num_images: numberOfImages,
    aspect_ratio: aspectRatio,
    output_format: "png",
  }

  if (negativePrompt) {
    input.negative_prompt = negativePrompt
  }

  if (seed !== undefined) {
    input.seed = seed
  }

  const requestId = await submitRequest(GROK_IMAGE_MODEL, input)
  const result = await pollStatus(GROK_IMAGE_MODEL, requestId) as { images?: Array<{ url: string }> }

  if (!result.images || result.images.length === 0) {
    throw new Error("No images generated")
  }

  return result.images.map((img) => img.url)
}

// ============================================
// VIDEO GENERATION
// ============================================

export interface GenerateVideoGrokOptions {
  prompt: string
  imageUrl?: string  // Optional reference image
  aspectRatio?: '16:9' | '9:16' | '1:1'
  duration?: number  // Duration in seconds
  seed?: number
}

/**
 * Generate video using xAI's Grok model via FAL.ai
 */
export async function generateVideoGrok(options: GenerateVideoGrokOptions): Promise<string> {
  const {
    prompt,
    imageUrl,
    aspectRatio = '16:9',
    duration,
    seed,
  } = options

  // Use different endpoint based on whether an image is provided
  const model = imageUrl ? GROK_VIDEO_IMAGE_TO_VIDEO : GROK_VIDEO_TEXT_TO_VIDEO
  console.log(`Generating video with Grok (${imageUrl ? 'image-to-video' : 'text-to-video'})...`)

  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
  }

  if (imageUrl) {
    input.image_url = imageUrl
  }

  if (duration) {
    input.duration = duration
  }

  if (seed !== undefined) {
    input.seed = seed
  }

  const requestId = await submitRequest(model, input)
  const result = await pollStatus(model, requestId) as Record<string, unknown>

  console.log('Grok video generation result:', JSON.stringify(result, null, 2))

  // Try different response formats the API might return
  if (result.video && typeof result.video === 'object' && 'url' in (result.video as object)) {
    return (result.video as { url: string }).url
  }

  // Some APIs return video_url directly
  if (typeof result.video_url === 'string') {
    return result.video_url
  }

  // Some APIs return url directly
  if (typeof result.url === 'string') {
    return result.url
  }

  // Some APIs return videos array
  if (Array.isArray(result.videos) && result.videos.length > 0) {
    const firstVideo = result.videos[0]
    if (typeof firstVideo === 'string') return firstVideo
    if (typeof firstVideo?.url === 'string') return firstVideo.url
  }

  throw new Error(`No video generated. Response: ${JSON.stringify(result)}`)
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get aspect ratio string from width/height dimensions
 */
export function getAspectRatioFromDimensions(
  width: number,
  height: number
): '1:1' | '16:9' | '9:16' | '4:3' | '3:4' {
  const ratio = width / height

  if (Math.abs(ratio - 1) < 0.1) return '1:1'
  if (Math.abs(ratio - 16/9) < 0.1) return '16:9'
  if (Math.abs(ratio - 9/16) < 0.1) return '9:16'
  if (Math.abs(ratio - 4/3) < 0.1) return '4:3'
  if (Math.abs(ratio - 3/4) < 0.1) return '3:4'

  // Default based on orientation
  if (width > height) return '16:9'
  if (height > width) return '9:16'
  return '1:1'
}
