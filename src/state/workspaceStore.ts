import { create } from "zustand"
import type { PanDirection } from "@/remotion/components"
import {
  getProjectWithRelations,
  updateProject,
  updateProjectBrief,
  createProjectBrief,
  getProjectBrief,
  updateMoodBoard,
  createMoodBoard,
  getMoodBoard,
  createStoryboardCard,
  updateStoryboardCard as updateStoryboardCardDb,
  deleteStoryboardCard,
  updateExportSettings as updateExportSettingsDb,
  createExportSettings,
  upsertProjectComposition,
} from "@/services/projects"
import { createAsset, updateAsset as updateAssetDb, deleteAsset } from "@/services/assets"
import {
  getClips,
  addClip as addClipDb,
  moveClip as moveClipDb,
  trimClip as trimClipDb,
  splitClip as splitClipDb,
  deleteClip as deleteClipDb,
  setClipVolume as setClipVolumeDb,
  setClipAnimation as setClipAnimationDb,
  appendClip as appendClipDb,
} from "@/services/timeline"
import type { Json, Asset } from "@/types/database"
import type { TimelineClip, ClipAnimation, Timeline } from "@/types/timeline"

// ============================================
// WORKSPACE TAB TYPES
// ============================================

export type WorkspaceTab =
  | "brief"
  | "script"
  | "moodboard"
  | "storyboard"
  | "platform"
  | "editor"
  | "assets"
  | "export"

export const WORKSPACE_TABS: {
  id: WorkspaceTab
  label: string
  icon: string
}[] = [
  { id: "platform", label: "Platform", icon: "FolderOpen" },
  { id: "brief", label: "Brief", icon: "FileText" },
  { id: "script", label: "Script", icon: "ScrollText" },
  { id: "moodboard", label: "Mood", icon: "Palette" },
  { id: "storyboard", label: "Story", icon: "BookOpen" },
  { id: "editor", label: "Editor", icon: "Film" },
  { id: "assets", label: "Assets", icon: "Layers" },
  { id: "export", label: "Export", icon: "Download" },
]

// Re-export PanDirection for easy access
export type { PanDirection } from "@/remotion/components"

// Available pan directions for clips
export const PAN_DIRECTIONS: { value: PanDirection; label: string; description: string }[] = [
  { value: "none", label: "None", description: "Static center crop" },
  { value: "zoom-in", label: "Zoom In", description: "Push into center" },
  { value: "zoom-out", label: "Zoom Out", description: "Pull back from center" },
  { value: "left-to-right", label: "Pan Right", description: "Move left to right" },
  { value: "right-to-left", label: "Pan Left", description: "Move right to left" },
  { value: "top-to-bottom", label: "Pan Down", description: "Move top to bottom" },
  { value: "bottom-to-top", label: "Pan Up", description: "Move bottom to top" },
  { value: "top-left-to-bottom-right", label: "Diagonal ↘", description: "Top-left to bottom-right" },
  { value: "bottom-right-to-top-left", label: "Diagonal ↖", description: "Bottom-right to top-left" },
]

// ============================================
// ASSET TYPES
// ============================================

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

export interface ProjectAsset {
  id: string
  name: string
  type: "image" | "video" | "audio" | "animation"
  category: AssetCategory
  url: string | null
  localPath?: string | null
  storageType: "local" | "cloud"
  duration?: number
  userDescription?: string | null
  aiPrompt?: string | null
  generationModel?: string | null
  createdAt: string
}

// ============================================
// TIMELINE CLIP WITH ASSET (for UI)
// ============================================

export interface TimelineClipWithAsset extends TimelineClip {
  asset?: ProjectAsset
}

// ============================================
// STORYBOARD & SCRIPT TYPES
// ============================================

export interface StoryboardCard {
  id: string
  title: string
  description: string
  content: string
  thumbnailUrl?: string
  order: number
}

export interface ScriptSection {
  id: string
  type: "description" | "dialogue" | "action" | "transition"
  content: string
  sceneContext?: string
  isNewScene: boolean
  characterId?: string
  characterName?: string
  order: number
}

