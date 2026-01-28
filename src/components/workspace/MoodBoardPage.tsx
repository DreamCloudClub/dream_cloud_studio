import { useState, useEffect, useRef } from "react"
import {
  Palette,
  X,
  ChevronDown,
  Check,
  ImagePlus,
  Upload,
  Loader2,
  Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"

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
import { useWorkspaceStore } from "@/state/workspaceStore"
import { useFoundationStore, Foundation } from "@/state/foundationStore"
import { useAuth } from "@/contexts/AuthContext"
import { getAssets, uploadAndCreateAsset } from "@/services/assets"
import { getAssetDisplayUrl } from "@/services/localStorage"
import type { Asset } from "@/types/database"

// Reference Modal Component (inline to avoid import issues)
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

  // Fetch image assets
  useEffect(() => {
    async function fetchAssets() {
      if (!user || !isOpen) return
      setIsLoadingAssets(true)
      try {
        const allAssets = await getAssets(user.id)
        // References are always images
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
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Add Reference Image</h2>
          <button onClick={handleClose} className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => setActiveTab("library")}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === "library"
                ? "text-sky-400 border-b-2 border-sky-400"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            From Library
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === "upload"
                ? "text-sky-400 border-b-2 border-sky-400"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            Upload New
          </button>
        </div>

        {/* Content */}
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
                  <button
                    onClick={() => setActiveTab("upload")}
                    className="mt-3 text-sky-400 hover:text-sky-300 text-sm"
                  >
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
                        selectedAssetId === asset.id
                          ? "border-sky-500 ring-2 ring-sky-500/30"
                          : "border-zinc-700 hover:border-zinc-600"
                      )}
                    >
                      <img
                        src={getAssetDisplayUrl(asset)}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
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
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
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

// Foundation Dropdown Component
interface FoundationDropdownProps {
  foundations: Foundation[]
  selectedFoundation: Foundation | null
  onSelect: (foundation: Foundation) => void
  onClear: () => void
}

function FoundationDropdown({ foundations, selectedFoundation, onSelect, onClear }: FoundationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (foundations.length === 0) return null

  return (
    <div ref={dropdownRef} className="relative">
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
            <button onClick={onClear} className="text-xs text-zinc-500 hover:text-zinc-300">
              Clear
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
              <Palette className="w-5 h-5 text-zinc-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-zinc-300">Select a Foundation</p>
              <p className="text-xs text-zinc-500">Apply existing visual style</p>
            </div>
          </div>
          <ChevronDown className={cn("w-5 h-5 text-zinc-500 transition-transform", isOpen && "rotate-180")} />
        </button>
      )}

      {/* Dropdown */}
      {isOpen && !selectedFoundation && (
        <div className="absolute z-10 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {foundations.map((foundation) => (
              <button
                key={foundation.id}
                onClick={() => {
                  onSelect(foundation)
                  setIsOpen(false)
                }}
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
  )
}

export function MoodBoardPage() {
  const { user } = useAuth()
  const { project, updateMoodBoard: updateWorkspaceMoodBoard } = useWorkspaceStore()
  const { foundations, loadFoundations, isLoading: isLoadingFoundations } = useFoundationStore()

  const [selectedFoundation, setSelectedFoundation] = useState<Foundation | null>(null)
  const [showReferenceModal, setShowReferenceModal] = useState(false)
  const [images, setImages] = useState<{ id: string; url: string; name: string }[]>([])
  const [colors, setColors] = useState<string[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [initialized, setInitialized] = useState(false)

  // Load foundations
  useEffect(() => {
    if (user && foundations.length === 0 && !isLoadingFoundations) {
      loadFoundations(user.id)
    }
  }, [user, foundations.length, isLoadingFoundations, loadFoundations])

  // Initialize from project moodBoard (only once)
  useEffect(() => {
    if (project?.moodBoard && !initialized) {
      setImages(project.moodBoard.images || [])
      setColors(project.moodBoard.colors || [])
      setKeywords(project.moodBoard.keywords || [])
      setInitialized(true)
    }
  }, [project?.moodBoard, initialized])

  // Initialize selected foundation from project (after foundations load)
  useEffect(() => {
    if (project?.moodBoard?.foundationId && foundations.length > 0 && !selectedFoundation) {
      const found = foundations.find(f => f.id === project.moodBoard?.foundationId)
      if (found) {
        setSelectedFoundation(found)
      }
    }
  }, [project?.moodBoard?.foundationId, foundations, selectedFoundation])

  const handleApplyFoundation = (foundation: Foundation) => {
    setSelectedFoundation(foundation)
    // Apply foundation colors (replace)
    const newColors = foundation.color_palette || []
    setColors(newColors)

    // Keep existing images, DON'T replace them
    // Only update colors and foundationId
    updateWorkspaceMoodBoard({
      colors: newColors,
      foundationId: foundation.id,
      // Keep existing images
      images: images,
    })
  }

  const handleClearFoundation = () => {
    setSelectedFoundation(null)
    // Clear foundationId but keep images and colors
    updateWorkspaceMoodBoard({
      foundationId: undefined,
    })
  }

  const handleAddImage = (image: { id: string; url: string; name: string }) => {
    const newImages = [...images, image]
    setImages(newImages)
    updateWorkspaceMoodBoard({ images: newImages })
  }

  const handleRemoveImage = (imageId: string) => {
    const newImages = images.filter((img) => img.id !== imageId)
    setImages(newImages)
    updateWorkspaceMoodBoard({ images: newImages })
  }

  const handleSelectPalette = (paletteColors: string[]) => {
    setColors(paletteColors)
    updateWorkspaceMoodBoard({ colors: paletteColors })
  }

  const handleToggleKeyword = (keyword: string) => {
    let newKeywords: string[]
    if (keywords.includes(keyword)) {
      newKeywords = keywords.filter((k) => k !== keyword)
    } else {
      newKeywords = [...keywords, keyword]
    }
    setKeywords(newKeywords)
    updateWorkspaceMoodBoard({ keywords: newKeywords })
  }

  if (!project) return null

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6 lg:py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Visual Direction</h1>
          <p className="text-zinc-400 mt-1">
            Set the visual style and reference images for this project.
          </p>
        </div>

        {/* Foundation Dropdown */}
        <div>
          <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wide mb-3">
            Foundation
          </h2>
          <FoundationDropdown
            foundations={foundations}
            selectedFoundation={selectedFoundation}
            onSelect={handleApplyFoundation}
            onClear={handleClearFoundation}
          />
          {foundations.length === 0 && !isLoadingFoundations && (
            <p className="text-xs text-zinc-500 mt-2">
              No foundations yet. Create one in the Library to quickly apply visual styles.
            </p>
          )}
        </div>

        {/* Reference Images */}
        <div>
          <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wide mb-3">
            Reference Images
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative aspect-square rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 group"
              >
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleRemoveImage(image.id)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 hover:bg-orange-500 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-xs text-white truncate">{image.name}</p>
                </div>
              </div>
            ))}

            {/* Add Image Button */}
            <button
              onClick={() => setShowReferenceModal(true)}
              className="aspect-square rounded-xl border-2 border-dashed border-zinc-700 hover:border-sky-500 hover:bg-sky-500/5 flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-sky-400 transition-all"
            >
              <ImagePlus className="w-8 h-8" />
              <span className="text-xs">Add Reference</span>
            </button>
          </div>
        </div>

        {/* Color Palette */}
        <div>
          <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wide mb-3">
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
                    JSON.stringify(colors) === JSON.stringify(palette.colors)
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
            {colors.length > 0 && (
              <div className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                <span className="text-sm text-zinc-400">Selected:</span>
                <div className="flex gap-2">
                  {colors.map((color) => (
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
        <div>
          <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wide mb-3">
            Style Keywords
          </h2>
          <div className="flex flex-wrap gap-2">
            {styleKeywords.map((keyword) => (
              <button
                key={keyword}
                onClick={() => handleToggleKeyword(keyword)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all",
                  keywords.includes(keyword)
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
