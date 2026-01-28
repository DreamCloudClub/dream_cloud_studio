import { Image, Film, Volume2, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAssetWizardStore, AssetType } from "@/state/assetWizardStore"

const ASSET_TYPES: {
  id: AssetType
  label: string
  description: string
  icon: React.ElementType
}[] = [
  {
    id: "image",
    label: "Image",
    description: "Generate still images, backgrounds, characters, and more",
    icon: Image,
  },
  {
    id: "video",
    label: "Video",
    description: "Create video clips, animations, and motion content",
    icon: Film,
  },
  {
    id: "audio",
    label: "Audio",
    description: "Generate music, sound effects, and voiceovers",
    icon: Volume2,
  },
]

export function TypeStep() {
  const { assetType, setAssetType, nextStep } = useAssetWizardStore()

  const handleSelect = (type: AssetType) => {
    setAssetType(type)
  }

  const handleContinue = () => {
    if (assetType) {
      nextStep()
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">
            What type of asset do you want to create?
          </h1>
          <p className="text-zinc-400">
            Choose the type of media you'd like to generate
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {ASSET_TYPES.map((type) => {
            const Icon = type.icon
            const isSelected = assetType === type.id

            return (
              <button
                key={type.id}
                onClick={() => handleSelect(type.id)}
                className={cn(
                  "relative p-6 rounded-2xl border-2 transition-all text-left flex flex-col items-start h-full",
                  isSelected
                    ? "border-sky-500 bg-sky-500/10"
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                )}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                    isSelected
                      ? "bg-sky-500/20 text-sky-400"
                      : "bg-zinc-800 text-zinc-400"
                  )}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-zinc-100 mb-1">{type.label}</h3>
                <p className="text-sm text-zinc-500">{type.description}</p>
              </button>
            )
          })}
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleContinue}
            disabled={!assetType}
            className={cn(
              "px-8 py-3 rounded-xl font-medium transition-all",
              assetType
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
