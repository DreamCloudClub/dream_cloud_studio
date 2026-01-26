import { create } from "zustand"

export type FoundationWizardStep = "basics" | "colors" | "style" | "mood" | "review"

export const FOUNDATION_WIZARD_STEPS: { id: FoundationWizardStep; label: string }[] = [
  { id: "basics", label: "Basics" },
  { id: "colors", label: "Colors" },
  { id: "style", label: "Style" },
  { id: "mood", label: "Mood" },
  { id: "review", label: "Review" },
]

export const STYLE_OPTIONS = [
  { id: "minimal", label: "Minimal", description: "Clean, simple, lots of whitespace" },
  { id: "bold", label: "Bold", description: "Strong colors, big typography" },
  { id: "cinematic", label: "Cinematic", description: "Film-like, dramatic lighting" },
  { id: "organic", label: "Organic", description: "Natural textures, soft edges" },
  { id: "retro", label: "Retro", description: "Vintage aesthetics, nostalgic feel" },
  { id: "futuristic", label: "Futuristic", description: "Sleek, high-tech, innovative" },
]

export const MOOD_OPTIONS = [
  { id: "professional", label: "Professional", description: "Corporate, trustworthy" },
  { id: "energetic", label: "Energetic", description: "Dynamic, exciting, fast-paced" },
  { id: "calm", label: "Calm", description: "Peaceful, serene, relaxing" },
  { id: "innovative", label: "Innovative", description: "Cutting-edge, forward-thinking" },
  { id: "playful", label: "Playful", description: "Fun, light-hearted, whimsical" },
  { id: "luxurious", label: "Luxurious", description: "Premium, elegant, sophisticated" },
]

export const TYPOGRAPHY_OPTIONS = [
  { id: "modern", label: "Modern Sans", description: "Clean sans-serif fonts" },
  { id: "classic", label: "Classic Serif", description: "Traditional, elegant serifs" },
  { id: "bold", label: "Bold Display", description: "Heavy, impactful headlines" },
  { id: "handwritten", label: "Handwritten", description: "Personal, organic feel" },
  { id: "monospace", label: "Monospace", description: "Technical, code-like aesthetic" },
]

export const TONE_OPTIONS = [
  { id: "professional", label: "Professional", description: "Formal, business-appropriate" },
  { id: "casual", label: "Casual", description: "Relaxed, conversational" },
  { id: "friendly", label: "Friendly", description: "Warm, approachable" },
  { id: "authoritative", label: "Authoritative", description: "Expert, commanding" },
  { id: "inspirational", label: "Inspirational", description: "Motivating, uplifting" },
]

interface MoodImage {
  id: string
  url: string
  name: string
}

interface FoundationWizardState {
  currentStep: FoundationWizardStep
  editingId: string | null // null for new, id for editing existing

  // Foundation data
  name: string
  description: string
  colorPalette: string[]
  style: string | null
  mood: string | null
  typography: string | null
  tone: string | null
  moodImages: MoodImage[]

  // Actions
  setCurrentStep: (step: FoundationWizardStep) => void
  nextStep: () => void
  prevStep: () => void
  setName: (name: string) => void
  setDescription: (description: string) => void
  setColorPalette: (colors: string[]) => void
  addColor: (color: string) => void
  removeColor: (index: number) => void
  updateColor: (index: number, color: string) => void
  setStyle: (style: string | null) => void
  setMood: (mood: string | null) => void
  setTypography: (typography: string | null) => void
  setTone: (tone: string | null) => void
  addMoodImage: (image: MoodImage) => void
  removeMoodImage: (id: string) => void
  loadFoundation: (foundation: {
    id: string
    name: string
    description?: string
    colorPalette: string[]
    style: string | null
    mood: string | null
    typography: string | null
    tone: string | null
    moodImages: MoodImage[]
  }) => void
  resetWizard: () => void
}

const initialState = {
  currentStep: "basics" as FoundationWizardStep,
  editingId: null as string | null,
  name: "",
  description: "",
  colorPalette: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
  style: null as string | null,
  mood: null as string | null,
  typography: null as string | null,
  tone: null as string | null,
  moodImages: [] as MoodImage[],
}

export const useFoundationWizardStore = create<FoundationWizardState>((set, get) => ({
  ...initialState,

  setCurrentStep: (step) => set({ currentStep: step }),

  nextStep: () => {
    const { currentStep } = get()
    const currentIndex = FOUNDATION_WIZARD_STEPS.findIndex((s) => s.id === currentStep)
    if (currentIndex < FOUNDATION_WIZARD_STEPS.length - 1) {
      set({ currentStep: FOUNDATION_WIZARD_STEPS[currentIndex + 1].id })
    }
  },

  prevStep: () => {
    const { currentStep } = get()
    const currentIndex = FOUNDATION_WIZARD_STEPS.findIndex((s) => s.id === currentStep)
    if (currentIndex > 0) {
      set({ currentStep: FOUNDATION_WIZARD_STEPS[currentIndex - 1].id })
    }
  },

  setName: (name) => set({ name }),
  setDescription: (description) => set({ description }),
  setColorPalette: (colorPalette) => set({ colorPalette }),

  addColor: (color) => {
    const { colorPalette } = get()
    if (colorPalette.length < 8) {
      set({ colorPalette: [...colorPalette, color] })
    }
  },

  removeColor: (index) => {
    const { colorPalette } = get()
    if (colorPalette.length > 1) {
      set({ colorPalette: colorPalette.filter((_, i) => i !== index) })
    }
  },

  updateColor: (index, color) => {
    const { colorPalette } = get()
    set({
      colorPalette: colorPalette.map((c, i) => (i === index ? color : c)),
    })
  },

  setStyle: (style) => set({ style }),
  setMood: (mood) => set({ mood }),
  setTypography: (typography) => set({ typography }),
  setTone: (tone) => set({ tone }),

  addMoodImage: (image) => {
    const { moodImages } = get()
    set({ moodImages: [...moodImages, image] })
  },

  removeMoodImage: (id) => {
    const { moodImages } = get()
    set({ moodImages: moodImages.filter((img) => img.id !== id) })
  },

  loadFoundation: (foundation) => {
    set({
      editingId: foundation.id,
      name: foundation.name,
      description: foundation.description || "",
      colorPalette: foundation.colorPalette,
      style: foundation.style,
      mood: foundation.mood,
      typography: foundation.typography,
      tone: foundation.tone,
      moodImages: foundation.moodImages,
      currentStep: "basics",
    })
  },

  resetWizard: () => set(initialState),
}))
