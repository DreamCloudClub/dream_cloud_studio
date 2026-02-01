// Replicate Generation Service
// Uses Supabase Edge Function proxy to avoid CORS issues
// Using premium models for best quality

import { supabase } from "../lib/supabase"
import type { Asset, AssetCategory, Json } from "@/types/database"
import { createGeneratedAsset, linkImageAssetToShot, linkVideoAssetToShot } from "./assets"

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
const FLUX_KONTEXT_PRO_VERSION = "897a70f5a7dbd8a0611413b3b98cf417b45f266bd595c571a22947619d9ae462"
const GPT_IMAGE_15_VERSION = "118f53498ea7319519229b2d5bd0d4a69e3d77eb60d6292d5db38125534dc1ca"
const SDXL_VERSION = "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc"

export interface GenerateImageOptions {
  prompt: string
  negativePrompt?: string
  style?: string
  referenceImageUrl?: string
  referenceImageUrls?: string[]  // Multiple reference images (uses GPT-image-1.5)
  width?: number
  height?: number
  numOutputs?: number
  model?: "flux-pro" | "flux-kontext" | "sdxl" | "gpt"
  strength?: number  // For img2img: 0-1, where higher = more transformation
}

export async function generateImages(options: GenerateImageOptions): Promise<string[]> {
  const {
    prompt,
    style,
    referenceImageUrl,
    referenceImageUrls,
    width = 1344,
    height = 768,
    numOutputs = 4,
    model = "flux-pro",
    strength = 0.75,
  } = options

  // Build the full prompt with style
  let fullPrompt = prompt
  if (style && style !== "realistic") {
    fullPrompt = `${style} style. ${prompt}`
  }

  // Collect all reference images
  const allReferenceUrls: string[] = []
  if (referenceImageUrls && referenceImageUrls.length > 0) {
    allReferenceUrls.push(...referenceImageUrls)
  } else if (referenceImageUrl) {
    allReferenceUrls.push(referenceImageUrl)
  }

  // Calculate aspect ratio string from dimensions
  const getAspectRatioString = (w: number, h: number): string => {
    if (w === h) return "1:1"
    if (w > h) return w / h >= 1.7 ? "16:9" : "4:3"
    return h / w >= 1.7 ? "9:16" : "3:4"
  }
  const aspectRatioStr = getAspectRatioString(width, height)

  // ============================================
  // FLUX Kontext Pro - Image-to-image with single reference
  // ============================================
  if (model === "flux-kontext" && allReferenceUrls.length >= 1) {
    console.log("Using FLUX Kontext Pro for image-to-image...")
    console.log(`Reference image: ${allReferenceUrls[0].substring(0, 100)}...`)
    console.log(`Strength: ${strength}`)

    const images: string[] = []

    for (let i = 0; i < numOutputs; i++) {
      try {
        console.log(`Generating image ${i + 1} of ${numOutputs} with FLUX Kontext Pro...`)

        const input: Record<string, unknown> = {
          prompt: fullPrompt,
          input_image: allReferenceUrls[0],
          strength: strength,  // 0-1: how much to transform
          aspect_ratio: aspectRatioStr,
          output_format: "png",
          safety_tolerance: 2,
          prompt_upsampling: true,
        }

        const prediction = await createPrediction(FLUX_KONTEXT_PRO_VERSION, input)
        const output = await pollPrediction(prediction.id) as string

        if (output) {
          images.push(output)
        }

        // Delay between requests
        if (i < numOutputs - 1) {
          console.log("Waiting 8 seconds before next request...")
          await new Promise(resolve => setTimeout(resolve, 8000))
        }
      } catch (error) {
        console.error(`Error generating image ${i + 1}:`, error)
      }
    }

    if (images.length > 0) {
      return images
    }

    throw new Error("FLUX Kontext Pro generation failed")
  }

  // ============================================
  // GPT Image - Multi-reference or explicit selection
  // ============================================
  if (model === "gpt" || allReferenceUrls.length > 1) {
    console.log("Using GPT-image-1.5 for multi-reference composition...")
    console.log(`Reference images: ${allReferenceUrls.length}`)

    try {
      // Map strength to input_fidelity: lower strength = high fidelity (preserve more)
      const inputFidelity = strength <= 0.5 ? "high" : "low"

      const input: Record<string, unknown> = {
        prompt: fullPrompt,
        input_images: allReferenceUrls.length > 0 ? allReferenceUrls : undefined,
        input_fidelity: inputFidelity,
        quality: "high",
        aspect_ratio: aspectRatioStr,
        number_of_images: numOutputs,
        output_format: "png",
      }

      const prediction = await createPrediction(GPT_IMAGE_15_VERSION, input)
      const output = await pollPrediction(prediction.id)

      // GPT-image-1.5 returns an array of image URIs
      if (Array.isArray(output) && output.length > 0) {
        return output as string[]
      }
      if (typeof output === "string") {
        return [output]
      }

      console.log("GPT-image-1.5 returned unexpected output:", output)
    } catch (error) {
      console.error("GPT-image-1.5 failed:", error)
    }

    throw new Error("GPT Image generation failed")
  }

  // ============================================
  // SDXL - With optional img2img support
  // ============================================
  if (model === "sdxl") {
    console.log("Generating with SDXL...")

    const input: Record<string, unknown> = {
      prompt: fullPrompt,
      negative_prompt: options.negativePrompt || "blurry, low quality, distorted, ugly, bad anatomy, deformed",
      width,
      height,
      num_outputs: numOutputs,
      num_inference_steps: 50,
      guidance_scale: 7.5,
      scheduler: "K_EULER_ANCESTRAL",
      refine: "expert_ensemble_refiner",
      high_noise_frac: 0.8,
    }

    // Add img2img parameters if reference provided
    if (allReferenceUrls.length === 1) {
      input.image = allReferenceUrls[0]
      input.prompt_strength = strength  // SDXL uses prompt_strength for img2img
      console.log(`SDXL img2img with strength: ${strength}`)
    }

    const prediction = await createPrediction(SDXL_VERSION, input)
    const output = await pollPrediction(prediction.id) as string[]

    if (!output || output.length === 0) {
      throw new Error("No images generated")
    }

    return output
  }

  // ============================================
  // FLUX 1.1 Pro - Text-to-image only (no reference)
  // ============================================
  if (model === "flux-pro") {
    console.log("Generating with FLUX 1.1 Pro...")

    const images: string[] = []

    for (let i = 0; i < numOutputs; i++) {
      try {
        console.log(`Generating image ${i + 1} of ${numOutputs}...`)

        const input: Record<string, unknown> = {
          prompt: fullPrompt,
          aspect_ratio: aspectRatioStr,
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
      }
    }

    if (images.length > 0) {
      return images
    }

    console.log("FLUX Pro failed, falling back to SDXL...")
  }

  // Fallback: SDXL
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
const KLING_V21_VERSION = "f045f3203a6faeb8a1b47dd4069fa397a8c83c41b418967f5ba095c57322ccb9"
const MINIMAX_VIDEO_VERSION = "5aa835260ff7f40f4069c41185f72036accf99e29957bb4a3b3a911f3b6c1912"

export interface GenerateVideoOptions {
  imageUrl?: string  // Optional - if not provided, generates from prompt only
  prompt?: string
  duration?: 5 | 10  // seconds
  quality?: "standard" | "pro"  // standard=720p, pro=1080p
  aspectRatio?: "16:9" | "9:16" | "1:1"
  model?: "kling" | "minimax"
}

export async function generateVideo(options: GenerateVideoOptions): Promise<string> {
  const {
    imageUrl,
    prompt = "",
    duration = 5,
    quality = "pro",
    aspectRatio = "16:9",
    model = "kling",
  } = options

  // Kling v2.1 - Best quality, 5 or 10 second videos
  if (model === "kling") {
    console.log(`Generating ${duration}s ${aspectRatio} video with Kling v2.1 (${quality} mode)${imageUrl ? ' from reference image' : ' from prompt'}...`)

    const input: Record<string, unknown> = {
      prompt: prompt || "Smooth cinematic motion, professional cinematography, high quality",
      duration,
      mode: quality,  // "standard" = 720p, "pro" = 1080p
      aspect_ratio: aspectRatio,
      negative_prompt: "blurry, low quality, distorted, glitchy",
    }

    // Only add start_image if we have a reference image
    if (imageUrl) {
      input.start_image = imageUrl
    }

    const prediction = await createPrediction(KLING_V21_VERSION, input)
    const output = await pollPrediction(prediction.id) as string

    if (!output) {
      throw new Error("No video generated")
    }

    return output
  }

  // Minimax video-01 - Fixed ~6 second videos
  console.log(`Generating video with Minimax Video-01${imageUrl ? ' from reference image' : ' from prompt'}...`)

  const input: Record<string, unknown> = {
    prompt: prompt || "Smooth cinematic motion, gentle camera movement, natural movement, high quality video, professional cinematography",
  }

  // Only add first_frame_image if we have a reference image
  if (imageUrl) {
    input.first_frame_image = imageUrl
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

// ============================================
// ASSET-AWARE GENERATION (NEW WORKFLOW)
// Generate → Create Asset → Optionally Link to Shot
// ============================================

export interface GenerateImageAssetOptions extends GenerateImageOptions {
  userId: string
  projectId?: string
  category?: AssetCategory
  shotId?: string  // If provided, links asset to this shot
  assetName?: string
}

export interface GenerateImageAssetResult {
  assets: Asset[]
  linkedToShot?: string  // Shot ID if linked
}

/**
 * Generate images and create asset records for each
 * Optionally links the first image to a shot
 */
export async function generateImageAssets(options: GenerateImageAssetOptions): Promise<GenerateImageAssetResult> {
  const {
    userId,
    projectId,
    category,
    shotId,
    assetName,
    prompt,
    style,
    ...generateOptions
  } = options

  // Build the AI prompt with style
  let aiPrompt = prompt
  if (style && style !== "realistic") {
    aiPrompt = `${style} style. ${prompt}`
  }

  // Generate the images (returns URLs)
  const imageUrls = await generateImages({
    prompt,
    style,
    ...generateOptions,
  })

  // Create asset records for each generated image
  const assets: Asset[] = []
  for (let i = 0; i < imageUrls.length; i++) {
    const name = assetName
      ? (imageUrls.length > 1 ? `${assetName} ${i + 1}` : assetName)
      : `Generated Image ${i + 1}`

    const asset = await createGeneratedAsset({
      userId,
      projectId,
      name,
      type: "image",
      category,
      sourceUrl: imageUrls[i],
      userDescription: prompt,
      aiPrompt,
      generationModel: options.model === "sdxl" ? "sdxl" : "flux-1.1-pro",
      generationSettings: {
        style,
        width: options.width || 1024,
        height: options.height || 1024,
      } as Json,
    })

    assets.push(asset)
  }

  // Link first asset to shot if requested
  let linkedToShot: string | undefined
  if (shotId && assets.length > 0) {
    await linkImageAssetToShot(shotId, assets[0].id)
    linkedToShot = shotId
  }

  return { assets, linkedToShot }
}

export interface GenerateVideoAssetOptions extends GenerateVideoOptions {
  userId: string
  projectId?: string
  category?: AssetCategory
  shotId?: string  // If provided, links asset to this shot
  assetName?: string
  sourceImageAssetId?: string  // The image asset being animated
}

export interface GenerateVideoAssetResult {
  asset: Asset
  linkedToShot?: string
}

/**
 * Generate a video and create an asset record
 * Optionally links the video to a shot
 */
export async function generateVideoAsset(options: GenerateVideoAssetOptions): Promise<GenerateVideoAssetResult> {
  const {
    userId,
    projectId,
    category,
    shotId,
    assetName,
    sourceImageAssetId,
    imageUrl,
    prompt,
    ...generateOptions
  } = options

  // Generate the video (returns URL)
  const videoUrl = await generateVideo({
    imageUrl,
    prompt,
    ...generateOptions,
  })

  // Determine actual duration (Kling can do 5 or 10s, Minimax does ~6s)
  const duration = options.model === "kling"
    ? (options.duration || 5)
    : 6

  const asset = await createGeneratedAsset({
    userId,
    projectId,
    name: assetName || "Generated Video",
    type: "video",
    category,
    sourceUrl: videoUrl,
    userDescription: prompt || "Animated image",
    aiPrompt: prompt || "Smooth cinematic motion",
    generationModel: options.model === "minimax" ? "minimax-video-01" : "kling-v2.1",
    generationSettings: {
      sourceImageAssetId,
      duration: options.duration || 5,
      quality: options.quality || "pro",
    } as Json,
    duration,
  })

  // Link to shot if requested
  let linkedToShot: string | undefined
  if (shotId) {
    await linkVideoAssetToShot(shotId, asset.id)
    linkedToShot = shotId
  }

  return { asset, linkedToShot }
}

export interface GenerateMusicAssetOptions extends GenerateMusicOptions {
  userId: string
  projectId?: string
  assetName?: string
}

/**
 * Generate music and create an asset record
 */
export async function generateMusicAsset(options: GenerateMusicAssetOptions): Promise<Asset> {
  const {
    userId,
    projectId,
    assetName,
    prompt,
    duration = 30,
  } = options

  // Generate the music (returns URL)
  const audioUrl = await generateMusic({ prompt, duration })

  const asset = await createGeneratedAsset({
    userId,
    projectId,
    name: assetName || "Generated Music",
    type: "audio",
    category: "music",
    sourceUrl: audioUrl,
    userDescription: prompt,
    aiPrompt: prompt,
    generationModel: "musicgen-stereo-large",
    generationSettings: {
      duration,
    } as Json,
    duration,
  })

  return asset
}

export interface GenerateVoiceAssetOptions extends GenerateVoiceOptions {
  userId: string
  projectId?: string
  assetName?: string
}

/**
 * Generate voice audio and create an asset record
 */
export async function generateVoiceAsset(options: GenerateVoiceAssetOptions): Promise<Asset> {
  const {
    userId,
    projectId,
    assetName,
    text,
    language = "en",
    referenceAudioUrl,
  } = options

  // Generate the voice (returns URL)
  const audioUrl = await generateVoice({ text, language, referenceAudioUrl })

  // Estimate duration (rough approximation: ~150 words per minute)
  const wordCount = text.split(/\s+/).length
  const estimatedDuration = Math.ceil((wordCount / 150) * 60)

  const asset = await createGeneratedAsset({
    userId,
    projectId,
    name: assetName || "Generated Voice",
    type: "audio",
    category: "voice",
    sourceUrl: audioUrl,
    userDescription: text.substring(0, 200) + (text.length > 200 ? "..." : ""),
    aiPrompt: text,
    generationModel: "xtts-v2",
    generationSettings: {
      language,
      hasReferenceAudio: !!referenceAudioUrl,
    } as Json,
    duration: estimatedDuration,
  })

  return asset
}
