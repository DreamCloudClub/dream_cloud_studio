import { create } from "zustand"
import { getInitialGreeting } from "@/services/claude"
import { getProjectWithRelations } from "@/services/projects"

// Step types for the wizard
export type WizardStep =
  | "platform"
  | "brief"
  | "mood"
  | "story"
  | "shots"
  | "filming"
  | "audio"
  | "review"

// Step metadata with labels and descriptions
export const WIZARD_STEPS: {
  id: WizardStep
  label: string
  description: string
}[] = [
  {
    id: "platform",
    label: "Platform",
    description: "Select or create a creative platform",
  },
  {
    id: "brief",
    label: "Brief",
    description: "Define your project goals and audience",
  },
  {
    id: "mood",
    label: "Mood",
    description: "Set visual direction and references",
  },
  {
    id: "story",
    label: "Story",
    description: "Build your narrative structure",
  },
  {
    id: "shots",
    label: "Shots",
    description: "Plan your shot list",
  },
  {
    id: "filming",
    label: "Film",
    description: "Create media for each shot",
  },
  {
    id: "audio",
    label: "Audio",
    description: "Add voiceover, music, and SFX",
  },
  {
    id: "review",
    label: "Review",
    description: "Confirm and create your project",
  },
]

// Data structures for each step
export interface PlatformData {
  type: "new" | "existing"
  platformId?: string
  platformName?: string
}

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5" | "4:3" | "21:9"

export const ASPECT_RATIOS: { id: AspectRatio; label: string; description: string }[] = [
  { id: "16:9", label: "16:9", description: "Landscape (YouTube, TV)" },
  { id: "9:16", label: "9:16", description: "Portrait (TikTok, Reels)" },
  { id: "1:1", label: "1:1", description: "Square (Instagram)" },
  { id: "4:5", label: "4:5", description: "Portrait (Instagram)" },
  { id: "4:3", label: "4:3", description: "Classic (TV)" },
  { id: "21:9", label: "21:9", description: "Cinematic (Widescreen)" },
]

export interface VideoContent {
  characters: string[]
  setting: string
  timeOfDay: string
  weather: string
  action: string
  props: string[]
  dialogue: string
}

export interface BriefData {
  name: string
  description: string
  audience: string
  tone: string
  duration: string
  aspectRatio: AspectRatio
  videoContent?: VideoContent
}

export interface MoodBoardData {
  images: { id: string; url: string; name: string }[]
  colors: string[]
  keywords: string[]
  foundationId?: string // ID of applied foundation, if any
}

export interface Act {
  id: string
  name: string
  description: string
  beats: { id: string; description: string }[]
}

export interface StoryboardData {
  acts: Act[]
}

export interface Shot {
  id: string
  sceneIndex: number
  shotNumber: number
  description: string
  duration: number
  shotType: string
  notes: string
  mediaId?: string
}

export interface Asset {
  id: string
  type: "image" | "video" | "audio"
  url: string
  thumbnailUrl?: string
  name: string
}

export interface AudioData {
  voiceovers: Asset[]
  soundtrack: Asset | null
  sfx: Asset[]
}

// Composition data for Remotion
export interface TitleConfig {
  text: string
  subtitle?: string
  font?: string
  fontSize?: number
  color?: string
  backgroundColor?: string
  animation?: "fade" | "slide-up" | "zoom" | "typewriter"
}

export interface TextOverlayConfig {
  id: string
  text: string
  position?: "top" | "center" | "bottom" | "lower-third"
  animation?: "fade" | "slide-up" | "slide-left" | "typewriter" | "glitch"
  font?: string
  fontSize?: number
  color?: string
  backgroundColor?: string
  shotId?: string // Which shot this overlay appears on
  startTime?: number // Seconds into the shot
  duration?: number // How long to show
}

export interface CompositionData {
  title?: TitleConfig
  outro?: TitleConfig
  defaultTransition?: "none" | "fade" | "wipe-left" | "wipe-right" | "zoom"
  transitionDuration?: number // seconds
  textOverlays: TextOverlayConfig[]
  backgroundColor?: string
}

export interface BubbleMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

// Main wizard state interface
interface ProjectWizardState {
  // Project ID (set when draft is created)
  projectId: string | null

  // Loading state for drafts
  isLoadingDraft: boolean

  // Navigation
  currentStep: WizardStep
  completedSteps: WizardStep[]

  // Initial context from Dashboard
  initialPrompt: string

