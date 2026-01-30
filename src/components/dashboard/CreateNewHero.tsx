import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clapperboard,
  Wand2,
  Download,
  MessageSquare,
  Mic,
  Rocket,
  Image,
  Video,
  Music,
  Play,
  Cloud,
  Type,
  ImagePlus,
  Paintbrush,
  Expand,
  Maximize,
  ArrowRight,
  RefreshCw,
  Mic2,
  Volume2,
  LucideIcon,
  Loader2,
} from "lucide-react"
import { useCreatorStore, type AssetType } from "@/state/creatorStore"
import { generateAssetDraft } from "@/services/claude"

interface CreateNewHeroProps {
  onStartWithBubble?: () => void
}

// Primary modes
type PrimaryMode = "bubble" | "image" | "video" | "audio" | "animation"

// Sub-mode definition
interface SubMode {
  id: string
  label: string
  icon: LucideIcon
  title: string
  description: string
  inputs: string
  outputs: string
}

// Sub-modes for each primary mode
const IMAGE_SUB_MODES: SubMode[] = [
  {
    id: "text-to-image",
    label: "Text → Image",
    icon: Type,
    title: "Text to Image Generation",
    description: "Generate images from natural language descriptions. The model interprets your text prompt and synthesizes a corresponding visual output using diffusion-based generation.",
    inputs: "Text prompt describing the desired image, optional style modifiers, aspect ratio, and quality settings.",
    outputs: "Single or batch of generated images at specified resolution (up to 2048x2048)."
  },
  {
    id: "image-to-image",
    label: "Img → Img",
    icon: ImagePlus,
    title: "Image to Image Transformation",
    description: "Transform existing images using text guidance. The model uses your source image as a structural reference while applying modifications based on your prompt.",
    inputs: "Source image + text prompt describing desired changes. Strength parameter controls deviation from original (0.1-1.0).",
    outputs: "Transformed image maintaining structural similarity to input based on strength setting."
  },
  {
    id: "inpaint",
    label: "Inpaint",
    icon: Paintbrush,
    title: "Inpainting & Selective Editing",
    description: "Selectively modify regions of an image while preserving the rest. Paint a mask over areas to regenerate, and the model will seamlessly blend new content.",
    inputs: "Source image + binary mask indicating edit regions + text prompt for masked area content.",
    outputs: "Edited image with masked regions regenerated according to prompt, seamlessly blended."
  },
  {
    id: "selective-edit",
    label: "Multi-Ref",
    icon: Expand,
    title: "Selective Editing (Multi-Reference)",
    description: "Compose or edit images using multiple reference images. Insert characters into scenes, blend styles, or create new compositions from reference elements.",
    inputs: "Text prompt + 1-4 reference images with optional roles (character, scene, style, object).",
    outputs: "Generated image combining elements from references according to prompt."
  },
  {
    id: "upscale",
    label: "Upscale",
    icon: Maximize,
    title: "AI Upscaling & Enhancement",
    description: "Increase image resolution while adding realistic detail. Uses super-resolution models to intelligently upscale without introducing artifacts.",
    inputs: "Low-resolution source image + scale factor (2x, 4x) + optional enhancement parameters.",
    outputs: "High-resolution image with enhanced detail and clarity."
  },
]

const VIDEO_SUB_MODES: SubMode[] = [
  {
    id: "text-to-video",
    label: "Text → Video",
    icon: Type,
    title: "Text to Video Generation",
    description: "Generate video clips from text descriptions. The model synthesizes temporally coherent frames depicting motion and action described in your prompt.",
    inputs: "Text prompt describing scene, action, and camera movement. Duration (3-10s), aspect ratio, and frame rate settings.",
    outputs: "Generated video clip with smooth motion and temporal consistency."
  },
  {
    id: "image-to-video",
    label: "Img → Video",
    icon: ImagePlus,
    title: "Image to Video Animation",
    description: "Animate static images into video sequences. The model infers natural motion from your image and generates frames that bring the scene to life.",
    inputs: "Source image + motion prompt describing desired animation. Optional camera movement parameters.",
    outputs: "Animated video sequence derived from the source image (3-10 seconds)."
  },
  {
    id: "video-to-video",
    label: "Vid → Vid",
    icon: RefreshCw,
    title: "Video to Video Stylization",
    description: "Transform existing videos with style transfer or content modification. Applies consistent transformations across all frames while maintaining temporal coherence.",
    inputs: "Source video + style/transformation prompt. Strength parameter for style intensity.",
    outputs: "Stylized video maintaining motion from original with applied visual transformations."
  },
  {
    id: "extend",
    label: "Extend",
    icon: ArrowRight,
    title: "Video Extension & Continuation",
    description: "Extend video clips by generating additional frames that continue the action. The model predicts logical continuations of motion and narrative.",
    inputs: "Source video clip + extension duration + optional prompt guiding continuation.",
    outputs: "Extended video with AI-generated frames appended to original sequence."
  },
]

