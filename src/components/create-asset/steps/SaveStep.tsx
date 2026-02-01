import { useState } from "react"
import { ChevronLeft, Save, Check, AlertCircle, Loader2, Film, Image, Volume2, Sparkles, ChevronDown } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAssetWizardStore, AssetCategory as WizardCategory } from "@/state/assetWizardStore"
import { useAuth } from "@/contexts/AuthContext"
import { createGeneratedAsset, createAnimationAsset } from "@/services/assets"
import type { AssetCategory as DBCategory } from "@/types/database"

// Asset categories grouped by type
const VISUAL_CATEGORIES: { id: WizardCategory; label: string }[] = [
  { id: "scene", label: "Scene" },
  { id: "stage", label: "Stage" },
  { id: "character", label: "Character" },
  { id: "weather", label: "Weather" },
  { id: "prop", label: "Prop" },
  { id: "effect", label: "Effect" },
]

const AUDIO_CATEGORIES: { id: WizardCategory; label: string }[] = [
  { id: "music", label: "Music" },
  { id: "sound_effect", label: "Sound Effect" },
  { id: "voice", label: "Voice" },
]

const ANIMATION_CATEGORIES: { id: WizardCategory; label: string }[] = [
  { id: "text", label: "Text Animation" },
  { id: "logo", label: "Logo Animation" },
  { id: "transition", label: "Transition" },
  { id: "lower_third", label: "Lower Third" },
  { id: "title_card", label: "Title Card" },
  { id: "overlay", label: "Overlay" },
]

function getCategoriesForType(assetType: string | null) {
  switch (assetType) {
    case "image":
    case "video":
      return VISUAL_CATEGORIES
    case "audio":
      return AUDIO_CATEGORIES
    case "animation":
      return ANIMATION_CATEGORIES
    default:
      return VISUAL_CATEGORIES
  }
}

interface SaveStepProps {
  onComplete?: () => void
}

