import { useState, useEffect } from "react"
import { Upload, X, Plus, Palette, ChevronDown, Check, Loader2, Save, ImagePlus } from "lucide-react"
import { useProjectWizardStore } from "@/state/projectWizardStore"
import { useFoundationStore, Foundation } from "@/state/foundationStore"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getMoodBoard, createMoodBoard, updateMoodBoard } from "@/services/projects"
import { getAssets, uploadAndCreateAsset } from "@/services/assets"
import { getAssetDisplayUrl } from "@/services/localStorage"
import type { Asset } from "@/types/database"

// Preset color palettes for quick selection
const presetPalettes = [
  { name: "Ocean", colors: ["#0ea5e9", "#0284c7", "#0369a1", "#075985"] },
  { name: "Sunset", colors: ["#f97316", "#ea580c", "#dc2626", "#9a3412"] },
  { name: "Forest", colors: ["#22c55e", "#16a34a", "#15803d", "#166534"] },
  { name: "Lavender", colors: ["#a855f7", "#9333ea", "#7c3aed", "#6d28d9"] },
  { name: "Monochrome", colors: ["#e4e4e7", "#a1a1aa", "#71717a", "#3f3f46"] },
  { name: "Warm", colors: ["#fbbf24", "#f59e0b", "#d97706", "#b45309"] },
]

// Preset style keywords
const styleKeywords = [
  "Cinematic",
  "Minimal",
  "Bold",
  "Organic",
  "Geometric",
  "Retro",
  "Futuristic",
  "Playful",
  "Elegant",
  "Raw",
  "Dreamy",
  "Dynamic",
]

// Reference Modal Component
interface ReferenceModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (image: { id: string; url: string; name: string }) => void
}

