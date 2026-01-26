import { useState } from "react"
import { ArrowLeft, Sparkles, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAssetWizardStore } from "@/state/assetWizardStore"

const STYLE_PRESETS = [
  { id: "cinematic", label: "Cinematic" },
  { id: "photorealistic", label: "Photorealistic" },
  { id: "anime", label: "Anime" },
  { id: "3d-render", label: "3D Render" },
  { id: "illustration", label: "Illustration" },
  { id: "abstract", label: "Abstract" },
]

export function PromptStep() {
  const {
    assetType,
    category,
    prompt,
    negativePrompt,
    stylePreset,
    setPrompt,
    setNegativePrompt,
    setStylePreset,
    nextStep,
    prevStep,
  } = useAssetWizardStore()

  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleGenerate = () => {
    if (prompt.trim()) {
      nextStep()
    }
  }

  const placeholders: Record<string, string> = {
    scene: "A serene mountain landscape at sunset with golden light...",
    stage: "A modern white podium with soft studio lighting...",
    character: "A professional business woman in a navy suit...",
    weather: "Gentle rain with soft ambient lighting...",
    prop: "A sleek smartphone floating with subtle reflections...",
    effect: "Magical sparkles and light particles...",
    audio: "Upbeat electronic music with synth leads...",
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">
            Describe your {category}
          </h1>
          <p className="text-zinc-400">
            Be specific about what you want to generate
          </p>
        </div>

        {/* Main Prompt */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Description
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholders[category || "scene"]}
            rows={4}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500 resize-none"
          />
        </div>

        {/* Style Presets (for images/video) */}
        {assetType !== "audio" && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Style
            </label>
            <div className="flex flex-wrap gap-2">
              {STYLE_PRESETS.map((style) => (
                <button
                  key={style.id}
                  onClick={() =>
                    setStylePreset(stylePreset === style.id ? null : style.id)
                  }
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    stylePreset === style.id
                      ? "bg-sky-500 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Options */}
        <div className="mb-8">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Advanced Options
          </button>

          {showAdvanced && (
            <div className="mt-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Negative Prompt
              </label>
              <textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="Things to avoid in the generation..."
                rows={2}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>
          )}
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
            onClick={handleGenerate}
            disabled={!prompt.trim()}
            className={cn(
              "px-8 py-3 rounded-xl font-medium transition-all inline-flex items-center gap-2",
              prompt.trim()
                ? "bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white hover:opacity-90"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            <Sparkles className="w-4 h-4" />
            Generate
          </button>
        </div>
      </div>
    </div>
  )
}
