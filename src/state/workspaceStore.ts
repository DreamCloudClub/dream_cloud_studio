import { create } from "zustand"
import {
  getProjectWithRelations,
  updateProject,
  updateProjectBrief,
  createProjectBrief,
  getProjectBrief,
  updateMoodBoard,
  createMoodBoard,
  getMoodBoard,
  createScene,
  updateScene as updateSceneDb,
  deleteScene,
  createShot,
  updateShot as updateShotDb,
  deleteShot,
  createStoryboardCard,
  updateStoryboardCard as updateStoryboardCardDb,
  deleteStoryboardCard,
  updateExportSettings as updateExportSettingsDb,
  createExportSettings,
  upsertProjectComposition,
} from "@/services/projects"
import { createAsset, updateAsset as updateAssetDb, deleteAsset } from "@/services/assets"
import type { Json } from "@/types/database"

// Workspace tab types
export type WorkspaceTab =
  | "brief"
  | "script"
  | "moodboard"
  | "storyboard"
  | "platform"
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
  { id: "platform", label: "Platform", icon: "FolderOpen" },
  { id: "brief", label: "Brief", icon: "FileText" },
  { id: "script", label: "Script", icon: "ScrollText" },
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
  url: string | null  // nullable for local-only assets
  localPath?: string | null  // local file path (Tauri)
  storageType: "local" | "cloud"
  duration?: number // for video/audio
  userDescription?: string | null  // what the user asked for
  aiPrompt?: string | null  // actual prompt sent to AI
  generationModel?: string | null  // model used
  createdAt: string
}

// Scene with shots
export interface Shot {
  id: string
  name: string
  description: string
  duration: number // seconds
  order: number
  shotType?: string // Wide, Medium, Close-up, etc.
  // Assets used in this shot
  assets: {
    scene?: ProjectAsset
    stage?: ProjectAsset
    characters: ProjectAsset[]
    weather?: ProjectAsset
    props: ProjectAsset[]
    effects: ProjectAsset[]
  }
  // Linked asset IDs (new approach - assets as first-class citizens)
  imageAssetId?: string | null
  videoAssetId?: string | null
  audioAssetId?: string | null
  // Full asset objects when loaded (expanded from asset IDs)
  imageAsset?: ProjectAsset | null
  videoAsset?: ProjectAsset | null
  audioAsset?: ProjectAsset | null
  // Legacy media fields (deprecated - use linked assets instead)
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

// Script section (from pre-production)
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

// Export settings
export interface ExportSettings {
  resolution: "720p" | "1080p" | "4k"
  format: "mp4" | "webm" | "mov"
  frameRate: 24 | 30 | 60
  quality: "draft" | "standard" | "high"
}

// Mood board data
export interface MoodBoardData {
  images: { id: string; url: string; name: string }[]
  colors: string[]
  keywords: string[]
  foundationId?: string
}

// Composition data
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
    shotId?: string
    startTime?: number
    duration?: number
  }>
}

// Full project state
export interface Project {
  id: string
  userId: string
  name: string
  platform_id: string | null
  brief: ProjectBrief
  moodBoard: MoodBoardData
  assets: ProjectAsset[]
  scenes: Scene[]
  storyboardCards: StoryboardCard[]
  scriptSections: ScriptSection[]
  exportSettings: ExportSettings
  composition: CompositionData
  createdAt: string
  updatedAt: string
}

