import {
  Mountain,
  Square,
  User,
  Cloud,
  Box,
  Sparkles,
  Volume2,
  Music,
  Mic,
  Check,
  ArrowLeft,
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
  { id: "audio", label: "Music", description: "Background music and scores", icon: Music },
  { id: "audio", label: "Sound Effect", description: "Sound effects and foley", icon: Volume2 },
  { id: "audio", label: "Voiceover", description: "Narration and dialogue", icon: Mic },
]

export function CategoryStep() {
  const { assetType, category, setCategory, nextStep, prevStep } = useAssetWizardStore()

  const categories = assetType === "audio" ? AUDIO_CATEGORIES : IMAGE_VIDEO_CATEGORIES

  const handleSelect = (cat: AssetCategory) => {
    setCategory(cat)
  }

  const handleContinue = () => {
    if (category) {
      nextStep()
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-8">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">
            What category of {assetType}?
          </h1>
          <p className="text-zinc-400">
            This helps organize your assets and improves generation quality
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
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

        <div className="flex justify-center gap-3">
          <button
            onClick={prevStep}
            className="px-6 py-3 rounded-xl font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={handleContinue}
            disabled={!category}
            className={cn(
              "px-8 py-3 rounded-xl font-medium transition-all",
              category
                ? "bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white hover:opacity-90"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
