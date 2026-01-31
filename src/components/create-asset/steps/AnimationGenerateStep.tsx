import { useState, useMemo, useCallback } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Loader2,
  RotateCcw,
  Wand2,
  Clock,
  Palette,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAssetWizardStore } from "@/state/assetWizardStore"
import { generateAnimation, ANIMATION_TEMPLATES } from "@/services/animation"
import { Player } from "@remotion/player"
import { AnimationComposition } from "@/remotion/AnimationComposition"
import type { AnimationConfig } from "@/remotion/AnimationComposition"

const DURATION_OPTIONS = [
  { value: 2, label: "2s" },
  { value: 3, label: "3s" },
  { value: 4, label: "4s" },
  { value: 5, label: "5s" },
  { value: 8, label: "8s" },
  { value: 10, label: "10s" },
]

const BACKGROUND_COLORS = [
  { value: "#000000", label: "Black" },
  { value: "#111111", label: "Dark Gray" },
  { value: "#1a1a2e", label: "Dark Blue" },
  { value: "#16213e", label: "Navy" },
  { value: "#1f1f1f", label: "Charcoal" },
  { value: "transparent", label: "Transparent" },
]

const TEMPLATE_OPTIONS = [
  { id: "fadeInTitle", label: "Fade In Title", description: "Simple fade-in title card" },
  { id: "slideUpLowerThird", label: "Lower Third", description: "Name plate that slides up" },
  { id: "typewriterText", label: "Typewriter", description: "Text types character by character" },
  { id: "logoReveal", label: "Logo Reveal", description: "Scale-up logo animation" },
  { id: "wipeTransition", label: "Wipe Transition", description: "Color wipe across screen" },
]

