import { create } from "zustand"
import { getProjectWithRelations } from "@/services/projects"
import type { ProjectWithRelations } from "@/types/database"

// Workspace tab types
export type WorkspaceTab =
  | "brief"
  | "moodboard"
  | "storyboard"
  | "editor"
  | "scenes"
  | "assets"
  | "export"

// Tab metadata
export const WORKSPACE_TABS: {
  id: WorkspaceTab
  label: string
  icon: string
}[] = [
  { id: "brief", label: "Brief", icon: "FileText" },
  { id: "moodboard", label: "Mood", icon: "Palette" },
  { id: "storyboard", label: "Story", icon: "BookOpen" },
  { id: "editor", label: "Editor", icon: "Film" },
  { id: "scenes", label: "Scenes", icon: "Image" },
  { id: "assets", label: "Assets", icon: "Layers" },
  { id: "export", label: "Export", icon: "Download" },
]

// Asset categories for mood board and scene manager
export type AssetCategory =
  | "scene"
  | "stage"
  | "character"
  | "weather"
  | "prop"
  | "effect"
  | "audio"

export const ASSET_CATEGORIES: { id: AssetCategory; label: string; icon: string }[] = [
  { id: "scene", label: "Scenes", icon: "Mountain" },
  { id: "stage", label: "Stages", icon: "Square" },
  { id: "character", label: "Characters", icon: "User" },
  { id: "weather", label: "Weather", icon: "Cloud" },
  { id: "prop", label: "Props", icon: "Box" },
  { id: "effect", label: "Effects", icon: "Sparkles" },
  { id: "audio", label: "Audio", icon: "Volume2" },
]

// Project asset with category
export interface ProjectAsset {
  id: string
  name: string
  type: "image" | "video" | "audio"
  category: AssetCategory
  url: string
  thumbnailUrl?: string
  duration?: number // for video/audio
  createdAt: string
}

// Scene with shots
export interface Shot {
  id: string
  name: string
  description: string
  duration: number // seconds
  order: number
  // Assets used in this shot
  assets: {
    scene?: ProjectAsset
    stage?: ProjectAsset
    characters: ProjectAsset[]
    weather?: ProjectAsset
    props: ProjectAsset[]
    effects: ProjectAsset[]
  }
  // Generated/selected media for this shot
  media?: {
    type: "image" | "video"
    url: string
    thumbnailUrl?: string
  }
  // Notes for regeneration
  notes: string
}

export interface Scene {
  id: string
  name: string
  description: string
  order: number
  shots: Shot[]
  // Voiceover for this scene
  voiceover?: {
    id: string
    script: string
    audioUrl?: string
    duration?: number
  }
}

// Storyboard card (LLM-generated content)
export interface StoryboardCard {
  id: string
  title: string
  description: string
  content: string // Full LLM-generated content
  thumbnailUrl?: string
  order: number
}

// Aspect ratio type
export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5" | "4:3" | "21:9"

// Brief data
export interface ProjectBrief {
  name: string
  description: string
  audience: string
  tone: string
  duration: string
  aspectRatio: AspectRatio
  goals: string[]
}

// Export settings
export interface ExportSettings {
  resolution: "720p" | "1080p" | "4k"
  format: "mp4" | "webm" | "mov"
  frameRate: 24 | 30 | 60
  quality: "draft" | "standard" | "high"
}

// Full project state
export interface Project {
  id: string
  name: string
  brief: ProjectBrief
  assets: ProjectAsset[]
  scenes: Scene[]
  storyboardCards: StoryboardCard[]
  exportSettings: ExportSettings
  createdAt: string
  updatedAt: string
}

// Workspace state
interface WorkspaceState {
  // Current project
  project: Project | null
  isLoading: boolean

  // Navigation
  activeTab: WorkspaceTab
  setActiveTab: (tab: WorkspaceTab) => void

  // Storyboard
  selectedStoryboardCardId: string | null
  setSelectedStoryboardCard: (id: string | null) => void

  // Editor
  selectedSceneId: string | null
  selectedShotId: string | null
  isPlaying: boolean
  currentTime: number
  setSelectedScene: (id: string | null) => void
  setSelectedShot: (id: string | null) => void
  setIsPlaying: (playing: boolean) => void
  setCurrentTime: (time: number) => void

  // Scene Manager
  expandedSceneIds: string[]
  toggleSceneExpanded: (id: string) => void