const AUDIO_SUB_MODES: SubMode[] = [
  {
    id: "text-to-speech",
    label: "Text → Speech",
    icon: Type,
    title: "Text to Speech Synthesis",
    description: "Convert written text into natural-sounding speech. Advanced neural TTS models produce human-like intonation, rhythm, and expressiveness.",
    inputs: "Text content + voice selection + speaking style (neutral, expressive, narrative). Optional speed and pitch adjustments.",
    outputs: "High-quality audio file with synthesized speech matching selected voice characteristics."
  },
  {
    id: "voice-to-voice",
    label: "Voice → Voice",
    icon: Mic2,
    title: "Voice Conversion & Cloning",
    description: "Transform voice recordings to match different speaker characteristics. Clone voices from samples or convert between predefined voice profiles.",
    inputs: "Source audio recording + target voice profile or reference sample for cloning.",
    outputs: "Converted audio with source speech content in target voice characteristics."
  },
  {
    id: "music-sfx",
    label: "Music / SFX",
    icon: Volume2,
    title: "Music & Sound Effect Generation",
    description: "Generate original music tracks and sound effects from text descriptions. Create ambient soundscapes, musical compositions, or specific audio effects.",
    inputs: "Text description of desired audio + duration + optional genre/mood/tempo parameters.",
    outputs: "Generated audio file matching description (music track, ambient sound, or specific SFX)."
  },
]

// Primary mode definitions with info card content
const PRIMARY_MODES = [
  {
    id: "bubble" as PrimaryMode,
    label: "Ask Bubble",
    icon: Cloud,
    color: "sky",
    title: "AI Production Assistant",
    description: "Describe what you want to create in natural language. Bubble will analyze your request, ask clarifying questions, and guide you through the optimal generation workflow.",
    inputs: "Open-ended natural language description of your creative vision.",
    outputs: "Guided workflow recommendations, asset generation, and project assembly assistance."
  },
  { id: "image" as PrimaryMode, label: "Image", icon: Image, color: "orange" },
  { id: "video" as PrimaryMode, label: "Video", icon: Video, color: "red" },
  { id: "audio" as PrimaryMode, label: "Audio", icon: Music, color: "violet" },
  {
    id: "animation" as PrimaryMode,
    label: "Animation",
    icon: Play,
    color: "emerald",
    title: "Animation Generation",
    description: "Advanced animation capabilities are currently in development. This will include character animation, motion graphics, and procedural animation tools.",
    inputs: "Coming soon.",
    outputs: "Coming soon."
  },
]

// Instruction cards for the carousel
const instructionCards = [
  {
    id: 1,
    icon: MessageSquare,
    title: "Describe Your Vision",
    description: "Type or speak what you want to create. Be as detailed or as simple as you like.",
  },
  {
    id: 2,
    icon: Sparkles,
    title: "Choose Your Path",
    description: "Select a generation mode — image, video, audio — and let AI handle the rest.",
  },
  {
    id: 3,
    icon: Wand2,
    title: "AI-Guided Creation",
    description: "Bubble AI will ask clarifying questions and help refine your ideas.",
  },
  {
    id: 4,
    icon: Clapperboard,
    title: "Generate & Iterate",
    description: "Create images, videos, and audio with AI. Regenerate until it's perfect.",
  },
  {
    id: 5,
    icon: Video,
    title: "Assemble & Edit",
    description: "Assemble your assets into a timeline. Refine and polish in the workspace.",
  },
  {
    id: 6,
    icon: Download,
    title: "Export Finished Project",
    description: "Render your final video and export in your preferred format and resolution.",
  },
]

// Helper to get sub-modes for a primary mode
function getSubModes(primaryMode: PrimaryMode): SubMode[] | null {
  switch (primaryMode) {
    case "image":
      return IMAGE_SUB_MODES
    case "video":
      return VIDEO_SUB_MODES
    case "audio":
      return AUDIO_SUB_MODES
    default:
      return null
  }
}