export function AnimationGenerateStep() {
  const {
    category,
    assetName,
    userDescription,
    animationConfig,
    setAssetName,
    setUserDescription,
    setAnimationConfig,
    setGeneratedAssets,
    nextStep,
    prevStep,
  } = useAssetWizardStore()

  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState(4)
  const [backgroundColor, setBackgroundColor] = useState("#000000")
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  // Build composition props for the player
  const compositionProps = useMemo(() => {
    if (!animationConfig) return null

    return {
      segments: [{
        id: 'preview',
        type: 'animation' as const,
        config: animationConfig,
      }],
      backgroundColor: animationConfig.background?.color || backgroundColor,
    }
  }, [animationConfig, backgroundColor])

  const handleGenerate = useCallback(async () => {
    if (!userDescription.trim()) {
      setError("Please enter a description")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const result = await generateAnimation({
        prompt: userDescription,
        category: category || 'text',
        duration,
        backgroundColor,
      })

      setAnimationConfig(result.config)
      if (!assetName) {
        setAssetName(result.name)
      }
    } catch (err) {
      console.error("Generation error:", err)
      setError(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setIsGenerating(false)
    }
  }, [userDescription, category, duration, backgroundColor, assetName, setAnimationConfig, setAssetName])

  const handleUseTemplate = useCallback((templateId: string) => {
    setSelectedTemplate(templateId)
    let config: AnimationConfig

    switch (templateId) {
      case 'fadeInTitle':
        config = ANIMATION_TEMPLATES.fadeInTitle(
          userDescription || 'Your Title Here',
          assetName || undefined
        )
        break
      case 'slideUpLowerThird':
        config = ANIMATION_TEMPLATES.slideUpLowerThird(
          userDescription || 'Name',
          assetName || undefined
        )
        break
      case 'typewriterText':
        config = ANIMATION_TEMPLATES.typewriterText(userDescription || 'Hello World')
        break
      case 'logoReveal':
        config = ANIMATION_TEMPLATES.logoReveal(userDescription || 'LOGO')
        break
      case 'wipeTransition':
        config = ANIMATION_TEMPLATES.wipeTransition(backgroundColor)
        break
      default:
        return
    }

    setAnimationConfig(config)
    if (!assetName) {
      setAssetName(TEMPLATE_OPTIONS.find(t => t.id === templateId)?.label || 'Animation')
    }
  }, [userDescription, assetName, backgroundColor, setAnimationConfig, setAssetName])

  const handleContinue = () => {
    if (animationConfig) {
      // Set up a generated asset entry for the SaveStep
      // Animation assets don't have a URL - they use the animationConfig
      setGeneratedAssets([{
        id: 'animation-preview',
        url: '',  // No URL for animations - rendered via Remotion
        selected: true,
        duration: animationConfig.duration,
      }])
      nextStep()
    }
  }

  const canContinue = animationConfig !== null

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">
            Create your animation
          </h1>
          <p className="text-zinc-400">
            Describe your animation or use a template
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="Name your animation..."
                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={userDescription}
                onChange={(e) => setUserDescription(e.target.value)}
                placeholder={
                  category === 'lower_third'
                    ? "Enter the name/title to display..."
                    : category === 'title_card'
                    ? "Enter the title text..."
                    : "Describe your animation (e.g., 'Welcome text that slides up with a blue glow')"
                }
                rows={3}
                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>

            {/* Options Row */}
            <div className="flex gap-4">
              {/* Duration */}
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Duration
                </label>
                <div className="flex gap-1">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDuration(opt.value)}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                        duration === opt.value
                          ? "bg-sky-500 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Background Color */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1">
                <Palette className="w-3 h-3" />
                Background
              </label>
              <div className="flex gap-2">
                {BACKGROUND_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setBackgroundColor(color.value)}
                    className={cn(
                      "w-8 h-8 rounded-lg border-2 transition-all",
                      backgroundColor === color.value
                        ? "border-sky-500 ring-2 ring-sky-500/30"
                        : "border-zinc-700 hover:border-zinc-600"
                    )}
                    style={{
                      backgroundColor: color.value === 'transparent' ? undefined : color.value,
                      backgroundImage: color.value === 'transparent'
                        ? 'linear-gradient(45deg, #444 25%, transparent 25%), linear-gradient(-45deg, #444 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #444 75%), linear-gradient(-45deg, transparent 75%, #444 75%)'
                        : undefined,
                      backgroundSize: color.value === 'transparent' ? '8px 8px' : undefined,
                      backgroundPosition: color.value === 'transparent' ? '0 0, 0 4px, 4px -4px, -4px 0px' : undefined,
                    }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!userDescription.trim() || isGenerating}
              className={cn(
                "w-full px-5 py-3 rounded-xl font-medium transition-all inline-flex items-center justify-center gap-2",
                userDescription.trim() && !isGenerating
                  ? "bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white hover:opacity-90"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate with AI
                </>
              )}
            </button>

            {/* Templates */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Or use a template
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATE_OPTIONS.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleUseTemplate(template.id)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      selectedTemplate === template.id
                        ? "border-sky-500 bg-sky-500/10"
                        : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                    )}
                  >
                    <div className="font-medium text-zinc-200 text-sm">{template.label}</div>
                    <div className="text-xs text-zinc-500">{template.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-zinc-300">
              Preview
            </label>

            {compositionProps ? (
              <div className="space-y-3">
                {/* Remotion Player */}
                <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-black">
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
                </div>

                {/* Config Summary */}
                <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                  <div className="text-xs text-zinc-500 space-y-1">
                    <div>Duration: {animationConfig?.duration}s</div>
                    <div>Layers: {animationConfig?.layers.length}</div>
                    {animationConfig?.layers.map((layer, i) => (
                      <div key={i} className="pl-2 text-zinc-600">
                        • {layer.type}: "{layer.content?.slice(0, 20)}{layer.content && layer.content.length > 20 ? '...' : ''}" ({layer.animation})
                      </div>
                    ))}
                  </div>
                </div>

                {/* Regenerate */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors inline-flex items-center justify-center gap-2 text-sm"
                >
                  <RotateCcw className="w-3 h-3" />
                  Regenerate
                </button>
              </div>
            ) : (
              <div className="aspect-video rounded-xl border-2 border-dashed border-zinc-800 flex items-center justify-center bg-zinc-900/30">
                <div className="text-center text-zinc-600">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Generate or select a template to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-10 pt-6 border-t border-zinc-800">
          <button
            onClick={prevStep}
            className="px-5 py-2.5 rounded-xl font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className={cn(
              "px-5 py-2.5 rounded-xl font-medium transition-all inline-flex items-center gap-2",
              canContinue
                ? "bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white hover:opacity-90"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
