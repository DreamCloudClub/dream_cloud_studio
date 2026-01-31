import { create } from "zustand"
import type { Asset } from "@/types/database"
import type { AnimationConfig } from "@/remotion/AnimationComposition"

export type AssetType = "image" | "video" | "audio" | "animation"

// Prompt types for each asset type
export type ImagePromptType = "text-to-image" | "image-to-image" | "inpaint" | "selective-edit" | "upscale"
export type VideoPromptType = "text-to-video" | "image-to-video" | "video-to-video" | "extend"
export type AudioPromptType = "text-to-speech" | "voice-to-voice" | "music-sfx"
export type AnimationPromptType = "text-to-animation" | "template"
export type PromptType = ImagePromptType | VideoPromptType | AudioPromptType | AnimationPromptType | null

// Asset categories for saving
export type AssetCategory = "scene" | "stage" | "character" | "weather" | "prop" | "effect" | "music" | "sound_effect" | "voice" | "text" | "logo" | "transition" | "lower_third" | "title_card" | "overlay"

export type AssetWizardStep = "type" | "promptType" | "generate" | "save"

export const ASSET_WIZARD_STEPS: { id: AssetWizardStep; label: string }[] = [
  { id: "type", label: "Asset Type" },
  { id: "promptType", label: "Prompt Type" },
  { id: "generate", label: "Generate" },
  { id: "save", label: "Save" },
]

// Prompt type options for each asset type
export const IMAGE_PROMPT_TYPES = [
  { id: "text-to-image" as const, label: "Text to Image", description: "Generate images from text descriptions" },
  { id: "image-to-image" as const, label: "Image to Image", description: "Transform existing images with text guidance" },
  { id: "inpaint" as const, label: "Inpaint", description: "Selectively edit regions of an image" },
  { id: "selective-edit" as const, label: "Multi-Reference", description: "Compose images from multiple references" },
  { id: "upscale" as const, label: "Upscale", description: "Increase resolution with AI enhancement" },
]

export const VIDEO_PROMPT_TYPES = [
  { id: "text-to-video" as const, label: "Text to Video", description: "Generate video from text descriptions" },
  { id: "image-to-video" as const, label: "Image to Video", description: "Animate static images into video" },
  { id: "video-to-video" as const, label: "Video to Video", description: "Transform videos with style transfer" },
  { id: "extend" as const, label: "Extend Video", description: "Generate additional frames to extend clips" },
]

export const AUDIO_PROMPT_TYPES = [
  { id: "text-to-speech" as const, label: "Text to Speech", description: "Convert text into natural speech" },
  { id: "voice-to-voice" as const, label: "Voice Conversion", description: "Transform voice to different speaker" },
  { id: "music-sfx" as const, label: "Music & SFX", description: "Generate music and sound effects" },
]

export const ANIMATION_PROMPT_TYPES = [
  { id: "text-to-animation" as const, label: "Text to Animation", description: "Describe your animation and AI generates it" },
  { id: "template" as const, label: "From Template", description: "Start from a pre-built animation template" },
]

export function getPromptTypesForAssetType(assetType: AssetType | null) {
  switch (assetType) {
    case "image": return IMAGE_PROMPT_TYPES
    case "video": return VIDEO_PROMPT_TYPES
    case "audio": return AUDIO_PROMPT_TYPES
    case "animation": return ANIMATION_PROMPT_TYPES
    default: return []
  }
}

export function getDefaultPromptType(assetType: AssetType | null): PromptType {
  switch (assetType) {
    case "image": return "text-to-image"
    case "video": return "text-to-video"
    case "audio": return "text-to-speech"
    case "animation": return "text-to-animation"
    default: return null
  }
}

interface AssetWizardState {
  // Current step
  currentStep: AssetWizardStep

  // Asset data
  assetType: AssetType | null
  promptType: PromptType
  category: AssetCategory | null
  assetName: string
  userDescription: string  // Human-readable description of what user wants
  aiPrompt: string         // Enhanced technical prompt for generation engine
  negativePrompt: string
  stylePreset: string | null

  // Reference assets (for image-to-image, image-to-video)
  referenceAssets: Asset[]

  // Generated results
  generatedAssets: {
    id: string
    url: string
    selected: boolean
    isVideo?: boolean
    duration?: number  // For video/audio assets
  }[]

  // Animation-specific
  animationConfig: AnimationConfig | null
  animationPreviewUrl: string | null  // Rendered preview video URL