  // Step data
  platform: PlatformData | null
  brief: BriefData | null
  moodBoard: MoodBoardData | null
  storyboard: StoryboardData | null
  shots: Shot[]

  // Filming progress
  filmingProgress: {
    currentShotIndex: number
    completedShots: string[]
  }
  shotMedia: Record<string, Asset>

  // Audio
  audio: AudioData

  // Composition (Remotion)
  composition: CompositionData

  // Bubble chat state
  bubbleMessages: BubbleMessage[]
  isBubbleTyping: boolean

  // Actions
  setStep: (step: WizardStep) => void
  goToNextStep: () => void
  goToPreviousStep: () => void
  markStepComplete: (step: WizardStep) => void
  canNavigateToStep: (step: WizardStep) => boolean

  // Project ID
  setProjectId: (id: string) => void

  // Initial prompt
  setInitialPrompt: (prompt: string) => void

  // Step data updates
  setPlatform: (data: PlatformData) => void
  updateBrief: (data: Partial<BriefData>) => void
  updateVideoContent: (data: Partial<VideoContent>) => void
  setBrief: (data: BriefData) => void
  updateMoodBoard: (data: Partial<MoodBoardData>) => void
  setMoodBoard: (data: MoodBoardData) => void
  updateStoryboard: (data: Partial<StoryboardData>) => void
  setStoryboard: (data: StoryboardData) => void
  setShots: (shots: Shot[]) => void
  updateShot: (shotId: string, data: Partial<Shot>) => void
  addShot: (shot: Shot) => void
  removeShot: (shotId: string) => void

  // Filming
  setCurrentShotIndex: (index: number) => void
  markShotComplete: (shotId: string) => void
  setShotMedia: (shotId: string, asset: Asset) => void

  // Audio
  addVoiceover: (asset: Asset) => void
  setSoundtrack: (asset: Asset | null) => void
  addSfx: (asset: Asset) => void
  removeAudio: (type: "voiceover" | "sfx", assetId: string) => void

  // Composition
  setTitleCard: (config: TitleConfig | undefined) => void
  setOutroCard: (config: TitleConfig | undefined) => void
  setDefaultTransition: (transition: CompositionData["defaultTransition"], duration?: number) => void
  addTextOverlay: (overlay: Omit<TextOverlayConfig, "id">) => void
  removeTextOverlay: (id: string) => void
  updateComposition: (data: Partial<CompositionData>) => void

  // Bubble
  addBubbleMessage: (message: Omit<BubbleMessage, "id" | "timestamp">) => void
  setBubbleTyping: (isTyping: boolean) => void
  clearBubbleMessages: () => void

  // Reset
  resetWizard: () => void

  // Draft loading
  loadDraft: (projectId: string) => Promise<void>
}

const initialState = {
  projectId: null as string | null,
  isLoadingDraft: false,
  currentStep: "platform" as WizardStep,
  completedSteps: [] as WizardStep[],
  initialPrompt: "",
  platform: null,
  brief: null,
  moodBoard: null,
  storyboard: null,
  shots: [],
  filmingProgress: {
    currentShotIndex: 0,
    completedShots: [],
  },
  shotMedia: {},
  audio: {
    voiceovers: [],
    soundtrack: null,
    sfx: [],
  },
  composition: {
    textOverlays: [],
    defaultTransition: "fade",
    transitionDuration: 0.5,
  },
  bubbleMessages: [],
  isBubbleTyping: false,
}

