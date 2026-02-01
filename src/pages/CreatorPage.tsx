import { useState, useEffect, useRef } from "react"
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom"
import {
  Sparkles,
  Loader2,
  Image,
  Video,
  Music,
  Play,
  Wand2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Trash2,
  ImagePlus,
  Upload,
  Paintbrush,
  Info,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useCreatorStore, type AssetType } from "@/state/creatorStore"
import { useUIStore } from "@/state/uiStore"
import { useAuth } from "@/contexts/AuthContext"
import { useAssetWizardStore, type PromptType } from "@/state/assetWizardStore"
import { BubblePanel } from "@/components/create"
import { InspectorPanel, WorkspaceNav } from "@/components/workspace"
import { HeaderActions } from "@/components/shared"
import { DashboardNav } from "@/components/dashboard"
import studioLogo from "@/assets/images/studio_logo.png"
import { ReferenceModal } from "@/components/create-asset/ReferenceModal"
import { generateImages, generateVideo } from "@/services/replicate"
import { generateImagesNanoBanana, generateVideoVeo } from "@/services/google-ai"
import { generateImagesGrok, generateVideoGrok } from "@/services/grok"
import { getAssetDisplayUrl } from "@/services/localStorage"
import type { Asset, AssetCategory } from "@/types/database"
import {
  getModeConfig,
  IMAGE_MODELS,
  getImageModelConfig,
  getModelsForWorkflow,
  STYLE_PRESETS,
  ASPECT_RATIOS,
  OUTPUT_COUNTS,
  INPAINT_AREAS,
  REFERENCE_ROLES,
  type ImageModelConfig,
} from "@/config/imageModes"

// ============================================
// Custom Dropdown Component
// ============================================
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-3 py-2 bg-zinc-900/80 border rounded-lg text-left transition-all text-sm",
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
            "w-4 h-4 text-zinc-400 transition-transform flex-shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 py-1 bg-zinc-900 border border-zinc-700/50 rounded-lg shadow-xl shadow-black/30 overflow-hidden max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={cn(
                "w-full px-3 py-2 text-left transition-all text-sm",
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
                <Check className="w-4 h-4 text-orange-400 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// Slider Component
// ============================================
interface SliderProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  label?: string
  showValue?: boolean
}

function Slider({ value, onChange, min, max, step = 1, showValue = true }: SliderProps) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
      />
      {showValue && (
        <span className="text-sm text-zinc-400 w-12 text-right font-mono">{value}</span>
      )}
    </div>
  )
}

// ============================================
// Types
// ============================================
interface GeneratedBatch {
  id: string
  assets: {
    id: string
    url: string
    selected: boolean
    isVideo?: boolean
    duration?: number
  }[]
  prompt: string
  timestamp: number
  refinement: string
}

interface ReferenceImage {
  asset: Asset
  role?: string
}

// Mode display names
const MODE_LABELS: Record<string, string> = {
  "text-to-image": "Text to Image",
  "image-to-image": "Image to Image",
  "inpaint": "Inpainting",
  "selective-edit": "Selective Editing",
  "outpaint": "Outpainting",
  "upscale": "AI Upscaling",
  "text-to-video": "Text to Video",
  "image-to-video": "Image to Video",
  "video-to-video": "Video Stylization",
  "extend": "Video Extension",
  "text-to-speech": "Text to Speech",
  "voice-to-voice": "Voice Conversion",
  "music-sfx": "Music & SFX",
}

const TYPE_ICONS: Record<string, typeof Image> = {
  image: Image,
  video: Video,
  audio: Music,
  animation: Play,
}

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  image: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", accent: "bg-orange-500" },
  video: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", accent: "bg-red-500" },
  audio: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/30", accent: "bg-violet-500" },
  animation: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", accent: "bg-emerald-500" },
}

// Video generation options
const VIDEO_MODELS = [
  { value: "kling", label: "Kling v2.1", description: "Best quality" },
  { value: "veo-3", label: "Veo 3", description: "Google AI" },
  { value: "grok-video", label: "Grok Video", description: "xAI" },
  { value: "minimax", label: "Minimax", description: "Fast" },
]

const VIDEO_DURATIONS = [
  { value: "5", label: "5 seconds" },
  { value: "10", label: "10 seconds" },
]

const VIDEO_ASPECT_RATIOS = [
  { value: "16:9", label: "Landscape (16:9)" },
  { value: "9:16", label: "Portrait (9:16)" },
  { value: "1:1", label: "Square (1:1)" },
]

// ============================================
// Auto-growing textarea hook
// ============================================
function useAutoGrow(value: string, minRows: number = 3) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = ref.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24
    const minHeight = lineHeight * minRows + 20
    const newHeight = Math.max(textarea.scrollHeight, minHeight)
    textarea.style.height = `${newHeight}px`
  }, [value, minRows])

  return ref
}

