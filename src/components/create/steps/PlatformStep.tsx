import { useState } from "react"
import { Box, FolderOpen, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useProjectWizardStore } from "@/state/projectWizardStore"
import { Button } from "@/components/ui/button"

// Mock platforms for demonstration
const mockPlatforms = [
  {
    id: "1",
    name: "Brand Videos",
    description: "Clean, professional style with blue accents",
    uses: 5,
    thumbnail: null,
  },
  {
    id: "2",
    name: "Social Stories",
    description: "Vibrant, fast-paced for Instagram/TikTok",
    uses: 12,
    thumbnail: null,
  },
  {
    id: "3",
    name: "Product Demos",
    description: "Minimal, product-focused visuals",
    uses: 8,
    thumbnail: null,
  },
]

export function PlatformStep() {
  const { platform, setPlatform, goToNextStep, markStepComplete } =
    useProjectWizardStore()

  const [selectedType, setSelectedType] = useState<"new" | "existing" | null>(
    platform?.type || null
  )
  const [selectedPlatformId, setSelectedPlatformId] = useState<string | null>(
    platform?.platformId || null
  )

  const handleTypeSelect = (type: "new" | "existing") => {
    setSelectedType(type)
    setSelectedPlatformId(null)
  }

  const handlePlatformSelect = (platformId: string) => {
    setSelectedPlatformId(platformId)
  }

  const handleContinue = () => {
    if (selectedType === "new") {
      setPlatform({ type: "new" })
      markStepComplete("platform")
      goToNextStep()
    } else if (selectedType === "existing" && selectedPlatformId) {
      const selected = mockPlatforms.find((p) => p.id === selectedPlatformId)
      setPlatform({
        type: "existing",
        platformId: selectedPlatformId,
        platformName: selected?.name,
      })
      markStepComplete("platform")
      goToNextStep()
    }
  }

  const canContinue =
    selectedType === "new" || (selectedType === "existing" && selectedPlatformId)

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-8">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-zinc-100 mb-2">
            Create New Project
          </h1>
          <p className="text-zinc-400">
            Start by selecting a creative platform for consistent visual direction.
          </p>
        </div>

        {/* Platform Type Selection */}
        {!selectedType && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">
              How would you like to start?
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              {/* New Platform Card */}
              <button
                onClick={() => handleTypeSelect("new")}
                className="group relative p-6 bg-zinc-900 border-2 border-zinc-800 hover:border-sky-500/50 rounded-xl text-left transition-all hover:bg-zinc-900/80"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-sky-500/20">
                  <Box className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                  New Platform
                </h3>
                <p className="text-sm text-zinc-400">
                  Start fresh. Define a new visual and audio direction for this
                  project.
                </p>
                <div className="absolute inset-0 rounded-xl ring-2 ring-transparent group-hover:ring-sky-500/20 transition-all" />
              </button>

              {/* Existing Platform Card */}
              <button
                onClick={() => handleTypeSelect("existing")}
                className="group relative p-6 bg-zinc-900 border-2 border-zinc-800 hover:border-sky-500/50 rounded-xl text-left transition-all hover:bg-zinc-900/80"
              >
                <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center mb-4">
                  <FolderOpen className="w-7 h-7 text-zinc-400" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                  Existing Platform
                </h3>
                <p className="text-sm text-zinc-400">
                  Use a saved platform for consistent branding across projects.
                </p>
                <div className="absolute inset-0 rounded-xl ring-2 ring-transparent group-hover:ring-sky-500/20 transition-all" />
              </button>
            </div>
          </div>
        )}

        {/* New Platform Selected */}
        {selectedType === "new" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setSelectedType(null)}
                className="text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
              >
                &larr; Back
              </button>
              <span className="text-zinc-700">|</span>
              <span className="text-sm text-zinc-400">New Platform</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20 flex-shrink-0">
                  <Box className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                    Create New Platform
                  </h3>
                  <p className="text-sm text-zinc-400 mb-4">
                    A new platform will be created as you work through this
                    project. You'll define visual styles, color palettes, and
                    audio direction along the way.
                  </p>
                  <ul className="text-sm text-zinc-500 space-y-1">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-sky-400" />
                      Define unique visual style
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-sky-400" />
                      Set custom color palette
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-sky-400" />
                      Choose audio direction
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-sky-400" />
                      Reuse for future projects
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Existing Platform Selection */}
        {selectedType === "existing" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setSelectedType(null)}
                className="text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
              >
                &larr; Back
              </button>
              <span className="text-zinc-700">|</span>
              <span className="text-sm text-zinc-400">Select Platform</span>
            </div>

            <h2 className="text-lg font-semibold text-zinc-200">
              Select a platform:
            </h2>

            {mockPlatforms.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {mockPlatforms.map((plat) => (
                  <button
                    key={plat.id}
                    onClick={() => handlePlatformSelect(plat.id)}
                    className={cn(
                      "relative p-5 bg-zinc-900 border-2 rounded-xl text-left transition-all",
                      selectedPlatformId === plat.id
                        ? "border-sky-500 ring-2 ring-sky-500/20"
                        : "border-zinc-800 hover:border-zinc-700"
                    )}
                  >
                    {/* Thumbnail placeholder */}
                    <div className="w-full aspect-video bg-zinc-800 rounded-lg mb-4 flex items-center justify-center">
                      <FolderOpen className="w-8 h-8 text-zinc-600" />
                    </div>

                    <h3 className="font-semibold text-zinc-100 mb-1">
                      {plat.name}
                    </h3>
                    <p className="text-xs text-zinc-500 mb-2">{plat.description}</p>
                    <p className="text-xs text-zinc-600">{plat.uses} uses</p>

                    {/* Selection indicator */}
                    {selectedPlatformId === plat.id && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                <FolderOpen className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400 mb-4">
                  You don't have any saved platforms yet.
                </p>
                <Button
                  onClick={() => handleTypeSelect("new")}
                  className="bg-sky-500 hover:bg-sky-400 text-white"
                >
                  Create Your First Platform
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Continue Button */}
        {canContinue && (
          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleContinue}
              className="bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 hover:from-sky-300 hover:via-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/20 px-8"
            >
              Continue
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
