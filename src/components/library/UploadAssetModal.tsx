import { useState, useCallback } from "react"
import {
  X,
  Upload,
  Image,
  Film,
  Volume2,
  Mountain,
  Square,
  User,
  Cloud,
  Box,
  Sparkles,
  Music,
  Waves,
  Mic,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { uploadAndCreateAsset } from "@/services/assets"
import type { AssetType, AssetCategory, VisualAssetCategory, AudioAssetCategory } from "@/types/database"

interface UploadAssetModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

// Visual categories for Image and Video assets
const VISUAL_CATEGORIES: { id: VisualAssetCategory; label: string; icon: React.ElementType }[] = [
  { id: "scene", label: "Scene", icon: Mountain },
  { id: "stage", label: "Stage", icon: Square },
  { id: "character", label: "Character", icon: User },
  { id: "weather", label: "Weather", icon: Cloud },
  { id: "prop", label: "Prop", icon: Box },
  { id: "effect", label: "Effect", icon: Sparkles },
]

// Audio categories for Audio assets
const AUDIO_CATEGORIES: { id: AudioAssetCategory; label: string; icon: React.ElementType }[] = [
  { id: "music", label: "Music", icon: Music },
  { id: "sound_effect", label: "Sound Effect", icon: Waves },
  { id: "voice", label: "Voice", icon: Mic },
]

const TYPE_ICONS: Record<AssetType, React.ElementType> = {
  image: Image,
  video: Film,
  audio: Volume2,
}

export function UploadAssetModal({ isOpen, onClose, onSuccess }: UploadAssetModalProps) {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [detectedType, setDetectedType] = useState<AssetType | null>(null)
  const [category, setCategory] = useState<AssetCategory | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const detectAssetType = (file: File): AssetType => {
    if (file.type.startsWith("image/")) return "image"
    if (file.type.startsWith("video/")) return "video"
    if (file.type.startsWith("audio/")) return "audio"
    // Default based on extension
    const ext = file.name.split(".").pop()?.toLowerCase()
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) return "image"
    if (["mp4", "webm", "mov", "avi"].includes(ext || "")) return "video"
    if (["mp3", "wav", "ogg", "m4a", "aac"].includes(ext || "")) return "audio"
    return "image" // Default
  }

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile)
    const type = detectAssetType(selectedFile)
    setDetectedType(type)
    setCategory(null) // Reset category when new file is selected
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
    input.accept = "image/*,video/*,audio/*"
    input.onchange = (e) => {
      const selectedFile = (e.target as HTMLInputElement).files?.[0]
      if (selectedFile) {
        handleFileSelect(selectedFile)
      }
    }
    input.click()
  }

  const handleUpload = async () => {
    if (!user || !file || !category) return

    setIsUploading(true)
    setError(null)

    try {
      await uploadAndCreateAsset(user.id, file, {
        category,
        bucket: "project-assets",
      })

      // Reset and close
      setFile(null)
      setDetectedType(null)
      setCategory(null)
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error("Upload error:", err)
      setError("Failed to upload asset. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    if (!isUploading) {
      setFile(null)
      setDetectedType(null)
      setCategory(null)
      setError(null)
      onClose()
    }
  }

  const categories = detectedType === "audio" ? AUDIO_CATEGORIES : VISUAL_CATEGORIES
  const TypeIcon = detectedType ? TYPE_ICONS[detectedType] : Upload

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Upload Asset</h2>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Drop Zone / File Preview */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                isDragging
                  ? "border-sky-500 bg-sky-500/10"
                  : "border-zinc-700 hover:border-zinc-600"
              )}
              onClick={handleBrowse}
            >
              <Upload className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
              <p className="text-zinc-300 font-medium mb-1">
                Drop your file here
              </p>
              <p className="text-sm text-zinc-500">
                or click to browse
              </p>
              <p className="text-xs text-zinc-600 mt-2">
                Supports images, videos, and audio files
              </p>
            </div>
          ) : (
            <div className="bg-zinc-800/50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                  <TypeIcon className="w-6 h-6 text-sky-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-200 font-medium truncate">{file.name}</p>
                  <p className="text-xs text-zinc-500">
                    {detectedType?.toUpperCase()} • {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFile(null)
                    setDetectedType(null)
                    setCategory(null)
                  }}
                  className="p-1 text-zinc-400 hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Category Selection */}
          {file && detectedType && (
            <div>
              <p className="text-sm font-medium text-zinc-300 mb-3">
                Select a category
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((cat) => {
                  const Icon = cat.icon
                  const isSelected = category === cat.id

                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={cn(
                        "relative p-3 rounded-xl border-2 transition-all text-left",
                        isSelected
                          ? "border-sky-500 bg-sky-500/10"
                          : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Icon className={cn(
                          "w-4 h-4",
                          isSelected ? "text-sky-400" : "text-zinc-400"
                        )} />
                        <span className={cn(
                          "text-sm font-medium",
                          isSelected ? "text-zinc-100" : "text-zinc-300"
                        )}>
                          {cat.label}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-zinc-800">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || !category || isUploading}
            className={cn(
              "px-6 py-2 rounded-lg font-medium transition-all inline-flex items-center gap-2",
              file && category && !isUploading
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
              <>
                <Upload className="w-4 h-4" />
                Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
