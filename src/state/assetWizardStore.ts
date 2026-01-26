import { create } from "zustand"
import type { Asset } from "@/types/database"

export type AssetType = "image" | "video" | "audio"
// Visual categories (for image/video) + Audio categories (for audio)
export type AssetCategory = "scene" | "stage" | "character" | "weather" | "prop" | "effect" | "music" | "sound_effect" | "voice"

export type AssetWizardStep = "type" | "category" | "prompt" | "generate" | "review"

export const ASSET_WIZARD_STEPS: { id: AssetWizardStep; label: string }[] = [
  { id: "type", label: "Type" },
  { id: "category", label: "Category" },
  { id: "prompt", label: "Describe" },
  { id: "generate", label: "Generate" },
  { id: "review", label: "Review" },
]

interface AssetWizardState {
  // Current step
  currentStep: AssetWizardStep

  // Asset data
  assetType: AssetType | null
  category: AssetCategory | null
  prompt: string
  negativePrompt: string
  stylePreset: string | null

  // Reference assets (for image-to-image, image-to-video)
  referenceAssets: Asset[]

  // Generated results
  generatedAssets: {
    id: string
    url: string
    thumbnailUrl?: string
    selected: boolean
  }[]

  // Actions
  setCurrentStep: (step: AssetWizardStep) => void
  nextStep: () => void
  prevStep: () => void
  setAssetType: (type: AssetType) => void
  setCategory: (category: AssetCategory) => void
  setPrompt: (prompt: string) => void
  setNegativePrompt: (prompt: string) => void
  setStylePreset: (preset: string | null) => void
  addReferenceAsset: (asset: Asset) => void
  removeReferenceAsset: (assetId: string) => void
  setGeneratedAssets: (assets: AssetWizardState["generatedAssets"]) => void
  toggleAssetSelection: (id: string) => void
  resetWizard: () => void
}

const initialState = {
  currentStep: "type" as AssetWizardStep,
  assetType: null,
  category: null,
  prompt: "",
  negativePrompt: "",
  stylePreset: null,
  referenceAssets: [] as Asset[],
  generatedAssets: [],
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

  setAssetType: (type) => set({ assetType: type }),
  setCategory: (category) => set({ category }),
  setPrompt: (prompt) => set({ prompt }),
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
}))