  // Project actions
  loadProject: (projectId: string) => void
  updateBrief: (data: Partial<ProjectBrief>) => void
  addAsset: (asset: ProjectAsset) => void
  removeAsset: (assetId: string) => void
  updateAsset: (assetId: string, data: Partial<ProjectAsset>) => void
  addScene: (scene: Scene) => void
  updateScene: (sceneId: string, data: Partial<Scene>) => void
  removeScene: (sceneId: string) => void
  reorderScenes: (sceneIds: string[]) => void
  addShot: (sceneId: string, shot: Shot) => void
  updateShot: (sceneId: string, shotId: string, data: Partial<Shot>) => void
  removeShot: (sceneId: string, shotId: string) => void
  reorderShots: (sceneId: string, shotIds: string[]) => void
  addStoryboardCard: (card: StoryboardCard) => void
  updateStoryboardCard: (cardId: string, data: Partial<StoryboardCard>) => void
  removeStoryboardCard: (cardId: string) => void
  updateExportSettings: (settings: Partial<ExportSettings>) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  // Initial state
  project: null,
  isLoading: false,
  activeTab: "editor",
  selectedStoryboardCardId: null,
  selectedSceneId: null,
  selectedShotId: null,
  isPlaying: false,
  currentTime: 0,
  expandedSceneIds: [],

  // Navigation
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Storyboard
  setSelectedStoryboardCard: (id) => set({ selectedStoryboardCardId: id }),

  // Editor
  setSelectedScene: (id) => set({ selectedSceneId: id, selectedShotId: null }),
  setSelectedShot: (id) => set({ selectedShotId: id }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),

  // Scene Manager
  toggleSceneExpanded: (id) => {
    const { expandedSceneIds } = get()
    if (expandedSceneIds.includes(id)) {
      set({ expandedSceneIds: expandedSceneIds.filter((s) => s !== id) })
    } else {
      set({ expandedSceneIds: [...expandedSceneIds, id] })
    }
  },

