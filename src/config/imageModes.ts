// ============================================
// Image Generation Mode Configuration
// ============================================

export type ImageMode =
  | "text-to-image"
  | "image-to-image"
  | "inpaint"
  | "upscale"

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
      supports_aspect_ratio: true, // Allow custom output size
      supports_output_count: true,
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
      supports_steps: true,
      supports_guidance: true,
      supports_style_preset: false,
      supports_mask_blur: true,
      supports_inpaint_area: true,
      supports_reference_strength: false,
    },
  },

  "upscale": {
    id: "upscale",
    label: "AI Upscaling",
    description: "Increase image resolution while preserving original content",
    capabilities: {
      requires_base_image: true,
      allows_reference_images: false,
      max_reference_images: 0,
      requires_mask: false,
      supports_strength: false,
      supports_negative_prompt: false,
      supports_aspect_ratio: false,  // Preserves original aspect ratio
      supports_output_count: false,  // Always outputs 1 image
      supports_steps: false,
      supports_guidance: false,
      supports_style_preset: false,
      supports_mask_blur: false,
      supports_inpaint_area: false,
      supports_reference_strength: false,
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

export interface ImageModelConfig {
  id: string
  label: string
  company: string
  description: string
  supportsMultipleRefs: boolean
  supportsSingleRef: boolean
  supportsInpainting: boolean
  maxImageInputs: number  // Max reference images the model accepts (0 = text-only)
  workflows: Array<'text-to-image' | 'image-to-image' | 'inpaint' | 'upscale'>
  bestFor: string
  inputs: string[]
  notes: string
}

export const IMAGE_MODELS: ImageModelConfig[] = [
  // Ordered from fastest/lightest to heaviest/professional
  {
    id: "sdxl",
    label: "SDXL",
    company: "Stability AI",
    description: "Inpainting",
    supportsMultipleRefs: false,
    supportsSingleRef: true,
    supportsInpainting: true,
    maxImageInputs: 1,
    workflows: ['inpaint'],
    bestFor: "Inpainting and masked region editing",
    inputs: ["Text prompt", "Base image", "Mask image"],
    notes: "Best-in-class inpainting model. Lower cost and faster than alternatives. Use for editing specific regions of existing images.",
  },
  {
    id: "grok",
    label: "Grok 2 Image",
    company: "xAI",
    description: "Text-only, fast",
    supportsMultipleRefs: false,
    supportsSingleRef: false,
    supportsInpainting: false,
    maxImageInputs: 0,
    workflows: ['text-to-image'],
    bestFor: "Rapid text-only image generation",
    inputs: ["Text prompt only"],
    notes: "Does not accept reference images. All refinements must be made through prompt edits.",
  },
  {
    id: "flux-pro",
    label: "FLUX 1.1 Pro",
    company: "Black Forest Labs",
    description: "High quality",
    supportsMultipleRefs: false,
    supportsSingleRef: false,
    supportsInpainting: false,
    maxImageInputs: 0,
    workflows: ['text-to-image'],
    bestFor: "High-quality text-to-image generation and photorealistic scenes",
    inputs: ["Text prompt only"],
    notes: "Text-to-image only. Strong realism, lighting, and detail. For image-to-image workflows, use FLUX Kontext Pro instead.",
  },
  {
    id: "flux-kontext",
    label: "FLUX Kontext Pro",
    company: "Black Forest Labs",
    description: "Image editing",
    supportsMultipleRefs: false,
    supportsSingleRef: true,
    supportsInpainting: false,
    maxImageInputs: 1,
    workflows: ['image-to-image'],
    bestFor: "Image transformation, style transfer, and character consistency",
    inputs: ["Text prompt", "1 reference image"],
    notes: "12B parameter model for in-context image editing. Supports strength control (0-1) for transformation intensity. Best for single-image transformations with high fidelity.",
  },
  {
    id: "gpt",
    label: "GPT Image",
    company: "OpenAI",
    description: "Stylized generation",
    supportsMultipleRefs: true,
    supportsSingleRef: true,
    supportsInpainting: false,
    maxImageInputs: 4,
    workflows: ['text-to-image', 'image-to-image'],
    bestFor: "Illustration, stylized scenes, structured compositions",
    inputs: ["Text prompt", "Optional reference images (up to 4)"],
    notes: "Strong prompt understanding and instruction following. Outputs tend toward illustration or stylized realism rather than strict photographic realism.",
  },
  {
    id: "nano-banana",
    label: "Imagen 3",
    company: "Google",
    description: "Professional",
    supportsMultipleRefs: true,
    supportsSingleRef: true,
    supportsInpainting: false,
    maxImageInputs: 4,
    workflows: ['text-to-image', 'image-to-image'],
    bestFor: "High-quality generation and image enhancement",
    inputs: ["Text prompt", "Optional reference images (up to 4)"],
    notes: "Heavier model intended for professional results. Slower generation compared to SDXL and FLUX 1.1 Pro. Excellent photorealism and text rendering.",
  },
]

// Helper to get model config by id
export function getImageModelConfig(modelId: string): ImageModelConfig | undefined {
  return IMAGE_MODELS.find(m => m.id === modelId)
}

// Helper to get models compatible with a specific workflow
export function getModelsForWorkflow(workflow: ImageModelConfig['workflows'][number]): ImageModelConfig[] {
  return IMAGE_MODELS.filter(m => m.workflows.includes(workflow))
}

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

