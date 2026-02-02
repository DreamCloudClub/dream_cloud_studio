import { useState, useRef, useEffect, useCallback } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Image,
  Wand2,
  Loader2,
  Check,
  Trash2,
  Music,
  Waves,
  Mic,
  ImagePlus,
  Film,
  Play,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Custom Dropdown Component
interface DropdownOption {
  value: string
  label: string
  description?: string
}

interface CustomDropdownProps {
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  placeholder?: string
  className?: string
}

function CustomDropdown({ value, onChange, options, placeholder = "Select...", className }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value)

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-4 py-2.5 bg-zinc-900/80 border rounded-xl text-left transition-all",
          "flex items-center justify-between gap-2",
          "hover:bg-zinc-800/80",
          isOpen
            ? "border-orange-500 ring-1 ring-orange-500/20"
            : "border-zinc-700/50 hover:border-zinc-600"
        )}
      >
        <span className={selectedOption ? "text-zinc-100" : "text-zinc-500"}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-zinc-400 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 py-1 bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-xl shadow-black/30 overflow-hidden">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={cn(
                "w-full px-4 py-2.5 text-left transition-all",
                "flex items-center justify-between",
                option.value === value
                  ? "bg-orange-500/10 text-orange-400"
                  : "text-zinc-300 hover:bg-zinc-800"
              )}
            >
              <div className="flex flex-col">
                <span className="font-medium">{option.label}</span>
                {option.description && (
                  <span className="text-xs text-zinc-500">{option.description}</span>
                )}
              </div>
              {option.value === value && (
                <Check className="w-4 h-4 text-orange-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
import { useAssetWizardStore } from "@/state/assetWizardStore"
import { ReferenceModal } from "../ReferenceModal"
import { generateImages, generateVideo, generateMusic } from "@/services/replicate"
import { generateImagesNanoBanana, generateVideoVeo } from "@/services/google-ai"
import { generateImagesGrok, generateVideoGrok } from "@/services/grok"
import { generateVoice, generateSoundEffect } from "@/services/elevenlabs"
import { getAssetDisplayUrl } from "@/services/localStorage"
import type { AssetCategory as DBAssetCategory } from "@/types/database"

const STYLE_PRESETS = [
  { id: "cinematic", label: "Cinematic" },
  { id: "photorealistic", label: "Photorealistic" },
  { id: "anime", label: "Anime" },
  { id: "3d-render", label: "3D Render" },
  { id: "illustration", label: "Illustration" },
  { id: "abstract", label: "Abstract" },
]

const IMAGE_MODELS = [
  { id: "flux-pro" as const, label: "FLUX Pro", description: "Best quality" },
  { id: "gpt" as const, label: "GPT Image", description: "Best for references" },
  { id: "nano-banana" as const, label: "Nano Banana", description: "Google AI" },
  { id: "grok" as const, label: "Grok", description: "xAI" },
  { id: "sdxl" as const, label: "SDXL", description: "Faster" },
]

const VIDEO_MODELS = [
  { id: "kling" as const, label: "Kling v2.1", description: "Best quality, 5-10s", durations: [5, 10] },
  { id: "veo-3" as const, label: "Veo 3", description: "Google AI, 4-8s", durations: [4, 6, 8] },
  { id: "grok-video" as const, label: "Grok Video", description: "xAI", durations: [5, 10] },
  { id: "minimax" as const, label: "Minimax", description: "Fast, ~6s", durations: [5, 10] },
]

// Helper to get duration options for a model
const getVideoDurationsForModel = (modelId: string) => {
  const model = VIDEO_MODELS.find(m => m.id === modelId)
  const durations = model?.durations || [5, 10]
  return durations.map(d => ({ id: d, label: `${d} seconds` }))
}

const ASPECT_RATIOS = [
  { id: "16:9" as const, label: "Landscape (16:9)", width: 1344, height: 768 },
  { id: "9:16" as const, label: "Portrait (9:16)", width: 768, height: 1344 },
  { id: "1:1" as const, label: "Square (1:1)", width: 1024, height: 1024 },
  { id: "4:3" as const, label: "Standard (4:3)", width: 1152, height: 864 },
]

// Category-specific options and prompt modifiers
interface CategoryConfig {
  label: string // Label for the dropdown
  options: { id: string; label: string; promptModifier: string }[]
  basePrompt: string // Always appended for this category
}

const CATEGORY_OPTIONS: Record<string, CategoryConfig> = {
  character: {
    label: "Framing",
    options: [
      { id: "full-body", label: "Full Body", promptModifier: "full body character turnaround sheet showing 3 angles: front view, side view, back view" },
      { id: "torso", label: "Torso", promptModifier: "upper body character sheet showing 3 angles: front view, three-quarter view, side view" },
      { id: "face", label: "Face", promptModifier: "character portrait sheet showing 3 angles: front view, three-quarter view, profile view" },
    ],
    basePrompt: "character design, model sheet layout, 3 views of same character, consistent design, neutral grey background, concept art",
  },
  scene: {
    label: "Composition",
    options: [
      { id: "wide", label: "Wide Shot", promptModifier: "wide angle, establishing shot" },
      { id: "medium", label: "Medium Shot", promptModifier: "medium shot, balanced composition" },
      { id: "close-up", label: "Close-up", promptModifier: "close-up shot, detailed" },
    ],
    basePrompt: "cinematic composition, detailed environment, atmospheric lighting",
  },
  stage: {
    label: "Depth",
    options: [
      { id: "deep", label: "Deep Perspective", promptModifier: "deep perspective, vanishing point" },
      { id: "mid", label: "Mid-ground Focus", promptModifier: "mid-ground focus, layered depth" },
      { id: "flat", label: "Flat/2D", promptModifier: "flat background, 2D style" },
    ],
    basePrompt: "seamless background, environment art, game-ready",
  },
  prop: {
    label: "View",
    options: [
      { id: "multi", label: "Multiple Views", promptModifier: "multiple angles, front side and back views" },
      { id: "isometric", label: "Isometric", promptModifier: "isometric view, 3/4 angle" },
      { id: "front", label: "Front View", promptModifier: "front view, straight-on" },
    ],
    basePrompt: "detailed object, product photography style, neutral grey background",
  },
  effect: {
    label: "Intensity",
    options: [
      { id: "subtle", label: "Subtle", promptModifier: "subtle effect, understated" },
      { id: "medium", label: "Medium", promptModifier: "visible effect, balanced intensity" },
      { id: "dramatic", label: "Dramatic", promptModifier: "dramatic effect, high impact, intense" },
    ],
    basePrompt: "VFX element, transparent background, game asset",
  },
  weather: {
    label: "Intensity",
    options: [
      { id: "light", label: "Light", promptModifier: "light, gentle" },
      { id: "moderate", label: "Moderate", promptModifier: "moderate intensity" },
      { id: "heavy", label: "Heavy/Dramatic", promptModifier: "heavy, dramatic, intense" },
    ],
    basePrompt: "weather effect, atmospheric, neutral grey background",
  },
  // Audio categories don't need visual framing options
  music: {
    label: "Energy",
    options: [
      { id: "calm", label: "Calm", promptModifier: "calm, relaxed, peaceful" },
      { id: "moderate", label: "Moderate", promptModifier: "moderate energy, balanced" },
      { id: "energetic", label: "Energetic", promptModifier: "energetic, upbeat, driving" },
    ],
    basePrompt: "",
  },
  sound_effect: {
    label: "Style",
    options: [
      { id: "realistic", label: "Realistic", promptModifier: "realistic, natural sound" },
      { id: "stylized", label: "Stylized", promptModifier: "stylized, exaggerated" },
      { id: "retro", label: "Retro/8-bit", promptModifier: "retro, 8-bit style, chiptune" },
    ],
    basePrompt: "",
  },
  voice: {
    label: "Tone",
    options: [
      { id: "neutral", label: "Neutral", promptModifier: "" },
      { id: "expressive", label: "Expressive", promptModifier: "" },
      { id: "dramatic", label: "Dramatic", promptModifier: "" },
    ],
    basePrompt: "",
  },
}

interface GeneratedBatch {
  id: string
  assets: {
    id: string
    url: string
    selected: boolean
    isVideo?: boolean  // Track if this is a video (vs image)
    isAnimating?: boolean  // Currently being animated
    duration?: number  // For video/audio assets
  }[]
  prompt: string
  timestamp: number
  refinement: string // Additional text to append for next generation
  // Single selection mode: selected assets are used as reference when generating more
}

// Auto-growing textarea hook
function useAutoGrow(value: string, minRows: number = 3) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = ref.current
    if (!textarea) return

    // Reset height to calculate proper scrollHeight
    textarea.style.height = 'auto'
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24
    const minHeight = lineHeight * minRows + 20 // 20 for padding
    const newHeight = Math.max(textarea.scrollHeight, minHeight)
    textarea.style.height = `${newHeight}px`
  }, [value, minRows])

  return ref
}

