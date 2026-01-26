import { create } from "zustand"
import { persist } from "zustand/middleware"

export type AssetType = "image" | "video" | "audio"
export type AssetCategory = "scene" | "stage" | "character" | "weather" | "prop" | "effect" | "audio"

export interface LibraryAsset {
  id: string
  name: string
  type: AssetType
  category: AssetCategory
  url: string
  thumbnailUrl?: string
  duration?: number
  createdAt: string
}

interface LibraryState {
  assets: LibraryAsset[]
  addAsset: (asset: LibraryAsset) => void
  addAssets: (assets: LibraryAsset[]) => void
  removeAsset: (id: string) => void
  updateAsset: (id: string, data: Partial<LibraryAsset>) => void
}

// Initial mock assets
const initialAssets: LibraryAsset[] = [
  // Scenes
  { id: "all-1", name: "Sunset Beach", type: "image", category: "scene", url: "", createdAt: new Date().toISOString() },
  { id: "all-2", name: "City Skyline", type: "image", category: "scene", url: "", createdAt: new Date().toISOString() },
  { id: "all-3", name: "Mountain Vista", type: "image", category: "scene", url: "", createdAt: new Date().toISOString() },
  { id: "all-4", name: "Office Interior", type: "image", category: "scene", url: "", createdAt: new Date().toISOString() },
  { id: "all-5", name: "Forest Path", type: "video", category: "scene", url: "", duration: 10, createdAt: new Date().toISOString() },
  // Stages
  { id: "all-6", name: "Presentation Stage", type: "image", category: "stage", url: "", createdAt: new Date().toISOString() },
  { id: "all-7", name: "Modern Table", type: "image", category: "stage", url: "", createdAt: new Date().toISOString() },
  // Characters
  { id: "all-8", name: "Business Professional", type: "image", category: "character", url: "", createdAt: new Date().toISOString() },
  { id: "all-9", name: "Tech Enthusiast", type: "image", category: "character", url: "", createdAt: new Date().toISOString() },
  { id: "all-10", name: "Walking Person", type: "video", category: "character", url: "", duration: 5, createdAt: new Date().toISOString() },
  // Weather
  { id: "all-11", name: "Sunny Day", type: "image", category: "weather", url: "", createdAt: new Date().toISOString() },
  { id: "all-12", name: "Rain Effect", type: "video", category: "weather", url: "", duration: 8, createdAt: new Date().toISOString() },
  // Props
  { id: "all-13", name: "Laptop", type: "image", category: "prop", url: "", createdAt: new Date().toISOString() },
  { id: "all-14", name: "Coffee Mug", type: "image", category: "prop", url: "", createdAt: new Date().toISOString() },
  { id: "all-15", name: "Smartphone", type: "image", category: "prop", url: "", createdAt: new Date().toISOString() },
  // Effects
  { id: "all-16", name: "Lens Flare", type: "video", category: "effect", url: "", duration: 3, createdAt: new Date().toISOString() },
  { id: "all-17", name: "Particle Burst", type: "video", category: "effect", url: "", duration: 2, createdAt: new Date().toISOString() },
  // Audio
  { id: "all-18", name: "Upbeat Background", type: "audio", category: "audio", url: "", duration: 120, createdAt: new Date().toISOString() },
  { id: "all-19", name: "Ambient Office", type: "audio", category: "audio", url: "", duration: 60, createdAt: new Date().toISOString() },
  { id: "all-20", name: "Click Sound", type: "audio", category: "audio", url: "", duration: 1, createdAt: new Date().toISOString() },
]

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set) => ({
      assets: initialAssets,

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
    }),
    {
      name: "dream-cloud-library",
    }
  )
)
