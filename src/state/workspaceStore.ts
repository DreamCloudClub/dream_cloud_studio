import { create } from "zustand"

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
  { id: "moodboard", label: "Mood", icon: "Image" },
  { id: "storyboard", label: "Story", icon: "BookOpen" },
  { id: "editor", label: "Editor", icon: "Film" },
  { id: "scenes", label: "Scenes", icon: "Layers" },
  { id: "assets", label: "Assets", icon: "FolderOpen" },
  { id: "export", label: "Export", icon: "Download" },
]

// Asset categories for mood board and scene manager
export type AssetCategory =
  | "background"
  | "stage"
  | "character"
  | "weather"
  | "prop"
  | "effect"
  | "audio"

export const ASSET_CATEGORIES: { id: AssetCategory; label: string; icon: string }[] = [
  { id: "background", label: "Backgrounds", icon: "Mountain" },
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
    background?: ProjectAsset
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

// Mock project data for development
const createMockProject = (): Project => ({
  id: "project-1",
  name: "Product Launch Video",
  brief: {
    name: "Product Launch Video",
    description: "A dynamic product launch video showcasing our new smart home device",
    audience: "Tech-savvy homeowners aged 25-45",
    tone: "Modern, sleek, innovative",
    duration: "60 seconds",
    aspectRatio: "16:9",
    goals: ["Highlight key features", "Create excitement", "Drive pre-orders"],
  },
  assets: [
    {
      id: "asset-1",
      name: "Living Room",
      type: "image",
      category: "background",
      url: "/mock/living-room.jpg",
      thumbnailUrl: "/mock/living-room-thumb.jpg",
      createdAt: new Date().toISOString(),
    },
    {
      id: "asset-2",
      name: "Kitchen",
      type: "image",
      category: "background",
      url: "/mock/kitchen.jpg",
      thumbnailUrl: "/mock/kitchen-thumb.jpg",
      createdAt: new Date().toISOString(),
    },
    {
      id: "asset-3",
      name: "Smart Device",
      type: "image",
      category: "prop",
      url: "/mock/device.jpg",
      thumbnailUrl: "/mock/device-thumb.jpg",
      createdAt: new Date().toISOString(),
    },
    {
      id: "asset-4",
      name: "User Character",
      type: "image",
      category: "character",
      url: "/mock/character.jpg",
      thumbnailUrl: "/mock/character-thumb.jpg",
      createdAt: new Date().toISOString(),
    },
    {
      id: "asset-5",
      name: "Morning Light",
      type: "image",
      category: "weather",
      url: "/mock/morning.jpg",
      thumbnailUrl: "/mock/morning-thumb.jpg",
      createdAt: new Date().toISOString(),
    },
    {
      id: "asset-6",
      name: "Glow Effect",
      type: "video",
      category: "effect",
      url: "/mock/glow.mp4",
      thumbnailUrl: "/mock/glow-thumb.jpg",
      duration: 3,
      createdAt: new Date().toISOString(),
    },
  ],
  scenes: [
    {
      id: "scene-1",
      name: "Introduction",
      description: "Opening scene establishing the modern home setting",
      order: 0,
      shots: [
        {
          id: "shot-1",
          name: "Wide establishing shot",
          description: "Aerial view of modern home exterior at sunrise",
          duration: 3,
          order: 0,
          assets: {
            background: undefined,
            characters: [],
            props: [],
            effects: [],
          },
          notes: "",
        },
        {
          id: "shot-2",
          name: "Interior reveal",
          description: "Camera moves through front door into living room",
          duration: 4,
          order: 1,
          assets: {
            characters: [],
            props: [],
            effects: [],
          },
          notes: "",
        },
      ],
      voiceover: {
        id: "vo-1",
        script: "Welcome to the future of smart living...",
        duration: 7,
      },
    },
    {
      id: "scene-2",
      name: "Product Demo",
      description: "Showcasing the device features",
      order: 1,
      shots: [
        {
          id: "shot-3",
          name: "Device close-up",
          description: "Close-up of the smart device on a table",
          duration: 3,
          order: 0,
          assets: {
            characters: [],
            props: [],
            effects: [],
          },
          notes: "",
        },
        {
          id: "shot-4",
          name: "User interaction",
          description: "Person interacting with device via voice command",
          duration: 5,
          order: 1,
          assets: {
            characters: [],
            props: [],
            effects: [],
          },
          notes: "",
        },
        {
          id: "shot-5",
          name: "Feature highlight",
          description: "UI overlay showing device features",
          duration: 4,
          order: 2,
          assets: {
            characters: [],
            props: [],
            effects: [],
          },
          notes: "",
        },
      ],
      voiceover: {
        id: "vo-2",
        script: "With just your voice, control your entire home...",
        duration: 12,
      },
    },
    {
      id: "scene-3",
      name: "Call to Action",
      description: "Closing scene with pre-order information",
      order: 2,
      shots: [
        {
          id: "shot-6",
          name: "Product beauty shot",
          description: "Glamour shot of device with lighting effects",
          duration: 3,
          order: 0,
          assets: {
            characters: [],
            props: [],
            effects: [],
          },
          notes: "",
        },
        {
          id: "shot-7",
          name: "CTA screen",
          description: "Pre-order now text with website URL",
          duration: 4,
          order: 1,
          assets: {
            characters: [],
            props: [],
            effects: [],
          },
          notes: "",
        },
      ],
      voiceover: {
        id: "vo-3",
        script: "Pre-order now and transform your home.",
        duration: 7,
      },
    },
  ],
  storyboardCards: [
    {
      id: "card-1",
      title: "Opening Hook",
      description: "Establish the aspirational setting",
      content:
        "The video opens with a breathtaking aerial shot of a modern smart home at sunrise. Golden light streams through large windows as we glide toward the house. This opening establishes the premium, aspirational tone of the brand while creating visual intrigue.\n\nKey elements:\n- Drone footage style movement\n- Warm morning color palette\n- Subtle ambient sounds of nature\n- No dialogue, let visuals breathe",
      order: 0,
    },
    {
      id: "card-2",
      title: "The Problem",
      description: "Show the complexity of current solutions",
      content:
        "Quick cuts showing the frustration of managing multiple smart home devices. Remote controls, phone apps, wall switches - the viewer relates to the chaos of disconnected technology.\n\nKey elements:\n- Fast-paced editing\n- Slightly desaturated color\n- Sound design: notification pings, beeps\n- Relatable everyday moments",
      order: 1,
    },
    {
      id: "card-3",
      title: "The Solution",
      description: "Introduce our device as the answer",
      content:
        "A moment of calm. The sleek device sits on a minimalist table. Natural light catches its elegant curves. A hand reaches into frame and with a simple voice command, the entire home responds in harmony.\n\nKey elements:\n- Slow, deliberate pacing\n- Return to warm color palette\n- Clear product hero shot\n- Satisfying response animations",
      order: 2,
    },
    {
      id: "card-4",
      title: "Call to Action",
      description: "Drive pre-orders with urgency",
      content:
        "The final sequence combines product beauty shots with clear pre-order messaging. Limited early-bird pricing creates urgency while the visual quality reinforces premium positioning.\n\nKey elements:\n- Product glamour shots\n- Clear typography\n- Website URL prominent\n- End card with logo",
      order: 3,
    },
  ],
  exportSettings: {
    resolution: "1080p",
    format: "mp4",
    frameRate: 30,
    quality: "high",
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

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
  loadProject: (projectId) => {
    set({ isLoading: true })
    // Simulate loading - in real app, fetch from Supabase
    setTimeout(() => {
      const project = createMockProject()
      project.id = projectId
      set({
        project,
        isLoading: false,
        expandedSceneIds: project.scenes.map((s) => s.id), // Expand all by default
        selectedStoryboardCardId: project.storyboardCards[0]?.id || null,
      })
    }, 500)
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
