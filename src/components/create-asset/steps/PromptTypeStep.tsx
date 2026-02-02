import { ChevronLeft, ChevronRight, Type, ImagePlus, Paintbrush, Expand, Maximize, RefreshCw, ArrowRight, Mic2, Volume2, Wand2, LayoutTemplate } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useAssetWizardStore,
  getPromptTypesForAssetType,
  PromptType,
  AssetType,
} from "@/state/assetWizardStore"

// Color schemes for each asset type
const TYPE_COLORS: Record<AssetType, {
  border: string
  bg: string
  iconBg: string
  iconText: string
  selectedBg: string
  continueText: string
}> = {
  image: {
    border: "border-orange-500",
    bg: "bg-orange-500/10",
    iconBg: "bg-orange-500/20",
    iconText: "text-orange-400",
    selectedBg: "bg-orange-500",
    continueText: "text-orange-400 hover:opacity-80",
  },
  video: {
    border: "border-red-500",
    bg: "bg-red-500/10",
    iconBg: "bg-red-500/20",
    iconText: "text-red-400",
    selectedBg: "bg-red-500",
    continueText: "text-red-400 hover:opacity-80",
  },
  audio: {
    border: "border-violet-500",
    bg: "bg-violet-500/10",
    iconBg: "bg-violet-500/20",
    iconText: "text-violet-400",
    selectedBg: "bg-violet-500",
    continueText: "text-violet-400 hover:opacity-80",
  },
  animation: {
    border: "border-emerald-500",
    bg: "bg-emerald-500/10",
    iconBg: "bg-emerald-500/20",
    iconText: "text-emerald-400",
    selectedBg: "bg-emerald-500",
    continueText: "text-emerald-400 hover:opacity-80",
  },
}

// Icons for each prompt type
const PROMPT_TYPE_ICONS: Record<string, React.ElementType> = {
  "text-to-image": Type,
  "image-to-image": ImagePlus,
  "inpaint": Paintbrush,
  "upscale": Maximize,
  "text-to-video": Type,
  "image-to-video": ImagePlus,
  "video-to-video": RefreshCw,
  "extend": ArrowRight,
  "text-to-speech": Type,
  "voice-to-voice": Mic2,
  "music-sfx": Volume2,
  "text-to-animation": Wand2,
  "template": LayoutTemplate,
}

export function PromptTypeStep() {
  const { assetType, promptType, setPromptType, nextStep, prevStep } = useAssetWizardStore()

  const promptTypes = getPromptTypesForAssetType(assetType)
  const colors = assetType ? TYPE_COLORS[assetType] : TYPE_COLORS.image

  const handleSelect = (type: PromptType) => {
    setPromptType(type)
  }

  const handleContinue = () => {
    if (promptType) {
      nextStep()
    }
  }

  const handleBack = () => {
    prevStep()
  }

  // Get title based on asset type
  const getTitle = () => {
    switch (assetType) {
      case "image": return "Select Image Generation Type"
      case "video": return "Select Video Generation Type"
      case "audio": return "Select Audio Generation Type"
      case "animation": return "Select Animation Type"
      default: return "Select Generation Type"
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header with navigation */}
      <div className="h-[72px] border-b border-zinc-800">
        <div className="h-full px-6 lg:px-8 flex items-center">
          <div className="w-24">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
          </div>

          <h1 className="flex-1 text-center text-xl font-semibold text-zinc-100">
            {getTitle()}
          </h1>

          <div className="w-24 flex justify-end">
            <button
              onClick={handleContinue}
              disabled={!promptType}
              className={cn(
                "flex items-center gap-1 transition-colors",
                promptType
                  ? colors.continueText
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
        <div className="max-w-lg mx-auto px-6 lg:px-8 pt-10 pb-6 space-y-2">
            {promptTypes.map((type) => {
            const Icon = PROMPT_TYPE_ICONS[type.id] || Type
            const isSelected = promptType === type.id

            return (
              <button
                key={type.id}
                onClick={() => handleSelect(type.id as PromptType)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                  isSelected
                    ? cn(colors.border, colors.bg)
                    : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900"
                )}
              >
                <Icon
                  className={cn(
                    "w-6 h-6 flex-shrink-0",
                    isSelected ? colors.iconText : "text-zinc-400"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-zinc-100">{type.label}</h3>
                  <p className="text-sm text-zinc-500 truncate">{type.description}</p>
                </div>
                {isSelected && (
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0", colors.selectedBg)}>
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </button>
            )
          })}

          {promptTypes.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <p>No generation types available for this asset type.</p>
              <p className="text-sm mt-2">Please go back and select a different type.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