export const useProjectWizardStore = create<ProjectWizardState>((set, get) => ({
  ...initialState,

  // Navigation
  setStep: (step) => set({ currentStep: step }),

  goToNextStep: () => {
    const { currentStep } = get()
    const currentIndex = WIZARD_STEPS.findIndex((s) => s.id === currentStep)
    if (currentIndex < WIZARD_STEPS.length - 1) {
      set({ currentStep: WIZARD_STEPS[currentIndex + 1].id })
    }
  },

  goToPreviousStep: () => {
    const { currentStep } = get()
    const currentIndex = WIZARD_STEPS.findIndex((s) => s.id === currentStep)
    if (currentIndex > 0) {
      set({ currentStep: WIZARD_STEPS[currentIndex - 1].id })
    }
  },

  markStepComplete: (step) => {
    const { completedSteps } = get()
    if (!completedSteps.includes(step)) {
      set({ completedSteps: [...completedSteps, step] })
    }
  },

  canNavigateToStep: (step) => {
    const { completedSteps, currentStep } = get()
    const targetIndex = WIZARD_STEPS.findIndex((s) => s.id === step)
    const currentIndex = WIZARD_STEPS.findIndex((s) => s.id === currentStep)

    // Can always go back to completed steps
    if (completedSteps.includes(step)) return true

    // Can go to current step
    if (step === currentStep) return true

    // Can go to next step if current is complete
    if (targetIndex === currentIndex + 1 && completedSteps.includes(currentStep))
      return true

    return false
  },

  // Project ID
  setProjectId: (id) => set({ projectId: id }),

  // Initial prompt - also seeds the chat with context
  setInitialPrompt: (prompt) => {
    set({ initialPrompt: prompt })

    if (prompt && prompt.trim()) {
      // Seed chat with the user's initial prompt and Bubble's response
      const { clearBubbleMessages, addBubbleMessage } = get()
      clearBubbleMessages()
      addBubbleMessage({ role: "user", content: prompt })
      addBubbleMessage({
        role: "assistant",
        content: getInitialGreeting("platform", prompt)
      })
    }
  },

  // Platform
  setPlatform: (data) =>
    set({
      platform: data,
      completedSteps: [...get().completedSteps.filter((s) => s !== "platform"), "platform"],
    }),

  // Brief
  updateBrief: (data) =>
    set({
      brief: { ...(get().brief || { name: "", description: "", audience: "", tone: "", duration: "", aspectRatio: "16:9" }), ...data },
    }),

  updateVideoContent: (data) => {
    const currentBrief = get().brief || { name: "", description: "", audience: "", tone: "", duration: "", aspectRatio: "16:9" as const }
    const currentContent = currentBrief.videoContent || {
      characters: [],
      setting: "",
      timeOfDay: "",
      weather: "",
      action: "",
      props: [],
      dialogue: "",
    }
    // Merge arrays instead of replacing
    const newContent: VideoContent = {
      ...currentContent,
      ...data,
      characters: data.characters !== undefined
        ? [...new Set([...currentContent.characters, ...data.characters])]
        : currentContent.characters,
      props: data.props !== undefined
        ? [...new Set([...currentContent.props, ...data.props])]
        : currentContent.props,
    }
    set({
      brief: { ...currentBrief, videoContent: newContent },
    })
  },

  setBrief: (data) =>
    set({
      brief: data,
      completedSteps: [...get().completedSteps.filter((s) => s !== "brief"), "brief"],
    }),

  // Mood Board
  updateMoodBoard: (data) =>
    set({
      moodBoard: { ...(get().moodBoard || { images: [], colors: [], keywords: [] }), ...data },
    }),

  setMoodBoard: (data) =>
    set({
      moodBoard: data,
      completedSteps: [...get().completedSteps.filter((s) => s !== "mood"), "mood"],
    }),

  // Storyboard
  updateStoryboard: (data) =>
    set({
      storyboard: { ...(get().storyboard || { acts: [] }), ...data },
    }),

  setStoryboard: (data) =>
    set({
      storyboard: data,
      completedSteps: [...get().completedSteps.filter((s) => s !== "story"), "story"],
    }),

  // Shots
  setShots: (shots) =>
    set({
      shots,
      completedSteps: [...get().completedSteps.filter((s) => s !== "shots"), "shots"],
    }),

  updateShot: (shotId, data) =>
    set({
      shots: get().shots.map((s) => (s.id === shotId ? { ...s, ...data } : s)),
    }),

  addShot: (shot) => set({ shots: [...get().shots, shot] }),

  removeShot: (shotId) =>
    set({ shots: get().shots.filter((s) => s.id !== shotId) }),

  // Filming
  setCurrentShotIndex: (index) =>
    set({
      filmingProgress: { ...get().filmingProgress, currentShotIndex: index },
    }),

  markShotComplete: (shotId) => {
    const { filmingProgress } = get()
    if (!filmingProgress.completedShots.includes(shotId)) {
      set({
        filmingProgress: {
          ...filmingProgress,
          completedShots: [...filmingProgress.completedShots, shotId],
        },
      })
    }
  },

  setShotMedia: (shotId, asset) =>
    set({
      shotMedia: { ...get().shotMedia, [shotId]: asset },
    }),

  // Audio
  addVoiceover: (asset) =>
    set({
      audio: { ...get().audio, voiceovers: [...get().audio.voiceovers, asset] },
    }),

  setSoundtrack: (asset) =>
    set({
      audio: { ...get().audio, soundtrack: asset },
    }),

  addSfx: (asset) =>
    set({
      audio: { ...get().audio, sfx: [...get().audio.sfx, asset] },
    }),

  removeAudio: (type, assetId) => {
    const { audio } = get()
    if (type === "voiceover") {
      set({
        audio: {
          ...audio,
          voiceovers: audio.voiceovers.filter((a) => a.id !== assetId),
        },
      })
    } else {
      set({
        audio: { ...audio, sfx: audio.sfx.filter((a) => a.id !== assetId) },
      })
    }
  },

  // Composition
  setTitleCard: (config) =>
    set({
      composition: { ...get().composition, title: config },
    }),

  setOutroCard: (config) =>
    set({
      composition: { ...get().composition, outro: config },
    }),

  setDefaultTransition: (transition, duration) =>
    set({
      composition: {
        ...get().composition,
        defaultTransition: transition,
        transitionDuration: duration ?? get().composition.transitionDuration,
      },
    }),

  addTextOverlay: (overlay) =>
    set({
      composition: {
        ...get().composition,
        textOverlays: [
          ...get().composition.textOverlays,
          { ...overlay, id: crypto.randomUUID() },
        ],
      },
    }),

  removeTextOverlay: (id) =>
    set({
      composition: {
        ...get().composition,
        textOverlays: get().composition.textOverlays.filter((o) => o.id !== id),
      },
    }),

  updateComposition: (data) =>
    set({
      composition: { ...get().composition, ...data },
    }),

  // Bubble
  addBubbleMessage: (message) =>
    set({
      bubbleMessages: [
        ...get().bubbleMessages,
        { ...message, id: crypto.randomUUID(), timestamp: new Date() },
      ],
    }),

  setBubbleTyping: (isTyping) => set({ isBubbleTyping: isTyping }),

  clearBubbleMessages: () => set({ bubbleMessages: [] }),

  // Reset
  resetWizard: () => set(initialState),

  // Load draft from database
  loadDraft: async (projectId: string) => {
    set({ isLoadingDraft: true })

    try {
      const project = await getProjectWithRelations(projectId)

      if (!project) {
        console.error("Draft project not found:", projectId)
        set({ isLoadingDraft: false })
        return
      }

      // Build completed steps and determine current step
      const completedSteps: WizardStep[] = []
      let currentStep: WizardStep = "platform"

      // Platform is complete if project has a platform_id
      if (project.platform_id) {
        completedSteps.push("platform")
        currentStep = "brief"
      }

      // Brief is complete if it has name and description
      if (project.brief?.name && project.brief?.description) {
        completedSteps.push("brief")
        currentStep = "mood"
      }

      // Mood board is complete if it has any content
      if (project.mood_board?.keywords?.length || project.mood_board?.colors?.length) {
        completedSteps.push("mood")
        currentStep = "story"
      }

      // Storyboard is complete if it has acts
      if (project.storyboard?.content) {
        completedSteps.push("story")
        currentStep = "shots"
      }

      // Shots are complete if there are scenes with shots
      if (project.scenes?.some(s => s.shots?.length > 0)) {
        completedSteps.push("shots")
        currentStep = "filming"
      }

      // Set the state with loaded data
      set({
        projectId: project.id,
        isLoadingDraft: false,
        currentStep,
        completedSteps,
        platform: project.platform_id
          ? {
              type: "existing",
              platformId: project.platform_id,
              platformName: project.platform?.name,
            }
          : null,
        brief: project.brief
          ? {
              name: project.brief.name || "",
              description: project.brief.description || "",
              audience: project.brief.audience || "",
              tone: project.brief.tone || "",
              duration: project.brief.duration || "",
              aspectRatio: (project.brief.aspect_ratio as AspectRatio) || "16:9",
            }
          : null,
        moodBoard: project.mood_board
          ? {
              images: [], // TODO: load mood board images
              colors: (project.mood_board.colors as string[]) || [],
              keywords: (project.mood_board.keywords as string[]) || [],
              foundationId: project.mood_board.foundation_id || undefined,
            }
          : null,
        storyboard: project.storyboard?.content
          ? { acts: project.storyboard.content as unknown as Act[] }
          : null,
      })
    } catch (error) {
      console.error("Error loading draft:", error)
      set({ isLoadingDraft: false })
    }
  },
}))