// ============================================
// Main Component
// ============================================
export function CreatorPage() {
  const navigate = useNavigate()
  const { type, subMode } = useParams<{ type: string; subMode: string }>()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get("projectId")
  const { user, profile, signOut } = useAuth()

  const {
    draft,
    originalPrompt,
    isGeneratingDraft,
    draftError,
    clearDraft,
  } = useCreatorStore()

  const { isBubbleCollapsed, toggleBubbleCollapsed, isInspectorCollapsed, toggleInspectorCollapsed } = useUIStore()

  // Get mode configuration
  const modeConfig = getModeConfig(subMode)
  const caps = modeConfig.capabilities

  // Form state
  const [projectName, setProjectName] = useState("")
  const [description, setDescription] = useState("")
  const [enhancedPrompt, setEnhancedPrompt] = useState("")

  // Core parameter state
  const [model, setModel] = useState("sdxl")
  const [aspectRatio, setAspectRatio] = useState("16:9")
  const [outputCount, setOutputCount] = useState("1")
  const [stylePreset, setStylePreset] = useState("")
  const [strength, setStrength] = useState(0.75)

  // Advanced parameter state
  const [negativePrompt, setNegativePrompt] = useState("")
  const [steps, setSteps] = useState(30)
  const [guidance, setGuidance] = useState(7.5)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Ensure selected model is compatible with current workflow
  useEffect(() => {
    const workflow = subMode as ImageModelConfig['workflows'][number]
    if (workflow) {
      const compatibleModels = getModelsForWorkflow(workflow)
      const isCurrentModelCompatible = compatibleModels.some(m => m.id === model)
      if (!isCurrentModelCompatible && compatibleModels.length > 0) {
        setModel(compatibleModels[0].id)
      }
    }
  }, [subMode, model])

  // Inpainting specific
  const [maskBlur, setMaskBlur] = useState(4)
  const [inpaintArea, setInpaintArea] = useState("masked_only")

  // Selective editing specific
  const [referenceStrength, setReferenceStrength] = useState(0.8)

  // Base image (for img2img, inpaint, image-to-video)
  const [baseImage, setBaseImage] = useState<Asset | null>(null)
  const [baseImageUrl, setBaseImageUrl] = useState<string | null>(null)

  // Video-specific state
  const [videoModel, setVideoModel] = useState<"kling" | "veo-3" | "grok-video" | "minimax">("kling")
  const [videoDuration, setVideoDuration] = useState<5 | 10>(5)
  const [videoAspectRatio, setVideoAspectRatio] = useState("16:9")

  // Check if this is a video type
  const isVideo = type === "video"
  const isImageToVideo = isVideo && subMode === "image-to-video"
  const isTextToVideo = isVideo && subMode === "text-to-video"

  // Reference images (for selective-edit)
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([])
  const [showReferenceModal, setShowReferenceModal] = useState(false)
  const [referenceModalTarget, setReferenceModalTarget] = useState<"base" | "reference" | "img2img">("reference")

  // Image-to-image reference images (dynamic based on model)
  const [img2imgRefs, setImg2imgRefs] = useState<Asset[]>([])

  // Trim img2imgRefs when model changes to one with lower limit
  useEffect(() => {
    const modelConfig = getImageModelConfig(model)
    const effectiveMax = Math.min(modelConfig?.maxImageInputs || 1, 12)
    if (img2imgRefs.length > effectiveMax) {
      setImg2imgRefs(prev => prev.slice(0, effectiveMax))
    }
  }, [model, img2imgRefs.length])

  // Model info modal
  const [showModelInfoModal, setShowModelInfoModal] = useState(false)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-grow refs
  const nameRef = useAutoGrow(projectName, 1)
  const descRef = useAutoGrow(description, 2)
  const promptRef = useAutoGrow(enhancedPrompt, 3)

  // Populate form when draft arrives
  useEffect(() => {
    if (draft) {
      setProjectName(draft.projectName || "")
      setDescription(draft.description || "")
      setEnhancedPrompt(draft.enhancedPrompt || "")
    } else if (originalPrompt) {
      setEnhancedPrompt(originalPrompt)
    }
  }, [draft, originalPrompt])

  // Listen for Bubble's image model updates
  useEffect(() => {
    const handleBubbleImageModel = (event: CustomEvent<{ imageModel: string }>) => {
      const { imageModel: newModel } = event.detail
      if (['flux-pro', 'gpt', 'nano-banana', 'grok', 'sdxl'].includes(newModel)) {
        setModel(newModel)
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
      if (['16:9', '9:16', '1:1', '4:3', '3:2'].includes(newRatio)) {
        setAspectRatio(newRatio)
        if (isVideo) {
          setVideoAspectRatio(newRatio)
        }
      }
    }

    window.addEventListener('bubble-update-aspect-ratio', handleBubbleAspectRatio as EventListener)
    return () => {
      window.removeEventListener('bubble-update-aspect-ratio', handleBubbleAspectRatio as EventListener)
    }
  }, [isVideo])

  // Listen for Bubble's video duration updates
  useEffect(() => {
    const handleBubbleVideoDuration = (event: CustomEvent<{ videoDuration: number }>) => {
      const { videoDuration: newDuration } = event.detail
      if ([5, 10].includes(newDuration)) {
        setVideoDuration(newDuration as 5 | 10)
      }
    }

    window.addEventListener('bubble-update-video-duration', handleBubbleVideoDuration as EventListener)
    return () => {
      window.removeEventListener('bubble-update-video-duration', handleBubbleVideoDuration as EventListener)
    }
  }, [])

  // Listen for Bubble's trigger generation event
  useEffect(() => {
    const handleBubbleTriggerGeneration = () => {
      // Find and click the generate button
      const generateButton = document.querySelector('[data-generate-button]') as HTMLButtonElement
      if (generateButton && !generateButton.disabled) {
        generateButton.click()
      }
    }

    window.addEventListener('bubble-trigger-generation', handleBubbleTriggerGeneration)
    return () => {
      window.removeEventListener('bubble-trigger-generation', handleBubbleTriggerGeneration)
    }
  }, [])

  // Listen for Bubble's name updates
  useEffect(() => {
    const handleBubbleName = (event: CustomEvent<{ name: string }>) => {
      setProjectName(event.detail.name)
    }

    window.addEventListener('bubble-update-name', handleBubbleName as EventListener)
    return () => {
      window.removeEventListener('bubble-update-name', handleBubbleName as EventListener)
    }
  }, [])

  // Listen for Bubble's description updates
  useEffect(() => {
    const handleBubbleDescription = (event: CustomEvent<{ description: string }>) => {
      setDescription(event.detail.description)
    }

    window.addEventListener('bubble-update-description', handleBubbleDescription as EventListener)
    return () => {
      window.removeEventListener('bubble-update-description', handleBubbleDescription as EventListener)
    }
  }, [])

  // Listen for Bubble's AI prompt updates
  useEffect(() => {
    const handleBubbleAiPrompt = (event: CustomEvent<{ aiPrompt: string }>) => {
      setEnhancedPrompt(event.detail.aiPrompt)
    }

    window.addEventListener('bubble-update-ai-prompt', handleBubbleAiPrompt as EventListener)
    return () => {
      window.removeEventListener('bubble-update-ai-prompt', handleBubbleAiPrompt as EventListener)
    }
  }, [])

  // Listen for Bubble's continue to save event
  useEffect(() => {
    const handleBubbleContinue = () => {
      // Find and click the continue button
      const continueButton = document.querySelector('[data-continue-button]') as HTMLButtonElement
      if (continueButton && !continueButton.disabled) {
        continueButton.click()
      }
    }

    window.addEventListener('bubble-continue-to-save', handleBubbleContinue)
    return () => {
      window.removeEventListener('bubble-continue-to-save', handleBubbleContinue)
    }
  }, [])

  // Listen for Bubble's save assets event
  useEffect(() => {
    const handleBubbleSave = () => {
      // Find and click the save button
      const saveButton = document.querySelector('[data-save-button]') as HTMLButtonElement
      if (saveButton && !saveButton.disabled) {
        saveButton.click()
      }
    }

    window.addEventListener('bubble-save-assets', handleBubbleSave)
    return () => {
      window.removeEventListener('bubble-save-assets', handleBubbleSave)
    }
  }, [])

  // Asset wizard store for save flow
  const {
    setAssetType: setWizardAssetType,
    setPromptType: setWizardPromptType,
    setGeneratedAssets,
    setUserDescription: setWizardDescription,
    setAiPrompt: setWizardPrompt,
    setCurrentStep,
    cachedBatches,
    setCachedBatches,
  } = useAssetWizardStore()

  // Use cached batches from store to persist across navigation
  // Ensure batches is always an array (fallback for initial/undefined state)
  const batches = Array.isArray(cachedBatches) ? cachedBatches : []
  const setBatches = setCachedBatches

  // Listen for Bubble's refinement updates
  useEffect(() => {
    const handleBubbleRefinement = (event: CustomEvent<{ refinement: string }>) => {
      // Update the last batch's refinement field
      setCachedBatches(prev => {
        if (prev.length === 0) return prev
        return prev.map((batch, index) =>
          index === prev.length - 1
            ? { ...batch, refinement: event.detail.refinement }
            : batch
        )
      })
    }

    window.addEventListener('bubble-update-refinement', handleBubbleRefinement as EventListener)
    return () => {
      window.removeEventListener('bubble-update-refinement', handleBubbleRefinement as EventListener)
    }
  }, [setCachedBatches])

  const handleBack = () => {
    clearDraft()
    // Go back to step 2 (prompt type selection)
    setCurrentStep("promptType")
    // Use browser back to preserve state and avoid full reload
    navigate(-1)
  }

  // Get all selected assets from batches
  const selectedAssets = batches.flatMap(b => b.assets).filter(a => a.selected)
  const hasSelectedAssets = selectedAssets.length > 0

  const handleSave = () => {
    if (!hasSelectedAssets) return

    // Transfer data to wizard store
    setWizardAssetType(type as any)
    setWizardPromptType(subMode as PromptType)
    setWizardDescription(description)
    setWizardPrompt(enhancedPrompt)
    setGeneratedAssets(selectedAssets)
    setCurrentStep("save")

    // Navigate to wizard save step (same flow for both contexts)
    const url = projectId ? `/create/asset?projectId=${projectId}` : "/create/asset"
    navigate(url)
  }

  const handleSelectBaseImage = (asset: Asset) => {
    setBaseImage(asset)
    setBaseImageUrl(getAssetDisplayUrl(asset))
    setShowReferenceModal(false)
  }

  const handleAddReferenceImage = (asset: Asset) => {
    if (referenceImages.length < caps.max_reference_images) {
      setReferenceImages(prev => [...prev, { asset, role: "character" }])
    }
    setShowReferenceModal(false)
  }

  const handleRemoveReferenceImage = (assetId: string) => {
    setReferenceImages(prev => prev.filter(r => r.asset.id !== assetId))
  }

  const handleUpdateReferenceRole = (assetId: string, role: string) => {
    setReferenceImages(prev => prev.map(r =>
      r.asset.id === assetId ? { ...r, role } : r
    ))
  }

  // Img2img reference handlers
  const handleAddImg2imgRef = (asset: Asset) => {
    const modelConfig = getImageModelConfig(model)
    const effectiveMax = Math.min(modelConfig?.maxImageInputs || 1, 12)
    if (img2imgRefs.length < effectiveMax) {
      setImg2imgRefs(prev => [...prev, asset])
    }
    setShowReferenceModal(false)
  }

  const handleRemoveImg2imgRef = (index: number) => {
    setImg2imgRefs(prev => prev.filter((_, i) => i !== index))
  }

  const handleGenerate = async () => {
    // Get selected generated images (for regeneration)
    const selectedGeneratedImages = batches.flatMap(b => b.assets).filter(a => a.selected)

    // Validate required inputs
    if (!description.trim() && !enhancedPrompt.trim()) {
      setError("Please enter a description or prompt")
      return
    }

    // Validate base image for image-to-video
    if (isImageToVideo && !baseImage) {
      setError("Please select a source image for video generation")
      return
    }

    // Validate base image for inpaint (img2img uses img2imgRefs instead)
    if (caps.requires_base_image && subMode !== "image-to-image" && !baseImage) {
      setError("Please select a base image")
      return
    }

    // Validate reference images for image-to-image
    // Allow if we have refs OR selected generated images to regenerate from
    if (subMode === "image-to-image" && img2imgRefs.length === 0 && selectedGeneratedImages.length === 0) {
      setError("Please add a reference image or select a generated image")
      return
    }

    if (caps.requires_mask) {
      // TODO: Validate mask is drawn
      setError("Mask editing coming soon")
      return
    }

    setIsGenerating(true)
    setError(null)

    const effectivePrompt = enhancedPrompt.trim() || description.trim()
    const batchId = `batch-${Date.now()}`

    try {
      // Handle video generation
      if (isVideo) {
        const sourceImageUrl = baseImage ? getAssetDisplayUrl(baseImage) : undefined
        let videoUrl: string

        if (videoModel === "veo-3") {
          videoUrl = await generateVideoVeo({
            prompt: effectivePrompt,
            imageUrl: sourceImageUrl,
            aspectRatio: videoAspectRatio as "16:9" | "9:16" | "1:1",
            duration: videoDuration,
          })
        } else if (videoModel === "grok-video") {
          videoUrl = await generateVideoGrok({
            prompt: effectivePrompt,
            imageUrl: sourceImageUrl,
            aspectRatio: videoAspectRatio as "16:9" | "9:16" | "1:1",
            duration: videoDuration,
          })
        } else {
          videoUrl = await generateVideo({
            imageUrl: sourceImageUrl,
            prompt: effectivePrompt,
            duration: videoDuration,
            aspectRatio: videoAspectRatio as "16:9" | "9:16" | "1:1",
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
          }],
          prompt: effectivePrompt,
          timestamp: Date.now(),
          refinement: "",
        }

        setBatches(prev => [...prev, newBatch])
      } else {
        // Handle image generation
        const numOutputs = parseInt(outputCount)

        // Build reference URLs
        let referenceUrls: string[] = []

        // For image-to-image, use img2imgRefs first, then fall back to selected generated images
        if (subMode === "image-to-image") {
          if (img2imgRefs.length > 0) {
            referenceUrls = img2imgRefs
              .map(asset => getAssetDisplayUrl(asset))
              .filter(Boolean) as string[]
          } else if (selectedGeneratedImages.length > 0) {
            // Use selected generated images as the new reference
            referenceUrls = selectedGeneratedImages
              .map(asset => asset.url)
              .filter(Boolean) as string[]
            console.log(`Using ${referenceUrls.length} selected generated image(s) as reference`)
          }
        }
        // For selective-edit, use referenceImages
        else if (caps.allows_reference_images && referenceImages.length > 0) {
          referenceUrls = referenceImages
            .map(r => getAssetDisplayUrl(r.asset))
            .filter(Boolean) as string[]
        }

        // Get aspect ratio dimensions
        const selectedAspect = ASPECT_RATIOS.find(r => r.id === aspectRatio) || ASPECT_RATIOS[0]
        let urls: string[]

        if (model === "nano-banana") {
          urls = await generateImagesNanoBanana({
            prompt: effectivePrompt,
            negativePrompt: caps.supports_negative_prompt ? negativePrompt : undefined,
            aspectRatio: referenceUrls.length > 0 ? "match_input_image" : aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
            numberOfImages: numOutputs,
            referenceImageUrls: referenceUrls.length > 0 ? referenceUrls : undefined,
          })
        } else if (model === "grok") {
          urls = await generateImagesGrok({
            prompt: effectivePrompt,
            negativePrompt: caps.supports_negative_prompt ? negativePrompt : undefined,
            aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
            numberOfImages: numOutputs,
          })
        } else {
          urls = await generateImages({
            prompt: effectivePrompt,
            negativePrompt: caps.supports_negative_prompt ? negativePrompt : undefined,
            style: caps.supports_style_preset && stylePreset ? stylePreset : undefined,
            referenceImageUrls: referenceUrls.length > 0 ? referenceUrls : undefined,
            model: model as "flux-pro" | "flux-kontext" | "gpt" | "sdxl",
            numOutputs,
            width: selectedAspect.width,
            height: selectedAspect.height,
            strength: caps.supports_strength ? strength : undefined,
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

  // Count selected across all batches
  const selectedCount = batches.reduce((acc, batch) =>
    acc + batch.assets.filter(a => a.selected).length, 0
  )

  const assetType = (type as AssetType) || "image"
  const Icon = TYPE_ICONS[assetType] || Image
  const colors = TYPE_COLORS[assetType] || TYPE_COLORS.image
  const modeLabel = MODE_LABELS[subMode || ""] || modeConfig.label

  // Check if we can generate
  // For img2img: allow if we have ref images OR selected generated images to use as refs
  const hasImg2imgSource = img2imgRefs.length > 0 || selectedCount > 0
  const canGenerate = (description.trim() || enhancedPrompt.trim()) &&
    (subMode !== "image-to-image" || hasImg2imgSource) && // img2img needs refs or selected images
    (subMode === "image-to-image" || !caps.requires_base_image || baseImage) && // other modes need base image
    (!caps.requires_mask || true) // TODO: Check mask

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      {/* Primary Header - Dream Cloud Studio + User */}
      <header className="h-14 border-b border-zinc-800 px-4 sm:px-6 flex items-center justify-between bg-zinc-950 flex-shrink-0">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
          <img
            src={studioLogo}
            alt="Dream Cloud Studio"
            className="w-8 h-8 rounded-lg object-contain flex-shrink-0"
          />
          <h1 className="text-base sm:text-lg font-semibold text-zinc-100 truncate">Dream Cloud Studio</h1>
        </Link>

        <HeaderActions
          userName={profile?.full_name || user?.email?.split("@")[0] || "User"}
          userEmail={user?.email || ""}
          userAvatar={profile?.avatar_url}
          onSignOut={signOut}
        />
      </header>

      {/* Main Layout with Panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Bubble Panel (Left) */}
        <div
          className={`${
            isBubbleCollapsed ? "w-16" : "w-80"
          } flex-shrink-0 hidden md:flex transition-all duration-300`}
        >
          <BubblePanel
            isCollapsed={isBubbleCollapsed}
            onToggleCollapse={toggleBubbleCollapsed}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Secondary Header - Navigation (inside panels) */}
          <div className="h-[72px] border-b border-zinc-800 bg-zinc-900/50 flex-shrink-0">
            <div className="h-full px-6 lg:px-8 flex items-center">
            <div className="w-24">
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Back</span>
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center gap-2">
              <Icon className={`w-5 h-5 ${colors.text}`} />
              <h1 className="text-xl font-semibold text-zinc-100">{modeLabel}</h1>
            </div>

            <div className="w-24 flex justify-end">
              <button
                data-continue-button
                onClick={handleSave}
                disabled={!hasSelectedAssets}
                className={cn(
                  "flex items-center gap-1 transition-colors",
                  hasSelectedAssets
                    ? "text-orange-400 hover:text-orange-300"
                    : "text-zinc-600 cursor-not-allowed"
                )}
              >
                <span className="text-sm font-medium">Continue</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1 overflow-auto py-6">
          <div className="max-w-2xl mx-auto px-6 space-y-5">

            {/* Loading State */}
            {isGeneratingDraft && (
              <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4 flex items-center gap-3`}>
                <Loader2 className={`w-5 h-5 ${colors.text} animate-spin`} />
                <div>
                  <p className="text-white font-medium text-sm">Preparing your workspace...</p>
                  <p className="text-xs text-zinc-400">AI is analyzing your prompt</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {draftError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-400 text-sm">
                <p className="font-medium">Failed to generate draft</p>
                <p className="text-xs opacity-80">{draftError}</p>
              </div>
            )}

            {/* Original Prompt Display */}
            {originalPrompt && (
              <div className={`rounded-xl border ${colors.border} ${colors.bg} p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className={`w-3.5 h-3.5 ${colors.text}`} />
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Your Prompt</span>
                </div>
                <p className="text-zinc-300 text-sm">{originalPrompt}</p>
              </div>
            )}

            {/* ============================================ */}
            {/* GLOBAL FORM FIELDS */}
            {/* ============================================ */}
            <div className="space-y-4">
              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Name</label>
                <textarea
                  ref={nameRef}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Name your creation..."
                  rows={1}
                  className="w-full px-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 resize-none"
                  style={{ overflow: 'hidden' }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
                <textarea
                  ref={descRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you want to create..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 resize-none"
                  style={{ overflow: 'hidden' }}
                />
              </div>

              {/* Enhanced Prompt */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-zinc-300">AI Prompt</label>
                  {draft && (
                    <span className={`text-xs ${colors.text} flex items-center gap-1`}>
                      <Wand2 className="w-3 h-3" />
                      Enhanced
                    </span>
                  )}
                </div>
                <textarea
                  ref={promptRef}
                  value={enhancedPrompt}
                  onChange={(e) => setEnhancedPrompt(e.target.value)}
                  placeholder="Technical prompt for generation..."
                  rows={3}
                  className={`w-full px-4 py-2.5 bg-zinc-800/30 border rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 resize-none font-mono text-sm ${
                    draft ? colors.border : "border-zinc-800"
                  }`}
                  style={{ overflow: 'hidden' }}
                />
              </div>
            </div>

            {/* ============================================ */}
            {/* VIDEO SOURCE IMAGE (image-to-video) */}
            {/* ============================================ */}
            {isImageToVideo && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Source Image <span className="text-red-400">*</span>
                </label>
                {baseImage ? (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-red-500/30 bg-zinc-800 group">
                    <img
                      src={baseImageUrl || getAssetDisplayUrl(baseImage)}
                      alt={baseImage.name}
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={() => {
                        setBaseImage(null)
                        setBaseImageUrl(null)
                      }}
                      className="absolute top-2 right-2 p-2 rounded-lg bg-black/70 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setReferenceModalTarget("base")
                      setShowReferenceModal(true)
                    }}
                    className="w-full aspect-video rounded-xl border-2 border-dashed border-red-500/30 hover:border-red-500 hover:bg-red-500/5 flex flex-col items-center justify-center gap-3 text-zinc-500 hover:text-red-400 transition-all"
                  >
                    <ImagePlus className="w-10 h-10" />
                    <span className="text-sm font-medium">Select Source Image</span>
                    <span className="text-xs text-zinc-600">This image will be animated into video</span>
                  </button>
                )}
              </div>
            )}

            {/* ============================================ */}
            {/* BASE IMAGE (inpaint only - img2img handled separately below model selector) */}
            {/* ============================================ */}
            {caps.requires_base_image && subMode !== "image-to-image" && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Base Image <span className="text-red-400">*</span>
                </label>
                {baseImage ? (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-zinc-700 bg-zinc-800 group">
                    <img
                      src={baseImageUrl || getAssetDisplayUrl(baseImage)}
                      alt={baseImage.name}
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={() => {
                        setBaseImage(null)
                        setBaseImageUrl(null)
                      }}
                      className="absolute top-2 right-2 p-2 rounded-lg bg-black/70 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {caps.requires_mask && (
                      <button
                        className="absolute bottom-2 right-2 px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium flex items-center gap-2 transition-all"
                      >
                        <Paintbrush className="w-4 h-4" />
                        Edit Mask
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setReferenceModalTarget("base")
                      setShowReferenceModal(true)
                    }}
                    className="w-full aspect-video rounded-xl border-2 border-dashed border-zinc-700 hover:border-orange-500 hover:bg-orange-500/5 flex flex-col items-center justify-center gap-3 text-zinc-500 hover:text-orange-400 transition-all"
                  >
                    <Upload className="w-10 h-10" />
                    <span className="text-sm font-medium">Select Base Image</span>
                    <span className="text-xs text-zinc-600">From library or upload new</span>
                  </button>
                )}
              </div>
            )}

            {/* ============================================ */}
            {/* REFERENCE IMAGES (selective-edit) */}
            {/* ============================================ */}
            {caps.allows_reference_images && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Reference Images
                  <span className="text-zinc-500 font-normal ml-2">({referenceImages.length}/{caps.max_reference_images})</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {referenceImages.map((ref) => (
                    <div
                      key={ref.asset.id}
                      className="relative rounded-xl overflow-hidden border-2 border-zinc-700 bg-zinc-800 group"
                    >
                      <div className="aspect-square">
                        <img
                          src={getAssetDisplayUrl(ref.asset)}
                          alt={ref.asset.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-2 bg-zinc-900 border-t border-zinc-800">
                        <CustomDropdown
                          value={ref.role || "character"}
                          onChange={(role) => handleUpdateReferenceRole(ref.asset.id, role)}
                          options={REFERENCE_ROLES.map(r => ({ value: r.id, label: r.label }))}
                          className="w-full"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveReferenceImage(ref.asset.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {referenceImages.length < caps.max_reference_images && (
                    <button
                      onClick={() => {
                        setReferenceModalTarget("reference")
                        setShowReferenceModal(true)
                      }}
                      className="aspect-square rounded-xl border-2 border-dashed border-zinc-700 hover:border-orange-500 hover:bg-orange-500/5 flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-orange-400 transition-all"
                    >
                      <ImagePlus className="w-8 h-8" />
                      <span className="text-xs font-medium">Add Reference</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ============================================ */}
            {/* CORE PARAMETERS */}
            {/* ============================================ */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-zinc-400">Parameters</h3>

              {isVideo ? (
                /* Video Parameters */
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Model</label>
                    <CustomDropdown
                      value={videoModel}
                      onChange={(val) => setVideoModel(val as "kling" | "veo-3" | "grok-video" | "minimax")}
                      options={VIDEO_MODELS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Duration</label>
                    <CustomDropdown
                      value={String(videoDuration)}
                      onChange={(val) => setVideoDuration(Number(val) as 5 | 10)}
                      options={VIDEO_DURATIONS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Aspect Ratio</label>
                    <CustomDropdown
                      value={videoAspectRatio}
                      onChange={setVideoAspectRatio}
                      options={VIDEO_ASPECT_RATIOS}
                    />
                  </div>
                </div>
              ) : (
                /* Image Parameters */
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {/* Model Info Button - First element */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">View Models</label>
                      <button
                        onClick={() => setShowModelInfoModal(true)}
                        className="w-full px-3 py-2 bg-orange-500/20 border border-orange-500/50 rounded-lg text-sm text-orange-400 hover:bg-orange-500/30 hover:border-orange-500 transition-all flex items-center justify-center gap-2"
                      >
                        <Info className="w-4 h-4" />
                        <span>Image Models</span>
                      </button>
                    </div>

                    {/* Model Dropdown */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Select Model</label>
                      <CustomDropdown
                        value={model}
                        onChange={setModel}
                        options={(() => {
                          // Filter models by current workflow
                          const workflow = subMode as ImageModelConfig['workflows'][number]
                          const compatibleModels = workflow
                            ? getModelsForWorkflow(workflow)
                            : IMAGE_MODELS
                          return compatibleModels.map(m => ({
                            value: m.id,
                            label: m.label,
                            description: m.company,
                          }))
                        })()}
                      />
                    </div>

                    {/* Aspect Ratio */}
                    {caps.supports_aspect_ratio && (
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Aspect Ratio</label>
                        <CustomDropdown
                          value={aspectRatio}
                          onChange={setAspectRatio}
                          options={ASPECT_RATIOS.map(r => ({ value: r.id, label: r.label }))}
                        />
                      </div>
                    )}

                    {/* Output Count */}
                    {caps.supports_output_count && (
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Output Count</label>
                        <CustomDropdown
                          value={outputCount}
                          onChange={setOutputCount}
                          options={OUTPUT_COUNTS.map(o => ({ value: o.id, label: o.label }))}
                        />
                      </div>
                    )}

                    {/* Style Preset */}
                    {caps.supports_style_preset && (
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Style</label>
                        <CustomDropdown
                          value={stylePreset}
                          onChange={setStylePreset}
                          placeholder="None"
                          options={[
                            { value: "", label: "None" },
                            ...STYLE_PRESETS.map(s => ({ value: s.id, label: s.label }))
                          ]}
                        />
                      </div>
                    )}

                  </div>

                  {/* ============================================ */}
                  {/* DYNAMIC REFERENCE IMAGES (image-to-image only) */}
                  {/* ============================================ */}
                  {subMode === "image-to-image" && (() => {
                    const modelConfig = getImageModelConfig(model)
                    const effectiveMax = Math.min(modelConfig?.maxImageInputs || 1, 12)

                    // Calculate visible slots: always show at least 1, plus 1 empty after last filled
                    const filledCount = img2imgRefs.length
                    const visibleSlots = Math.min(
                      Math.max(1, filledCount + 1),
                      effectiveMax
                    )

                    return (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                          Reference Images
                          <span className="text-zinc-500 font-normal ml-2">
                            {effectiveMax === 1 ? "(1 max)" : `(up to ${effectiveMax})`}
                          </span>
                        </label>
                        <div className="grid grid-cols-4 gap-3">
                          {Array.from({ length: visibleSlots }).map((_, index) => {
                            const asset = img2imgRefs[index]

                            if (asset) {
                              // Filled slot
                              return (
                                <div
                                  key={asset.id}
                                  className="relative aspect-square rounded-xl overflow-hidden border-2 border-orange-500/50 bg-zinc-800 group"
                                >
                                  <img
                                    src={getAssetDisplayUrl(asset)}
                                    alt={asset.name}
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    onClick={() => handleRemoveImg2imgRef(index)}
                                    className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/70 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 text-[10px] text-zinc-300 truncate">
                                    {index + 1}. {asset.name}
                                  </div>
                                </div>
                              )
                            } else {
                              // Empty slot
                              return (
                                <button
                                  key={`empty-${index}`}
                                  onClick={() => {
                                    setReferenceModalTarget("img2img")
                                    setShowReferenceModal(true)
                                  }}
                                  className="aspect-square rounded-xl border-2 border-dashed border-zinc-700 hover:border-orange-500 hover:bg-orange-500/5 flex flex-col items-center justify-center gap-1.5 text-zinc-500 hover:text-orange-400 transition-all"
                                >
                                  <ImagePlus className="w-6 h-6" />
                                  <span className="text-[10px] font-medium">
                                    {index === 0 ? "Add image" : `Add #${index + 1}`}
                                  </span>
                                </button>
                              )
                            }
                          })}
                        </div>
                        {filledCount === 0 && (
                          <p className="text-xs text-zinc-500 mt-2">
                            Add reference images to guide the generation
                          </p>
                        )}
                      </div>
                    )
                  })()}

                  {/* Strength Slider (img2img, inpaint) */}
                  {caps.supports_strength && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                        Strength / Denoise
                        <span className="text-zinc-500 ml-2 font-normal">({(strength * 100).toFixed(0)}%)</span>
                      </label>
                      <Slider
                        value={strength}
                        onChange={setStrength}
                        min={0.1}
                        max={1}
                        step={0.05}
                        showValue={false}
                      />
                      <p className="text-xs text-zinc-500 mt-1">
                        Lower = closer to original, Higher = more transformation
                      </p>
                    </div>
                  )}

                  {/* Reference Strength (selective-edit) */}
                  {caps.supports_reference_strength && referenceImages.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                        Reference Strength
                        <span className="text-zinc-500 ml-2 font-normal">({(referenceStrength * 100).toFixed(0)}%)</span>
                      </label>
                      <Slider
                        value={referenceStrength}
                        onChange={setReferenceStrength}
                        min={0.1}
                        max={1}
                        step={0.05}
                        showValue={false}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ============================================ */}
            {/* ADVANCED OPTIONS (images only) */}
            {/* ============================================ */}
            {!isVideo && (
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Advanced options
              </button>

              {showAdvanced && (
                <div className="mt-3 p-4 bg-zinc-900/30 rounded-xl border border-zinc-800 space-y-4">
                  {/* Negative Prompt */}
                  {caps.supports_negative_prompt && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Negative Prompt</label>
                      <textarea
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="Things to avoid in generation..."
                        rows={2}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 resize-none text-sm"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {/* Steps */}
                    {caps.supports_steps && (
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                          Steps <span className="text-zinc-500 font-normal">({steps})</span>
                        </label>
                        <Slider
                          value={steps}
                          onChange={setSteps}
                          min={10}
                          max={50}
                          step={5}
                          showValue={false}
                        />
                      </div>
                    )}

                    {/* Guidance / CFG */}
                    {caps.supports_guidance && (
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                          Guidance <span className="text-zinc-500 font-normal">({guidance.toFixed(1)})</span>
                        </label>
                        <Slider
                          value={guidance}
                          onChange={setGuidance}
                          min={1}
                          max={20}
                          step={0.5}
                          showValue={false}
                        />
                      </div>
                    )}
                  </div>

                  {/* Inpainting specific options */}
                  {caps.supports_mask_blur && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                        Mask Blur <span className="text-zinc-500 font-normal">({maskBlur}px)</span>
                      </label>
                      <Slider
                        value={maskBlur}
                        onChange={setMaskBlur}
                        min={0}
                        max={20}
                        step={1}
                        showValue={false}
                      />
                    </div>
                  )}

                  {caps.supports_inpaint_area && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Inpaint Area</label>
                      <CustomDropdown
                        value={inpaintArea}
                        onChange={setInpaintArea}
                        options={INPAINT_AREAS.map(a => ({
                          value: a.id,
                          label: a.label,
                          description: a.description,
                        }))}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}

            {/* ============================================ */}
            {/* GENERATED BATCHES */}
            {/* ============================================ */}
            <div className="space-y-6">
              {batches.map((batch, batchIndex) => (
                <div key={batch.id}>
                  {/* Batch Panel */}
                  <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-zinc-500">
                        Batch {batchIndex + 1} &middot; {batch.assets.length} images
                      </span>
                      <button
                        onClick={() => handleRemoveBatch(batch.id)}
                        className="text-xs text-zinc-500 hover:text-orange-400 transition-colors inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                    </div>

                    {/* Image Grid */}
                    <div className={cn(
                      "grid gap-3",
                      batch.assets.length === 1 ? "grid-cols-1" :
                      batch.assets.length === 2 ? "grid-cols-2" :
                      "grid-cols-2"
                    )}>
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
                          {asset.isVideo ? (
                            <video src={asset.url} controls className="w-full h-auto block" />
                          ) : (
                            <img src={asset.url} alt="Generated" className="w-full h-auto block" />
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all pointer-events-none" />
                          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemoveAsset(batch.id, asset.id) }}
                              className="p-1.5 bg-zinc-900/80 hover:bg-orange-500 text-zinc-400 hover:text-white rounded-lg transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {asset.selected && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Refinement section - only for last batch */}
                  {batchIndex === batches.length - 1 && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-zinc-400 mb-2">
                        {selectedCount > 0 ? (
                          <>Regenerate with refinements</>
                        ) : (
                          <>Refinements for next generation</>
                        )}
                      </label>
                      <textarea
                        value={batch.refinement}
                        onChange={(e) => handleUpdateRefinement(batch.id, e.target.value)}
                        placeholder={selectedCount > 0 ? "Describe changes to apply to selected images..." : "Add changes for the next batch..."}
                        rows={2}
                        className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 resize-none"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ============================================ */}
            {/* ACTION BUTTONS */}
            {/* ============================================ */}
            <div className="pt-2 pb-16">
              {/* Model Compatibility Warning */}
              {(() => {
                const modelConfig = getImageModelConfig(model)
                const refCount = referenceImages.length + (baseImage ? 1 : 0)
                const selectedRefCount = batches.flatMap(b => b.assets).filter(a => a.selected).length
                const totalRefs = refCount + selectedRefCount

                if (!modelConfig || totalRefs === 0) return null

                // Check if model doesn't support references at all
                if (totalRefs > 0 && !modelConfig.supportsSingleRef && !modelConfig.supportsMultipleRefs) {
                  return (
                    <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-amber-300 font-medium">
                          {modelConfig.label} doesn't support reference images
                        </p>
                        <p className="text-xs text-amber-400/70 mt-1">
                          Your reference images will be ignored. Switch to FLUX 1.1 Pro (single ref) or GPT Image / Imagen 3 (multi-ref).
                        </p>
                      </div>
                    </div>
                  )
                }

                // Check if model only supports single ref but multiple are selected
                if (totalRefs > 1 && modelConfig.supportsSingleRef && !modelConfig.supportsMultipleRefs) {
                  return (
                    <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-amber-300 font-medium">
                          {modelConfig.label} only supports 1 reference image
                        </p>
                        <p className="text-xs text-amber-400/70 mt-1">
                          Only the first reference will be used. Switch to GPT Image or Imagen 3 for multiple reference support.
                        </p>
                      </div>
                    </div>
                  )
                }

                return null
              })()}

              {/* Generate Button */}
              <button
                data-generate-button
                onClick={handleGenerate}
                disabled={isGenerating || !canGenerate}
                className={cn(
                  "w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 border",
                  isGenerating || !canGenerate
                    ? "bg-zinc-800/50 text-zinc-500 border-zinc-700 cursor-not-allowed"
                    : `${colors.bg} ${colors.text} ${colors.border} hover:bg-opacity-20`
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : batches.length > 0 && selectedCount > 0 ? (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Regenerate</span>
                  </>
                ) : batches.length > 0 ? (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate More</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </main>
        </div>

        {/* Control Panel (Right) */}
        <div
          className={`${
            isInspectorCollapsed ? "w-16" : "w-80"
          } flex-shrink-0 hidden md:flex transition-all duration-300 overflow-hidden`}
        >
          <InspectorPanel
            isCollapsed={isInspectorCollapsed}
            onToggleCollapse={toggleInspectorCollapsed}
            libraryPage="dashboard"
          />
        </div>
      </div>

      {/* Show appropriate bottom nav based on context */}
      {projectId ? <WorkspaceNav activeTabOverride="assets" projectId={projectId} /> : <DashboardNav />}

      {/* Reference Modal */}
      <ReferenceModal
        isOpen={showReferenceModal}
        onClose={() => setShowReferenceModal(false)}
        onSelect={(asset) => {
          if (referenceModalTarget === "base") {
            handleSelectBaseImage(asset)
          } else if (referenceModalTarget === "img2img") {
            handleAddImg2imgRef(asset)
          } else {
            handleAddReferenceImage(asset)
          }
        }}
        assetType="image"
        category={"scene" as AssetCategory}
      />

      {/* Model Info Modal */}
      {showModelInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowModelInfoModal(false)}
          />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-100">Image Models</h2>
              <button
                onClick={() => setShowModelInfoModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              {IMAGE_MODELS.filter(m => {
                // Filter out models that don't support current workflow
                if (subMode === "image-to-image" && !m.supportsSingleRef) return false
                return true
              }).map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "p-4 rounded-xl border transition-colors",
                    model === m.id
                      ? "bg-orange-500/10 border-orange-500/30"
                      : "bg-zinc-800/50 border-zinc-700/50"
                  )}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-zinc-100">{m.label}</h3>
                      <p className="text-xs text-zinc-500">{m.company}</p>
                    </div>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {m.supportsMultipleRefs && (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/20 text-emerald-400">
                          Multi-ref
                        </span>
                      )}
                      {m.supportsSingleRef && !m.supportsMultipleRefs && (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-sky-500/20 text-sky-400">
                          Single ref
                        </span>
                      )}
                      {!m.supportsSingleRef && !m.supportsMultipleRefs && (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-zinc-500/20 text-zinc-400">
                          Text only
                        </span>
                      )}
                      {m.supportsInpainting && (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-purple-500/20 text-purple-400">
                          Inpaint
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Best For */}
                  <div className="mb-3">
                    <p className="text-xs font-medium text-zinc-500 mb-1">Best for</p>
                    <p className="text-sm text-zinc-300">{m.bestFor}</p>
                  </div>

                  {/* Inputs */}
                  <div className="mb-3">
                    <p className="text-xs font-medium text-zinc-500 mb-1">Inputs</p>
                    <ul className="text-xs text-zinc-400 space-y-0.5">
                      {m.inputs.map((input, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-zinc-600 mt-0.5">•</span>
                          <span>{input}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Notes */}
                  <div className="p-2.5 bg-zinc-900/50 rounded-lg">
                    <p className="text-xs text-zinc-500 leading-relaxed">{m.notes}</p>
                  </div>

                  {/* Action */}
                  {model !== m.id && (
                    <button
                      onClick={() => {
                        setModel(m.id)
                        setShowModelInfoModal(false)
                      }}
                      className="mt-3 px-3 py-1.5 text-xs font-medium text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded-lg transition-colors"
                    >
                      Use this model
                    </button>
                  )}
                  {model === m.id && (
                    <p className="mt-3 text-xs text-orange-400 font-medium">Currently selected</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
