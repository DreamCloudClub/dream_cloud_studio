import { useState, useEffect, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Image,
  Video,
  Music,
  Play,
  Wand2,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Trash2,
  ImagePlus,
  Upload,
  Paintbrush,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useCreatorStore, type AssetType } from "@/state/creatorStore"
import { useUIStore } from "@/state/uiStore"
import { BubblePanel } from "@/components/create"
import { InspectorPanel } from "@/components/workspace"
import { ReferenceModal } from "@/components/create-asset/ReferenceModal"
import { generateImages } from "@/services/replicate"
import { getAssetDisplayUrl } from "@/services/localStorage"
import type { Asset, AssetCategory } from "@/types/database"
import {
  getModeConfig,
  IMAGE_MODELS,
  STYLE_PRESETS,
  ASPECT_RATIOS,
  OUTPUT_COUNTS,
  INPAINT_AREAS,
  REFERENCE_ROLES,
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
            ? "border-sky-500 ring-1 ring-sky-500/20"
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
                  ? "bg-sky-500/10 text-sky-400"
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
                <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />
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
        className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
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

  const {
    draft,
    originalPrompt,
    isGeneratingDraft,
    draftError,
    clearDraft,
  } = useCreatorStore()

  const { isBubbleCollapsed, toggleBubbleCollapsed } = useUIStore()
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false)

  // Get mode configuration
  const modeConfig = getModeConfig(subMode)
  const caps = modeConfig.capabilities

  // Form state
  const [projectName, setProjectName] = useState("")
  const [description, setDescription] = useState("")
  const [enhancedPrompt, setEnhancedPrompt] = useState("")

  // Core parameter state
  const [model, setModel] = useState("flux-pro")
  const [aspectRatio, setAspectRatio] = useState("16:9")
  const [outputCount, setOutputCount] = useState("4")
  const [stylePreset, setStylePreset] = useState("")
  const [strength, setStrength] = useState(0.75)

  // Advanced parameter state
  const [negativePrompt, setNegativePrompt] = useState("")
  const [steps, setSteps] = useState(30)
  const [guidance, setGuidance] = useState(7.5)
  const [seed, setSeed] = useState("")
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Inpainting specific
  const [maskBlur, setMaskBlur] = useState(4)
  const [inpaintArea, setInpaintArea] = useState("masked_only")

  // Selective editing specific
  const [referenceStrength, setReferenceStrength] = useState(0.8)

  // Base image (for img2img, inpaint)
  const [baseImage, setBaseImage] = useState<Asset | null>(null)
  const [baseImageUrl, setBaseImageUrl] = useState<string | null>(null)

  // Reference images (for selective-edit)
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([])
  const [showReferenceModal, setShowReferenceModal] = useState(false)
  const [referenceModalTarget, setReferenceModalTarget] = useState<"base" | "reference">("reference")

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [batches, setBatches] = useState<GeneratedBatch[]>([])

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

  const handleBack = () => {
    clearDraft()
    navigate("/")
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

  const handleGenerate = async () => {
    // Validate required inputs
    if (!description.trim() && !enhancedPrompt.trim()) {
      setError("Please enter a description or prompt")
      return
    }

    if (caps.requires_base_image && !baseImage) {
      setError("Please select a base image")
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
    const numOutputs = parseInt(outputCount)

    try {
      // Build reference URLs
      let referenceUrls: string[] = []
      if (caps.allows_reference_images && referenceImages.length > 0) {
        referenceUrls = referenceImages
          .map(r => getAssetDisplayUrl(r.asset))
          .filter(Boolean) as string[]
      }

      // Get aspect ratio dimensions
      const selectedAspect = ASPECT_RATIOS.find(r => r.id === aspectRatio) || ASPECT_RATIOS[0]

      const urls = await generateImages({
        prompt: effectivePrompt,
        negativePrompt: caps.supports_negative_prompt ? negativePrompt : undefined,
        style: caps.supports_style_preset && stylePreset ? stylePreset : undefined,
        referenceImageUrls: referenceUrls.length > 0 ? referenceUrls : undefined,
        model: model as "flux-pro" | "gpt" | "sdxl",
        numOutputs,
        width: selectedAspect.width,
        height: selectedAspect.height,
      })

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
  const canGenerate = (description.trim() || enhancedPrompt.trim()) &&
    (!caps.requires_base_image || baseImage) &&
    (!caps.requires_mask || true) // TODO: Check mask

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-zinc-800 flex items-center px-4 flex-shrink-0">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>

        <div className="flex-1 flex items-center justify-center gap-2">
          <div className={`w-7 h-7 rounded-lg ${colors.accent} flex items-center justify-center`}>
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <h1 className="text-sm font-semibold text-white">{modeLabel}</h1>
        </div>

        <div className="w-[80px]" />
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
                  className="w-full px-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500 resize-none"
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
                  className="w-full px-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500 resize-none"
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
                  className={`w-full px-4 py-2.5 bg-zinc-800/30 border rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500 resize-none font-mono text-sm ${
                    draft ? colors.border : "border-zinc-800"
                  }`}
                  style={{ overflow: 'hidden' }}
                />
              </div>
            </div>

            {/* ============================================ */}
            {/* BASE IMAGE (img2img, inpaint) */}
            {/* ============================================ */}
            {caps.requires_base_image && (
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
                        className="absolute bottom-2 right-2 px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium flex items-center gap-2 transition-all"
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
                    className="w-full aspect-video rounded-xl border-2 border-dashed border-zinc-700 hover:border-sky-500 hover:bg-sky-500/5 flex flex-col items-center justify-center gap-3 text-zinc-500 hover:text-sky-400 transition-all"
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
                      className="aspect-square rounded-xl border-2 border-dashed border-zinc-700 hover:border-sky-500 hover:bg-sky-500/5 flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-sky-400 transition-all"
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

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Model - Always shown */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Model</label>
                  <CustomDropdown
                    value={model}
                    onChange={setModel}
                    options={IMAGE_MODELS.map(m => ({
                      value: m.id,
                      label: m.label,
                      description: m.description,
                    }))}
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

                {/* Seed */}
                {caps.supports_seed && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Seed</label>
                    <input
                      type="text"
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      placeholder="Random"
                      className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-700/50 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500 text-sm"
                    />
                  </div>
                )}
              </div>

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
            </div>

            {/* ============================================ */}
            {/* ADVANCED OPTIONS */}
            {/* ============================================ */}
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
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500 resize-none text-sm"
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
                              ? "border-sky-500 ring-2 ring-sky-500/30"
                              : "border-zinc-700 hover:border-zinc-600"
                          )}
                          onClick={() => handleToggleSelection(batch.id, asset.id)}
                        >
                          <img src={asset.url} alt="Generated" className="w-full h-auto block" />
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
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center">
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
                        Refinements for next generation
                        {selectedCount > 0 && (
                          <span className="ml-2 text-sky-400 text-xs">(selected images will be used as reference)</span>
                        )}
                      </label>
                      <textarea
                        value={batch.refinement}
                        onChange={(e) => handleUpdateRefinement(batch.id, e.target.value)}
                        placeholder="Add changes for the next batch..."
                        rows={2}
                        className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500 resize-none"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ============================================ */}
            {/* ACTION BUTTONS */}
            {/* ============================================ */}
            <div className="space-y-3 pt-2">
              {/* Generate Button */}
              <button
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

              {/* Use Selected Button */}
              {selectedCount > 0 && (
                <button
                  onClick={() => {
                    // TODO: Save selected assets and continue
                    console.log("Use selected:", selectedCount, "assets")
                  }}
                  className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${colors.accent} text-white hover:opacity-90`}
                >
                  <Check className="w-5 h-5" />
                  <span>Use Selected ({selectedCount})</span>
                </button>
              )}
            </div>
          </div>
        </main>

        {/* Control Panel (Right) */}
        <div
          className={`${
            isInspectorCollapsed ? "w-16" : "w-80"
          } flex-shrink-0 hidden md:flex transition-all duration-300 overflow-hidden`}
        >
          <InspectorPanel
            isCollapsed={isInspectorCollapsed}
            onToggleCollapse={() => setIsInspectorCollapsed(!isInspectorCollapsed)}
            libraryPage="dashboard"
          />
        </div>
      </div>

      {/* Reference Modal */}
      <ReferenceModal
        isOpen={showReferenceModal}
        onClose={() => setShowReferenceModal(false)}
        onSelect={(asset) => {
          if (referenceModalTarget === "base") {
            handleSelectBaseImage(asset)
          } else {
            handleAddReferenceImage(asset)
          }
        }}
        assetType="image"
        category={"scene" as AssetCategory}
      />
    </div>
  )
}
