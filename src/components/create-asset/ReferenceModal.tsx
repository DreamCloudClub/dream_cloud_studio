import { useState, useCallback, useEffect } from "react"
import {
  X,
  Upload,
  Image,
  FolderOpen,
  Check,
  Loader2,
  AlertCircle,
  Mountain,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { getAssets, uploadAndCreateAsset } from "@/services/assets"
import { getAssetDisplayUrl } from "@/services/localStorage"
import type { Asset, AssetType, AssetCategory } from "@/types/database"

interface ReferenceModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (asset: Asset) => void
  assetType: AssetType
  category: AssetCategory
}

type Tab = "library" | "upload"

export function ReferenceModal({
  isOpen,
  onClose,
  onSelect,
  assetType,
  category,
}: ReferenceModalProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>("library")
  const [libraryAssets, setLibraryAssets] = useState<Asset[]>([])
  const [isLoadingAssets, setIsLoadingAssets] = useState(true)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)

  // Upload state
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch assets filtered for references
  // References are always IMAGES (for both image and video generation)
  // Filter by category to keep relevance (scene refs for scenes, etc.)
  useEffect(() => {
    async function fetchAssets() {
      if (!user || !isOpen) return
      setIsLoadingAssets(true)
      try {
        const allAssets = await getAssets(user.id)
        // References are always images - show ALL images so users can mix (e.g., add character to scene)
        const filtered = allAssets.filter((a) => a.type === "image")
        setLibraryAssets(filtered)
      } catch (err) {
        console.error("Error fetching assets:", err)
      } finally {
        setIsLoadingAssets(false)
      }
    }
    fetchAssets()
  }, [user, isOpen, category])

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile)
    setError(null)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleBrowse = () => {
    const input = document.createElement("input")
    input.type = "file"
    // References are always images
    input.accept = "image/*"
    input.onchange = (e) => {
      const selectedFile = (e.target as HTMLInputElement).files?.[0]
      if (selectedFile) {
        handleFileSelect(selectedFile)
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
        category,
        bucket: "project-assets",
      })

      // Select the newly uploaded asset
      onSelect(asset)
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
      onSelect(asset)
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Add Reference</h2>
          <button
            onClick={handleClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
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
            <FolderOpen className="w-4 h-4 inline-block mr-2" />
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
            <Upload className="w-4 h-4 inline-block mr-2" />
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
                  <Mountain className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400 text-sm">
                    No images in your library
                  </p>
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
                      {asset.url || asset.local_path ? (
                        <img
                          src={getAssetDisplayUrl(asset)}
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                          <Image className="w-6 h-6 text-zinc-600" />
                        </div>
                      )}
                      {selectedAssetId === asset.id && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-[10px] text-white truncate">{asset.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Drop Zone */}
              {!file ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={handleBrowse}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                    isDragging
                      ? "border-sky-500 bg-sky-500/10"
                      : "border-zinc-700 hover:border-zinc-600"
                  )}
                >
                  <Upload className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
                  <p className="text-zinc-300 font-medium mb-1">
                    Drop your reference image here
                  </p>
                  <p className="text-sm text-zinc-500">or click to browse</p>
                </div>
              ) : (
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                      <Image className="w-6 h-6 text-sky-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-200 font-medium truncate">{file.name}</p>
                      <p className="text-xs text-zinc-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="p-1 text-zinc-400 hover:text-zinc-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Auto-category info */}
              <p className="text-xs text-zinc-500">
                This will be saved to your library as a <span className="text-zinc-300">{category}</span> image.
              </p>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-zinc-800">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
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
