import { useState, useEffect, useRef, useCallback } from "react"
import {
  Save,
  Trash2,
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
  AlertTriangle,
  Calendar,
  HardDrive,
  Clock,
  Cpu,
  FileText,
  Wand2,
  Download,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { updateAsset, deleteAsset } from "@/services/assets"
import { getAssetDisplayUrl } from "@/services/localStorage"
import type { Asset, AssetType, AssetCategory, VisualAssetCategory, AudioAssetCategory } from "@/types/database"

interface AssetDetailsModalProps {
  isOpen: boolean
  asset: Asset | null
  onClose: () => void
  onUpdate?: (asset: Asset) => void
  onDelete?: (assetId: string) => void
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
  animation: Sparkles,
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "Unknown"
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, "0")}`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function AssetDetailsModal({
  isOpen,
  asset,
  onClose,
  onUpdate,
  onDelete,
}: AssetDetailsModalProps) {
  // Form state
  const [name, setName] = useState("")
  const [category, setCategory] = useState<AssetCategory | null>(null)
  const [userDescription, setUserDescription] = useState("")
  const [aiPrompt, setAiPrompt] = useState("")

  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Refs for auto-growing textareas
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const aiPromptRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea to fit content
  const autoResize = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [])

  // Initialize form when asset changes
  useEffect(() => {
    if (asset) {
      setName(asset.name)
      setCategory(asset.category)
      setUserDescription(asset.user_description || "")
      setAiPrompt(asset.ai_prompt || "")
      setHasChanges(false)
      setError(null)
      setShowDeleteConfirm(false)
      // Auto-resize textareas after state updates
      setTimeout(() => {
        autoResize(descriptionRef.current)
        autoResize(aiPromptRef.current)
      }, 0)
    }
  }, [asset, autoResize])

  // Track changes
  useEffect(() => {
    if (asset) {
      const changed =
        name !== asset.name ||
        category !== asset.category ||
        userDescription !== (asset.user_description || "") ||
        aiPrompt !== (asset.ai_prompt || "")
      setHasChanges(changed)
    }
  }, [name, category, userDescription, aiPrompt, asset])

  const handleSave = async () => {
    if (!asset || !hasChanges) return

    setIsSaving(true)
    setError(null)

    try {
      const updatedAsset = await updateAsset(asset.id, {
        name,
        category,
        user_description: userDescription || null,
        ai_prompt: aiPrompt || null,
      })
      onUpdate?.(updatedAsset)
      setHasChanges(false)
    } catch (err) {
      console.error("Error saving asset:", err)
      setError("Failed to save changes. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!asset) return

    setIsDeleting(true)
    setError(null)

    try {
      await deleteAsset(asset.id)
      onDelete?.(asset.id)
      onClose()
    } catch (err) {
      console.error("Error deleting asset:", err)
      setError("Failed to delete asset. Please try again.")
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    if (!isSaving && !isDeleting) {
      onClose()
    }
  }

  const handleDownload = async () => {
    if (!asset || !previewUrl) return

    try {
      // Determine file extension based on asset type
      const extensions: Record<AssetType, string> = {
        image: "png",
        video: "mp4",
        audio: "mp3",
      }
      const extension = extensions[asset.type]
      const filename = `${asset.name.replace(/[^a-zA-Z0-9]/g, "_")}.${extension}`

      // Handle base64 data URLs
      if (previewUrl.startsWith("data:")) {
        const response = await fetch(previewUrl)
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else {
        // Regular URL - fetch and download
        const response = await fetch(previewUrl)
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error("Error downloading asset:", err)
      setError("Failed to download asset. Please try again.")
    }
  }

  if (!isOpen || !asset) return null

  const categories = asset.type === "audio" ? AUDIO_CATEGORIES : VISUAL_CATEGORIES
  const TypeIcon = TYPE_ICONS[asset.type]

  // Get asset URL for preview (handles local vs cloud storage)
  const previewUrl = getAssetDisplayUrl(asset)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <div className="flex items-center justify-center gap-2">
            <TypeIcon className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Asset Details</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Preview */}
          <div className="rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700">
            {asset.type === "image" && previewUrl && (
              <div className="aspect-square w-full flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt={asset.name}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            {asset.type === "video" && previewUrl && (
              <div className="aspect-square w-full flex items-center justify-center bg-black">
                <video
                  src={previewUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            {asset.type === "audio" && previewUrl && (
              <div className="p-6 flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-sky-500/20 flex items-center justify-center">
                  {category === "music" && <Music className="w-10 h-10 text-sky-400" />}
                  {category === "sound_effect" && <Waves className="w-10 h-10 text-sky-400" />}
                  {category === "voice" && <Mic className="w-10 h-10 text-sky-400" />}
                  {!category && <Volume2 className="w-10 h-10 text-sky-400" />}
                </div>
                <audio src={previewUrl} controls className="w-full max-w-md" />
              </div>
            )}
            {!previewUrl && (
              <div className="p-12 flex items-center justify-center text-zinc-500">
                <TypeIcon className="w-12 h-12" />
              </div>
            )}
          </div>

          {/* Editable Fields */}
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:border-sky-500 transition-colors"
                placeholder="Asset name"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Category
              </label>
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

            {/* User Description */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                <FileText className="w-4 h-4 inline mr-1.5" />
                Description
              </label>
              <textarea
                ref={descriptionRef}
                value={userDescription}
                onChange={(e) => {
                  setUserDescription(e.target.value)
                  autoResize(e.target)
                }}
                className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:border-sky-500 transition-colors resize-none overflow-hidden min-h-[2.5rem]"
                placeholder="What this asset is about..."
              />
            </div>

            {/* AI Prompt */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                <Wand2 className="w-4 h-4 inline mr-1.5" />
                AI Generation Prompt
              </label>
              <textarea
                ref={aiPromptRef}
                value={aiPrompt}
                onChange={(e) => {
                  setAiPrompt(e.target.value)
                  autoResize(e.target)
                }}
                className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:border-sky-500 transition-colors resize-none overflow-hidden font-mono text-sm min-h-[2.5rem]"
                placeholder="The prompt used to generate this asset..."
              />
            </div>
          </div>

          {/* Read-only Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-zinc-800/50 rounded-xl">
              <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-xs">Created</span>
              </div>
              <p className="text-sm text-zinc-200">{formatDate(asset.created_at)}</p>
            </div>

            <div className="p-3 bg-zinc-800/50 rounded-xl">
              <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                <HardDrive className="w-3.5 h-3.5" />
                <span className="text-xs">Size</span>
              </div>
              <p className="text-sm text-zinc-200">{formatFileSize(asset.file_size)}</p>
            </div>

            {asset.duration && (
              <div className="p-3 bg-zinc-800/50 rounded-xl">
                <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs">Duration</span>
                </div>
                <p className="text-sm text-zinc-200">{formatDuration(asset.duration)}</p>
              </div>
            )}

            {asset.generation_model && (
              <div className="p-3 bg-zinc-800/50 rounded-xl">
                <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                  <Cpu className="w-3.5 h-3.5" />
                  <span className="text-xs">Model</span>
                </div>
                <p className="text-sm text-zinc-200 truncate" title={asset.generation_model}>
                  {asset.generation_model.replace('replicate_', '').replace('_', ' ')}
                </p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-zinc-100">Delete this asset?</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    This action cannot be undone. The asset will be permanently removed.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                      className="px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-3 p-4 border-t border-zinc-800 sticky bottom-0 bg-zinc-900">
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSaving || isDeleting || showDeleteConfirm}
              className="px-4 py-2 rounded-lg text-orange-400 hover:bg-orange-500/10 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={handleDownload}
              disabled={isSaving || isDeleting || !previewUrl}
              className="px-4 py-2 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={isSaving || isDeleting}
              className="px-4 py-2 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {hasChanges ? "Cancel" : "Close"}
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving || isDeleting}
              className={cn(
                "px-6 py-2 rounded-lg font-medium transition-all inline-flex items-center gap-2",
                hasChanges && !isSaving
                  ? "bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white hover:opacity-90"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              )}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
