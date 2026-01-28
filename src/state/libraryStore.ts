import { create } from "zustand"
import { getAssets } from "@/services/assets"
import type { Asset } from "@/types/database"

export type AssetType = "image" | "video" | "audio"
export type AssetCategory = "scene" | "stage" | "character" | "weather" | "prop" | "effect" | "music" | "sound_effect" | "voice"

export interface LibraryAsset {
  id: string
  name: string
  type: AssetType
  category: AssetCategory
  url: string
  localPath?: string
  storageType?: "local" | "cloud"
  duration?: number
  userDescription?: string
  aiPrompt?: string
  generationModel?: string
  createdAt: string
}

interface LibraryState {
  assets: LibraryAsset[]
  isLoading: boolean
  error: string | null
  loadAssets: (userId: string) => Promise<void>
  addAsset: (asset: LibraryAsset) => void
  addAssets: (assets: LibraryAsset[]) => void
  removeAsset: (id: string) => void
  updateAsset: (id: string, data: Partial<LibraryAsset>) => void
  clearAssets: () => void
}

// Convert database Asset to LibraryAsset
function toLibraryAsset(asset: Asset): LibraryAsset {
  return {
    id: asset.id,
    name: asset.name,
    type: asset.type as AssetType,
    category: (asset.category || "scene") as AssetCategory,
    url: asset.url || "",
    localPath: asset.local_path || undefined,
    storageType: (asset.storage_type || "cloud") as "local" | "cloud",
    duration: asset.duration || undefined,
    userDescription: asset.user_description || undefined,
    aiPrompt: asset.ai_prompt || undefined,
    generationModel: asset.generation_model || undefined,
    createdAt: asset.created_at,
  }
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  assets: [],
  isLoading: false,
  error: null,

  loadAssets: async (userId: string) => {
    set({ isLoading: true, error: null })
    try {
      const dbAssets = await getAssets(userId)
      const libraryAssets = dbAssets.map(toLibraryAsset)
      set({ assets: libraryAssets, isLoading: false })
    } catch (err) {
      console.error("Failed to load assets:", err)
      set({
        error: err instanceof Error ? err.message : "Failed to load assets",
        isLoading: false
      })
    }
  },

  addAsset: (asset) =>
    set((state) => ({
      assets: [asset, ...state.assets],
    })),

  addAssets: (assets) =>
    set((state) => ({
      assets: [...assets, ...state.assets],
    })),

  removeAsset: (id) =>
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== id),
    })),

  updateAsset: (id, data) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === id ? { ...a, ...data } : a
      ),
    })),

  clearAssets: () => set({ assets: [] }),
}))