// Simple script data (title, subtitle, content)
export interface Script {
  title: string
  subtitle: string
  content: string
}

// ============================================
// PROJECT TYPES
// ============================================

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5" | "4:3" | "21:9"

export interface ProjectBrief {
  name: string
  description: string
  audience: string
  tone: string
  duration: string
  aspectRatio: AspectRatio
  goals: string[]
  videoContent?: {
    characters: string[]
    setting: string
    timeOfDay: string
    weather: string
    action: string
    props: string[]
    dialogue: string
  }
  audioPlans?: {
    voiceoverScript?: string
    musicStyle?: string
    soundEffects?: string[]
  }
}

export interface ExportSettings {
  resolution: "720p" | "1080p" | "4k"
  format: "mp4" | "webm" | "mov"
  frameRate: 24 | 30 | 60
  quality: "draft" | "standard" | "high"
}

export interface MoodBoardData {
  images: { id: string; url: string; name: string }[]
  colors: string[]
  keywords: string[]
  foundationId?: string
}

export interface CompositionData {
  titleCard?: {
    text: string
    subtitle?: string
    font?: string
    animation?: string
    backgroundColor?: string
  }
  outroCard?: {
    text: string
    subtitle?: string
    animation?: string
  }
  defaultTransition: string
  transitionDuration: number
  textOverlays: Array<{
    id: string
    text: string
    position?: string
    animation?: string
    clipId?: string
    startTime?: number
    duration?: number
  }>
}

// ============================================
// PROJECT STATE
// ============================================

export interface Project {
  id: string
  userId: string
  name: string
  platform_id: string | null
  brief: ProjectBrief
  moodBoard: MoodBoardData
  assets: ProjectAsset[]
  timeline: Timeline
  storyboardCards: StoryboardCard[]
  scriptSections: ScriptSection[]
  script: Script
  exportSettings: ExportSettings
  composition: CompositionData
  createdAt: string
  updatedAt: string
}

// ============================================
// EDITOR NOTE TYPE
// ============================================

export interface EditorNote {
  id: string
  content: string
  createdAt: string
}

// ============================================
// WORKSPACE STORE
// ============================================

interface WorkspaceState {
  // Current project
  project: Project | null
  isLoading: boolean

  // Save state
  isSaving: boolean
  saveStatus: "idle" | "saving" | "saved"
  handleSave: () => Promise<void>

  // Navigation
  activeTab: WorkspaceTab
  setActiveTab: (tab: WorkspaceTab) => void

  // Control Panel UI state (persists across navigation)
  controlPanelTab: "properties" | "notes" | "assets"
  setControlPanelTab: (tab: "properties" | "notes" | "assets") => void

  // Asset Creation Mode
  assetCreationMode: boolean
  assetCreationType: "image" | "video" | "audio" | "animation" | null
  startAssetCreation: (type?: "image" | "video" | "audio" | "animation") => void
  clearAssetCreationMode: () => void

  // Storyboard
  selectedStoryboardCardId: string | null
  setSelectedStoryboardCard: (id: string | null) => void

  // Editor - Timeline selection
  selectedClipId: string | null
  isPlaying: boolean
  currentTime: number
  setSelectedClip: (id: string | null) => void
  setIsPlaying: (playing: boolean) => void
  setCurrentTime: (time: number) => void

  // Editor - Notes (session-based, not persisted)
  editorNotes: EditorNote[]
  addEditorNote: (content: string) => void
  deleteEditorNote: (noteId: string) => void

  // Project actions
  loadProject: (projectId: string) => Promise<void>
  updateBrief: (data: Partial<ProjectBrief>) => Promise<void>
  updateMoodBoard: (data: Partial<MoodBoardData>) => Promise<void>
  addAsset: (asset: Omit<ProjectAsset, "id" | "createdAt">, userId: string) => Promise<void>
  removeAsset: (assetId: string) => Promise<void>
  updateAsset: (assetId: string, data: Partial<ProjectAsset>) => Promise<void>

