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
  Maximize2,
  Minimize2,
  Play,
  Pause,
  SkipBack,
  Crop,
  X,
} from "lucide-react"
import ReactCrop, { type Crop as CropArea, type PixelCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import { cn } from "@/lib/utils"
import { updateAsset, deleteAsset, uploadAndCreateAsset } from "@/services/assets"
import { getAssetDisplayUrl } from "@/services/localStorage"
import { useAuth } from "@/contexts/AuthContext"
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

// Crop aspect ratio presets
const CROP_PRESETS = [
  { label: "Free", value: undefined },
  { label: "1:1", value: 1 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
]

// Color schemes per asset type
const TYPE_COLORS: Record<AssetType, {
  text: string
  border: string
  bg: string
  bgLight: string
  gradient: string
  focusBorder: string
}> = {
  image: {
    text: "text-orange-400",
    border: "border-orange-500",
    bg: "bg-orange-500",
    bgLight: "bg-orange-500/10",
    gradient: "bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600",
    focusBorder: "focus:border-orange-500",
  },
  video: {
    text: "text-red-400",
    border: "border-red-500",
    bg: "bg-red-500",
    bgLight: "bg-red-500/10",
    gradient: "bg-gradient-to-br from-red-400 via-red-500 to-rose-600",
    focusBorder: "focus:border-red-500",
  },
  audio: {
    text: "text-violet-400",
    border: "border-violet-500",
    bg: "bg-violet-500",
    bgLight: "bg-violet-500/10",
    gradient: "bg-gradient-to-br from-violet-400 via-violet-500 to-purple-600",
    focusBorder: "focus:border-violet-500",
  },
  animation: {
    text: "text-emerald-400",
    border: "border-emerald-500",
    bg: "bg-emerald-500",
    bgLight: "bg-emerald-500/10",
    gradient: "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600",
    focusBorder: "focus:border-emerald-500",
  },
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
  const { user } = useAuth()

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
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Cropping state
  const [isCropping, setIsCropping] = useState(false)
  const [crop, setCrop] = useState<CropArea>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined)
  const [isSavingCrop, setIsSavingCrop] = useState(false)
  const cropImageRef = useRef<HTMLImageElement>(null)

  // Fullscreen zoom/pan state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const fullscreenContainerRef = useRef<HTMLDivElement>(null)

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)

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

  // Reset zoom/pan when exiting fullscreen
  useEffect(() => {
    if (!isFullscreen) {
      setZoom(1)
      setPan({ x: 0, y: 0 })
    }
  }, [isFullscreen])

  // Fullscreen zoom handler (scroll wheel)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(prev => Math.min(Math.max(0.5, prev + delta), 5))
  }, [])

  // Fullscreen pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }, [zoom, pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
    }
  }, [isPanning, panStart])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Reset zoom/pan on double click
  const handleDoubleClick = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
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
      // Reset audio state
      setIsPlaying(false)
      setAudioProgress(0)
      setAudioCurrentTime(0)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      // Reset crop state
      setIsCropping(false)
      setCrop(undefined)
      setCompletedCrop(undefined)
      setCropAspect(undefined)
      // Auto-resize textareas after state updates
      setTimeout(() => {
        autoResize(descriptionRef.current)
        autoResize(aiPromptRef.current)
      }, 0)
    }
  }, [asset, autoResize])

  // Audio playback handlers
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleAudioPlayPause = () => {
    if (!previewUrl) return

    if (!audioRef.current) {
      audioRef.current = new Audio(previewUrl)
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current) {
          setAudioCurrentTime(audioRef.current.currentTime)
          setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100)
        }
      })
      audioRef.current.addEventListener('loadedmetadata', () => {
        if (audioRef.current) setAudioDuration(audioRef.current.duration)
      })
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false)
        setAudioProgress(0)
        setAudioCurrentTime(0)
      })
    }

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleAudioReset = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      setAudioCurrentTime(0)
      setAudioProgress(0)
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressBarRef.current) return
    const rect = progressBarRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    audioRef.current.currentTime = percentage * audioRef.current.duration
  }

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

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

  // Cropping handlers
  const handleStartCrop = () => {
    setIsCropping(true)
    setCrop(undefined)
    setCompletedCrop(undefined)
    setCropAspect(undefined)
  }

  const handleCancelCrop = () => {
    setIsCropping(false)
    setCrop(undefined)
    setCompletedCrop(undefined)
  }

  const handleSaveCrop = async () => {
    if (!completedCrop || !cropImageRef.current || !asset || !user) {
      console.log("Missing required data:", { completedCrop, cropImageRef: cropImageRef.current, asset, user })
      return
    }

    setIsSavingCrop(true)
    setError(null)

    try {
      const image = cropImageRef.current
      const canvas = document.createElement("canvas")
      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      canvas.width = completedCrop.width * scaleX
      canvas.height = completedCrop.height * scaleY

      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Could not get canvas context")

      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      )

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error("Failed to create blob"))
          },
          "image/png",
          1
        )
      })

      // Create file from blob - use original name
      const croppedFile = new File([blob], `${asset.name}.png`, { type: "image/png" })

      // Upload as new asset (gets a new ID automatically)
      const newAsset = await uploadAndCreateAsset(user.id, croppedFile, {
        projectId: asset.project_id || undefined,
        category: asset.category || undefined,
      })

      // Update with original metadata
      const updatedAsset = await updateAsset(newAsset.id, {
        user_description: asset.user_description,
        ai_prompt: asset.ai_prompt,
      })

      setIsCropping(false)
      setCrop(undefined)
      setCompletedCrop(undefined)

      // Close modal and notify parent to refresh the list
      onClose()
    } catch (err) {
      console.error("Error saving cropped image:", err)
      setError("Failed to save cropped image. Please try again.")
    } finally {
      setIsSavingCrop(false)
    }
  }

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
        animation: "json",  // Animation configs are JSON
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

  // Fullscreen asset view
  if (isFullscreen) {
    return (
      <div
        ref={fullscreenContainerRef}
        className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {asset.type === "image" && previewUrl && (
          <div
            className="w-full h-full flex items-center justify-center"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onDoubleClick={handleDoubleClick}
            style={{ cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
          >
            <img
              src={previewUrl}
              alt={asset.name}
              className="max-w-full max-h-full object-contain select-none"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transition: isPanning ? 'none' : 'transform 0.1s ease-out',
              }}
              draggable={false}
            />
          </div>
        )}
        {asset.type === "video" && previewUrl && (
          <video
            src={previewUrl}
            controls
            autoPlay
            className="max-w-full max-h-full object-contain"
          />
        )}
        {asset.type === "audio" && previewUrl && (
          <div className="flex flex-col items-center gap-8">
            {/* Large icon */}
            <div className="w-40 h-40 rounded-full bg-gradient-to-br from-violet-500/30 to-purple-600/30 flex items-center justify-center">
              {category === "music" && <Music className="w-20 h-20 text-violet-400" />}
              {category === "sound_effect" && <Waves className="w-20 h-20 text-violet-400" />}
              {category === "voice" && <Mic className="w-20 h-20 text-violet-400" />}
              {!category && <Volume2 className="w-20 h-20 text-violet-400" />}
            </div>
            {/* Track name */}
            <p className="text-xl font-medium text-zinc-200">{asset.name}</p>
            {/* Audio player card */}
            <div className="w-full max-w-md bg-zinc-900/80 rounded-2xl p-6 border border-zinc-700">
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={handleAudioReset}
                  className="w-10 h-10 rounded-lg flex items-center justify-center bg-zinc-700 text-zinc-400 hover:bg-zinc-600 hover:text-white transition-all"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={handleAudioPlayPause}
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center transition-all",
                    isPlaying
                      ? "bg-violet-500 text-white"
                      : "bg-zinc-700 text-zinc-300 hover:bg-violet-500 hover:text-white"
                  )}
                >
                  {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
                </button>
                <div className="flex-1 text-center">
                  <div className="text-lg text-zinc-200">
                    {formatTime(audioCurrentTime)} / {formatTime(audioDuration || asset.duration || 0)}
                  </div>
                </div>
              </div>
              <div
                ref={progressBarRef}
                onClick={handleProgressClick}
                className="h-2.5 bg-zinc-700 rounded-full cursor-pointer relative overflow-hidden"
              >
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all"
                  style={{ width: `${audioProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}
        {/* Zoom indicator */}
        {asset.type === "image" && zoom !== 1 && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-zinc-800/80 rounded-lg text-sm text-zinc-300">
            {Math.round(zoom * 100)}%
          </div>
        )}
        {/* Collapse button - bottom right */}
        <button
          onClick={() => setIsFullscreen(false)}
          className="absolute bottom-6 right-6 p-3 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl transition-colors"
          title="Exit fullscreen (double-click to reset zoom)"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      </div>
    )
  }

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
          <div className="flex items-center justify-between">
            <div className="w-8">
              {asset.type === "image" && previewUrl && !isCropping && (
                <button
                  onClick={handleStartCrop}
                  className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Crop image"
                >
                  <Crop className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <TypeIcon className={cn("w-5 h-5", TYPE_COLORS[asset.type].text)} />
              <h2 className="text-lg font-semibold text-zinc-100">Asset Details</h2>
            </div>
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Preview */}
          <div className="rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700">
            {asset.type === "image" && previewUrl && (
              <div className="relative">
                {isCropping ? (
                  <div className="p-4 space-y-4">
                    {/* Crop aspect ratio presets */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-zinc-400">Aspect:</span>
                      {CROP_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => setCropAspect(preset.value)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                            cropAspect === preset.value
                              ? cn(TYPE_COLORS[asset.type].bg, "text-white")
                              : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    {/* Cropper */}
                    <div className="flex justify-center bg-zinc-900 rounded-lg p-2">
                      <ReactCrop
                        crop={crop}
                        onChange={(c) => setCrop(c)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={cropAspect}
                      >
                        <img
                          ref={cropImageRef}
                          src={previewUrl}
                          alt={asset.name}
                          crossOrigin="anonymous"
                          className="max-h-[400px] object-contain"
                        />
                      </ReactCrop>
                    </div>
                    {/* Crop actions */}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleCancelCrop}
                        disabled={isSavingCrop}
                        className="px-4 py-2 rounded-lg text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveCrop}
                        disabled={!completedCrop || isSavingCrop}
                        className={cn(
                          "px-4 py-2 rounded-lg font-medium transition-all inline-flex items-center gap-2",
                          completedCrop && !isSavingCrop
                            ? cn(TYPE_COLORS[asset.type].gradient, "text-white hover:opacity-90")
                            : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                        )}
                      >
                        {isSavingCrop ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Save as New
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square w-full flex items-center justify-center">
                    <img
                      src={previewUrl}
                      alt={asset.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
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
              <div className="bg-gradient-to-br from-violet-500/10 to-purple-600/10">
                {/* Audio Card */}
                <div className="px-5 pb-5 pt-6 flex items-center gap-4">
                  {/* Reset button */}
                  <button
                    onClick={handleAudioReset}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 bg-zinc-700 text-zinc-400 hover:bg-zinc-600 hover:text-white"
                    title="Reset to start"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  {/* Play button */}
                  <button
                    onClick={handleAudioPlayPause}
                    className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center transition-all flex-shrink-0",
                      isPlaying
                        ? "bg-violet-500 text-white"
                        : "bg-zinc-700 text-zinc-300 hover:bg-violet-500 hover:text-white"
                    )}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-0.5" />
                    )}
                  </button>

                  {/* Track info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-zinc-200 mb-1">
                      {category === "music" && <Music className="w-4 h-4 text-violet-400" />}
                      {category === "sound_effect" && <Waves className="w-4 h-4 text-violet-400" />}
                      {category === "voice" && <Mic className="w-4 h-4 text-violet-400" />}
                      {!category && <Volume2 className="w-4 h-4 text-violet-400" />}
                      <span className="font-medium truncate">{asset.name}</span>
                    </div>
                    <div className="text-xs text-zinc-500">
                      {formatTime(audioCurrentTime)} / {formatTime(audioDuration || asset.duration || 0)}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="px-5 pb-5">
                  <div
                    ref={progressBarRef}
                    onClick={handleProgressClick}
                    className="h-2 bg-zinc-700 rounded-full cursor-pointer relative overflow-hidden"
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all"
                      style={{ width: `${audioProgress}%` }}
                    />
                    <div className="absolute inset-0 bg-violet-400/20 opacity-0 hover:opacity-100 transition-opacity rounded-full" />
                  </div>
                </div>
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
                className={cn(
                  "w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none transition-colors",
                  TYPE_COLORS[asset.type].focusBorder
                )}
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
                          ? cn(TYPE_COLORS[asset.type].border, TYPE_COLORS[asset.type].bgLight)
                          : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                      )}
                    >
                      {isSelected && (
                        <div className={cn("absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center", TYPE_COLORS[asset.type].bg)}>
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Icon className={cn(
                          "w-4 h-4",
                          isSelected ? TYPE_COLORS[asset.type].text : "text-zinc-400"
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
                className={cn(
                  "w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none transition-colors resize-none overflow-hidden min-h-[2.5rem]",
                  TYPE_COLORS[asset.type].focusBorder
                )}
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
                className={cn(
                  "w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none transition-colors resize-none overflow-hidden font-mono text-sm min-h-[2.5rem]",
                  TYPE_COLORS[asset.type].focusBorder
                )}
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
                  ? cn(TYPE_COLORS[asset.type].gradient, "text-white hover:opacity-90")
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
