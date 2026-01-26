import { useEffect, useState } from "react"
import { ArrowLeft, RefreshCw, Check, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAssetWizardStore } from "@/state/assetWizardStore"
import {
  generateImages,
  generateVideo,
  generateMusic,
  generateVoice,
} from "@/services/replicate"

export function GenerateStep() {
  const {
    assetType,
    category,
    prompt,
    negativePrompt,
    stylePreset,
    referenceAssets,
    generatedAssets,
    setGeneratedAssets,
    toggleAssetSelection,
    nextStep,
    prevStep,
  } = useAssetWizardStore()

  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasStarted, setHasStarted] = useState(false)

  // Start generation on mount
  useEffect(() => {
    if (!hasStarted) {
      setHasStarted(true)
      handleGenerate()
    }
  }, [hasStarted])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      if (assetType === "image") {
        // Get first reference image URL if available
        const referenceUrl = referenceAssets[0]?.url || referenceAssets[0]?.thumbnail_url

        const urls = await generateImages({
          prompt,
          negativePrompt,
          style: stylePreset || undefined,
          referenceImageUrl: referenceUrl,
          numOutputs: 4,
        })

        setGeneratedAssets(
          urls.map((url, i) => ({
            id: `generated-${Date.now()}-${i}`,
            url,
            thumbnailUrl: url,
            selected: i === 0,
          }))
        )
      } else if (assetType === "video") {
        // Video requires a reference image
        const referenceUrl = referenceAssets[0]?.url || referenceAssets[0]?.thumbnail_url

        if (!referenceUrl) {
          throw new Error("Video generation requires a reference image")
        }

        const videoUrl = await generateVideo({
          imageUrl: referenceUrl,
        })

        setGeneratedAssets([
          {
            id: `generated-${Date.now()}`,
            url: videoUrl,
            thumbnailUrl: referenceUrl, // Use reference as thumbnail
            selected: true,
          },
        ])
      } else if (assetType === "audio") {
        let audioUrl: string

        if (category === "music" || category === "sound_effect") {
          audioUrl = await generateMusic({
            prompt,
            duration: 10,
          })
        } else {
          // Voice
          audioUrl = await generateVoice({
            text: prompt,
          })
        }

        setGeneratedAssets([
          {
            id: `generated-${Date.now()}`,
            url: audioUrl,
            selected: true,
          },
        ])
      }
    } catch (err) {
      console.error("Generation error:", err)
      setError(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerate = () => {
    handleGenerate()
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

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">Generation failed</p>
              <p className="text-sm text-red-400/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Generation Grid */}
        {isGenerating ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-sky-500 animate-spin mx-auto mb-4" />
              <p className="text-zinc-400">This may take a moment...</p>
              <p className="text-xs text-zinc-500 mt-2">
                {assetType === "video" ? "Video generation can take 30-60 seconds" : "Usually 10-30 seconds"}
              </p>
            </div>
          </div>
        ) : generatedAssets.length > 0 ? (
          <>
            <div className={cn(
              "grid gap-4 mb-6",
              assetType === "audio"
                ? "grid-cols-1 max-w-md mx-auto"
                : generatedAssets.length === 1
                  ? "grid-cols-1 max-w-md mx-auto"
                  : "grid-cols-2 md:grid-cols-4"
            )}>
              {generatedAssets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => toggleAssetSelection(asset.id)}
                  className={cn(
                    "relative rounded-xl overflow-hidden border-2 transition-all",
                    assetType === "audio" ? "p-4" : "aspect-square",
                    asset.selected
                      ? "border-sky-500 ring-2 ring-sky-500/30"
                      : "border-zinc-700 hover:border-zinc-600"
                  )}
                >
                  {assetType === "audio" ? (
                    // Audio player
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-sky-500/20 flex items-center justify-center">
                        <span className="text-2xl">🎵</span>
                      </div>
                      <audio
                        src={asset.url}
                        controls
                        className="w-full"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  ) : assetType === "video" ? (
                    // Video player
                    <video
                      src={asset.url}
                      poster={asset.thumbnailUrl}
                      controls
                      className="w-full h-full object-cover"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    // Image
                    <img
                      src={asset.url}
                      alt="Generated"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}

                  {/* Selection indicator */}
                  {asset.selected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}

                  {/* Hover overlay for images */}
                  {assetType === "image" && (
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors" />
                  )}
                </button>
              ))}
            </div>

            {/* Regenerate button */}
            <div className="flex justify-center mb-8">
              <button
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4", isGenerating && "animate-spin")} />
                Regenerate
              </button>
            </div>
          </>
        ) : !error ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-zinc-500">No results yet</p>
          </div>
        ) : null}

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