export function SaveStep({ onComplete }: SaveStepProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get("projectId")
  const { user } = useAuth()
  const {
    assetType,
    promptType,
    category,
    setCategory,
    userDescription,
    aiPrompt,
    stylePreset,
    generatedAssets,
    animationConfig,
    assetName,
    resetWizard,
    prevStep,
  } = useAssetWizardStore()

  const selectedAssets = generatedAssets.filter((a) => a.selected)
  const categories = getCategoriesForType(assetType)

  // Initialize category if not set
  useState(() => {
    if (!category && categories.length > 0) {
      setCategory(categories[0].id)
    }
  })

  // Asset names and descriptions state
  const [assetData, setAssetData] = useState<Record<string, { name: string; description: string }>>(() => {
    return selectedAssets.reduce(
      (acc, asset, i) => ({
        ...acc,
        [asset.id]: {
          // Use assetName from store if available (e.g., from animation generation)
          name: assetName || (selectedAssets.length === 1 ? "Untitled Asset" : `Asset ${i + 1}`),
          description: userDescription || "",
        },
      }),
      {}
    )
  })

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 })
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)

  const handleNameChange = (id: string, name: string) => {
    setAssetData((prev) => ({
      ...prev,
      [id]: { ...prev[id], name },
    }))
  }

  const handleDescriptionChange = (id: string, description: string) => {
    setAssetData((prev) => ({
      ...prev,
      [id]: { ...prev[id], description },
    }))
  }

  const handleSaveToLibrary = async () => {
    if (!user) {
      setError("You must be logged in to save assets")
      return
    }

    if (!category) {
      setError("Please select a category")
      return
    }

    setIsSaving(true)
    setError(null)
    setSaveProgress({ current: 0, total: selectedAssets.length })

    try {
      // Handle animation assets specially - they use animationConfig instead of URLs
      if (assetType === "animation" && animationConfig) {
        setSaveProgress({ current: 1, total: 1 })

        const data = assetData[selectedAssets[0]?.id]

        await createAnimationAsset({
          userId: user.id,
          projectId: projectId || undefined,
          name: data?.name || assetName || "Animation",
          category: category as DBCategory,
          userDescription: data?.description || userDescription,
          animationConfig: animationConfig as any,
          duration: animationConfig.duration,
        })
      } else {
        // Standard assets (image, video, audio) with URLs
        for (let i = 0; i < selectedAssets.length; i++) {
          const asset = selectedAssets[i]
          setSaveProgress({ current: i + 1, total: selectedAssets.length })

          const data = assetData[asset.id]

          await createGeneratedAsset({
            userId: user.id,
            name: data?.name || `${category} asset`,
            type: assetType!,
            category: category as DBCategory,
            sourceUrl: asset.url,
            userDescription: data?.description || userDescription,
            aiPrompt: aiPrompt || userDescription,
            generationModel: assetType === "audio"
              ? (category === "music" ? "replicate_musicgen" : "elevenlabs")
              : assetType === "video" ? "kling-v2.1" : "replicate_flux",
            generationSettings: {
              style: stylePreset,
              promptType: promptType,
            },
            duration: asset.duration,
          })
        }
      }

      resetWizard()
      if (onComplete) {
        onComplete()
      } else if (projectId) {
        // Navigate back to project assets
        navigate(`/project/${projectId}?tab=assets`)
      } else {
        navigate("/library/assets")
      }
    } catch (err) {
      console.error("Error saving assets:", err)
      setError("Failed to save assets. Please try again.")
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    prevStep()
  }

  const selectedCategory = categories.find((c) => c.id === category)

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header with navigation */}
      <div className="h-[72px] flex items-center px-4 border-b border-zinc-800 flex-shrink-0">
        <div className="w-24">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>

        <h1 className="flex-1 text-center text-lg font-semibold text-zinc-100">
          Save Assets
        </h1>

        <div className="w-24" /> {/* Spacer for alignment */}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl mx-auto p-6 pb-12 space-y-6">
          {/* Category Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">
              Asset Category
            </label>
            <div className="relative">
              <button
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-left hover:border-zinc-600 transition-colors"
              >
                <span className="text-zinc-100">
                  {selectedCategory?.label || "Select category..."}
                </span>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-zinc-400 transition-transform",
                    showCategoryDropdown && "rotate-180"
                  )}
                />
              </button>

              {showCategoryDropdown && (
                <div className="absolute z-10 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setCategory(cat.id)
                        setShowCategoryDropdown(false)
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
                        category === cat.id
                          ? "bg-sky-500/10 text-sky-400"
                          : "text-zinc-300 hover:bg-zinc-800"
                      )}
                    >
                      <span>{cat.label}</span>
                      {category === cat.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Asset List */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-zinc-300">
              Assets ({selectedAssets.length})
            </label>

            {selectedAssets.map((asset) => (
              <div
                key={asset.id}
                className="flex gap-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800"
              >
                {/* Thumbnail */}
                <div className="w-24 h-24 rounded-lg bg-zinc-800 flex-shrink-0 overflow-hidden">
                  {assetType === "image" && asset.url ? (
                    <img
                      src={asset.url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : assetType === "video" && asset.url ? (
                    <video
                      src={asset.url}
                      className="w-full h-full object-cover"
                      preload="metadata"
                      muted
                    />
                  ) : assetType === "animation" && animationConfig ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-500/10">
                      <Sparkles className="w-6 h-6 text-emerald-400 mb-1" />
                      <div className="text-xs text-emerald-400">{animationConfig.duration}s</div>
                      <div className="text-xs text-zinc-500">{animationConfig.layers.length} layer{animationConfig.layers.length !== 1 ? 's' : ''}</div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {assetType === "audio" ? (
                        <Volume2 className="w-8 h-8 text-zinc-600" />
                      ) : assetType === "animation" ? (
                        <Sparkles className="w-8 h-8 text-zinc-600" />
                      ) : assetType === "video" ? (
                        <Film className="w-8 h-8 text-zinc-600" />
                      ) : (
                        <Image className="w-8 h-8 text-zinc-600" />
                      )}
                    </div>
                  )}
                </div>

                {/* Name & Description */}
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={assetData[asset.id]?.name || ""}
                      onChange={(e) => handleNameChange(asset.id, e.target.value)}
                      placeholder="Enter asset name..."
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={assetData[asset.id]?.description || ""}
                      onChange={(e) => handleDescriptionChange(asset.id, e.target.value)}
                      placeholder="Add a description..."
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSaveToLibrary}
            disabled={isSaving || selectedAssets.length === 0}
            className={cn(
              "w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3",
              isSaving || selectedAssets.length === 0
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white hover:opacity-90"
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving {saveProgress.current}/{saveProgress.total}...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save to Library
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