  // Timeline actions (core editing operations)
  addClip: (assetId: string, startTime: number, options?: { duration?: number; inPoint?: number }) => Promise<string>
  appendClip: (assetId: string) => Promise<string>
  moveClip: (clipId: string, startTime: number) => Promise<void>
  trimClip: (clipId: string, inPoint?: number, duration?: number) => Promise<void>
  splitClip: (clipId: string, splitAt: number) => Promise<string>
  deleteClip: (clipId: string) => Promise<void>
  setClipVolume: (clipId: string, volume: number) => Promise<void>
  setClipAnimation: (clipId: string, animation: ClipAnimation) => Promise<void>

  // Storyboard actions
  addStoryboardCard: (card: Omit<StoryboardCard, "id">) => Promise<void>
  updateStoryboardCard: (cardId: string, data: Partial<StoryboardCard>) => Promise<void>
  removeStoryboardCard: (cardId: string) => Promise<void>

  // Script actions
  updateScript: (data: Partial<Script>) => Promise<void>

  // Settings actions
  updateExportSettings: (settings: Partial<ExportSettings>) => Promise<void>
  updateComposition: (data: Partial<CompositionData>) => Promise<void>
  saveAll: () => Promise<void>
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  // Initial state
  project: null,
  isLoading: false,
  isSaving: false,
  saveStatus: "idle",
  activeTab: "editor",
  controlPanelTab: "properties",
  assetCreationMode: false,
  assetCreationType: null,
  selectedStoryboardCardId: null,
  selectedClipId: null,
  isPlaying: false,
  currentTime: 0,
  editorNotes: [],

  // Navigation
  setActiveTab: (tab) => set({ activeTab: tab }),
  setControlPanelTab: (tab) => set({ controlPanelTab: tab }),

  // Asset Creation Mode
  startAssetCreation: (type) => set({
    assetCreationMode: true,
    assetCreationType: type || null,
    activeTab: "assets"
  }),
  clearAssetCreationMode: () => set({ assetCreationMode: false, assetCreationType: null }),

  // Save handler
  handleSave: async () => {
    const { project, saveAll } = get()
    if (!project) return

    set({ isSaving: true, saveStatus: "saving" })
    try {
      await saveAll()
      set({ saveStatus: "saved" })
      setTimeout(() => set({ saveStatus: "idle" }), 2000)
    } catch (error) {
      console.error("Failed to save:", error)
      set({ saveStatus: "idle" })
    } finally {
      set({ isSaving: false })
    }
  },

  // Storyboard
  setSelectedStoryboardCard: (id) => set({ selectedStoryboardCardId: id }),

  // Editor
  setSelectedClip: (id) => set({ selectedClipId: id }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),

  // Editor Notes (session-based)
  addEditorNote: (content) => {
    const newNote: EditorNote = {
      id: crypto.randomUUID(),
      content,
      createdAt: new Date().toISOString(),
    }
    set((state) => ({
      editorNotes: [newNote, ...state.editorNotes],
    }))
  },
  deleteEditorNote: (noteId) => {
    set((state) => ({
      editorNotes: state.editorNotes.filter((n) => n.id !== noteId),
    }))
  },

  // ============================================
  // PROJECT LOADING
  // ============================================