// Workspace state
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

  // Asset Creation Mode (for launching generator from other pages)
  assetCreationMode: boolean
  assetCreationType: "image" | "video" | "audio" | null
  startAssetCreation: (type?: "image" | "video" | "audio") => void
  clearAssetCreationMode: () => void

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

  // Generation Panel
  generatingForShotId: string | null
  generatingForSceneId: string | null
  openGenerationPanel: (sceneId: string, shotId: string) => void
  closeGenerationPanel: () => void

  // Project actions - ALL PERSIST TO DATABASE
  loadProject: (projectId: string) => Promise<void>
  updateBrief: (data: Partial<ProjectBrief>) => Promise<void>
  updateMoodBoard: (data: Partial<MoodBoardData>) => Promise<void>
  addAsset: (asset: Omit<ProjectAsset, "id" | "createdAt">, userId: string) => Promise<void>
  removeAsset: (assetId: string) => Promise<void>
  updateAsset: (assetId: string, data: Partial<ProjectAsset>) => Promise<void>
  addScene: (scene: Omit<Scene, "id">) => Promise<void>
  updateScene: (sceneId: string, data: Partial<Scene>) => Promise<void>
  removeScene: (sceneId: string) => Promise<void>
  reorderScenes: (sceneIds: string[]) => Promise<void>
  addShot: (sceneId: string, shot: Omit<Shot, "id">) => Promise<void>
  updateShot: (sceneId: string, shotId: string, data: Partial<Shot>) => Promise<void>
  removeShot: (sceneId: string, shotId: string) => Promise<void>
  reorderShots: (sceneId: string, shotIds: string[]) => Promise<void>
  addStoryboardCard: (card: Omit<StoryboardCard, "id">) => Promise<void>
  updateStoryboardCard: (cardId: string, data: Partial<StoryboardCard>) => Promise<void>
  removeStoryboardCard: (cardId: string) => Promise<void>
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
  assetCreationMode: false,
  assetCreationType: null,
  selectedStoryboardCardId: null,
  selectedSceneId: null,
  selectedShotId: null,
  isPlaying: false,
  currentTime: 0,
  expandedSceneIds: [],
  generatingForShotId: null,
  generatingForSceneId: null,

  // Navigation
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Asset Creation Mode
  startAssetCreation: (type) => set({
    assetCreationMode: true,
    assetCreationType: type || null,
    activeTab: "assets"
  }),
  clearAssetCreationMode: () => set({ assetCreationMode: false, assetCreationType: null }),

  // Save with status tracking
  handleSave: async () => {
    const { project, saveAll } = get()
    if (!project) return

    set({ isSaving: true, saveStatus: "saving" })
    try {
      await saveAll()
      set({ saveStatus: "saved" })
      // Reset to idle after 2 seconds
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

  // Generation Panel
  openGenerationPanel: (sceneId, shotId) => set({
    generatingForSceneId: sceneId,
    generatingForShotId: shotId,
  }),
  closeGenerationPanel: () => set({
    generatingForSceneId: null,
    generatingForShotId: null,
  }),

  // Project actions - ALL PERSIST TO DATABASE
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
        assets: (dbProject.assets || []).map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type as "image" | "video" | "audio",
          category: (a.category || "scene") as AssetCategory,
          url: a.url,
          localPath: a.local_path || undefined,
          storageType: (a.storage_type || "cloud") as "local" | "cloud",
          duration: a.duration || undefined,
          userDescription: a.user_description || undefined,
          aiPrompt: a.ai_prompt || undefined,
          generationModel: a.generation_model || undefined,
          createdAt: a.created_at,
        })),
        scenes: (dbProject.scenes || []).map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description || "",
          order: s.sort_order,
          shots: (s.shots || []).map((shot) => {
            // Find linked assets from the project assets
            const imageAsset = shot.image_asset_id
              ? (dbProject.assets || []).find(a => a.id === shot.image_asset_id)
              : null
            const videoAsset = shot.video_asset_id
              ? (dbProject.assets || []).find(a => a.id === shot.video_asset_id)
              : null
            const audioAsset = shot.audio_asset_id
              ? (dbProject.assets || []).find(a => a.id === shot.audio_asset_id)
              : null

            return {
              id: shot.id,
              name: shot.name,
              description: shot.description || "",
              duration: shot.duration,
              order: shot.sort_order,
              shotType: shot.shot_type || undefined,
              assets: {
                characters: [],
                props: [],
                effects: [],
              },
              // New asset linking approach
              imageAssetId: shot.image_asset_id || null,
              videoAssetId: shot.video_asset_id || null,
              audioAssetId: shot.audio_asset_id || null,
              imageAsset: imageAsset ? {
                id: imageAsset.id,
                name: imageAsset.name,
                type: imageAsset.type as "image" | "video" | "audio",
                category: (imageAsset.category || "scene") as AssetCategory,
                url: imageAsset.url,
                localPath: imageAsset.local_path || undefined,
                storageType: (imageAsset.storage_type || "cloud") as "local" | "cloud",
                duration: imageAsset.duration || undefined,
                userDescription: imageAsset.user_description || undefined,
                aiPrompt: imageAsset.ai_prompt || undefined,
                generationModel: imageAsset.generation_model || undefined,
                createdAt: imageAsset.created_at,
              } : null,
              videoAsset: videoAsset ? {
                id: videoAsset.id,
                name: videoAsset.name,
                type: videoAsset.type as "image" | "video" | "audio",
                category: (videoAsset.category || "scene") as AssetCategory,
                url: videoAsset.url,
                localPath: videoAsset.local_path || undefined,
                storageType: (videoAsset.storage_type || "cloud") as "local" | "cloud",
                duration: videoAsset.duration || undefined,
                userDescription: videoAsset.user_description || undefined,
                aiPrompt: videoAsset.ai_prompt || undefined,
                generationModel: videoAsset.generation_model || undefined,
                createdAt: videoAsset.created_at,
              } : null,
              audioAsset: audioAsset ? {
                id: audioAsset.id,
                name: audioAsset.name,
                type: audioAsset.type as "image" | "video" | "audio",
                category: (audioAsset.category || "audio") as AssetCategory,
                url: audioAsset.url,
                localPath: audioAsset.local_path || undefined,
                storageType: (audioAsset.storage_type || "cloud") as "local" | "cloud",
                duration: audioAsset.duration || undefined,
                userDescription: audioAsset.user_description || undefined,
                aiPrompt: audioAsset.ai_prompt || undefined,
                generationModel: audioAsset.generation_model || undefined,
                createdAt: audioAsset.created_at,
              } : null,
              // Legacy media fields (fallback if no linked assets)
              media: shot.media_url
                ? {
                    type: (shot.media_type || "image") as "image" | "video",
                    url: shot.media_url,
                    thumbnailUrl: shot.media_thumbnail_url || undefined,
                  }
                : undefined,
              notes: shot.notes || "",
            }
          }),
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
        expandedSceneIds: project.scenes.map((s) => s.id),
        selectedStoryboardCardId: project.storyboardCards[0]?.id || null,
      })
    } catch (error) {
      console.error("Error loading project:", error)
      set({ isLoading: false, project: null })
    }
  },

  updateBrief: async (data) => {
    const { project } = get()
    if (!project) return

    // Update local state immediately
    const updatedBrief = { ...project.brief, ...data }
    set({
      project: {
        ...project,
        brief: updatedBrief,
        updatedAt: new Date().toISOString(),
      },
    })

    // Persist to database
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

      // Also update project name if brief name changed
      if (data.name) {
        await updateProject(project.id, { name: data.name })
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
      console.error("Failed to save brief to database:", error)
    }
  },

  updateMoodBoard: async (data) => {
    const { project } = get()
    if (!project) return

    // Update local state immediately
    const updatedMoodBoard = { ...project.moodBoard, ...data }
    set({
      project: {
        ...project,
        moodBoard: updatedMoodBoard,
        updatedAt: new Date().toISOString(),
      },
    })

    // Persist to database
    try {
      const dbData = {
        images: updatedMoodBoard.images as Json,
        colors: updatedMoodBoard.colors as Json,
        keywords: updatedMoodBoard.keywords as Json,
        foundation_id: updatedMoodBoard.foundationId || null,
      }

      const existing = await getMoodBoard(project.id)
      if (existing) {
        await updateMoodBoard(project.id, dbData)
      } else {
        await createMoodBoard({ project_id: project.id, ...dbData })
      }
    } catch (error) {
      console.error("Failed to save mood board to database:", error)
    }
  },

  addAsset: async (asset, userId) => {
    const { project } = get()
    if (!project) return

    try {
      // Create in database first to get ID
      // Import type for proper casting
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

      // Then update local state
      const newAsset: ProjectAsset = {
        id: dbAsset.id,
        name: dbAsset.name,
        type: dbAsset.type as "image" | "video" | "audio",
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

    // Update local state immediately
    set({
      project: {
        ...project,
        assets: project.assets.filter((a) => a.id !== assetId),
        updatedAt: new Date().toISOString(),
      },
    })

    // Delete from database
    try {
      await deleteAsset(assetId)
    } catch (error) {
      console.error("Failed to delete asset:", error)
    }
  },

  updateAsset: async (assetId, data) => {
    const { project } = get()
    if (!project) return

    // Update local state immediately
    set({
      project: {
        ...project,
        assets: project.assets.map((a) => (a.id === assetId ? { ...a, ...data } : a)),
        updatedAt: new Date().toISOString(),
      },
    })

    // Persist to database
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

  addScene: async (scene) => {
    const { project } = get()
    if (!project) return

    try {
      // Create in database first
      const dbScene = await createScene({
        project_id: project.id,
        name: scene.name,
        description: scene.description,
        sort_order: scene.order,
        voiceover_script: scene.voiceover?.script,
        voiceover_audio_url: scene.voiceover?.audioUrl,
        voiceover_duration: scene.voiceover?.duration,
      })

      // Create shots if any
      const newShots: Shot[] = []
      for (const shot of scene.shots) {
        const dbShot = await createShot({
          scene_id: dbScene.id,
          name: shot.name,
          description: shot.description,
          duration: shot.duration,
          sort_order: shot.order,
          shot_type: null,
          notes: shot.notes,
          media_type: shot.media?.type,
          media_url: shot.media?.url,
          media_thumbnail_url: shot.media?.thumbnailUrl,
        })
        newShots.push({
          ...shot,
          id: dbShot.id,
        })
      }

      // Then update local state
      const newScene: Scene = {
        ...scene,
        id: dbScene.id,
        shots: newShots,
      }

      set({
        project: {
          ...project,
          scenes: [...project.scenes, newScene],
          updatedAt: new Date().toISOString(),
        },
        expandedSceneIds: [...get().expandedSceneIds, newScene.id],
      })
    } catch (error) {
      console.error("Failed to add scene:", error)
    }
  },

  updateScene: async (sceneId, data) => {
    const { project } = get()
    if (!project) return

    // Update local state immediately
    set({
      project: {
        ...project,
        scenes: project.scenes.map((s) => (s.id === sceneId ? { ...s, ...data } : s)),
        updatedAt: new Date().toISOString(),
      },
    })

    // Persist to database
    try {
      const dbData: Record<string, unknown> = {}
      if (data.name !== undefined) dbData.name = data.name
      if (data.description !== undefined) dbData.description = data.description
      if (data.order !== undefined) dbData.sort_order = data.order
      if (data.voiceover !== undefined) {
        dbData.voiceover_script = data.voiceover?.script
        dbData.voiceover_audio_url = data.voiceover?.audioUrl
        dbData.voiceover_duration = data.voiceover?.duration
      }

      await updateSceneDb(sceneId, dbData)
    } catch (error) {
      console.error("Failed to update scene:", error)
    }
  },

  removeScene: async (sceneId) => {
    const { project } = get()
    if (!project) return

    // Update local state immediately
    set({
      project: {
        ...project,
        scenes: project.scenes.filter((s) => s.id !== sceneId),
        updatedAt: new Date().toISOString(),
      },
    })

    // Delete from database (cascade deletes shots)
    try {
      await deleteScene(sceneId)
    } catch (error) {
      console.error("Failed to delete scene:", error)
    }
  },

  reorderScenes: async (sceneIds) => {
    const { project } = get()
    if (!project) return

    // Update local state immediately
    const reordered = sceneIds
      .map((id, index) => {
        const scene = project.scenes.find((s) => s.id === id)
        return scene ? { ...scene, order: index } : null
      })
      .filter(Boolean) as Scene[]

    set({
      project: {
        ...project,
        scenes: reordered,
        updatedAt: new Date().toISOString(),
      },
    })

    // Persist to database
    try {
      for (let i = 0; i < sceneIds.length; i++) {
        await updateSceneDb(sceneIds[i], { sort_order: i })
      }
    } catch (error) {
      console.error("Failed to reorder scenes:", error)
    }
  },

  addShot: async (sceneId, shot) => {
    const { project } = get()
    if (!project) return

    try {
      // Create in database first
      const dbShot = await createShot({
        scene_id: sceneId,
        name: shot.name,
        description: shot.description,
        duration: shot.duration,
        sort_order: shot.order,
        shot_type: null,
        notes: shot.notes,
        media_type: shot.media?.type,
        media_url: shot.media?.url,
        media_thumbnail_url: shot.media?.thumbnailUrl,
      })

      // Then update local state
      const newShot: Shot = {
        ...shot,
        id: dbShot.id,
      }

      set({
        project: {
          ...project,
          scenes: project.scenes.map((s) =>
            s.id === sceneId ? { ...s, shots: [...s.shots, newShot] } : s
          ),
          updatedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error("Failed to add shot:", error)
    }
  },

  updateShot: async (sceneId, shotId, data) => {
    const { project } = get()
    if (!project) return

    // Update local state immediately
    set({
      project: {
        ...project,
        scenes: project.scenes.map((s) =>
          s.id === sceneId
            ? {
                ...s,
                shots: s.shots.map((shot) => (shot.id === shotId ? { ...shot, ...data } : shot)),
              }
            : s
        ),
        updatedAt: new Date().toISOString(),
      },
    })

    // Persist to database
    try {
      const dbData: Record<string, unknown> = {}
      if (data.name !== undefined) dbData.name = data.name
      if (data.description !== undefined) dbData.description = data.description
      if (data.duration !== undefined) dbData.duration = data.duration
      if (data.order !== undefined) dbData.sort_order = data.order
      if (data.notes !== undefined) dbData.notes = data.notes
      if (data.shotType !== undefined) dbData.shot_type = data.shotType
      // Asset linking (new approach)
      if (data.imageAssetId !== undefined) dbData.image_asset_id = data.imageAssetId
      if (data.videoAssetId !== undefined) dbData.video_asset_id = data.videoAssetId
      if (data.audioAssetId !== undefined) dbData.audio_asset_id = data.audioAssetId
      // Legacy media fields
      if (data.media !== undefined) {
        dbData.media_type = data.media?.type
        dbData.media_url = data.media?.url
        dbData.media_thumbnail_url = data.media?.thumbnailUrl
      }

      await updateShotDb(shotId, dbData)
    } catch (error) {
      console.error("Failed to update shot:", error)
    }
  },

  removeShot: async (sceneId, shotId) => {
    const { project } = get()
    if (!project) return

    // Update local state immediately
    set({
      project: {
        ...project,
        scenes: project.scenes.map((s) =>
          s.id === sceneId ? { ...s, shots: s.shots.filter((shot) => shot.id !== shotId) } : s
        ),
        updatedAt: new Date().toISOString(),
      },
    })

    // Delete from database
    try {
      await deleteShot(shotId)
    } catch (error) {
      console.error("Failed to delete shot:", error)
    }
  },

  reorderShots: async (sceneId, shotIds) => {
    const { project } = get()
    if (!project) return

    // Update local state immediately
    set({
      project: {
        ...project,
        scenes: project.scenes.map((s) => {
          if (s.id !== sceneId) return s
          const reordered = shotIds
            .map((id, index) => {
              const shot = s.shots.find((sh) => sh.id === id)
              return shot ? { ...shot, order: index } : null
            })
            .filter(Boolean) as Shot[]
          return { ...s, shots: reordered }
        }),
        updatedAt: new Date().toISOString(),
      },
    })

    // Persist to database
    try {
      for (let i = 0; i < shotIds.length; i++) {
        await updateShotDb(shotIds[i], { sort_order: i })
      }
    } catch (error) {
      console.error("Failed to reorder shots:", error)
    }
  },

  addStoryboardCard: async (card) => {
    const { project } = get()
    if (!project) return

    try {
      // Create in database first
      const dbCard = await createStoryboardCard({
        project_id: project.id,
        title: card.title,
        description: card.description,
        content: card.content,
        thumbnail_url: card.thumbnailUrl,
        sort_order: card.order,
      })

      // Then update local state
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

    // Update local state immediately
    set({
      project: {
        ...project,
        storyboardCards: project.storyboardCards.map((c) =>
          c.id === cardId ? { ...c, ...data } : c
        ),
        updatedAt: new Date().toISOString(),
      },
    })

    // Persist to database
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

    // Update local state immediately
    set({
      project: {
        ...project,
        storyboardCards: project.storyboardCards.filter((c) => c.id !== cardId),
        updatedAt: new Date().toISOString(),
      },
    })

    // Delete from database
    try {
      await deleteStoryboardCard(cardId)
    } catch (error) {
      console.error("Failed to delete storyboard card:", error)
    }
  },

  updateExportSettings: async (settings) => {
    const { project } = get()
    if (!project) return

    // Update local state immediately
    const updatedSettings = { ...project.exportSettings, ...settings }
    set({
      project: {
        ...project,
        exportSettings: updatedSettings,
        updatedAt: new Date().toISOString(),
      },
    })

    // Persist to database
    try {
      const dbData: Record<string, unknown> = {}
      if (settings.resolution !== undefined) dbData.resolution = settings.resolution
      if (settings.format !== undefined) dbData.format = settings.format
      if (settings.frameRate !== undefined) dbData.frame_rate = settings.frameRate
      if (settings.quality !== undefined) dbData.quality = settings.quality

      await updateExportSettingsDb(project.id, dbData)
    } catch (error) {
      console.error("Failed to update export settings:", error)
      // Try creating if doesn't exist
      try {
        await createExportSettings({
          project_id: project.id,
          resolution: updatedSettings.resolution,
          format: updatedSettings.format,
          frame_rate: updatedSettings.frameRate,
          quality: updatedSettings.quality,
        })
      } catch {
        // Already exists or other error
      }
    }
  },

  updateComposition: async (data) => {
    const { project } = get()
    if (!project) return

    // Update local state immediately
    const updatedComposition = { ...project.composition, ...data }
    set({
      project: {
        ...project,
        composition: updatedComposition,
        updatedAt: new Date().toISOString(),
      },
    })

    // Persist to database
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

  // Full project save - saves all data to database
  saveAll: async () => {
    const { project } = get()
    if (!project) return

    try {
      // Save project name
      await updateProject(project.id, {
        name: project.name,
      })

      // Save brief
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

      // Save mood board
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

      // Note: Storyboard cards are saved individually via updateStoryboardCard
      // The legacy storyboard save has been removed since Project uses storyboardCards

      // Save composition
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