// Enhance user description into a detailed AI prompt
async function enhancePrompt(
  userDescription: string,
  assetType: string,
  category: string,
  style?: string | null
): Promise<string> {
  const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!ANTHROPIC_API_KEY) {
    return style ? `${userDescription}, ${style} style` : userDescription
  }

  const systemPrompt = `You are an expert at writing prompts for AI image/video/audio generation.
Your task is to enhance a user's simple description into a detailed, technical prompt that will produce high-quality results.

Rules:
- Keep the core intent of the user's description
- Add technical details: lighting, composition, mood, texture, quality descriptors
- For images: add details about framing, depth of field, color palette
- For audio: add details about tempo, instruments, mood, genre
- Keep it concise (1-3 sentences max)
- Don't add anything the user didn't imply
- Output ONLY the enhanced prompt, no explanation`

  const userPrompt = `Asset type: ${assetType}
Category: ${category}
${style ? `Style: ${style}` : ''}

User description: "${userDescription}"

Enhanced prompt:`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to enhance prompt')
    }

    const data = await response.json()
    const enhanced = data.content?.[0]?.text?.trim()
    return enhanced || userDescription
  } catch (error) {
    console.error('Error enhancing prompt:', error)
    return style ? `${userDescription}, ${style} style` : userDescription
  }
}

