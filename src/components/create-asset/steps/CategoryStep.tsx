import {
  Mountain,
  Square,
  User,
  Cloud,
  Box,
  Sparkles,
  Waves,
  Music,
  Mic,
  Check,
  ChevronLeft,
  ChevronRight,
  Type,
  Hexagon,
  ArrowRightLeft,
  Subtitles,
  LayoutTemplate,
  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAssetWizardStore, AssetCategory } from "@/state/assetWizardStore"

const IMAGE_VIDEO_CATEGORIES: {
  id: AssetCategory
  label: string
  description: string
  icon: React.ElementType
}[] = [
  { id: "scene", label: "Scene", description: "Backgrounds and environments", icon: Mountain },
  { id: "stage", label: "Stage", description: "Platforms and surfaces", icon: Square },
  { id: "character", label: "Character", description: "People and avatars", icon: User },
  { id: "weather", label: "Weather", description: "Weather and atmosphere effects", icon: Cloud },
  { id: "prop", label: "Prop", description: "Objects and items", icon: Box },
  { id: "effect", label: "Effect", description: "Visual effects and overlays", icon: Sparkles },
]

const AUDIO_CATEGORIES: {
  id: AssetCategory
  label: string
  description: string
  icon: React.ElementType
}[] = [
  { id: "music", label: "Music", description: "Background music and scores", icon: Music },
  { id: "sound_effect", label: "Sound Effect", description: "Sound effects and foley", icon: Waves },
  { id: "voice", label: "Voice", description: "Narration and dialogue", icon: Mic },
]

const ANIMATION_CATEGORIES: {
  id: AssetCategory
  label: string
  description: string
  icon: React.ElementType
}[] = [
  { id: "text", label: "Text", description: "Animated text and titles", icon: Type },
  { id: "logo", label: "Logo", description: "Logo animations and reveals", icon: Hexagon },
  { id: "transition", label: "Transition", description: "Scene transitions and wipes", icon: ArrowRightLeft },
  { id: "lower_third", label: "Lower Third", description: "Name plates and info bars", icon: Subtitles },
  { id: "title_card", label: "Title Card", description: "Full screen title cards", icon: LayoutTemplate },
  { id: "overlay", label: "Overlay", description: "Animated overlays and effects", icon: Layers },
]

export function CategoryStep() {
  const { assetType, category, setCategory, nextStep, prevStep } = useAssetWizardStore()

  const categories = assetType === "audio"
    ? AUDIO_CATEGORIES
    : assetType === "animation"
    ? ANIMATION_CATEGORIES
    : IMAGE_VIDEO_CATEGORIES

  const handleSelect = (cat: AssetCategory) => {
    setCategory(cat)
  }

  const handleContinue = () => {
    if (category) {
      nextStep()
    }
  }

  // Get the color for the Continue button based on asset type
  const getContinueColor = () => {
    switch (assetType) {
      case "image": return "text-orange-400"
      case "video": return "text-red-400"
      case "audio": return "text-violet-400"
      case "animation": return "text-emerald-400"
      default: return "text-sky-400"
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
            Select Category
          </h1>

          <div className="w-24 flex justify-end">
            <button
              onClick={handleContinue}
              disabled={!category}
              className={cn(
                "flex items-center gap-1 transition-colors",
                category
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
        <div className="max-w-3xl mx-auto px-6 lg:px-8 pt-10 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((cat, index) => {
              const Icon = cat.icon
              const isSelected = category === cat.id

              return (
                <button
                  key={`${cat.id}-${index}`}
                  onClick={() => handleSelect(cat.id)}
                  className={cn(
                    "relative p-4 rounded-xl border-2 transition-all text-left",
                    isSelected
                      ? "border-sky-500 bg-sky-500/10"
                      : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        isSelected
                          ? "bg-sky-500/20 text-sky-400"
                          : "bg-zinc-800 text-zinc-400"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-zinc-100">{cat.label}</h3>
                      <p className="text-xs text-zinc-500">{cat.description}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
