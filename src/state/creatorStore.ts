import { create } from "zustand"
import type { AssetDraft } from "@/services/claude"

export type AssetType = "image" | "video" | "audio" | "animation"

export interface CreatorState {
  // Draft data from AI
  draft: AssetDraft | null

  // Selected mode
  assetType: AssetType | null
  subMode: string | null

  // Original user prompt (before AI enhancement)
  originalPrompt: string

  // Loading state for draft generation
  isGeneratingDraft: boolean
  draftError: string | null

  // Actions
  setDraft: (draft: AssetDraft | null) => void
  setMode: (assetType: AssetType, subMode: string) => void
  setOriginalPrompt: (prompt: string) => void
  setIsGeneratingDraft: (loading: boolean) => void
  setDraftError: (error: string | null) => void

  // Clear all state (on successful generation or cancel)
  clearDraft: () => void
}

export const useCreatorStore = create<CreatorState>((set) => ({
  draft: null,
  assetType: null,
  subMode: null,
  originalPrompt: "",
  isGeneratingDraft: false,
  draftError: null,

  setDraft: (draft) => set({ draft }),

  setMode: (assetType, subMode) => set({ assetType, subMode }),

  setOriginalPrompt: (prompt) => set({ originalPrompt: prompt }),

  setIsGeneratingDraft: (loading) => set({ isGeneratingDraft: loading }),

  setDraftError: (error) => set({ draftError: error }),

  clearDraft: () => set({
    draft: null,
    assetType: null,
    subMode: null,
    originalPrompt: "",
    isGeneratingDraft: false,
    draftError: null,
  }),
}))
