import { useMemo } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAssetWizardStore } from "@/state/assetWizardStore"
import { Player } from "@remotion/player"
import { AnimationComposition } from "@/remotion/AnimationComposition"

export function AnimationGenerateStep() {
  const {
    animationConfig,
    setGeneratedAssets,
    nextStep,
    prevStep,
  } = useAssetWizardStore()

  // Build composition props for the player
  const compositionProps = useMemo(() => {
    if (!animationConfig) return null

    return {
      segments: [{
        id: 'preview',
        type: 'animation' as const,
        config: animationConfig,
      }],
      backgroundColor: animationConfig.background?.color || '#000000',
    }
  }, [animationConfig])

  const handleContinue = () => {
    if (animationConfig) {
      setGeneratedAssets([{
        id: 'animation-preview',
        url: '',
        selected: true,
        duration: animationConfig.duration,
      }])
      nextStep()
    }
  }

  const canContinue = animationConfig !== null

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header with navigation */}
      <div className="h-[72px] border-b border-zinc-800 flex-shrink-0">
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
            Create Animation
          </h1>

          <div className="w-24 flex justify-end">
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className={cn(
                "flex items-center gap-1 transition-colors",
                canContinue
                  ? "text-emerald-400 hover:opacity-80"
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
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-4xl w-full mx-auto px-6 lg:px-8 py-8">
          {/* Animation Preview */}
          <div className="aspect-video relative bg-zinc-900 rounded-2xl overflow-hidden">
            {compositionProps ? (
              <Player
                component={AnimationComposition}
                inputProps={compositionProps}
                durationInFrames={Math.round(animationConfig!.duration * 30)}
                fps={30}
                compositionWidth={1920}
                compositionHeight={1080}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                controls
                autoPlay={false}
                loop
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-zinc-500">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium text-zinc-400">No animation yet</p>
                  <p className="text-sm mt-2 max-w-sm mx-auto">
                    Use the chat panel to describe your animation and I'll create it for you
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-zinc-800/50 rounded-lg text-zinc-400">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm">Try: "Create a fade-in title that says Welcome"</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Animation Info */}
          {animationConfig && (
            <div className="mt-6 bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-300">Animation Details</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {animationConfig.duration}s duration • {animationConfig.layers.length} layer{animationConfig.layers.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500">Layers</p>
                  <div className="flex flex-wrap gap-1 mt-1 justify-end">
                    {animationConfig.layers.map((layer, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-zinc-700/50 rounded text-xs text-zinc-400"
                      >
                        {layer.type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