export function PromptAndGenerateStep() {
  const {
    assetType,
    category,
    assetName,
    userDescription,
    aiPrompt,
    negativePrompt,
    stylePreset,
    referenceAssets,
    generatedAssets,
    setAssetName,
    setUserDescription,
    setAiPrompt,
    setNegativePrompt,
    setStylePreset,
    addReferenceAsset,
    removeReferenceAsset,
    setGeneratedAssets,
    toggleAssetSelection,
    cachedBatches,
    setCachedBatches,
    nextStep,
    prevStep,
  } = useAssetWizardStore()

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showReferenceModal, setShowReferenceModal] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageModel, setImageModel] = useState<"flux-pro" | "gpt" | "nano-banana" | "grok" | "sdxl">("sdxl")
  const [videoModel, setVideoModel] = useState<"kling" | "veo-3" | "grok-video" | "minimax">("kling")
  const [videoDuration, setVideoDuration] = useState<number>(5)
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1" | "4:3">("16:9")

  // Reset duration when video model changes if current duration isn't valid
  useEffect(() => {
    const modelConfig = VIDEO_MODELS.find(m => m.id === videoModel)
    const validDurations = modelConfig?.durations || [5, 10]
    if (!validDurations.includes(videoDuration)) {
      setVideoDuration(validDurations[0])
    }
  }, [videoModel, videoDuration])

  // Initialize batches from cache
  const [batches, setBatchesLocal] = useState<GeneratedBatch[]>(() => {
    return cachedBatches as GeneratedBatch[]
  })

  // Wrapper to sync batches to store cache
  const setBatches = (updater: GeneratedBatch[] | ((prev: GeneratedBatch[]) => GeneratedBatch[])) => {
    setBatchesLocal(prev => {
      const newBatches = typeof updater === 'function' ? updater(prev) : updater
      // Sync to store cache
      setCachedBatches(newBatches.map(b => ({
        id: b.id,
        assets: b.assets,
        prompt: b.prompt,
        timestamp: b.timestamp,
        refinement: b.refinement,
      })))
      return newBatches
    })
  }

  const [pendingRefinement, setPendingRefinement] = useState("")

  // Additional references added after generation (for next batch)
  const [additionalReferences, setAdditionalReferences] = useState<typeof referenceAssets>([])
  const [isAddingToAdditional, setIsAddingToAdditional] = useState(false)

  // Category-specific option (e.g., "full-body" for characters, "wide" for scenes)
  const categoryConfig = category ? CATEGORY_OPTIONS[category] : null
  const [categoryOption, setCategoryOption] = useState<string>(() => {
    // Default to first option for the category
    return categoryConfig?.options[0]?.id || ""
  })

  // Update default when category changes
  useEffect(() => {
    if (categoryConfig && !categoryConfig.options.find(o => o.id === categoryOption)) {
      setCategoryOption(categoryConfig.options[0]?.id || "")
    }
  }, [category, categoryConfig, categoryOption])

  // Auto-growing textarea refs
  const nameRef = useAutoGrow(assetName, 1)
  const descRef = useAutoGrow(userDescription, 3)
  const promptRef = useAutoGrow(aiPrompt, 3)

  // Listen for Bubble's refinement updates
  useEffect(() => {
    const handleBubbleRefinement = (event: CustomEvent<{ refinement: string }>) => {
      const { refinement } = event.detail

      if (batches.length === 0) {
        // No batches yet - store as pending refinement (shown in UI)
        setPendingRefinement(refinement)
      } else {
        // Update the last batch's refinement
        setBatches(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            refinement
          }
          return updated
        })
      }
    }

    window.addEventListener('bubble-update-refinement', handleBubbleRefinement as EventListener)
    return () => {
      window.removeEventListener('bubble-update-refinement', handleBubbleRefinement as EventListener)
    }
  }, [batches.length])

  // Listen for Bubble's category option updates
  useEffect(() => {
    const handleBubbleCategoryOption = (event: CustomEvent<{ categoryOption: string }>) => {
      const { categoryOption: newOption } = event.detail
      // Verify it's a valid option for the current category
      if (categoryConfig?.options.find(o => o.id === newOption)) {
        setCategoryOption(newOption)
      }
    }

    window.addEventListener('bubble-update-category-option', handleBubbleCategoryOption as EventListener)
    return () => {
      window.removeEventListener('bubble-update-category-option', handleBubbleCategoryOption as EventListener)
    }
  }, [categoryConfig])

  // Listen for Bubble's image model updates
  useEffect(() => {
    const handleBubbleImageModel = (event: CustomEvent<{ imageModel: string }>) => {
      const { imageModel: newModel } = event.detail
      if (['flux-pro', 'gpt', 'nano-banana', 'grok', 'sdxl'].includes(newModel)) {
        setImageModel(newModel as "flux-pro" | "gpt" | "nano-banana" | "grok" | "sdxl")
      }
    }

    window.addEventListener('bubble-update-image-model', handleBubbleImageModel as EventListener)
    return () => {
      window.removeEventListener('bubble-update-image-model', handleBubbleImageModel as EventListener)
    }
  }, [])

  // Listen for Bubble's video model updates
  useEffect(() => {
    const handleBubbleVideoModel = (event: CustomEvent<{ videoModel: string }>) => {
      const { videoModel: newModel } = event.detail
      if (['kling', 'veo-3', 'grok-video', 'minimax'].includes(newModel)) {
        setVideoModel(newModel as "kling" | "veo-3" | "grok-video" | "minimax")
      }
    }

    window.addEventListener('bubble-update-video-model', handleBubbleVideoModel as EventListener)
    return () => {
      window.removeEventListener('bubble-update-video-model', handleBubbleVideoModel as EventListener)
    }
  }, [])

  // Listen for Bubble's aspect ratio updates
  useEffect(() => {
    const handleBubbleAspectRatio = (event: CustomEvent<{ aspectRatio: string }>) => {
      const { aspectRatio: newRatio } = event.detail
      if (['16:9', '9:16', '1:1', '4:3'].includes(newRatio)) {
        setAspectRatio(newRatio as "16:9" | "9:16" | "1:1" | "4:3")
      }
    }

    window.addEventListener('bubble-update-aspect-ratio', handleBubbleAspectRatio as EventListener)
    return () => {
      window.removeEventListener('bubble-update-aspect-ratio', handleBubbleAspectRatio as EventListener)
    }
  }, [])

  // Listen for Bubble's video duration updates
  useEffect(() => {
    const handleBubbleVideoDuration = (event: CustomEvent<{ videoDuration: number }>) => {
      const { videoDuration: newDuration } = event.detail
      const modelConfig = VIDEO_MODELS.find(m => m.id === videoModel)
      const validDurations = modelConfig?.durations || [5, 10]
      if (validDurations.includes(newDuration)) {
        setVideoDuration(newDuration)
      }
    }

    window.addEventListener('bubble-update-video-duration', handleBubbleVideoDuration as EventListener)
    return () => {
      window.removeEventListener('bubble-update-video-duration', handleBubbleVideoDuration as EventListener)
    }
  }, [videoModel])

  const handleEnhance = async () => {
    if (!userDescription.trim() || !assetType || !category) return

    setIsEnhancing(true)
    try {
      const enhanced = await enhancePrompt(userDescription, assetType, category, stylePreset)
      setAiPrompt(enhanced)
    } finally {
      setIsEnhancing(false)
    }
  }

  const handleGenerate = async () => {
    if (!userDescription.trim() && !aiPrompt.trim()) {
      setError("Please enter a description")
      return
    }

    setIsGenerating(true)
    setError(null)

    // Build prompt: structural modifiers FIRST, then user description, then style/background
    // Models pay more attention to the beginning of prompts
    const userPrompt = aiPrompt.trim() || userDescription.trim()
    let effectivePrompt = userPrompt

    // Add category-specific modifiers (framing, composition, etc.)
    if (categoryConfig && categoryOption) {
      const selectedOption = categoryConfig.options.find(o => o.id === categoryOption)
      if (selectedOption?.promptModifier) {
        // Put structural elements FIRST (e.g., "full body character turnaround sheet, front and side view")
        effectivePrompt = `${selectedOption.promptModifier}, ${userPrompt}`
      }
      // Add base prompt at the END (style, background)
      if (categoryConfig.basePrompt) {
        effectivePrompt = `${effectivePrompt}, ${categoryConfig.basePrompt}`
      }
    }

    // Get the last batch to check for selected image and refinement
    const lastBatch = batches[batches.length - 1]

    // Collect ALL reference images (supports multiple for GPT-image-1.5)
    // Priority: additional refs > selected from batches > initial refs
    let referenceUrls: string[] = []

    if (additionalReferences.length > 0) {
      referenceUrls = additionalReferences.map(a => a.url).filter(Boolean) as string[]
    } else {
      // Find selected assets across all batches
      const selectedAssets = batches.flatMap(b => b.assets).filter(a => a.selected)
      if (selectedAssets.length > 0) {
        referenceUrls = selectedAssets.map(a => a.url)
      } else if (batches.length === 0) {
        // Only use initial references for the FIRST generation
        referenceUrls = referenceAssets.map(a => a.url).filter(Boolean) as string[]
      }
    }

    if (lastBatch) {
      // If there's refinement text, append it to the prompt
      if (lastBatch.refinement.trim()) {
        effectivePrompt = `${effectivePrompt}. ${lastBatch.refinement.trim()}`
      }
    } else if (pendingRefinement.trim()) {
      // Use pending refinement from Bubble if no batches yet
      effectivePrompt = `${effectivePrompt}. ${pendingRefinement.trim()}`
      setPendingRefinement("") // Clear after use
    }

    const batchId = `batch-${Date.now()}`

    try {
      if (assetType === "image") {
        // Generate 4 images
        const selectedAspect = ASPECT_RATIOS.find(r => r.id === aspectRatio) || ASPECT_RATIOS[0]
        let urls: string[]

        if (imageModel === "nano-banana") {
          // Use Google AI Nano Banana via Replicate
          urls = await generateImagesNanoBanana({
            prompt: effectivePrompt,
            negativePrompt,
            aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
            numberOfImages: 4,
          })
        } else if (imageModel === "grok") {
          // Use Grok via FAL.ai
          urls = await generateImagesGrok({
            prompt: effectivePrompt,
            negativePrompt,
            aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
            numberOfImages: 4,
          })
        } else {
          // Use Replicate (flux-pro, gpt, sdxl)
          urls = await generateImages({
            prompt: effectivePrompt,
            negativePrompt,
            style: stylePreset || undefined,
            referenceImageUrls: referenceUrls.length > 0 ? referenceUrls : undefined,
            model: imageModel as "flux-pro" | "gpt" | "sdxl",
            numOutputs: 4,
            width: selectedAspect.width,
            height: selectedAspect.height,
          })
        }

        const newBatch: GeneratedBatch = {
          id: batchId,
          assets: urls.map((url, i) => ({
            id: `${batchId}-${i}`,
            url,
            selected: false,
            isVideo: false,
          })),
          prompt: effectivePrompt,
          timestamp: Date.now(),
          refinement: "",
        }

        setBatches(prev => [...prev, newBatch])
        setAdditionalReferences([]) // Clear after successful generation
      } else if (assetType === "video") {
        // Generate 1 video directly
        // Use reference image if provided, otherwise generate without
        const referenceImage = referenceUrls.length > 0 ? referenceUrls[0] : undefined

        // Video only supports 16:9, 9:16, 1:1 - fall back to 16:9 if 4:3 selected
        const videoAspect = aspectRatio === "4:3" ? "16:9" : aspectRatio
        let videoUrl: string

        if (videoModel === "veo-3") {
          // Use Google AI Veo 3 via Replicate
          videoUrl = await generateVideoVeo({
            prompt: effectivePrompt,
            imageUrl: referenceImage,
            aspectRatio: videoAspect as "16:9" | "9:16" | "1:1",
            duration: videoDuration,
          })
        } else if (videoModel === "grok-video") {
          // Use Grok via FAL.ai
          videoUrl = await generateVideoGrok({
            prompt: effectivePrompt,
            imageUrl: referenceImage,
            aspectRatio: videoAspect as "16:9" | "9:16" | "1:1",
            duration: videoDuration,
          })
        } else {
          // Use Replicate (kling, minimax)
          videoUrl = await generateVideo({
            imageUrl: referenceImage,
            prompt: effectivePrompt,
            duration: videoDuration,
            aspectRatio: videoAspect,
            model: videoModel as "kling" | "minimax",
          })
        }

        const newBatch: GeneratedBatch = {
          id: batchId,
          assets: [{
            id: `${batchId}-0`,
            url: videoUrl,
            selected: false,
            isVideo: true,
            duration: videoDuration,
          }],
          prompt: effectivePrompt,
          timestamp: Date.now(),
          refinement: "",
        }

        setBatches(prev => [...prev, newBatch])
        setAdditionalReferences([]) // Clear after successful generation
      } else if (assetType === "audio") {
        let audioUrl: string
        let audioDuration: number | undefined

        if (category === "music") {
          audioUrl = await generateMusic({
            prompt: effectivePrompt,
            duration: 10,
          })
          audioDuration = 10
        } else if (category === "sound_effect") {
          audioUrl = await generateSoundEffect({
            text: effectivePrompt,
            duration_seconds: 5,
          })
          audioDuration = 5
        } else {
          audioUrl = await generateVoice({
            text: effectivePrompt,
          })
          // Voice duration is unknown at generation time
        }

        const newBatch: GeneratedBatch = {
          id: batchId,
          assets: [{
            id: `${batchId}-0`,
            url: audioUrl,
            selected: false,
            duration: audioDuration,
          }],
          prompt: effectivePrompt,
          timestamp: Date.now(),
          refinement: "",
        }

        setBatches(prev => [...prev, newBatch])
      }
    } catch (err) {
      console.error("Generation error:", err)
      setError(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleToggleSelection = (batchId: string, assetId: string) => {
    setBatches(prev => prev.map(batch => {
      if (batch.id === batchId) {
        return {
          ...batch,
          assets: batch.assets.map(asset =>
            asset.id === assetId ? { ...asset, selected: !asset.selected } : asset
          )
        }
      }
      return batch
    }))
  }

  const handleUpdateRefinement = (batchId: string, text: string) => {
    setBatches(prev => prev.map(batch => {
      if (batch.id === batchId) {
        return { ...batch, refinement: text }
      }
      return batch
    }))
  }

  const handleRemoveBatch = (batchId: string) => {
    setBatches(prev => prev.filter(b => b.id !== batchId))
  }

  const handleRemoveAsset = (batchId: string, assetId: string) => {
    setBatches(prev => prev.map(batch => {
      if (batch.id === batchId) {
        const newAssets = batch.assets.filter(a => a.id !== assetId)
        return newAssets.length > 0 ? { ...batch, assets: newAssets } : null
      }
      return batch
    }).filter(Boolean) as GeneratedBatch[])
  }

  // Animate an image into a video (for video asset type)
  const handleAnimate = async (batchId: string, assetId: string, imageUrl: string) => {
    // Mark as animating
    setBatches(prev => prev.map(batch => {
      if (batch.id === batchId) {
        return {
          ...batch,
          assets: batch.assets.map(a =>
            a.id === assetId ? { ...a, isAnimating: true } : a
          )
        }
      }
      return batch
    }))

    try {
      let videoUrl: string
      const animatePrompt = aiPrompt || userDescription || "Smooth cinematic motion"

      if (videoModel === "veo-3") {
        videoUrl = await generateVideoVeo({
          prompt: animatePrompt,
          imageUrl,
          duration: videoDuration,
        })
      } else if (videoModel === "grok-video") {
        videoUrl = await generateVideoGrok({
          prompt: animatePrompt,
          imageUrl,
          duration: videoDuration,
        })
      } else {
        videoUrl = await generateVideo({
          imageUrl,
          prompt: animatePrompt,
          duration: videoDuration,
          quality: "pro",
          model: videoModel as "kling" | "minimax",
        })
      }

      // Replace the image with the video
      setBatches(prev => prev.map(batch => {
        if (batch.id === batchId) {
          return {
            ...batch,
            assets: batch.assets.map(a =>
              a.id === assetId ? { ...a, url: videoUrl, isVideo: true, isAnimating: false, duration: videoDuration } : a
            )
          }
        }
        return batch
      }))
    } catch (err) {
      console.error("Animation error:", err)
      setError(err instanceof Error ? err.message : "Animation failed")
      // Remove animating state
      setBatches(prev => prev.map(batch => {
        if (batch.id === batchId) {
          return {
            ...batch,
            assets: batch.assets.map(a =>
              a.id === assetId ? { ...a, isAnimating: false } : a
            )
          }
        }
        return batch
      }))
    }
  }

  // Count selected across all batches
  const selectedCount = batches.reduce((acc, batch) =>
    acc + batch.assets.filter(a => a.selected).length, 0
  )
  const canContinue = selectedCount > 0

  const handleContinue = () => {
    if (canContinue) {
      // Flatten selected assets to the store format
      const selected = batches.flatMap(batch =>
        batch.assets.filter(a => a.selected)
      )
      setGeneratedAssets(selected)
      nextStep()
    }
  }

  const getDescriptionPlaceholder = () => {
    if (assetType === "audio") {
      if (category === "music") return "Describe the music (e.g., 'upbeat corporate music with piano')"
      if (category === "sound_effect") return "Describe the sound effect (e.g., 'whoosh transition')"
      if (category === "voice") return "Write the text to speak"
    }
    if (category === "character") return "Describe the character's appearance"
    if (category === "scene") return "Describe the scene or environment"
    return "Describe what you want to generate..."
  }

  // Get the color for the Continue button based on asset type
  const getContinueColor = () => {
    switch (assetType) {
      case "image": return "text-orange-400"
      case "video": return "text-red-400"
      case "audio": return "text-violet-400"
      default: return "text-orange-400"
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header with navigation */}
      <div className="h-[72px] border-b border-zinc-800">
        <div className="h-full px-6 lg:px-8 flex items-center">
          <div className="w-24">
            <button
              onClick={prevStep}
              className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
          </div>

          <h1 className="flex-1 text-center text-xl font-semibold text-zinc-100">
            Create {assetType === "image" ? "Image" : assetType === "video" ? "Video" : "Audio"}
          </h1>

          <div className="w-24 flex justify-end">
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className={cn(
                "flex items-center gap-1 transition-colors",
                canContinue
                  ? cn(getContinueColor(), "hover:opacity-80")
                  : "text-zinc-600 cursor-not-allowed"
              )}
            >
              <span className="text-sm font-medium">Continue</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl w-full mx-auto px-6 lg:px-8 py-8">
          {/* Form Section - No panel wrapper initially */}
          <div className="space-y-5 mb-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Name <span className="text-red-400">*</span>
            </label>
            <textarea
              ref={nameRef}
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder={`Name your ${assetType}...`}
              rows={1}
              className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 resize-none text-lg"
              style={{ overflow: 'hidden' }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              ref={descRef}
              value={userDescription}
              onChange={(e) => setUserDescription(e.target.value)}
              placeholder={getDescriptionPlaceholder()}
              rows={3}
              className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 resize-none"
              style={{ overflow: 'hidden' }}
            />
          </div>

          {/* AI Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-zinc-300">AI Prompt</label>
              <button
                onClick={handleEnhance}
                disabled={!userDescription.trim() || isEnhancing}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5",
                  userDescription.trim() && !isEnhancing
                    ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                )}
              >
                {isEnhancing ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Enhancing...</>
                ) : (
                  <><Wand2 className="w-3 h-3" /> Enhance</>
                )}
              </button>
            </div>
            <textarea
              ref={promptRef}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Technical prompt with style, lighting, composition... (Click Enhance to auto-generate)"
              rows={3}
              className="w-full px-4 py-3 bg-zinc-800/30 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 resize-none font-mono text-sm"
              style={{ overflow: 'hidden' }}
            />
          </div>

          {/* Category Options & Style Row */}
          <div className="flex gap-4">
            {/* Category-specific option (Framing, Composition, etc.) */}
            {categoryConfig && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">{categoryConfig.label}</label>
                <CustomDropdown
                  value={categoryOption}
                  onChange={setCategoryOption}
                  options={categoryConfig.options.map(o => ({
                    value: o.id,
                    label: o.label,
                  }))}
                />
              </div>
            )}
            {/* Style preset (images only) */}
            {assetType === "image" && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Style</label>
                <CustomDropdown
                  value={stylePreset || ""}
                  onChange={(val) => setStylePreset(val || null)}
                  placeholder="None"
                  options={[
                    { value: "", label: "None", description: "No style preset" },
                    ...STYLE_PRESETS.map(s => ({ value: s.id, label: s.label }))
                  ]}
                />
              </div>
            )}
            {/* Aspect Ratio (images and video) */}
            {(assetType === "image" || assetType === "video") && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Aspect Ratio</label>
                <CustomDropdown
                  value={aspectRatio}
                  onChange={(val) => setAspectRatio(val as "16:9" | "9:16" | "1:1" | "4:3")}
                  options={ASPECT_RATIOS.map(r => ({
                    value: r.id,
                    label: r.label,
                  }))}
                />
              </div>
            )}
            {/* Image Model (images only) */}
            {assetType === "image" && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Model</label>
                <CustomDropdown
                  value={imageModel}
                  onChange={(val) => setImageModel(val as "flux-pro" | "gpt" | "nano-banana" | "grok" | "sdxl")}
                  options={IMAGE_MODELS.map(m => ({
                    value: m.id,
                    label: m.label,
                    description: m.description
                  }))}
                />
              </div>
            )}
            {/* Video Model (video only - inline with category options) */}
            {assetType === "video" && (
              <>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Video Model</label>
                  <CustomDropdown
                    value={videoModel}
                    onChange={(val) => setVideoModel(val as "kling" | "veo-3" | "grok-video" | "minimax")}
                    options={VIDEO_MODELS.map(m => ({
                      value: m.id,
                      label: m.label,
                      description: m.description
                    }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Duration</label>
                  <CustomDropdown
                    value={String(videoDuration)}
                    onChange={(val) => setVideoDuration(Number(val))}
                    options={getVideoDurationsForModel(videoModel).map(d => ({
                      value: String(d.id),
                      label: d.label,
                    }))}
                  />
                </div>
              </>
            )}
          </div>

          {/* Legacy video options section - now inline above, remove duplicate */}
          {false && assetType === "video" && (
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Video Model</label>
                <CustomDropdown
                  value={videoModel}
                  onChange={(val) => setVideoModel(val as "kling" | "veo-3" | "grok-video" | "minimax")}
                  options={VIDEO_MODELS.map(m => ({
                    value: m.id,
                    label: m.label,
                    description: m.description
                  }))}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Duration</label>
                <CustomDropdown
                  value={String(videoDuration)}
                  onChange={(val) => setVideoDuration(Number(val))}
                  options={getVideoDurationsForModel(videoModel).map(d => ({
                    value: String(d.id),
                    label: d.label,
                  }))}
                />
              </div>
            </div>
          )}

          {/* Advanced Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Advanced options
          </button>

          {showAdvanced && assetType === "image" && (
            <div className="p-4 bg-zinc-900/30 rounded-xl border border-zinc-800">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Negative Prompt</label>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="Things to avoid..."
                  rows={2}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 resize-none text-sm"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Pending Refinement from Bubble (shows when no batches yet) */}
          {batches.length === 0 && pendingRefinement && (
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
              <label className="block text-sm font-medium text-orange-300 mb-2">
                Refinement from Bubble
              </label>
              <textarea
                value={pendingRefinement}
                onChange={(e) => setPendingRefinement(e.target.value)}
                placeholder="Additional adjustments..."
                rows={2}
                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 resize-none"
              />
              <p className="text-xs text-orange-400/70 mt-2">
                This will be appended to your prompt when you generate
              </p>
            </div>
          )}
        </div>

        {/* Initial Reference Images - shown before batches, locked once generated */}
        {assetType !== "audio" && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-400 mb-3">
              Reference Images
              {batches.length === 0 && <span className="text-zinc-600 font-normal ml-2">(optional)</span>}
              {batches.length > 0 && referenceAssets.length > 0 && <span className="text-zinc-600 font-normal ml-2">(locked)</span>}
            </label>
            <div className="grid grid-cols-4 gap-3">
              {/* Display existing reference images */}
              {referenceAssets.map((asset) => (
                <div
                  key={asset.id}
                  className={cn(
                    "relative aspect-square rounded-xl overflow-hidden border-2 bg-zinc-800",
                    batches.length === 0 ? "group border-zinc-700" : "border-zinc-700/50 opacity-75"
                  )}
                >
                  <img
                    src={getAssetDisplayUrl(asset)}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Only show remove button if no batches yet */}
                  {batches.length === 0 && (
                    <button
                      onClick={() => removeReferenceAsset(asset.id)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 hover:bg-orange-500 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {/* Add button - only show if no batches yet and less than 4 */}
              {batches.length === 0 && referenceAssets.length < 4 && (
                <button
                  onClick={() => setShowReferenceModal(true)}
                  className="aspect-square rounded-xl border-2 border-dashed border-zinc-700 hover:border-orange-500 hover:bg-orange-500/5 flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-orange-400 transition-all"
                >
                  <ImagePlus className="w-8 h-8" />
                  <span className="text-xs">Add Reference</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Generated Batches */}
        <div className="space-y-6">
          {batches.map((batch, batchIndex) => (
            <div key={batch.id}>
              {/* Batch Panel */}
              <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-5">
                {/* Batch Header - just delete option */}
                <div className="flex items-center justify-end mb-3">
                  <button
                    onClick={() => handleRemoveBatch(batch.id)}
                    className="text-xs text-zinc-500 hover:text-orange-400 transition-colors inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove
                  </button>
                </div>

                {/* Assets Grid */}
                {assetType === "audio" ? (
                  <div className="space-y-2">
                    {batch.assets.map(asset => (
                      <div
                        key={asset.id}
                        className={cn(
                          "p-3 rounded-xl border-2 transition-all",
                          asset.selected
                            ? "border-orange-500 bg-orange-500/10"
                            : "border-zinc-700 bg-zinc-800/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleSelection(batch.id, asset.id)}
                            className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                              asset.selected ? "bg-orange-500" : "bg-zinc-700 hover:bg-zinc-600"
                            )}
                          >
                            {asset.selected && <Check className="w-4 h-4 text-white" />}
                          </button>
                          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                            {category === "music" && <Music className="w-5 h-5 text-orange-400" />}
                            {category === "sound_effect" && <Waves className="w-5 h-5 text-orange-400" />}
                            {category === "voice" && <Mic className="w-5 h-5 text-orange-400" />}
                          </div>
                          <audio src={asset.url} controls className="flex-1 h-8" />
                          <button
                            onClick={() => handleRemoveAsset(batch.id, asset.id)}
                            className="p-1.5 text-zinc-500 hover:text-orange-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : assetType === "video" ? (
                  /* Video layout - single video with player controls */
                  <div className="space-y-3">
                    {batch.assets.map(asset => (
                      <div key={asset.id} className="space-y-3">
                        {/* Video player */}
                        <div
                          className={cn(
                            "relative aspect-video rounded-xl overflow-hidden border-2 transition-all",
                            asset.selected
                              ? "border-orange-500 ring-2 ring-orange-500/30"
                              : "border-zinc-700"
                          )}
                        >
                          <video
                            src={asset.url}
                            className="absolute inset-0 w-full h-full object-contain bg-black"
                            controls
                            playsInline
                          />
                          {/* Video badge */}
                          <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-purple-500/80 text-[10px] font-medium text-white flex items-center gap-1 pointer-events-none">
                            <Film className="w-3 h-3" />
                            {videoDuration}s
                          </div>
                        </div>
                        {/* Select button below video */}
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRemoveAsset(batch.id, asset.id)}
                            className="px-3 py-2 text-zinc-400 hover:text-orange-400 transition-colors text-sm inline-flex items-center gap-1.5"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </button>
                          <button
                            onClick={() => handleToggleSelection(batch.id, asset.id)}
                            className={cn(
                              "px-4 py-2 rounded-xl font-medium text-sm transition-all inline-flex items-center gap-2",
                              asset.selected
                                ? "bg-orange-500 text-white"
                                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                            )}
                          >
                            {asset.selected ? (
                              <>
                                <Check className="w-4 h-4" />
                                Selected
                              </>
                            ) : (
                              "Select for Continue"
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Image layout - 2x2 grid */
                  <div className="grid grid-cols-2 gap-3">
                    {batch.assets.map(asset => (
                      <div
                        key={asset.id}
                        className={cn(
                          "group relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer",
                          asset.selected
                            ? "border-orange-500 ring-2 ring-orange-500/30"
                            : "border-zinc-700 hover:border-zinc-600"
                        )}
                        onClick={() => handleToggleSelection(batch.id, asset.id)}
                      >
                        <img src={asset.url} alt="Generated" className="w-full h-auto block" />

                        {/* Hover overlay with actions */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all pointer-events-none" />
                        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveAsset(batch.id, asset.id) }}
                            className="p-1.5 bg-zinc-900/80 hover:bg-orange-500 text-zinc-400 hover:text-white rounded-lg transition-all"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Selection indicator (orange checkmark) */}
                        {asset.selected && !asset.isAnimating && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Refinement section below panel - only for last batch */}
              {batchIndex === batches.length - 1 && assetType !== "audio" && (
                <div className="mt-4 space-y-4">
                  {/* Refinement text */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      Refinements for next generation
                      {selectedCount > 0 && (
                        <span className="ml-2 text-orange-400 text-xs">(selected images will be used as reference)</span>
                      )}
                    </label>
                    <textarea
                      value={batch.refinement}
                      onChange={(e) => handleUpdateRefinement(batch.id, e.target.value)}
                      placeholder="Add changes or adjustments for the next batch... (e.g., 'make it more dramatic', 'change lighting to sunset')"
                      rows={2}
                      className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 resize-none"
                    />
                  </div>

                  {/* Additional reference images for next generation */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-3">
                      Additional Reference Images
                      <span className="text-zinc-600 font-normal ml-2">(for next generation)</span>
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {/* Display additional references */}
                      {additionalReferences.map((asset) => (
                        <div
                          key={asset.id}
                          className="relative group aspect-square rounded-xl overflow-hidden border-2 border-zinc-700 bg-zinc-800"
                        >
                          <img
                            src={getAssetDisplayUrl(asset)}
                            alt={asset.name}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => setAdditionalReferences(prev => prev.filter(a => a.id !== asset.id))}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 hover:bg-orange-500 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {/* Add button - show if less than 4 */}
                      {additionalReferences.length < 4 && (
                        <button
                          onClick={() => {
                            setIsAddingToAdditional(true)
                            setShowReferenceModal(true)
                          }}
                          className="aspect-square rounded-xl border-2 border-dashed border-zinc-700 hover:border-orange-500 hover:bg-orange-500/5 flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-orange-400 transition-all"
                        >
                          <ImagePlus className="w-8 h-8" />
                          <span className="text-xs">Add Reference</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* Audio refinement - simpler, no reference images */}
              {batchIndex === batches.length - 1 && assetType === "audio" && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Refinements for next generation
                  </label>
                  <textarea
                    value={batch.refinement}
                    onChange={(e) => handleUpdateRefinement(batch.id, e.target.value)}
                    placeholder="Add changes or adjustments for the next batch..."
                    rows={2}
                    className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 resize-none"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Single Generate Button - always at the bottom */}
        <div className="mt-6 pb-16">
          {!isGenerating && (
            <button
              onClick={() => handleGenerate()}
              disabled={!userDescription.trim() && !aiPrompt.trim()}
              className={cn(
                "px-5 py-2.5 rounded-xl font-medium transition-all inline-flex items-center gap-2",
                userDescription.trim() || aiPrompt.trim()
                  ? "bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 text-white hover:opacity-90"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              )}
            >
              <Sparkles className="w-4 h-4" />
              {batches.length === 0
                ? assetType === "video"
                  ? "Generate Video"
                  : assetType === "audio"
                    ? "Generate Audio"
                    : "Generate 4 Images"
                : assetType === "video"
                  ? "Generate Another"
                  : assetType === "audio"
                    ? "Generate More"
                    : "Generate 4 More"
              }
            </button>
          )}

          {/* Loading State */}
          {isGenerating && (
            <div className="py-8 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800 text-center">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-3" />
              <p className="text-zinc-400">Generating{batches.length > 0 ? " more" : ""}...</p>
              {assetType === "image" && imageModel === "flux-pro" && (
                <p className="text-xs text-zinc-600 mt-1">FLUX Pro takes ~1 min for best quality</p>
              )}
            </div>
          )}
        </div>

        </div>
      </div>

      {/* Reference Modal */}
      {assetType && category && (
        <ReferenceModal
          isOpen={showReferenceModal}
          onClose={() => {
            setShowReferenceModal(false)
            setIsAddingToAdditional(false)
          }}
          onSelect={(asset) => {
            if (isAddingToAdditional) {
              setAdditionalReferences(prev => [...prev, asset])
            } else {
              addReferenceAsset(asset)
            }
            setShowReferenceModal(false)
            setIsAddingToAdditional(false)
          }}
          assetType={assetType}
          category={category as DBAssetCategory}
        />
      )}
    </div>
  )
}
