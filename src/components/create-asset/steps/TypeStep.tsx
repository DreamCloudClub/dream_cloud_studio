import { useNavigate, useSearchParams } from "react-router-dom"
import { Image, Film, Volume2, Sparkles, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAssetWizardStore, AssetType } from "@/state/assetWizardStore"

// Color schemes for each asset type
const TYPE_COLORS: Record<AssetType, {
  border: string
  bg: string
  iconBg: string
  iconText: string
  selectedBg: string
}> = {
  image: {
    border: "border-orange-500",
    bg: "bg-orange-500/10",
    iconBg: "bg-orange-500/20",
    iconText: "text-orange-400",
    selectedBg: "bg-orange-500",
  },
  video: {
    border: "border-red-500",
    bg: "bg-red-500/10",
    iconBg: "bg-red-500/20",
    iconText: "text-red-400",
    selectedBg: "bg-red-500",
  },
  audio: {
    border: "border-violet-500",
    bg: "bg-violet-500/10",
    iconBg: "bg-violet-500/20",
    iconText: "text-violet-400",
    selectedBg: "bg-violet-500",
  },
  animation: {
    border: "border-emerald-500",
    bg: "bg-emerald-500/10",
    iconBg: "bg-emerald-500/20",
    iconText: "text-emerald-400",
    selectedBg: "bg-emerald-500",
  },
}

const ASSET_TYPES: {
  id: AssetType
  label: string
  description: string
  icon: React.ElementType
  available: boolean
}[] = [
  {
    id: "image",
    label: "Image",
    description: "Generate still images, backgrounds, characters, and more",
    icon: Image,
    available: true,
  },
  {
    id: "video",
    label: "Video",
    description: "Create video clips, animations, and motion content",
    icon: Film,
    available: true,
  },
  {
    id: "audio",
    label: "Audio",
    description: "Generate music, sound effects, and voiceovers",
    icon: Volume2,
    available: true,
  },
  {
    id: "animation",
    label: "Animation",
    description: "Create text animations, motion graphics, and animated overlays",
    icon: Sparkles,
    available: false,
  },
]

interface TypeStepProps {
  onBack?: () => void
}

export function TypeStep({ onBack }: TypeStepProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get("projectId")
  const { assetType, setAssetType, nextStep, resetWizard } = useAssetWizardStore()

  const handleSelect = (type: AssetType) => {
    if (ASSET_TYPES.find(t => t.id === type)?.available) {
      setAssetType(type)
    }
  }

  const handleContinue = () => {
    if (assetType) {
      nextStep()
    }
  }

  const handleBack = () => {
    resetWizard()
    if (onBack) {
      onBack()
    } else if (projectId) {
      navigate(`/project/${projectId}?tab=assets`)
    } else {
      navigate("/library/assets")
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
            Select Asset Type
          </h1>

          <div className="w-24 flex justify-end">
            <button
              onClick={handleContinue}
              disabled={!assetType}
              className={cn(
                "flex items-center gap-1 transition-colors",
                assetType
                  ? cn(TYPE_COLORS[assetType].iconText, "hover:opacity-80")
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
          {ASSET_TYPES.map((type) => {
            const Icon = type.icon
            const isSelected = assetType === type.id
            const isDisabled = !type.available
            const colors = TYPE_COLORS[type.id]

            return (
              <button
                key={type.id}
                onClick={() => handleSelect(type.id)}
                disabled={isDisabled}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                  isDisabled
                    ? "border-zinc-800 bg-zinc-900/30 opacity-50 cursor-not-allowed"
                    : isSelected
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
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-zinc-100">{type.label}</h3>
                    {isDisabled && (
                      <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                        Coming Soon
                      </span>
                    )}
                  </div>
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
        </div>
      </div>
    </div>
  )
}
