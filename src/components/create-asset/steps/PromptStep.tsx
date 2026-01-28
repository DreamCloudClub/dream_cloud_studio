import { useState } from "react"
import { ArrowLeft, Sparkles, ChevronDown, ChevronUp, Plus, X, Image, Wand2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAssetWizardStore } from "@/state/assetWizardStore"
import { ReferenceModal } from "../ReferenceModal"
import type { AssetCategory as DBAssetCategory } from "@/types/database"

const STYLE_PRESETS = [
  { id: "cinematic", label: "Cinematic" },
  { id: "photorealistic", label: "Photorealistic" },
  { id: "anime", label: "Anime" },
  { id: "3d-render", label: "3D Render" },
  { id: "illustration", label: "Illustration" },
  { id: "abstract", label: "Abstract" },
]

// Enhance user description into a detailed AI prompt
async function enhancePrompt(
  userDescription: string,
  assetType: string,
  category: string,
  style?: string | null
): Promise<string> {
  const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!ANTHROPIC_API_KEY) {
    // Fallback: just return the user description with style appended
    return style ? `${userDescription}, ${style} style` : userDescription
  }

  const systemPrompt = `You are an expert at writing prompts for AI image/video/audio generation.
Your task is to enhance a user's simple description into a detailed, technical prompt that will produce high-quality results.

Rules:
- Keep the core intent of the user's description
- Add technical details: lighting, composition, mood, texture, quality descriptors
- For images: add details about framing, depth of field, color palette
- For audio: add details about tempo, instruments, mood, genre
- Keep it concise (1-3 sentences max)
- Don't add anything the user didn't imply
- Output ONLY the enhanced prompt, no explanation`

  const userPrompt = `Asset type: ${assetType}
Category: ${category}
${style ? `Style: ${style}` : ''}

User description: "${userDescription}"

Enhanced prompt:`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to enhance prompt')
    }

    const data = await response.json()
    const enhanced = data.content?.[0]?.text?.trim()
    return enhanced || userDescription
  } catch (error) {
    console.error('Error enhancing prompt:', error)
    // Fallback
    return style ? `${userDescription}, ${style} style` : userDescription
  }
}

export function PromptStep() {
  const {
    assetType,
    category,
    assetName,
    userDescription,
    aiPrompt,
    negativePrompt,
    stylePreset,
    referenceAssets,
    setAssetName,
    setUserDescription,
    setAiPrompt,
    setNegativePrompt,
    setStylePreset,
    addReferenceAsset,
    removeReferenceAsset,
    nextStep,
    prevStep,
  } = useAssetWizardStore()

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showReferenceModal, setShowReferenceModal] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)

  const handleEnhance = async () => {
    if (!userDescription.trim() || !assetType || !category) return

    setIsEnhancing(true)
    try {
      const enhanced = await enhancePrompt(userDescription, assetType, category, stylePreset)
      setAiPrompt(enhanced)
    } finally {
      setIsEnhancing(false)
    }
  }

  const handleGenerate = () => {
    // Auto-enhance if AI prompt is empty
    if (assetName.trim() && userDescription.trim()) {
      if (!aiPrompt.trim()) {
        // Use user description as AI prompt if not enhanced
        setAiPrompt(userDescription)
      }
      nextStep()
    }
  }

  const canGenerate = assetName.trim() && userDescription.trim()

  const getDescriptionPlaceholder = () => {
    if (assetType === "audio") {
      if (category === "music") return "Describe the music you want (e.g., 'upbeat corporate music with piano')"
      if (category === "sound_effect") return "Describe the sound effect (e.g., 'whoosh transition sound')"
      if (category === "voice") return "Describe the voice and what it should say"
    }
    if (category === "character") return "Describe the character's appearance and personality"
    if (category === "scene") return "Describe the scene or environment"
    if (category === "stage") return "Describe the stage or backdrop"
    return "Describe what you want to generate..."
  }

  const getAiPromptPlaceholder = () => {
    if (assetType === "audio") {
      return "Technical prompt for audio generation..."
    }
    return "Technical prompt with lighting, composition, style details..."
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">
            Describe your {category}
          </h1>
          <p className="text-zinc-400">
            Provide a description and we'll enhance it for better results
          </p>
        </div>

        {/* Asset Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            placeholder={`Name your ${category}...`}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* User Description */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={userDescription}
            onChange={(e) => setUserDescription(e.target.value)}
            placeholder={getDescriptionPlaceholder()}
            rows={3}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500 resize-none"
          />
          <p className="text-xs text-zinc-500 mt-1">
            Write in plain language what you want to create
          </p>
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

        {/* AI Prompt (Enhanced) */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-zinc-300">
              AI Prompt
            </label>
            <button
              onClick={handleEnhance}
              disabled={!userDescription.trim() || isEnhancing}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5",
                userDescription.trim() && !isEnhancing
                  ? "bg-sky-500/20 text-sky-400 hover:bg-sky-500/30"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              )}
            >
              {isEnhancing ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Enhancing...
                </>
              ) : (
                <>
                  <Wand2 className="w-3 h-3" />
                  Enhance
                </>
              )}
            </button>
          </div>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder={getAiPromptPlaceholder()}
            rows={4}
            className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500 resize-none"
          />
          <p className="text-xs text-zinc-500 mt-1">
            Click "Enhance" to generate a detailed prompt, or write your own. This is sent to the AI.
          </p>
        </div>

        {/* Reference Images (for images/video only) */}
        {assetType !== "audio" && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Reference Images
            </label>

            <div className="grid grid-cols-4 gap-2">
              {/* Existing references */}
              {referenceAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="relative group aspect-square rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800"
                >
                  {asset.url ? (
                    <img
                      src={asset.url}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-8 h-8 text-zinc-600" />
                    </div>
                  )}
                  <button
                    onClick={() => removeReferenceAsset(asset.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-black"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Add button (only show if less than 4 refs) */}
              {referenceAssets.length < 4 && (
                <button
                  onClick={() => setShowReferenceModal(true)}
                  className="aspect-square rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-500 transition-colors flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-zinc-400"
                >
                  <Plus className="w-6 h-6" />
                  <span className="text-xs">Add</span>
                </button>
              )}
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
            disabled={!canGenerate}
            className={cn(
              "px-8 py-3 rounded-xl font-medium transition-all inline-flex items-center gap-2",
              canGenerate
                ? "bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white hover:opacity-90"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            <Sparkles className="w-4 h-4" />
            Generate
          </button>
        </div>
      </div>

      {/* Reference Modal */}
      {assetType && category && (
        <ReferenceModal
          isOpen={showReferenceModal}
          onClose={() => setShowReferenceModal(false)}
          onSelect={(asset) => {
            addReferenceAsset(asset)
            setShowReferenceModal(false)
          }}
          assetType={assetType}
          category={category as DBAssetCategory}
        />
      )}
    </div>
  )
}