  loadProject: async (projectId) => {
    set({ isLoading: true })

    try {
      const dbProject = await getProjectWithRelations(projectId)

      if (!dbProject) {
        console.error("Project not found:", projectId)
        set({ isLoading: false, project: null })
        return
      }

      // Load timeline clips
      const clips = await getClips(projectId)

      // Transform assets
      const assets: ProjectAsset[] = (dbProject.assets || []).map((a: Asset) => ({
        id: a.id,
        name: a.name,
        type: a.type as "image" | "video" | "audio" | "animation",
        category: (a.category || "scene") as AssetCategory,
        url: a.url,
        localPath: a.local_path || undefined,
        storageType: (a.storage_type || "cloud") as "local" | "cloud",
        duration: a.duration || undefined,
        userDescription: a.user_description || undefined,
        aiPrompt: a.ai_prompt || undefined,
        generationModel: a.generation_model || undefined,
        createdAt: a.created_at,
      }))

      // Build project
      const project: Project = {
        id: dbProject.id,
        userId: dbProject.user_id,
        name: dbProject.name,
        platform_id: dbProject.platform_id,
        brief: {
          name: dbProject.brief?.name || dbProject.name,
          description: dbProject.brief?.description || "",
          audience: dbProject.brief?.audience || "",
          tone: dbProject.brief?.tone || "",
          duration: dbProject.brief?.duration || "",
          aspectRatio: (dbProject.brief?.aspect_ratio as AspectRatio) || "16:9",
          goals: (dbProject.brief?.goals as string[]) || [],
          videoContent: dbProject.brief?.video_content
            ? (dbProject.brief.video_content as ProjectBrief["videoContent"])
            : undefined,
          audioPlans: dbProject.brief?.audio_plans
            ? (dbProject.brief.audio_plans as ProjectBrief["audioPlans"])
            : undefined,
        },
        moodBoard: {
          images: (dbProject.mood_board?.images as MoodBoardData["images"]) || [],
          colors: (dbProject.mood_board?.colors as string[]) || [],
          keywords: (dbProject.mood_board?.keywords as string[]) || [],
          foundationId: (dbProject.mood_board as any)?.foundation_id || undefined,
        },
        assets,
        timeline: { clips },
        storyboardCards: (dbProject.storyboard_cards || []).map((c: any) => ({
          id: c.id,
          title: c.title,
          description: c.description || "",
          content: c.content || "",
          thumbnailUrl: c.thumbnail_url || undefined,
          order: c.sort_order,
        })),
        scriptSections: (dbProject.script_sections || []).map((s: any) => ({
          id: s.id,
          type: s.type || "description",
          content: s.content || "",
          sceneContext: s.scene_context || undefined,
          isNewScene: s.is_new_scene || false,
          characterId: s.character_id || undefined,
          characterName: s.character?.name || undefined,
          order: s.sort_order,
        })),
        script: {
          title: dbProject.brief?.script_title || "",
          subtitle: dbProject.brief?.script_subtitle || "",
          content: dbProject.brief?.script_content || "",
        },
        exportSettings: {
          resolution: (dbProject.export_settings?.resolution || "1080p") as "720p" | "1080p" | "4k",
          format: (dbProject.export_settings?.format || "mp4") as "mp4" | "webm" | "mov",
          frameRate: (dbProject.export_settings?.frame_rate || 30) as 24 | 30 | 60,
          quality: (dbProject.export_settings?.quality || "high") as "draft" | "standard" | "high",
        },
        composition: dbProject.composition
          ? {
              titleCard: dbProject.composition.title_card
                ? (dbProject.composition.title_card as CompositionData["titleCard"])
                : undefined,
              outroCard: dbProject.composition.outro_card
                ? (dbProject.composition.outro_card as CompositionData["outroCard"])
                : undefined,
              defaultTransition: dbProject.composition.default_transition || "fade",
              transitionDuration: dbProject.composition.transition_duration || 0.5,
              textOverlays: (dbProject.composition.text_overlays as CompositionData["textOverlays"]) || [],
            }
          : {
              defaultTransition: "fade",
              transitionDuration: 0.5,
              textOverlays: [],
            },
        createdAt: dbProject.created_at,
        updatedAt: dbProject.updated_at,
      }

      set({
        project,
        isLoading: false,
        selectedStoryboardCardId: project.storyboardCards[0]?.id || null,
      })
    } catch (error) {
      console.error("Error loading project:", error)
      set({ isLoading: false, project: null })
    }
  },

  // ============================================
  // BRIEF & MOOD BOARD
  // ============================================