// Helper to get default sub-mode for a primary mode
function getDefaultSubMode(primaryMode: PrimaryMode): string | null {
  switch (primaryMode) {
    case "image":
      return "text-to-image"
    case "video":
      return "text-to-video"
    case "audio":
      return "text-to-speech"
    default:
      return null
  }
}

// Helper to get info card content
function getInfoCardContent(primaryMode: PrimaryMode, subMode: string | null) {
  const subModes = getSubModes(primaryMode)

  if (subModes && subMode) {
    const selectedSubMode = subModes.find(m => m.id === subMode)
    if (selectedSubMode) {
      return {
        title: selectedSubMode.title,
        description: selectedSubMode.description,
        inputs: selectedSubMode.inputs,
        outputs: selectedSubMode.outputs,
      }
    }
  }

  // Fall back to primary mode info
  const primaryModeData = PRIMARY_MODES.find(m => m.id === primaryMode)
  if (primaryModeData && 'title' in primaryModeData) {
    return {
      title: primaryModeData.title,
      description: primaryModeData.description,
      inputs: primaryModeData.inputs,
      outputs: primaryModeData.outputs,
    }
  }

  return null
}

export function CreateNewHero({ onStartWithBubble }: CreateNewHeroProps) {
  const navigate = useNavigate()
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [inputValue, setInputValue] = useState("")
  const [primaryMode, setPrimaryMode] = useState<PrimaryMode>("image")
  const [subMode, setSubMode] = useState<string | null>("text-to-image")
  const [isLaunching, setIsLaunching] = useState(false)

  const {
    setDraft,
    setMode,
    setOriginalPrompt,
    setIsGeneratingDraft,
    setDraftError,
  } = useCreatorStore()

  const handlePrimaryModeChange = (mode: PrimaryMode) => {
    setPrimaryMode(mode)
    setSubMode(getDefaultSubMode(mode))
  }

  // Get the route for the creator page based on mode selection
  const getCreatorRoute = (type: PrimaryMode, sub: string | null): string => {
    if (type === "bubble") return "/"
    if (!sub) return `/create/${type}`
    return `/create/${type}/${sub}`
  }

  // Handle Launch button click
  const handleLaunch = async () => {
    // If "Ask Bubble" mode, open Bubble panel instead
    if (primaryMode === "bubble") {
      onStartWithBubble?.()
      return
    }

    const trimmedPrompt = inputValue.trim()
    const route = getCreatorRoute(primaryMode, subMode)

    // Store the mode selection
    setMode(primaryMode as AssetType, subMode || "")
    setOriginalPrompt(trimmedPrompt)

    // If no prompt, just navigate to the creator page (empty form)
    if (!trimmedPrompt) {
      setDraft(null)
      navigate(route)
      return
    }

    // Generate AI draft
    setIsLaunching(true)
    setIsGeneratingDraft(true)
    setDraftError(null)

    try {
      const draft = await generateAssetDraft({
        userPrompt: trimmedPrompt,
        assetType: primaryMode as AssetType,
        subMode: subMode || "text-to-image",
      })

      setDraft(draft)
      navigate(route)
    } catch (error) {
      console.error("Failed to generate draft:", error)
      setDraftError(error instanceof Error ? error.message : "Failed to generate draft")
      // Still navigate, but with empty draft
      setDraft(null)
      navigate(route)
    } finally {
      setIsLaunching(false)
      setIsGeneratingDraft(false)
    }
  }

  const canGoLeft = carouselIndex > 0
  const canGoRight = carouselIndex < instructionCards.length - 1

  const handlePrev = () => {
    if (canGoLeft) setCarouselIndex(carouselIndex - 1)
  }

  const handleNext = () => {
    if (canGoRight) setCarouselIndex(carouselIndex + 1)
  }

  const currentSubModes = getSubModes(primaryMode)
  const infoCard = getInfoCardContent(primaryMode, subMode)

  // Get color for current primary mode
  const currentPrimaryMode = PRIMARY_MODES.find(m => m.id === primaryMode)
  const modeColor = currentPrimaryMode?.color || "sky"

  return (
    <div className="py-6 sm:py-8 md:py-10 lg:py-12">
      <div className="w-full max-w-[90%] md:max-w-[80%] lg:max-w-3xl mx-auto space-y-4">

        {/* Instruction Carousel */}
        <div className="relative">
          <button
            onClick={handlePrev}
            disabled={!canGoLeft}
            className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-2 z-10 transition-opacity ${
              canGoLeft ? "opacity-100 hover:opacity-80" : "opacity-30 cursor-not-allowed"
            }`}
          >
            <ChevronLeft className="h-6 w-6 text-zinc-400" />
          </button>

          <div className="overflow-hidden px-[1px]">
            <div
              className="flex gap-4 transition-transform duration-300 ease-out"
              style={{ transform: `translateX(calc(-${carouselIndex} * (75% + 1rem)))` }}
            >
              {instructionCards.map((card, idx) => {
                const Icon = card.icon
                const isActive = idx === carouselIndex
                const isNext = idx === carouselIndex + 1

                const opacityClass = isActive
                  ? "border-zinc-500 bg-zinc-900/80"
                  : isNext
                    ? "border-zinc-700 bg-zinc-900/50 opacity-60"
                    : "border-zinc-800 bg-zinc-900/30 opacity-30"

                return (
                  <div
                    key={card.id}
                    className={`w-[75%] flex-shrink-0 ${opacityClass} border rounded-xl p-5 sm:p-6 md:p-7 transition-all duration-300 flex flex-col min-h-[160px] sm:min-h-[180px] md:min-h-[200px]`}
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-zinc-800 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-sky-400" />
                    </div>
                    <h4 className="text-sm sm:text-base md:text-lg font-semibold text-zinc-100 mb-2">
                      {card.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-zinc-400 line-clamp-3 mt-auto">
                      {card.description}
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-zinc-950 to-transparent pointer-events-none" />
          </div>

          <button
            onClick={handleNext}
            disabled={!canGoRight}
            className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-2 z-10 transition-opacity ${
              canGoRight ? "opacity-100 hover:opacity-80" : "opacity-30 cursor-not-allowed"
            }`}
          >
            <ChevronRight className="h-6 w-6 text-zinc-400" />
          </button>

          <div className="flex justify-center gap-1.5 mt-4">
            {instructionCards.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCarouselIndex(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  idx === carouselIndex
                    ? "bg-sky-400 w-4"
                    : "bg-zinc-700 hover:bg-zinc-600"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Main Chat Input Bar */}
        <div className="relative flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-xl shadow-black/20 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/50 transition-all">
          <button
            type="button"
            className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-sky-400 transition-colors"
            aria-label="Voice input"
          >
            <Mic className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Describe what you want to create..."
            className="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder:text-zinc-500 text-base sm:text-lg px-2 py-2"
          />
        </div>

        {/* Row 1: Primary Mode Toggles - Equal width, fill container */}
        <div className="grid grid-cols-5 gap-2">
          {PRIMARY_MODES.map((mode) => {
            const Icon = mode.icon
            const isSelected = primaryMode === mode.id

            const colorClasses = isSelected
              ? mode.id === "bubble"
                ? "bg-sky-500/10 text-sky-400 border-sky-500"
                : mode.id === "image"
                  ? "bg-orange-500/10 text-orange-400 border-orange-500"
                  : mode.id === "video"
                    ? "bg-red-500/10 text-red-400 border-red-500"
                    : mode.id === "audio"
                      ? "bg-violet-500/10 text-violet-400 border-violet-500"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500"
              : "bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-600"

            return (
              <button
                key={mode.id}
                onClick={() => handlePrimaryModeChange(mode.id)}
                className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border font-medium text-xs sm:text-sm transition-all ${colorClasses}`}
              >
                <Icon className="w-5 h-5" />
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            )
          })}
        </div>

        {/* Info Card with Sub-Mode Icons */}
        {infoCard && (
          <div className={`rounded-xl border p-5 transition-all ${
            modeColor === "sky" ? "bg-sky-500/5 border-sky-500/20" :
            modeColor === "orange" ? "bg-orange-500/5 border-orange-500/20" :
            modeColor === "red" ? "bg-red-500/5 border-red-500/20" :
            modeColor === "violet" ? "bg-violet-500/5 border-violet-500/20" :
            modeColor === "emerald" ? "bg-emerald-500/5 border-emerald-500/20" :
            "bg-zinc-800/50 border-zinc-700"
          }`}>
            {/* Sub-mode icons row - always reserve space */}
            <div className="h-11 flex justify-center items-center gap-2 mb-4">
              {currentSubModes ? (
                currentSubModes.map((mode) => {
                  const Icon = mode.icon
                  const isSelected = subMode === mode.id

                  const selectedColorClass =
                    primaryMode === "image" ? "bg-orange-500/20 border-orange-500 text-orange-300" :
                    primaryMode === "video" ? "bg-red-500/20 border-red-500 text-red-300" :
                    primaryMode === "audio" ? "bg-violet-500/20 border-violet-500 text-violet-300" :
                    "bg-zinc-700 border-zinc-500 text-white"

                  return (
                    <button
                      key={mode.id}
                      onClick={() => setSubMode(mode.id)}
                      title={mode.label}
                      className={`w-11 h-11 flex items-center justify-center rounded-lg border transition-all ${
                        isSelected
                          ? selectedColorClass
                          : "bg-zinc-800/30 text-zinc-500 border-zinc-800 hover:bg-zinc-800/50 hover:text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  )
                })
              ) : null}
            </div>

            {/* Divider line */}
            <div className={`h-px mb-4 ${
              modeColor === "sky" ? "bg-sky-500/20" :
              modeColor === "orange" ? "bg-orange-500/20" :
              modeColor === "red" ? "bg-red-500/20" :
              modeColor === "violet" ? "bg-violet-500/20" :
              modeColor === "emerald" ? "bg-emerald-500/20" :
              "bg-zinc-700"
            }`} />

            <h3 className={`text-lg font-semibold mb-2 ${
              modeColor === "sky" ? "text-sky-300" :
              modeColor === "orange" ? "text-orange-300" :
              modeColor === "red" ? "text-red-300" :
              modeColor === "violet" ? "text-violet-300" :
              modeColor === "emerald" ? "text-emerald-300" :
              "text-zinc-200"
            }`}>
              {infoCard.title}
            </h3>
            <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
              {infoCard.description}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <div className={`font-medium uppercase tracking-wide ${
                  modeColor === "sky" ? "text-sky-400" :
                  modeColor === "orange" ? "text-orange-400" :
                  modeColor === "red" ? "text-red-400" :
                  modeColor === "violet" ? "text-violet-400" :
                  modeColor === "emerald" ? "text-emerald-400" :
                  "text-zinc-300"
                }`}>
                  Inputs
                </div>
                <p className="text-zinc-500 leading-relaxed">{infoCard.inputs}</p>
              </div>
              <div className="space-y-1">
                <div className={`font-medium uppercase tracking-wide ${
                  modeColor === "sky" ? "text-sky-400" :
                  modeColor === "orange" ? "text-orange-400" :
                  modeColor === "red" ? "text-red-400" :
                  modeColor === "violet" ? "text-violet-400" :
                  modeColor === "emerald" ? "text-emerald-400" :
                  "text-zinc-300"
                }`}>
                  Outputs
                </div>
                <p className="text-zinc-500 leading-relaxed">{infoCard.outputs}</p>
              </div>
            </div>
          </div>
        )}

        {/* Launch Button */}
        {primaryMode !== "bubble" && (
          <button
            onClick={handleLaunch}
            disabled={isLaunching}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 border ${
              isLaunching
                ? "bg-zinc-800/50 text-zinc-500 border-zinc-700 cursor-wait"
                : modeColor === "orange"
                  ? "bg-orange-500/10 text-orange-400 border-orange-500 hover:bg-orange-500/20"
                  : modeColor === "red"
                    ? "bg-red-500/10 text-red-400 border-red-500 hover:bg-red-500/20"
                    : modeColor === "violet"
                      ? "bg-violet-500/10 text-violet-400 border-violet-500 hover:bg-violet-500/20"
                      : modeColor === "emerald"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500 hover:bg-emerald-500/20"
                        : "bg-sky-500/10 text-sky-400 border-sky-500 hover:bg-sky-500/20"
            }`}
          >
            {isLaunching ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Preparing...</span>
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5" />
                <span>Launch</span>
              </>
            )}
          </button>
        )}

        {/* Ask Bubble Button */}
        {primaryMode === "bubble" && (
          <button
            onClick={() => onStartWithBubble?.()}
            className="w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 border bg-sky-500/10 text-sky-400 border-sky-500 hover:bg-sky-500/20"
          >
            <Cloud className="w-5 h-5" />
            <span>Start with Bubble</span>
          </button>
        )}
      </div>
    </div>
  )
}
