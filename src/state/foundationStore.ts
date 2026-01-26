import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Foundation {
  id: string
  name: string
  description?: string
  colorPalette: string[]
  style: string | null
  mood: string | null
  typography: string | null
  tone: string | null
  moodImages: { id: string; url: string; name: string }[]
  projectCount: number
  createdAt: string
  updatedAt: string
}

interface FoundationState {
  foundations: Foundation[]
  addFoundation: (foundation: Foundation) => void
  updateFoundation: (id: string, data: Partial<Foundation>) => void
  removeFoundation: (id: string) => void
  duplicateFoundation: (id: string) => string | null
  incrementProjectCount: (id: string) => void
}

// Initial mock foundations
const initialFoundations: Foundation[] = [
  {
    id: "foundation-1",
    name: "Corporate Clean",
    description: "Professional and minimal aesthetic with blue accents",
    colorPalette: ["#1e3a5f", "#3b82f6", "#f8fafc", "#64748b"],
    style: "minimal",
    mood: "professional",
    typography: "modern",
    tone: "professional",
    moodImages: [],
    projectCount: 5,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "foundation-2",
    name: "Playful Social",
    description: "Vibrant colors and dynamic compositions for social media",
    colorPalette: ["#ec4899", "#8b5cf6", "#f97316", "#22c55e"],
    style: "bold",
    mood: "energetic",
    typography: "bold",
    tone: "casual",
    moodImages: [],
    projectCount: 3,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "foundation-3",
    name: "Tech Minimal",
    description: "Dark mode aesthetic with neon highlights",
    colorPalette: ["#0f0f0f", "#18181b", "#22d3ee", "#a855f7"],
    style: "minimal",
    mood: "innovative",
    typography: "modern",
    tone: "professional",
    moodImages: [],
    projectCount: 2,
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "foundation-4",
    name: "Warm Natural",
    description: "Earth tones and organic textures",
    colorPalette: ["#854d0e", "#a16207", "#fef3c7", "#365314"],
    style: "organic",
    mood: "calm",
    typography: "classic",
    tone: "friendly",
    moodImages: [],
    projectCount: 1,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

export const useFoundationStore = create<FoundationState>()(
  persist(
    (set) => ({
      foundations: initialFoundations,

      addFoundation: (foundation) =>
        set((state) => ({
          foundations: [foundation, ...state.foundations],
        })),

      updateFoundation: (id, data) =>
        set((state) => ({
          foundations: state.foundations.map((f) =>
            f.id === id ? { ...f, ...data, updatedAt: new Date().toISOString() } : f
          ),
        })),

      removeFoundation: (id) =>
        set((state) => ({
          foundations: state.foundations.filter((f) => f.id !== id),
        })),

      duplicateFoundation: (id) => {
        const state = useFoundationStore.getState()
        const foundation = state.foundations.find((f) => f.id === id)
        if (!foundation) return null

        const newId = `foundation-${Date.now()}`
        const duplicate: Foundation = {
          ...foundation,
          id: newId,
          name: `${foundation.name} (Copy)`,
          projectCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        set((state) => ({
          foundations: [duplicate, ...state.foundations],
        }))

        return newId
      },

      incrementProjectCount: (id) =>
        set((state) => ({
          foundations: state.foundations.map((f) =>
            f.id === id ? { ...f, projectCount: f.projectCount + 1 } : f
          ),
        })),
    }),
    {
      name: "dream-cloud-foundations",
    }
  )
)