  updateBrief: async (data) => {
    const { project } = get()
    if (!project) return

    const updatedBrief = { ...project.brief, ...data }
    set({
      project: {
        ...project,
        brief: updatedBrief,
        updatedAt: new Date().toISOString(),
      },
    })

    try {
      const dbData: Record<string, unknown> = {}
      if (data.name !== undefined) dbData.name = data.name
      if (data.description !== undefined) dbData.description = data.description
      if (data.audience !== undefined) dbData.audience = data.audience
      if (data.tone !== undefined) dbData.tone = data.tone
      if (data.duration !== undefined) dbData.duration = data.duration
      if (data.aspectRatio !== undefined) dbData.aspect_ratio = data.aspectRatio
      if (data.goals !== undefined) dbData.goals = data.goals
      if (data.videoContent !== undefined) dbData.video_content = data.videoContent
      if (data.audioPlans !== undefined) dbData.audio_plans = data.audioPlans

      if (data.name !== undefined) {
        await updateProject(project.id, { name: data.name || "Untitled Project" })
      }

      const existingBrief = await getProjectBrief(project.id)
      if (existingBrief) {
        await updateProjectBrief(project.id, dbData)
      } else {
        await createProjectBrief({
          project_id: project.id,
          name: updatedBrief.name,
          description: updatedBrief.description,
          audience: updatedBrief.audience,
          tone: updatedBrief.tone,
          duration: updatedBrief.duration,
          aspect_ratio: updatedBrief.aspectRatio,
          goals: updatedBrief.goals as Json,
          video_content: updatedBrief.videoContent as Json,
          audio_plans: updatedBrief.audioPlans as Json,
        })
      }
    } catch (error) {
      console.error("Failed to save brief:", error)
      throw error
    }
  },

  updateMoodBoard: async (data) => {
    const { project } = get()
    if (!project) return

    const updatedMoodBoard = { ...project.moodBoard, ...data }
    set({
      project: {
        ...project,
        moodBoard: updatedMoodBoard,
        updatedAt: new Date().toISOString(),
      },
    })

    try {
      const dbData = {
        images: updatedMoodBoard.images as unknown as Json,
        colors: updatedMoodBoard.colors as unknown as Json,
        keywords: updatedMoodBoard.keywords as unknown as Json,
        foundation_id: updatedMoodBoard.foundationId || null,
      }

      const existing = await getMoodBoard(project.id)
      if (existing) {
        await updateMoodBoard(project.id, dbData)
      } else {
        await createMoodBoard({ project_id: project.id, ...dbData })
      }
    } catch (error) {
      console.error("Failed to save mood board:", error)
    }
  },

  // ============================================
  // ASSET MANAGEMENT
  // ============================================