  // Actions
  setCurrentStep: (step: AssetWizardStep) => void
  nextStep: () => void
  prevStep: () => void
  setAssetType: (type: AssetType) => void
  setPromptType: (promptType: PromptType) => void
  setCategory: (category: AssetCategory) => void
  setAssetName: (name: string) => void
  setUserDescription: (desc: string) => void
  setAiPrompt: (prompt: string) => void
  setNegativePrompt: (prompt: string) => void
  setStylePreset: (preset: string | null) => void
  addReferenceAsset: (asset: Asset) => void
  removeReferenceAsset: (assetId: string) => void
  setGeneratedAssets: (assets: AssetWizardState["generatedAssets"]) => void
  toggleAssetSelection: (id: string) => void
  resetWizard: () => void
  initWithType: (type: AssetType) => void
  initWithTypeAndPrompt: (type: AssetType, promptType: PromptType) => void
  // Animation actions
  setAnimationConfig: (config: AnimationConfig | null) => void
  setAnimationPreviewUrl: (url: string | null) => void
}

const initialState = {
  currentStep: "type" as AssetWizardStep,
  assetType: "image" as AssetType | null,
  promptType: null as PromptType,
  category: null as AssetCategory | null,
  assetName: "",
  userDescription: "",
  aiPrompt: "",
  negativePrompt: "",
  stylePreset: null as string | null,
  referenceAssets: [] as Asset[],
  generatedAssets: [] as AssetWizardState["generatedAssets"],
  animationConfig: null as AnimationConfig | null,
  animationPreviewUrl: null as string | null,
}

export const useAssetWizardStore = create<AssetWizardState>((set, get) => ({
  ...initialState,

  setCurrentStep: (step) => set({ currentStep: step }),

  nextStep: () => {
    const { currentStep } = get()
    const currentIndex = ASSET_WIZARD_STEPS.findIndex((s) => s.id === currentStep)
    if (currentIndex < ASSET_WIZARD_STEPS.length - 1) {
      set({ currentStep: ASSET_WIZARD_STEPS[currentIndex + 1].id })
    }
  },

  prevStep: () => {
    const { currentStep } = get()
    const currentIndex = ASSET_WIZARD_STEPS.findIndex((s) => s.id === currentStep)
    if (currentIndex > 0) {
      set({ currentStep: ASSET_WIZARD_STEPS[currentIndex - 1].id })
    }
  },

  setAssetType: (type) => set({ assetType: type, promptType: getDefaultPromptType(type) }),
  setPromptType: (promptType) => set({ promptType }),
  setCategory: (category) => set({ category }),
  setAssetName: (name) => set({ assetName: name }),
  setUserDescription: (desc) => set({ userDescription: desc }),
  setAiPrompt: (prompt) => set({ aiPrompt: prompt }),
  setNegativePrompt: (prompt) => set({ negativePrompt: prompt }),
  setStylePreset: (preset) => set({ stylePreset: preset }),

  addReferenceAsset: (asset) => {
    const { referenceAssets } = get()
    // Prevent duplicates
    if (!referenceAssets.find((a) => a.id === asset.id)) {
      set({ referenceAssets: [...referenceAssets, asset] })
    }
  },

  removeReferenceAsset: (assetId) => {
    const { referenceAssets } = get()
    set({ referenceAssets: referenceAssets.filter((a) => a.id !== assetId) })
  },

  setGeneratedAssets: (assets) => set({ generatedAssets: assets }),

  toggleAssetSelection: (id) => {
    const { generatedAssets } = get()
    set({
      generatedAssets: generatedAssets.map((a) =>
        a.id === id ? { ...a, selected: !a.selected } : a
      ),
    })
  },

  resetWizard: () => set(initialState),

  // Initialize wizard with a pre-selected type, starting at promptType step
  initWithType: (type) => set({
    ...initialState,
    assetType: type,
    promptType: getDefaultPromptType(type),
    currentStep: "promptType",
  }),

  // Initialize wizard with type and prompt type, starting at generate step
  initWithTypeAndPrompt: (type, promptType) => set({
    ...initialState,
    assetType: type,
    promptType: promptType,
    currentStep: "generate",
  }),

  // Animation actions
  setAnimationConfig: (config) => set({ animationConfig: config }),
  setAnimationPreviewUrl: (url) => set({ animationPreviewUrl: url }),
}))