  // Project actions
  loadProject: async (projectId) => {
    set({ isLoading: true })

    try {
      const dbProject = await getProjectWithRelations(projectId)

      if (!dbProject) {
        console.error("Project not found:", projectId)
        set({ isLoading: false, project: null })
        return
      }

      // Transform DB format to workspace format
      const project: Project = {
        id: dbProject.id,
        name: dbProject.name,
        brief: {
          name: dbProject.brief?.name || dbProject.name,
          description: dbProject.brief?.description || "",
          audience: dbProject.brief?.audience || "",
          tone: dbProject.brief?.tone || "",
          duration: dbProject.brief?.duration || "",
          aspectRatio: (dbProject.brief?.aspect_ratio as AspectRatio) || "16:9",
          goals: (dbProject.brief?.goals as string[]) || [],
        },
        assets: (dbProject.assets || []).map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type as "image" | "video" | "audio",
          category: (a.category || "scene") as AssetCategory,
          url: a.url,
          thumbnailUrl: a.thumbnail_url || undefined,
          duration: a.duration || undefined,
          createdAt: a.created_at,
        })),
        scenes: (dbProject.scenes || []).map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description || "",
          order: s.sort_order,
          shots: (s.shots || []).map((shot) => ({
            id: shot.id,
            name: shot.name,
            description: shot.description || "",
            duration: shot.duration,
            order: shot.sort_order,
            assets: {
              characters: [],
              props: [],
              effects: [],
            },
            media: shot.media_url
              ? {
                  type: (shot.media_type || "image") as "image" | "video",
                  url: shot.media_url,
                  thumbnailUrl: shot.media_thumbnail_url || undefined,
                }
              : undefined,
            notes: shot.notes || "",
          })),
          voiceover: s.voiceover_script
            ? {
                id: `vo-${s.id}`,
                script: s.voiceover_script,
                audioUrl: s.voiceover_audio_url || undefined,
                duration: s.voiceover_duration || undefined,
              }
            : undefined,
        })),
        storyboardCards: (dbProject.storyboard_cards || []).map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description || "",
          content: c.content || "",
          thumbnailUrl: c.thumbnail_url || undefined,
          order: c.sort_order,
        })),
        exportSettings: {
          resolution: (dbProject.export_settings?.resolution || "1080p") as "720p" | "1080p" | "4k",
          format: (dbProject.export_settings?.format || "mp4") as "mp4" | "webm" | "mov",
          frameRate: (dbProject.export_settings?.frame_rate || 30) as 24 | 30 | 60,
          quality: (dbProject.export_settings?.quality || "high") as "draft" | "standard" | "high",
        },
        createdAt: dbProject.created_at,
        updatedAt: dbProject.updated_at,
      }

      set({
        project,
        isLoading: false,
        expandedSceneIds: project.scenes.map((s) => s.id),
        selectedStoryboardCardId: project.storyboardCards[0]?.id || null,
      })
    } catch (error) {
      console.error("Error loading project:", error)
      set({ isLoading: false, project: null })
    }
  },

  updateBrief: (data) => {
    const { project } = get()
    if (!project) return
    set({
      project: {
        ...project,
        brief: { ...project.brief, ...data },
        updatedAt: new Date().toISOString(),
      },
    })
  },

  addAsset: (asset) => {
    const { project } = get()
    if (!project) return
    set({
      project: {
        ...project,
        assets: [...project.assets, asset],
        updatedAt: new Date().toISOString(),
      },
    })
  },

  removeAsset: (assetId) => {
    const { project } = get()
    if (!project) return
    set({
      project: {
        ...project,
        assets: project.assets.filter((a) => a.id !== assetId),
        updatedAt: new Date().toISOString(),
      },
    })
  },

  updateAsset: (assetId, data) => {
    const { project } = get()
    if (!project) return
    set({
      project: {
        ...project,
        assets: project.assets.map((a) => (a.id === assetId ? { ...a, ...data } : a)),
        updatedAt: new Date().toISOString(),
      },
    })
  },

  addScene: (scene) => {
    const { project } = get()
    if (!project) return
    set({
      project: {
        ...project,
        scenes: [...project.scenes, scene],
        updatedAt: new Date().toISOString(),
      },
    })
  },

  updateScene: (sceneId, data) => {
    const { project } = get()
    if (!project) return
    set({
      project: {
        ...project,
        scenes: project.scenes.map((s) => (s.id === sceneId ? { ...s, ...data } : s)),
        updatedAt: new Date().toISOString(),
      },
    })
  },

  removeScene: (sceneId) => {
    const { project } = get()
    if (!project) return
    set({
      project: {
        ...project,
        scenes: project.scenes.filter((s) => s.id !== sceneId),
        updatedAt: new Date().toISOString(),
      },
    })
  },

  reorderScenes: (sceneIds) => {
    const { project } = get()
    if (!project) return
    const reordered = sceneIds.map((id, index) => {
      const scene = project.scenes.find((s) => s.id === id)
      return scene ? { ...scene, order: index } : null
    }).filter(Boolean) as Scene[]
    set({
      project: {
        ...project,
        scenes: reordered,
        updatedAt: new Date().toISOString(),
      },
    })
  },

  addShot: (sceneId, shot) => {
    const { project } = get()
    if (!project) return
    set({
      project: {
        ...project,
        scenes: project.scenes.map((s) =>
          s.id === sceneId ? { ...s, shots: [...s.shots, shot] } : s
        ),
        updatedAt: new Date().toISOString(),
      },
    })
  },

  updateShot: (sceneId, shotId, data) => {
    const { project } = get()
    if (!project) return
    set({
      project: {
        ...project,
        scenes: project.scenes.map((s) =>
          s.id === sceneId
            ? {
                ...s,
                shots: s.shots.map((shot) =>
                  shot.id === shotId ? { ...shot, ...data } : shot
                ),
              }
            : s
        ),
        updatedAt: new Date().toISOString(),
      },
    })
  },

  removeShot: (sceneId, shotId) => {
    const { project } = get()
    if (!project) return
    set({
      project: {
        ...project,
        scenes: project.scenes.map((s) =>
          s.id === sceneId
            ? { ...s, shots: s.shots.filter((shot) => shot.id !== shotId) }
            : s
        ),
        updatedAt: new Date().toISOString(),
      },
    })
  },

  reorderShots: (sceneId, shotIds) => {
    const { project } = get()
    if (!project) return
    set({
      project: {
        ...project,
        scenes: project.scenes.map((s) => {
          if (s.id !== sceneId) return s
          const reordered = shotIds.map((id, index) => {
            const shot = s.shots.find((sh) => sh.id === id)
            return shot ? { ...shot, order: index } : null
          }).filter(Boolean) as Shot[]
          return { ...s, shots: reordered }
        }),
        updatedAt: new Date().toISOString(),
      },
    })
  },

  addStoryboardCard: (card) => {
    const { project } = get()
    if (!project) return
    set({
      project: {
        ...project,
        storyboardCards: [...project.storyboardCards, card],
        updatedAt: new Date().toISOString(),
      },
    })
  },

  updateStoryboardCard: (cardId, data) => {
    const { project } = get()
    if (!project) return
    set({
      project: {
        ...project,
        storyboardCards: project.storyboardCards.map((c) =>
          c.id === cardId ? { ...c, ...data } : c
        ),
        updatedAt: new Date().toISOString(),
      },
    })
  },

  removeStoryboardCard: (cardId) => {
    const { project } = get()
    if (!project) return
    set({
      project: {
        ...project,
        storyboardCards: project.storyboardCards.filter((c) => c.id !== cardId),
        updatedAt: new Date().toISOString(),
      },
    })
  },

  updateExportSettings: (settings) => {
    const { project } = get()
    if (!project) return
    set({
      project: {
        ...project,
        exportSettings: { ...project.exportSettings, ...settings },
        updatedAt: new Date().toISOString(),
      },
    })
  },
}))