function ReferenceModal({ isOpen, onClose, onSelect }: ReferenceModalProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<"library" | "upload">("library")
  const [libraryAssets, setLibraryAssets] = useState<Asset[]>([])
  const [isLoadingAssets, setIsLoadingAssets] = useState(true)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAssets() {
      if (!user || !isOpen) return
      setIsLoadingAssets(true)
      try {
        const allAssets = await getAssets(user.id)
        const filtered = allAssets.filter((a) => a.type === "image")
        setLibraryAssets(filtered)
      } catch (err) {
        console.error("Error fetching assets:", err)
      } finally {
        setIsLoadingAssets(false)
      }
    }
    fetchAssets()
  }, [user, isOpen])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      setFile(droppedFile)
      setError(null)
    }
  }

  const handleBrowse = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = (e) => {
      const selectedFile = (e.target as HTMLInputElement).files?.[0]
      if (selectedFile) {
        setFile(selectedFile)
        setError(null)
      }
    }
    input.click()
  }

  const handleUpload = async () => {
    if (!user || !file) return
    setIsUploading(true)
    setError(null)
    try {
      const asset = await uploadAndCreateAsset(user.id, file, {
        category: "scene",
        bucket: "project-assets",
      })
      onSelect({
        id: asset.id,
        url: getAssetDisplayUrl(asset),
        name: asset.name,
      })
      handleClose()
    } catch (err) {
      console.error("Upload error:", err)
      setError("Failed to upload. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleSelectFromLibrary = () => {
    if (!selectedAssetId) return
    const asset = libraryAssets.find((a) => a.id === selectedAssetId)
    if (asset) {
      onSelect({
        id: asset.id,
        url: getAssetDisplayUrl(asset),
        name: asset.name,
      })
      handleClose()
    }
  }

  const handleClose = () => {
    setFile(null)
    setSelectedAssetId(null)
    setError(null)
    setActiveTab("library")
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Add Reference Image</h2>
          <button onClick={handleClose} className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => setActiveTab("library")}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === "library" ? "text-sky-400 border-b-2 border-sky-400" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            From Library
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === "upload" ? "text-sky-400 border-b-2 border-sky-400" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            Upload New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "library" ? (
            <div>
              {isLoadingAssets ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
                </div>
              ) : libraryAssets.length === 0 ? (
                <div className="text-center py-12">
                  <ImagePlus className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400 text-sm">No images in your library</p>
                  <button onClick={() => setActiveTab("upload")} className="mt-3 text-sky-400 hover:text-sky-300 text-sm">
                    Upload one instead
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {libraryAssets.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => setSelectedAssetId(asset.id)}
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                        selectedAssetId === asset.id ? "border-sky-500 ring-2 ring-sky-500/30" : "border-zinc-700 hover:border-zinc-600"
                      )}
                    >
                      <img src={getAssetDisplayUrl(asset)} alt={asset.name} className="w-full h-full object-cover" />
                      {selectedAssetId === asset.id && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {!file ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
                  onClick={handleBrowse}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                    isDragging ? "border-sky-500 bg-sky-500/10" : "border-zinc-700 hover:border-zinc-600"
                  )}
                >
                  <Upload className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
                  <p className="text-zinc-300 font-medium mb-1">Drop your image here</p>
                  <p className="text-sm text-zinc-500">or click to browse</p>
                </div>
              ) : (
                <div className="bg-zinc-800/50 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                    <ImagePlus className="w-6 h-6 text-sky-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-200 font-medium truncate">{file.name}</p>
                    <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button onClick={() => setFile(null)} className="p-1 text-zinc-400 hover:text-zinc-200">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">{error}</div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-zinc-800">
          <button onClick={handleClose} className="px-4 py-2 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors">
            Cancel
          </button>
          {activeTab === "library" ? (
            <button
              onClick={handleSelectFromLibrary}
              disabled={!selectedAssetId}
              className={cn(
                "px-6 py-2 rounded-lg font-medium transition-all",
                selectedAssetId
                  ? "bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white hover:opacity-90"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              )}
            >
              Select
            </button>
          ) : (
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className={cn(
                "px-6 py-2 rounded-lg font-medium transition-all inline-flex items-center gap-2",
                file && !isUploading
                  ? "bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white hover:opacity-90"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              )}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload & Select"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function MoodBoardStep() {
  const { user } = useAuth()
  const { moodBoard, setMoodBoard, goToNextStep, goToPreviousStep, markStepComplete, projectId } =
    useProjectWizardStore()
  const { foundations, loadFoundations, isLoading: isLoadingFoundations } = useFoundationStore()

  const [images, setImages] = useState<{ id: string; url: string; name: string }[]>(
    moodBoard?.images || []
  )
  const [selectedColors, setSelectedColors] = useState<string[]>(
    moodBoard?.colors || []
  )
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(
    moodBoard?.keywords || []
  )
  const [selectedFoundation, setSelectedFoundation] = useState<Foundation | null>(null)
  const [showFoundationPicker, setShowFoundationPicker] = useState(false)
  const [showReferenceModal, setShowReferenceModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [moodBoardExists, setMoodBoardExists] = useState(false)

  // Load foundations on mount
  useEffect(() => {
    if (user && foundations.length === 0 && !isLoadingFoundations) {
      loadFoundations(user.id)
    }
  }, [user, foundations.length, isLoadingFoundations, loadFoundations])

  // Check if mood board exists on mount
  useEffect(() => {
    if (projectId) {
      getMoodBoard(projectId).then((existing) => {
        if (existing) setMoodBoardExists(true)
      })
    }
  }, [projectId])

  // Sync store changes back to local state (when Bubble updates via chat)
  useEffect(() => {
    if (moodBoard) {
      if (moodBoard.images) setImages(moodBoard.images)
      if (moodBoard.colors) setSelectedColors(moodBoard.colors)
      if (moodBoard.keywords) setSelectedKeywords(moodBoard.keywords)
    }
  }, [moodBoard])

  const handleAddImage = (image: { id: string; url: string; name: string }) => {
    setImages([...images, image])
  }

  const handleRemoveImage = (imageId: string) => {
    setImages(images.filter((img) => img.id !== imageId))
  }

  const handleSelectPalette = (colors: string[]) => {
    setSelectedColors(colors)
  }

  const handleToggleKeyword = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      setSelectedKeywords(selectedKeywords.filter((k) => k !== keyword))
    } else {
      setSelectedKeywords([...selectedKeywords, keyword])
    }
  }

  const handleApplyFoundation = (foundation: Foundation) => {
    setSelectedFoundation(foundation)
    setSelectedColors(foundation.color_palette || [])
    // Map foundation style to keywords if it exists
    const keywords: string[] = []
    if (foundation.style) {
      const styleMap: Record<string, string> = {
        minimal: "Minimal",
        bold: "Bold",
        cinematic: "Cinematic",
        organic: "Organic",
        retro: "Retro",
        futuristic: "Futuristic",
      }
      if (styleMap[foundation.style]) keywords.push(styleMap[foundation.style])
    }
    if (foundation.mood) {
      const moodMap: Record<string, string> = {
        professional: "Elegant",
        energetic: "Dynamic",
        calm: "Dreamy",
        innovative: "Futuristic",
        playful: "Playful",
        luxurious: "Elegant",
      }
      if (moodMap[foundation.mood]) keywords.push(moodMap[foundation.mood])
    }
    setSelectedKeywords(keywords)
    // Add foundation mood images if any
    if (foundation.mood_images && foundation.mood_images.length > 0) {
      setImages(foundation.mood_images)
    }
    setShowFoundationPicker(false)
  }

  const handleClearFoundation = () => {
    setSelectedFoundation(null)
  }

  const handleSaveDraft = async () => {
    if (!projectId) return

    setIsSavingDraft(true)
    try {
      const moodBoardData = {
        images: images as unknown as import("@/types/database").Json,
        colors: selectedColors as unknown as import("@/types/database").Json,
        keywords: selectedKeywords as unknown as import("@/types/database").Json,
      }

      if (moodBoardExists) {
        await updateMoodBoard(projectId, moodBoardData)
      } else {
        await createMoodBoard({ project_id: projectId, ...moodBoardData })
        setMoodBoardExists(true)
      }

      // Update local state
      setMoodBoard({
        images,
        colors: selectedColors,
        keywords: selectedKeywords,
        foundationId: selectedFoundation?.id,
      })

      // Stay on page - user can use back button to exit
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
      const moodBoardData = {
        images: images as unknown as import("@/types/database").Json,
        colors: selectedColors as unknown as import("@/types/database").Json,
        keywords: selectedKeywords as unknown as import("@/types/database").Json,
      }

      if (moodBoardExists) {
        await updateMoodBoard(projectId, moodBoardData)
      } else {
        await createMoodBoard({
          project_id: projectId,
          ...moodBoardData,
        })
        setMoodBoardExists(true)
      }

      // Update local state
      setMoodBoard({
        images,
        colors: selectedColors,
        keywords: selectedKeywords,
        foundationId: selectedFoundation?.id,
      })
      markStepComplete("mood")
      goToNextStep()
    } catch (error) {
      console.error("Error saving mood board:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // Save and go back
  const handleBack = async () => {
    if (!projectId) {
      goToPreviousStep()
      return
    }

    try {
      const moodBoardData = {
        images: images as unknown as import("@/types/database").Json,
        colors: selectedColors as unknown as import("@/types/database").Json,
        keywords: selectedKeywords as unknown as import("@/types/database").Json,
      }

      if (moodBoardExists) {
        await updateMoodBoard(projectId, moodBoardData)
      } else if (images.length > 0 || selectedColors.length > 0 || selectedKeywords.length > 0) {
        await createMoodBoard({ project_id: projectId, ...moodBoardData })
        setMoodBoardExists(true)
      }
    } catch (error) {
      console.error("Error saving on back:", error)
    }
    goToPreviousStep()
  }

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-zinc-100 mb-2">
            Visual Direction
          </h1>
          <p className="text-zinc-400">
            Set the mood with reference images, colors, and style keywords.
          </p>
        </div>

        {/* Foundation Quick Apply */}
        {foundations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">
              Apply Foundation
            </h2>
            <div className="relative">
              {selectedFoundation ? (
                <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-sky-500/50 rounded-xl">
                  <div className="w-10 h-10 rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 flex-shrink-0">
                    {(selectedFoundation.color_palette || []).slice(0, 4).map((color, i) => (
                      <div key={i} style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-100">{selectedFoundation.name}</p>
                    <p className="text-xs text-zinc-500">Foundation applied</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-sky-400" />
                    <button
                      onClick={handleClearFoundation}
                      className="text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowFoundationPicker(!showFoundationPicker)}
                  className="w-full flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <Palette className="w-5 h-5 text-zinc-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-zinc-300">Use a saved foundation</p>
                      <p className="text-xs text-zinc-500">Apply existing visual style</p>
                    </div>
                  </div>
                  <ChevronDown className={cn(
                    "w-5 h-5 text-zinc-500 transition-transform",
                    showFoundationPicker && "rotate-180"
                  )} />
                </button>
              )}

              {/* Foundation Dropdown */}
              {showFoundationPicker && !selectedFoundation && (
                <div className="absolute z-10 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    {foundations.map((foundation) => (
                      <button
                        key={foundation.id}
                        onClick={() => handleApplyFoundation(foundation)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 flex-shrink-0">
                          {(foundation.color_palette || []).slice(0, 4).map((color, i) => (
                            <div key={i} style={{ backgroundColor: color }} />
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200">{foundation.name}</p>
                          {foundation.description && (
                            <p className="text-xs text-zinc-500 truncate">{foundation.description}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Or customize below to create a unique look
            </p>
          </div>
        )}

        {/* Reference Images */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">
            Reference Images
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative aspect-video bg-zinc-800 rounded-lg overflow-hidden group"
              >
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleRemoveImage(image.id)}
                  className="absolute top-2 right-2 w-6 h-6 bg-zinc-900/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-500"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}

            {/* Add Image Button */}
            <button
              onClick={() => setShowReferenceModal(true)}
              className="aspect-video bg-zinc-900 border-2 border-dashed border-zinc-700 hover:border-sky-500 hover:bg-sky-500/5 rounded-lg flex flex-col items-center justify-center gap-2 transition-colors text-zinc-500 hover:text-sky-400"
            >
              <ImagePlus className="w-6 h-6" />
              <span className="text-xs">Add Reference</span>
            </button>
          </div>
        </div>

        {/* Color Palette */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">
            Color Palette
          </h2>
          <div className="space-y-4">
            {/* Preset Palettes */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {presetPalettes.map((palette) => (
                <button
                  key={palette.name}
                  onClick={() => handleSelectPalette(palette.colors)}
                  className={cn(
                    "p-3 bg-zinc-900 border rounded-lg transition-all",
                    JSON.stringify(selectedColors) === JSON.stringify(palette.colors)
                      ? "border-sky-500 ring-2 ring-sky-500/20"
                      : "border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <div className="flex gap-1 mb-2">
                    {palette.colors.map((color) => (
                      <div
                        key={color}
                        className="flex-1 h-6 rounded"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-zinc-400 text-center">{palette.name}</p>
                </button>
              ))}
            </div>

            {/* Selected Colors Display */}
            {selectedColors.length > 0 && (
              <div className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                <span className="text-sm text-zinc-400">Selected:</span>
                <div className="flex gap-2">
                  {selectedColors.map((color) => (
                    <div
                      key={color}
                      className="w-8 h-8 rounded-lg shadow-inner"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Style Keywords */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">
            Style Keywords
          </h2>
          <div className="flex flex-wrap gap-2">
            {styleKeywords.map((keyword) => (
              <button
                key={keyword}
                onClick={() => handleToggleKeyword(keyword)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all",
                  selectedKeywords.includes(keyword)
                    ? "bg-sky-500 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"
                )}
              >
                {keyword}
              </button>
            ))}
            <button className="px-4 py-2 rounded-full text-sm font-medium bg-zinc-900 text-zinc-500 border border-dashed border-zinc-700 hover:border-zinc-600 flex items-center gap-1">
              <Plus className="w-4 h-4" />
              Custom
            </button>
          </div>
        </div>

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

      {/* Reference Modal */}
      <ReferenceModal
        isOpen={showReferenceModal}
        onClose={() => setShowReferenceModal(false)}
        onSelect={handleAddImage}
      />
    </div>
  )
}