  addAsset: async (asset, userId) => {
    const { project } = get()
    if (!project) return

    try {
      type DbAssetCategory = "scene" | "stage" | "character" | "weather" | "prop" | "effect" | "music" | "sound_effect" | "voice"
      const dbAsset = await createAsset({
        user_id: userId,
        project_id: project.id,
        name: asset.name,
        type: asset.type,
        category: asset.category as DbAssetCategory,
        url: asset.url || null,
        duration: asset.duration,
        storage_type: asset.storageType,
        local_path: asset.localPath,
        user_description: asset.userDescription,
        ai_prompt: asset.aiPrompt,
        generation_model: asset.generationModel,
      })

      const newAsset: ProjectAsset = {
        id: dbAsset.id,
        name: dbAsset.name,
        type: dbAsset.type as "image" | "video" | "audio" | "animation",
        category: (dbAsset.category || "scene") as AssetCategory,
        url: dbAsset.url,
        localPath: dbAsset.local_path || undefined,
        storageType: (dbAsset.storage_type || "cloud") as "local" | "cloud",
        duration: dbAsset.duration || undefined,
        userDescription: dbAsset.user_description || undefined,
        aiPrompt: dbAsset.ai_prompt || undefined,
        generationModel: dbAsset.generation_model || undefined,
        createdAt: dbAsset.created_at,
      }

      set({
        project: {
          ...project,
          assets: [...project.assets, newAsset],
          updatedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error("Failed to add asset:", error)
    }
  },

  removeAsset: async (assetId) => {
    const { project } = get()
    if (!project) return

    set({
      project: {
        ...project,
        assets: project.assets.filter((a) => a.id !== assetId),
        updatedAt: new Date().toISOString(),
      },
    })

    try {
      await deleteAsset(assetId)
    } catch (error) {
      console.error("Failed to delete asset:", error)
    }
  },

  updateAsset: async (assetId, data) => {
    const { project } = get()
    if (!project) return

    set({
      project: {
        ...project,
        assets: project.assets.map((a) => (a.id === assetId ? { ...a, ...data } : a)),
        updatedAt: new Date().toISOString(),
      },
    })

    try {
      const dbData: Record<string, unknown> = {}
      if (data.name !== undefined) dbData.name = data.name
      if (data.category !== undefined) dbData.category = data.category
      if (data.url !== undefined) dbData.url = data.url
      if (data.duration !== undefined) dbData.duration = data.duration

      await updateAssetDb(assetId, dbData)
    } catch (error) {
      console.error("Failed to update asset:", error)
    }
  },

  // ============================================
  // TIMELINE EDITING OPERATIONS
  // ============================================

  addClip: async (assetId, startTime, options) => {
    const { project } = get()
    if (!project) throw new Error("No project loaded")

    const clip = await addClipDb(project.id, assetId, startTime, options)

    set({
      project: {
        ...project,
        timeline: {
          clips: [...project.timeline.clips, clip].sort((a, b) => a.startTime - b.startTime),
        },
        updatedAt: new Date().toISOString(),
      },
    })

    return clip.id
  },

  appendClip: async (assetId) => {
    const { project } = get()
    if (!project) throw new Error("No project loaded")

    const clip = await appendClipDb(project.id, assetId)

    set({
      project: {
        ...project,
        timeline: {
          clips: [...project.timeline.clips, clip].sort((a, b) => a.startTime - b.startTime),
        },
        updatedAt: new Date().toISOString(),
      },
    })

    return clip.id
  },

  moveClip: async (clipId, startTime) => {
    const { project } = get()
    if (!project) return

    // Optimistic update
    set({
      project: {
        ...project,
        timeline: {
          clips: project.timeline.clips
            .map((c) => (c.id === clipId ? { ...c, startTime } : c))
            .sort((a, b) => a.startTime - b.startTime),
        },
        updatedAt: new Date().toISOString(),
      },
    })

    try {
      await moveClipDb(clipId, startTime)
    } catch (error) {
      console.error("Failed to move clip:", error)
      // Reload to sync state
      await get().loadProject(project.id)
    }
  },

  trimClip: async (clipId, inPoint, duration) => {
    const { project } = get()
    if (!project) return

    // Optimistic update
    set({
      project: {
        ...project,
        timeline: {
          clips: project.timeline.clips.map((c) =>
            c.id === clipId
              ? {
                  ...c,
                  inPoint: inPoint ?? c.inPoint,
                  duration: duration ?? c.duration,
                }
              : c
          ),
        },
        updatedAt: new Date().toISOString(),
      },
    })

    try {
      await trimClipDb(clipId, inPoint, duration)
    } catch (error) {
      console.error("Failed to trim clip:", error)
      await get().loadProject(project.id)
    }
  },

  splitClip: async (clipId, splitAt) => {
    const { project } = get()
    if (!project) throw new Error("No project loaded")

    const { original, newClip } = await splitClipDb(clipId, splitAt)

    set({
      project: {
        ...project,
        timeline: {
          clips: project.timeline.clips
            .map((c) => (c.id === clipId ? original : c))
            .concat([newClip])
            .sort((a, b) => a.startTime - b.startTime),
        },
        updatedAt: new Date().toISOString(),
      },
    })

    return newClip.id
  },

  deleteClip: async (clipId) => {
    const { project, selectedClipId } = get()
    if (!project) return

    // Clear selection if deleting selected clip
    if (selectedClipId === clipId) {
      set({ selectedClipId: null })
    }

    // Optimistic update
    set({
      project: {
        ...project,
        timeline: {
          clips: project.timeline.clips.filter((c) => c.id !== clipId),
        },
        updatedAt: new Date().toISOString(),
      },
    })

    try {
      await deleteClipDb(clipId)
    } catch (error) {
      console.error("Failed to delete clip:", error)
      await get().loadProject(project.id)
    }
  },

  setClipVolume: async (clipId, volume) => {
    const { project } = get()
    if (!project) return

    set({
      project: {
        ...project,
        timeline: {
          clips: project.timeline.clips.map((c) =>
            c.id === clipId ? { ...c, volume } : c
          ),
        },
        updatedAt: new Date().toISOString(),
      },
    })

    try {
      await setClipVolumeDb(clipId, volume)
    } catch (error) {
      console.error("Failed to set clip volume:", error)
    }
  },

  setClipAnimation: async (clipId, animation) => {
    const { project } = get()
    if (!project) return

    set({
      project: {
        ...project,
        timeline: {
          clips: project.timeline.clips.map((c) =>
            c.id === clipId ? { ...c, animation } : c
          ),
        },
        updatedAt: new Date().toISOString(),
      },
    })

    try {
      await setClipAnimationDb(clipId, animation)
    } catch (error) {
      console.error("Failed to set clip animation:", error)
    }
  },

  // ============================================
  // STORYBOARD
  // ============================================

  addStoryboardCard: async (card) => {
    const { project } = get()
    if (!project) return

    try {
      const dbCard = await createStoryboardCard({
        project_id: project.id,
        title: card.title,
        description: card.description,
        content: card.content,
        thumbnail_url: card.thumbnailUrl,
        sort_order: card.order,
      })

      const newCard: StoryboardCard = {
        ...card,
        id: dbCard.id,
      }

      set({
        project: {
          ...project,
          storyboardCards: [...project.storyboardCards, newCard],
          updatedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error("Failed to add storyboard card:", error)
    }
  },

  updateStoryboardCard: async (cardId, data) => {
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

    try {
      const dbData: Record<string, unknown> = {}
      if (data.title !== undefined) dbData.title = data.title
      if (data.description !== undefined) dbData.description = data.description
      if (data.content !== undefined) dbData.content = data.content
      if (data.thumbnailUrl !== undefined) dbData.thumbnail_url = data.thumbnailUrl
      if (data.order !== undefined) dbData.sort_order = data.order

      await updateStoryboardCardDb(cardId, dbData)
    } catch (error) {
      console.error("Failed to update storyboard card:", error)
    }
  },

  removeStoryboardCard: async (cardId) => {
    const { project } = get()
    if (!project) return

    set({
      project: {
        ...project,
        storyboardCards: project.storyboardCards.filter((c) => c.id !== cardId),
        updatedAt: new Date().toISOString(),
      },
    })

    try {
      await deleteStoryboardCard(cardId)
    } catch (error) {
      console.error("Failed to delete storyboard card:", error)
    }
  },

  // ============================================
  // SETTINGS
  // ============================================

  updateExportSettings: async (settings) => {
    const { project } = get()
    if (!project) return

    const updatedSettings = { ...project.exportSettings, ...settings }
    set({
      project: {
        ...project,
        exportSettings: updatedSettings,
        updatedAt: new Date().toISOString(),
      },
    })

    try {
      const dbData: Record<string, unknown> = {}
      if (settings.resolution !== undefined) dbData.resolution = settings.resolution
      if (settings.format !== undefined) dbData.format = settings.format
      if (settings.frameRate !== undefined) dbData.frame_rate = settings.frameRate
      if (settings.quality !== undefined) dbData.quality = settings.quality

      await updateExportSettingsDb(project.id, dbData)
    } catch (error) {
      console.error("Failed to update export settings:", error)
      try {
        await createExportSettings({
          project_id: project.id,
          resolution: updatedSettings.resolution,
          format: updatedSettings.format,
          frame_rate: updatedSettings.frameRate,
          quality: updatedSettings.quality,
        })
      } catch {
        // Already exists
      }
    }
  },

  updateComposition: async (data) => {
    const { project } = get()
    if (!project) return

    const updatedComposition = { ...project.composition, ...data }
    set({
      project: {
        ...project,
        composition: updatedComposition,
        updatedAt: new Date().toISOString(),
      },
    })

    try {
      const dbData: Record<string, unknown> = {}
      if (data.titleCard !== undefined) dbData.title_card = data.titleCard
      if (data.outroCard !== undefined) dbData.outro_card = data.outroCard
      if (data.defaultTransition !== undefined) dbData.default_transition = data.defaultTransition
      if (data.transitionDuration !== undefined) dbData.transition_duration = data.transitionDuration
      if (data.textOverlays !== undefined) dbData.text_overlays = data.textOverlays

      await upsertProjectComposition(project.id, dbData)
    } catch (error) {
      console.error("Failed to update composition:", error)
    }
  },

  updateScript: async (data) => {
    const { project } = get()
    if (!project) return

    const updatedScript = { ...project.script, ...data }
    set({
      project: {
        ...project,
        script: updatedScript,
        updatedAt: new Date().toISOString(),
      },
    })

    try {
      // Persist to database - store script in project_briefs for now
      await updateProjectBrief(project.id, {
        script_title: updatedScript.title,
        script_subtitle: updatedScript.subtitle,
        script_content: updatedScript.content,
      })
    } catch (error) {
      console.error("Failed to update script:", error)
    }
  },

  saveAll: async () => {
    const { project } = get()
    if (!project) return

    try {
      await updateProject(project.id, { name: project.name })

      const briefData: Record<string, unknown> = {
        name: project.brief.name,
        description: project.brief.description,
        audience: project.brief.audience,
        tone: project.brief.tone,
        duration: project.brief.duration,
        aspect_ratio: project.brief.aspectRatio,
        goals: project.brief.goals,
        video_content: project.brief.videoContent,
        audio_plans: project.brief.audioPlans,
      }
      const existingBrief = await getProjectBrief(project.id)
      if (existingBrief) {
        await updateProjectBrief(project.id, briefData)
      } else {
        await createProjectBrief({ project_id: project.id, name: project.brief.name || "Untitled", ...briefData })
      }

      const moodBoardData = {
        images: project.moodBoard.images as unknown as Json,
        colors: project.moodBoard.colors as unknown as Json,
        keywords: project.moodBoard.keywords as unknown as Json,
        foundation_id: project.moodBoard.foundationId || null,
      }
      const existingMoodBoard = await getMoodBoard(project.id)
      if (existingMoodBoard) {
        await updateMoodBoard(project.id, moodBoardData)
      } else {
        await createMoodBoard({ project_id: project.id, ...moodBoardData })
      }

      await upsertProjectComposition(project.id, {
        title_card: project.composition.titleCard as unknown as Json,
        outro_card: project.composition.outroCard as unknown as Json,
        default_transition: project.composition.defaultTransition,
        transition_duration: project.composition.transitionDuration,
        text_overlays: project.composition.textOverlays as unknown as Json,
      })

      console.log("Project saved successfully")
    } catch (error) {
      console.error("Failed to save project:", error)
      throw error
    }
  },
}))

// ============================================
// HELPER: Get clip with its asset data
// ============================================

export function getClipWithAsset(
  clip: TimelineClip,
  assets: ProjectAsset[]
): TimelineClipWithAsset {
  return {
    ...clip,
    asset: assets.find((a) => a.id === clip.assetId),
  }
}

export function getClipsWithAssets(
  clips: TimelineClip[],
  assets: ProjectAsset[]
): TimelineClipWithAsset[] {
  return clips.map((clip) => getClipWithAsset(clip, assets))
}
