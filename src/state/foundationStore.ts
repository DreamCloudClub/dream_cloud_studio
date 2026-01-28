import { create } from "zustand"
import {
  getFoundations,
  createFoundation as createFoundationDb,
  updateFoundation as updateFoundationDb,
  deleteFoundation as deleteFoundationDb,
  duplicateFoundation as duplicateFoundationDb,
  incrementFoundationProjectCount,
  type Foundation,
} from "@/services/foundations"

// Re-export the Foundation type from the service
export type { Foundation }

interface FoundationState {
  foundations: Foundation[]
  isLoading: boolean
  error: string | null

  // Actions
  loadFoundations: (userId: string) => Promise<void>
  addFoundation: (userId: string, data: {
    name: string
    description?: string
    colorPalette: string[]
    style: string | null
    mood: string | null
    typography: string | null
    tone: string | null
    moodImages: { id: string; url: string; name: string }[]
  }) => Promise<Foundation>
  updateFoundation: (id: string, data: Partial<{
    name: string
    description?: string
    colorPalette: string[]
    style: string | null
    mood: string | null
    typography: string | null
    tone: string | null
    moodImages: { id: string; url: string; name: string }[]
  }>) => Promise<void>
  removeFoundation: (id: string) => Promise<void>
  duplicateFoundation: (id: string, userId: string) => Promise<string | null>
  incrementProjectCount: (id: string) => Promise<void>
}

export const useFoundationStore = create<FoundationState>()((set, get) => ({
  foundations: [],
  isLoading: false,
  error: null,

  loadFoundations: async (userId: string) => {
    set({ isLoading: true, error: null })
    try {
      const foundations = await getFoundations(userId)
      set({ foundations, isLoading: false })
    } catch (error) {
      console.error("Error loading foundations:", error)
      set({ error: "Failed to load foundations", isLoading: false })
    }
  },

  addFoundation: async (userId, data) => {
    try {
      const foundation = await createFoundationDb({
        user_id: userId,
        name: data.name,
        description: data.description || null,
        color_palette: data.colorPalette,
        style: data.style,
        mood: data.mood,
        typography: data.typography,
        tone: data.tone,
        mood_images: data.moodImages,
      })

      set((state) => ({
        foundations: [foundation, ...state.foundations],
      }))

      return foundation
    } catch (error) {
      console.error("Error creating foundation:", error)
      throw error
    }
  },

  updateFoundation: async (id, data) => {
    try {
      const updateData: Parameters<typeof updateFoundationDb>[1] = {}

      if (data.name !== undefined) updateData.name = data.name
      if (data.description !== undefined) updateData.description = data.description
      if (data.colorPalette !== undefined) updateData.color_palette = data.colorPalette
      if (data.style !== undefined) updateData.style = data.style
      if (data.mood !== undefined) updateData.mood = data.mood
      if (data.typography !== undefined) updateData.typography = data.typography
      if (data.tone !== undefined) updateData.tone = data.tone
      if (data.moodImages !== undefined) updateData.mood_images = data.moodImages

      const updated = await updateFoundationDb(id, updateData)

      set((state) => ({
        foundations: state.foundations.map((f) =>
          f.id === id ? updated : f
        ),
      }))
    } catch (error) {
      console.error("Error updating foundation:", error)
      throw error
    }
  },

  removeFoundation: async (id) => {
    try {
      await deleteFoundationDb(id)
      set((state) => ({
        foundations: state.foundations.filter((f) => f.id !== id),
      }))
    } catch (error) {
      console.error("Error deleting foundation:", error)
      throw error
    }
  },

  duplicateFoundation: async (id, userId) => {
    try {
      const duplicate = await duplicateFoundationDb(id, userId)

      set((state) => ({
        foundations: [duplicate, ...state.foundations],
      }))

      return duplicate.id
    } catch (error) {
      console.error("Error duplicating foundation:", error)
      return null
    }
  },

  incrementProjectCount: async (id) => {
    try {
      await incrementFoundationProjectCount(id)

      set((state) => ({
        foundations: state.foundations.map((f) =>
          f.id === id ? { ...f, project_count: f.project_count + 1 } : f
        ),
      }))
    } catch (error) {
      console.error("Error incrementing project count:", error)
    }
  },
}))
