import { useEffect, useState } from "react"
import { ArrowLeft, RefreshCw, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAssetWizardStore } from "@/state/assetWizardStore"

export function GenerateStep() {
  const {
    assetType,
    prompt,
    generatedAssets,
    setGeneratedAssets,
    toggleAssetSelection,
    nextStep,
    prevStep,
  } = useAssetWizardStore()

  const [isGenerating, setIsGenerating] = useState(true)

  // Simulate generation
  useEffect(() => {
    const timer = setTimeout(() => {
      // Mock generated assets
      const mockAssets = Array.from({ length: 4 }, (_, i) => ({
        id: `generated-${i + 1}`,
        url: "",
        thumbnailUrl: "",
        selected: i === 0, // Select first by default
      }))
      setGeneratedAssets(mockAssets)
      setIsGenerating(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [setGeneratedAssets])

  const handleRegenerate = () => {
    setIsGenerating(true)
    setTimeout(() => {
      const mockAssets = Array.from({ length: 4 }, (_, i) => ({
        id: `regenerated-${Date.now()}-${i}`,
        url: "",
        thumbnailUrl: "",
        selected: false,
      }))
      setGeneratedAssets(mockAssets)
      setIsGenerating(false)
    }, 2000)
  }

  const selectedCount = generatedAssets.filter((a) => a.selected).length

  const handleContinue = () => {
    if (selectedCount > 0) {
      nextStep()
    }
  }

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-8">
      <div className="max-w-4xl w-full mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">
            {isGenerating ? "Generating..." : "Select your favorites"}
          </h1>
          <p className="text-zinc-400">
            {isGenerating
              ? `Creating ${assetType}s based on your description`
              : "Click to select the assets you want to keep"}
          </p>
        </div>

        {/* Prompt Preview */}
        <div className="mb-6 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
          <p className="text-sm text-zinc-400 mb-1">Prompt:</p>
          <p className="text-zinc-200">{prompt}</p>
        </div>

        {/* Generation Grid */}
        {isGenerating ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-sky-500 animate-spin mx-auto mb-4" />
              <p className="text-zinc-400">This may take a moment...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {generatedAssets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => toggleAssetSelection(asset.id)}
                  className={cn(
                    "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                    asset.selected
                      ? "border-sky-500 ring-2 ring-sky-500/30"
                      : "border-zinc-700 hover:border-zinc-600"
                  )}
                >
                  {/* Placeholder for generated content */}
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                    <span className="text-4xl text-zinc-600">
                      {assetType === "audio" ? "🎵" : "🖼️"}
                    </span>
                  </div>

                  {/* Selection indicator */}
                  {asset.selected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors" />
                </button>
              ))}
            </div>

            {/* Regenerate button */}
            <div className="flex justify-center mb-8">
              <button
                onClick={handleRegenerate}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 transition-colors inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate All
              </button>
            </div>
          </>
        )}

        {/* Actions */}
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
            disabled={selectedCount === 0 || isGenerating}
            className={cn(
              "px-8 py-3 rounded-xl font-medium transition-all",
              selectedCount > 0 && !isGenerating
                ? "bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white hover:opacity-90"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            Continue with {selectedCount} selected
          </button>
        </div>
      </div>
    </div>
  )
}
