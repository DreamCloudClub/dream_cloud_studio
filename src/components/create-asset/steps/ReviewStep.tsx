import { useState } from "react"
import { ArrowLeft, Save, FolderPlus, Check, AlertCircle, Loader2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAssetWizardStore } from "@/state/assetWizardStore"
import { useAuth } from "@/contexts/AuthContext"
import { createGeneratedAsset } from "@/services/assets"
import type { AssetCategory } from "@/types/database"

interface ReviewStepProps {
  onComplete?: () => void
}

export function ReviewStep({ onComplete }: ReviewStepProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { assetType, category, assetName, userDescription, aiPrompt, stylePreset, generatedAssets, resetWizard, prevStep } =
    useAssetWizardStore()

  // Use the asset name from the store, with index suffix if multiple selected
  const [assetNames, setAssetNames] = useState<Record<string, string>>(() => {
    const selected = generatedAssets.filter((a) => a.selected)
    if (selected.length === 1) {
      return { [selected[0].id]: assetName }
    }
    return selected.reduce(
      (acc, asset, i) => ({
        ...acc,
        [asset.id]: `${assetName} ${i + 1}`,
      }),
      {}
    )
  })

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedAssets = generatedAssets.filter((a) => a.selected)

  const handleNameChange = (id: string, name: string) => {
    setAssetNames((prev) => ({ ...prev, [id]: name }))
  }

  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 })

  const handleSaveToLibrary = async () => {
    if (!user) {
      setError("You must be logged in to save assets")
      return
    }

    setIsSaving(true)
    setError(null)
    setSaveProgress({ current: 0, total: selectedAssets.length })

    try {
      // Save each selected asset - downloads to local storage and creates record
      for (let i = 0; i < selectedAssets.length; i++) {
        const asset = selectedAssets[i]
        setSaveProgress({ current: i + 1, total: selectedAssets.length })

        await createGeneratedAsset({
          userId: user.id,
          name: assetNames[asset.id] || assetName || `${category} asset`,
          type: assetType!,
          category: category as AssetCategory,
          sourceUrl: asset.url,  // This will be downloaded to local storage
          userDescription: userDescription,
          aiPrompt: aiPrompt || userDescription,
          generationModel: assetType === 'audio'
            ? (category === 'music' ? 'replicate_musicgen' : 'elevenlabs')
            : 'replicate_flux',
          generationSettings: {
            style: stylePreset,
          },
        })
      }

      resetWizard()
      if (onComplete) {
        onComplete()
      } else {
        navigate("/library/assets")
      }
    } catch (err) {
      console.error("Error saving assets:", err)
      setError("Failed to save assets. Please try again.")
      setIsSaving(false)
    }
  }

  const handleAddToProject = () => {
    // TODO: Show project selector modal
    console.log("Add to project")
  }

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-8">
      <div className="max-w-3xl w-full mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">
            Review & Save
          </h1>
          <p className="text-zinc-400">
            Name your assets and save them to your library
          </p>
        </div>

        {/* Summary */}
        <div className="mb-6 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-zinc-500">Type</p>
              <p className="text-zinc-200 capitalize">{assetType}</p>
            </div>
            <div>
              <p className="text-zinc-500">Category</p>
              <p className="text-zinc-200 capitalize">{category}</p>
            </div>
            <div>
              <p className="text-zinc-500">Assets</p>
              <p className="text-zinc-200">{selectedAssets.length} selected</p>
            </div>
          </div>
        </div>

        {/* Asset List */}
        <div className="space-y-4 mb-8">
          {selectedAssets.map((asset, index) => (
            <div
              key={asset.id}
              className="flex items-center gap-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800"
            >
              {/* Thumbnail */}
              <div className="w-20 h-20 rounded-lg bg-zinc-800 flex-shrink-0 flex items-center justify-center">
                <span className="text-2xl text-zinc-600">
                  {assetType === "audio" ? "🎵" : "🖼️"}
                </span>
              </div>

              {/* Name Input */}
              <div className="flex-1">
                <label className="block text-xs text-zinc-500 mb-1">
                  Asset Name
                </label>
                <input
                  type="text"
                  value={assetNames[asset.id] || ""}
                  onChange={(e) => handleNameChange(asset.id, e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Check */}
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-green-400" />
              </div>
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={prevStep}
            className="px-6 py-3 rounded-xl font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={handleAddToProject}
            className="px-6 py-3 rounded-xl font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors inline-flex items-center justify-center gap-2"
          >
            <FolderPlus className="w-4 h-4" />
            Add to Project
          </button>
          <button
            onClick={handleSaveToLibrary}
            disabled={isSaving}
            className={cn(
              "px-8 py-3 rounded-xl font-medium transition-all inline-flex items-center justify-center gap-2",
              "bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white hover:opacity-90",
              isSaving && "opacity-80"
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Downloading {saveProgress.current}/{saveProgress.total}...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save to Library
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
