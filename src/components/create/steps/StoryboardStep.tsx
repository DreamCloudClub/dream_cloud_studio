import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  Loader2,
  Save,
  Plus,
  Upload,
  Layers,
  X,
  Sparkles,
  Check,
  Trash2,
} from "lucide-react"
import { useProjectWizardStore } from "@/state/projectWizardStore"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { getScriptSections } from "@/services/scripts"
import { getAssets, uploadAndCreateAsset } from "@/services/assets"
import {
  getStoryboardCards,
  createStoryboardCard,
  updateStoryboardCard,
} from "@/services/storyboard"
import { getAssetDisplayUrl } from "@/services/localStorage"
import type { Asset, StoryboardCard } from "@/types/database"

interface StoryboardItem {
  id: string
  scriptSectionId: string | null
  title: string
  description: string
  imageAssetId: string | null
  imageUrl: string | null
  sortOrder: number
}

export function StoryboardStep() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    projectId,
    goToNextStep,
    goToPreviousStep,
    markStepComplete,
  } = useProjectWizardStore()

  // State
  const [items, setItems] = useState<StoryboardItem[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  // Modal state for adding images
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAssetPicker, setShowAssetPicker] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Load script sections and existing storyboard cards
  useEffect(() => {
    async function loadData() {
      if (!projectId || !user) {
        setIsLoading(false)
        return
      }

      try {
        // Load script sections, assets, and existing storyboard cards in parallel
        const [sections, allAssets, existingCards] = await Promise.all([
          getScriptSections(projectId),
          getAssets(user.id), // Load ALL user assets, not just project-specific
          getStoryboardCards(projectId),
        ])

        // Filter to only image assets for the picker
        setAssets(allAssets.filter((a) => a.type === "image"))

        // Build storyboard items from script sections that are descriptions
        const sceneSections = sections.filter(
          (s) => s.type === "description"
        )

        // Map existing cards by their script section ID or title for matching
        const cardMap = new Map<string, StoryboardCard>()
        existingCards.forEach((card) => {
          // Try to match by content or create a unique key
          const key = card.description || card.title
          cardMap.set(key, card)
        })

        // Build items from scene sections, matching with existing cards
        const storyboardItems: StoryboardItem[] = sceneSections.map((section, index) => {
          // Try to find an existing card that matches this section
          const existingCard = cardMap.get(section.content) || cardMap.get(section.scene_context || "")

          return {
            id: existingCard?.id || `temp-${section.id}`,
            scriptSectionId: section.id,
            title: section.scene_context || `Scene ${index + 1}`,
            description: section.content,
            imageAssetId: null, // We'll store asset reference in metadata
            imageUrl: existingCard?.thumbnail_url || null,
            sortOrder: index,
          }
        })

        // If no scene sections exist, show empty state or allow manual addition
        if (storyboardItems.length === 0) {
          // Check if there are any storyboard cards without linked sections
          const orphanedCards = existingCards.map((card, index) => ({
            id: card.id,
            scriptSectionId: null,
            title: card.title,
            description: card.description || "",
            imageAssetId: null,
            imageUrl: card.thumbnail_url,
            sortOrder: card.sort_order ?? index,
          }))
          setItems(orphanedCards)
        } else {
          setItems(storyboardItems)
        }
      } catch (error) {
        console.error("Error loading storyboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [projectId, user])

  // Handle opening the add image modal
  const handleAddImage = (itemId: string) => {
    setActiveItemId(itemId)
    setShowAddModal(true)
  }

  // Navigate to asset creator for generating a new image
  const handleGenerateNew = () => {
    setShowAddModal(false)
    // Store return path and context in session storage
    sessionStorage.setItem("returnToStoryboard", "true")
    sessionStorage.setItem("storyboardProjectId", projectId || "")
    sessionStorage.setItem("storyboardItemId", activeItemId || "")
    navigate("/create/asset")
  }

  // Open asset picker to select existing asset
  const handleSelectExisting = () => {
    setShowAddModal(false)
    setShowAssetPicker(true)
  }

  // Handle selecting an existing asset
  const handleAssetSelect = async (asset: Asset) => {
    if (!activeItemId) return

    // Use getAssetDisplayUrl to properly handle local assets
    const displayUrl = getAssetDisplayUrl(asset)

    setItems((prev) =>
      prev.map((item) =>
        item.id === activeItemId
          ? { ...item, imageAssetId: asset.id, imageUrl: displayUrl }
          : item
      )
    )

    setShowAssetPicker(false)
    setActiveItemId(null)
  }

  // Handle file upload
  const handleUpload = useCallback(async (file: File) => {
    if (!user || !activeItemId) return

    setIsUploading(true)
    try {
      const asset = await uploadAndCreateAsset(user.id, file, {
        category: "scene",
        bucket: "project-assets",
        projectId: projectId || undefined,
      })

      // Use getAssetDisplayUrl to properly handle local assets
      const displayUrl = getAssetDisplayUrl(asset)

      setItems((prev) =>
        prev.map((item) =>
          item.id === activeItemId
            ? { ...item, imageAssetId: asset.id, imageUrl: displayUrl }
            : item
        )
      )

      // Add to local assets list
      setAssets((prev) => [asset, ...prev])
      setShowAddModal(false)
      setActiveItemId(null)
    } catch (error) {
      console.error("Error uploading file:", error)
    } finally {
      setIsUploading(false)
    }
  }, [user, activeItemId, projectId])

  // Handle file input change
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  // Remove image from item
  const handleRemoveImage = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, imageAssetId: null, imageUrl: null }
          : item
      )
    )
  }

  // Save to database
  const saveToDatabase = async () => {
    if (!projectId) throw new Error("No project ID")

    // Save each storyboard item as a card
    for (const item of items) {
      if (item.id.startsWith("temp-")) {
        // Create new card
        await createStoryboardCard({
          project_id: projectId,
          title: item.title,
          description: item.description,
          thumbnail_url: item.imageUrl,
          sort_order: item.sortOrder,
        })
      } else {
        // Update existing card
        await updateStoryboardCard(item.id, {
          title: item.title,
          description: item.description,
          thumbnail_url: item.imageUrl,
          sort_order: item.sortOrder,
        })
      }
    }
  }

  const handleSaveDraft = async () => {
    if (!projectId) return

    setIsSavingDraft(true)
    try {
      await saveToDatabase()
    } catch (error) {
      console.error("Error saving draft:", error)
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleContinue = async () => {
    if (!projectId) return

    setIsSaving(true)
    try {
      await saveToDatabase()
      markStepComplete("story")
      goToNextStep()
    } catch (error) {
      console.error("Error saving:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = async () => {
    if (projectId) {
      try {
        await saveToDatabase()
      } catch (error) {
        console.error("Error saving on back:", error)
      }
    }
    goToPreviousStep()
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-zinc-100 mb-2">
            Storyboard
          </h1>
          <p className="text-zinc-400">
            Add visual references for each scene from your script.
          </p>
        </div>

        {/* Storyboard Items */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
            <Layers className="w-12 h-12 text-zinc-600 mb-3" />
            <p className="text-zinc-500 text-sm text-center mb-2">
              No scenes found
            </p>
            <p className="text-zinc-600 text-xs text-center">
              Go back to the Script step and add description sections
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex gap-10"
              >
                {/* Left side - Title and Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-zinc-500 font-medium bg-zinc-800 px-2 py-0.5 rounded">
                      Scene {index + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-100 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {item.description || "No description"}
                  </p>
                </div>

                {/* Right side - Image (square) */}
                <div className="flex-shrink-0">
                  {item.imageUrl ? (
                    <div className="relative group">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-56 h-56 object-cover rounded-lg border border-zinc-700"
                      />
                      <button
                        onClick={() => handleRemoveImage(item.id)}
                        className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-300 hover:text-orange-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAddImage(item.id)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center"
                      >
                        <span className="text-xs text-white font-medium">Change</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddImage(item.id)}
                      className="w-56 h-56 border-2 border-dashed border-zinc-700 hover:border-zinc-600 rounded-lg flex flex-col items-center justify-center gap-2 transition-colors bg-zinc-800/30 hover:bg-zinc-800/50"
                    >
                      <Plus className="w-6 h-6 text-zinc-500" />
                      <span className="text-xs text-zinc-500">Add Image</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="text-zinc-400 hover:text-zinc-300"
          >
            &larr; Back
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || !projectId}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingDraft ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Draft
            </Button>
            <Button
              onClick={handleContinue}
              disabled={isSaving}
              className="bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 hover:from-sky-300 hover:via-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/20 px-8"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Add Image Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowAddModal(false)
              setActiveItemId(null)
            }}
          />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">
              Add Image
            </h3>

            <div className="space-y-3">
              {/* Generate New */}
              <button
                onClick={handleGenerateNew}
                className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl flex items-center gap-3 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-sky-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-zinc-200">Generate New</p>
                  <p className="text-xs text-zinc-500">Create with AI</p>
                </div>
              </button>

              {/* Select Existing */}
              <button
                onClick={handleSelectExisting}
                className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl flex items-center gap-3 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-orange-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-zinc-200">Select Existing</p>
                  <p className="text-xs text-zinc-500">From your assets</p>
                </div>
              </button>

              {/* Upload */}
              <label className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl flex items-center gap-3 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-medium text-zinc-200">
                    {isUploading ? "Uploading..." : "Upload"}
                  </p>
                  <p className="text-xs text-zinc-500">From your device</p>
                </div>
              </label>
            </div>

            <button
              onClick={() => {
                setShowAddModal(false)
                setActiveItemId(null)
              }}
              className="mt-4 w-full py-2 text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Asset Picker Modal */}
      {showAssetPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowAssetPicker(false)
              setActiveItemId(null)
            }}
          />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100">
                Select Image
              </h3>
              <button
                onClick={() => {
                  setShowAssetPicker(false)
                  setActiveItemId(null)
                }}
                className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Layers className="w-10 h-10 text-zinc-600 mb-2" />
                  <p className="text-zinc-500 text-sm">No image assets found</p>
                  <p className="text-zinc-600 text-xs mt-1">
                    Generate or upload images first
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {assets.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => handleAssetSelect(asset)}
                      className="relative aspect-square rounded-lg overflow-hidden border-2 border-zinc-700 hover:border-sky-500 transition-colors group"
                    >
                      <img
                        src={getAssetDisplayUrl(asset)}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <Check className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
