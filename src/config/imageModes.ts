// ============================================
// Image Generation Mode Configuration
// ============================================

export type ImageMode =
  | "text-to-image"
  | "image-to-image"
  | "inpaint"
  | "selective-edit"

export interface ModeCapabilities {
  // Input requirements
  requires_base_image: boolean
  allows_reference_images: boolean
  max_reference_images: number
  requires_mask: boolean

  // Parameter support
  supports_strength: boolean
  supports_negative_prompt: boolean
  supports_aspect_ratio: boolean
  supports_output_count: boolean
  supports_seed: boolean
  supports_steps: boolean
  supports_guidance: boolean
  supports_style_preset: boolean

  // Advanced options
  supports_mask_blur: boolean
  supports_inpaint_area: boolean
  supports_reference_strength: boolean
}

export interface ModeConfig {
  id: ImageMode
  label: string
  description: string
  capabilities: ModeCapabilities
}

export const IMAGE_MODE_CONFIGS: Record<ImageMode, ModeConfig> = {
  "text-to-image": {
    id: "text-to-image",
    label: "Text to Image",
    description: "Generate new images from text descriptions",
    capabilities: {
      requires_base_image: false,
      allows_reference_images: false,
      max_reference_images: 0,
      requires_mask: false,
      supports_strength: false,
      supports_negative_prompt: true,
      supports_aspect_ratio: true,
      supports_output_count: true,
      supports_seed: true,
      supports_steps: true,
      supports_guidance: true,
      supports_style_preset: true,
      supports_mask_blur: false,
      supports_inpaint_area: false,
      supports_reference_strength: false,
    },
  },

  "image-to-image": {
    id: "image-to-image",
    label: "Image to Image",
    description: "Transform an existing image using text guidance",
    capabilities: {
      requires_base_image: true,
      allows_reference_images: false,
      max_reference_images: 0,
      requires_mask: false,
      supports_strength: true,
      supports_negative_prompt: true,
      supports_aspect_ratio: false, // Locked to base image
      supports_output_count: true,
      supports_seed: true,
      supports_steps: true,
      supports_guidance: true,
      supports_style_preset: false,
      supports_mask_blur: false,
      supports_inpaint_area: false,
      supports_reference_strength: false,
    },
  },

  "inpaint": {
    id: "inpaint",
    label: "Inpainting",
    description: "Edit a specific masked region of an image",
    capabilities: {
      requires_base_image: true,
      allows_reference_images: false,
      max_reference_images: 0,
      requires_mask: true,
      supports_strength: true,
      supports_negative_prompt: true,
      supports_aspect_ratio: false, // Locked to base image
      supports_output_count: true,
      supports_seed: true,
      supports_steps: true,
      supports_guidance: true,
      supports_style_preset: false,
      supports_mask_blur: true,
      supports_inpaint_area: true,
      supports_reference_strength: false,
    },
  },

  "selective-edit": {
    id: "selective-edit",
    label: "Selective Editing",
    description: "Compose or edit images using multiple references",
    capabilities: {
      requires_base_image: false,
      allows_reference_images: true,
      max_reference_images: 4,
      requires_mask: false,
      supports_strength: false,
      supports_negative_prompt: true,
      supports_aspect_ratio: true,
      supports_output_count: true,
      supports_seed: true,
      supports_steps: true,
      supports_guidance: true,
      supports_style_preset: false,
      supports_mask_blur: false,
      supports_inpaint_area: false,
      supports_reference_strength: true,
    },
  },
}

// Get mode config, falling back to text-to-image if unknown
export function getModeConfig(mode: string | undefined): ModeConfig {
  if (mode && mode in IMAGE_MODE_CONFIGS) {
    return IMAGE_MODE_CONFIGS[mode as ImageMode]
  }
  return IMAGE_MODE_CONFIGS["text-to-image"]
}

// ============================================
// Parameter Options
// ============================================

export const IMAGE_MODELS = [
  { id: "flux-pro", label: "FLUX Pro", description: "Best quality" },
  { id: "gpt", label: "GPT Image", description: "Best for references" },
  { id: "sdxl", label: "SDXL", description: "Faster" },
]

export const STYLE_PRESETS = [
  { id: "cinematic", label: "Cinematic" },
  { id: "photorealistic", label: "Photorealistic" },
  { id: "anime", label: "Anime" },
  { id: "3d-render", label: "3D Render" },
  { id: "illustration", label: "Illustration" },
  { id: "abstract", label: "Abstract" },
  { id: "watercolor", label: "Watercolor" },
  { id: "oil-painting", label: "Oil Painting" },
]

export const ASPECT_RATIOS = [
  { id: "16:9", label: "Landscape (16:9)", width: 1344, height: 768 },
  { id: "9:16", label: "Portrait (9:16)", width: 768, height: 1344 },
  { id: "1:1", label: "Square (1:1)", width: 1024, height: 1024 },
  { id: "4:3", label: "Standard (4:3)", width: 1152, height: 864 },
  { id: "3:2", label: "Photo (3:2)", width: 1216, height: 832 },
]

export const OUTPUT_COUNTS = [
  { id: "1", label: "1 image" },
  { id: "2", label: "2 images" },
  { id: "4", label: "4 images" },
]

export const INPAINT_AREAS = [
  { id: "masked_only", label: "Masked Only", description: "Only regenerate masked area" },
  { id: "full_image", label: "Full Image", description: "Regenerate entire image with context" },
]

// Reference image roles (for selective editing)
export const REFERENCE_ROLES = [
  { id: "character", label: "Character" },
  { id: "scene", label: "Scene/Background" },
  { id: "style", label: "Style Reference" },
  { id: "object", label: "Object/Prop" },
]
