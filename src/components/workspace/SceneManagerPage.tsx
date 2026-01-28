import { useState, useRef, useEffect, useCallback } from "react"
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  GripVertical,
  Play,
  Wand2,
  X,
  FolderOpen,
  Upload,
  Volume2,
  Film,
  Image,
  Loader2,
  Check,
  Mountain,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useWorkspaceStore,
  Scene,
  Shot,
  ProjectAsset,
} from "@/state/workspaceStore"
import { getAssetDisplayUrl } from "@/services/localStorage"
import { useAuth } from "@/contexts/AuthContext"
import { getAssetsByType, uploadAndCreateAsset } from "@/services/assets"
import type { Asset, AssetType } from "@/types/database"

// Media types for a shot
const MEDIA_TYPES = [
  { id: "video", label: "Video", icon: Film },
  { id: "image", label: "Image", icon: Image },
  { id: "audio", label: "Audio", icon: Volume2 },
] as const

type MediaType = typeof MEDIA_TYPES[number]["id"]

// Simple 3-button action modal for adding media
interface MediaActionModalProps {
  isOpen: boolean
  onClose: () => void
  mediaType: MediaType
  onGenerate: () => void
  onSelectExisting: () => void
  onUpload: () => void
}

function MediaActionModal({ isOpen, onClose, mediaType, onGenerate, onSelectExisting, onUpload }: MediaActionModalProps) {
  if (!isOpen) return null

  const typeInfo = MEDIA_TYPES.find(t => t.id === mediaType)
  const label = typeInfo?.label || "Media"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Add {label}</h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Generate Button */}
          <button
            onClick={() => { onGenerate(); onClose(); }}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/30 hover:border-orange-500/50 transition-colors group"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
              <Wand2 className="w-6 h-6 text-orange-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-zinc-100">Generate</p>
              <p className="text-sm text-zinc-500">Create with AI</p>
            </div>
          </button>

          {/* Select Existing Button */}
          <button
            onClick={() => { onSelectExisting(); onClose(); }}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 transition-colors group"
          >
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center group-hover:bg-sky-500/30 transition-colors">
              <FolderOpen className="w-6 h-6 text-sky-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-zinc-100">Existing Asset</p>
              <p className="text-sm text-zinc-500">Choose from library</p>
            </div>
          </button>

          {/* Upload Button */}
          <button
            onClick={() => { onUpload(); onClose(); }}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 transition-colors group"
          >
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center group-hover:bg-sky-500/30 transition-colors">
              <Upload className="w-6 h-6 text-sky-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-zinc-100">Upload File</p>
              <p className="text-sm text-zinc-500">From your device</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// Asset picker modal for selecting existing assets
interface AssetPickerModalProps {
  isOpen: boolean
  onClose: () => void
  assetType: AssetType
  onSelect: (asset: Asset) => void
}

function AssetPickerModal({ isOpen, onClose, assetType, onSelect }: AssetPickerModalProps) {
  const { user } = useAuth()
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAssets() {
      if (!user || !isOpen) return
      setIsLoading(true)
      try {
        const filtered = await getAssetsByType(user.id, assetType)
        setAssets(filtered)
      } catch (err) {
        console.error("Error fetching assets:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAssets()
  }, [user, isOpen, assetType])

  const handleSelect = () => {
    if (!selectedAssetId) return
    const asset = assets.find((a) => a.id === selectedAssetId)
    if (asset) {
      onSelect(asset)
      onClose()
    }
  }

  if (!isOpen) return null

  const typeLabel = assetType === "video" ? "Videos" : assetType === "image" ? "Images" : "Audio"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Select {typeLabel}</h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-12">
              <Mountain className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">No {typeLabel.toLowerCase()} in your library</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {assets.map((asset) => (
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
                  {asset.type === "audio" ? (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                      <Volume2 className="w-8 h-8 text-zinc-500" />
                    </div>
                  ) : asset.type === "video" ? (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                      <Play className="w-8 h-8 text-zinc-500" />
                    </div>
                  ) : (asset.url || asset.local_path) ? (
                    <img
                      src={getAssetDisplayUrl(asset as any)}
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

        <div className="flex justify-end gap-3 p-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
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
        </div>
      </div>
    </div>
  )
}

// Media type slot component - square cards with previews
interface MediaTypeSlotProps {
  type: typeof MEDIA_TYPES[number]
  asset?: ProjectAsset
  onClick: () => void
  onRemove?: () => void
}

function MediaTypeSlot({ type, asset, onClick, onRemove }: MediaTypeSlotProps) {
  const Icon = type.icon
  const hasAsset = !!asset
  const assetUrl = asset ? getAssetDisplayUrl(asset) : null

  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={cn(
          "relative aspect-square rounded-xl border-2 overflow-hidden transition-all group w-full",
          hasAsset
            ? "border-sky-500/50 hover:border-sky-400"
            : "border-zinc-700/50 border-dashed hover:border-zinc-600 bg-zinc-800/30"
        )}
      >
        {hasAsset && assetUrl ? (
          // Show preview
          <>
            {asset.type === "video" ? (
              <>
                <video
                  src={assetUrl}
                  className="w-full h-full object-cover"
                  preload="metadata"
                  muted
                  playsInline
                />
                {/* Play icon overlay for videos */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                  </div>
                </div>
              </>
            ) : asset.type === "audio" ? (
              <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <Volume2 className="w-8 h-8 text-purple-400" />
              </div>
            ) : (
              <img
                src={assetUrl}
                alt={asset.name}
                className="w-full h-full object-cover"
              />
            )}
            {/* Overlay with name on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 inset-x-0 p-2">
                <p className="text-xs text-white truncate">{asset.name}</p>
              </div>
            </div>
            {/* Type badge */}
            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 text-[10px] font-medium text-white">
              {type.label}
            </div>
          </>
        ) : (
          // Empty state
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
            <div className="w-10 h-10 rounded-lg bg-zinc-700/50 flex items-center justify-center">
              <Icon className="w-5 h-5 text-zinc-500" />
            </div>
            <span className="text-xs text-zinc-500">{type.label}</span>
            <Plus className="w-4 h-4 text-zinc-600" />
          </div>
        )}
      </button>

      {/* Orange trash can - top right corner */}
      {hasAsset && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="absolute top-1 right-1 w-8 h-8 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 flex items-center justify-center text-orange-400 hover:text-orange-300 transition-colors z-10"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

interface ShotCardProps {
  shot: Shot
  sceneId: string
  isExpanded: boolean
  onToggle: () => void
  onDragStart: (e: React.DragEvent, shotId: string) => void
  onDragOver: (e: React.DragEvent, shotId: string) => void
  onDragEnd: () => void
  isDragging: boolean
  isDragOver: boolean
}

function ShotCard({ shot, sceneId, isExpanded, onToggle, onDragStart, onDragOver, onDragEnd, isDragging, isDragOver }: ShotCardProps) {
  const { user } = useAuth()
  const { updateShot, removeShot, startAssetCreation, project } = useWorkspaceStore()
  const [name, setName] = useState(shot.name)
  const [description, setDescription] = useState(shot.description)
  const [activeMediaModal, setActiveMediaModal] = useState<MediaType | null>(null)
  const [assetPickerType, setAssetPickerType] = useState<AssetType | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const nameRef = useRef<HTMLTextAreaElement>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)

  const autoResize = useCallback((textarea: HTMLTextAreaElement | null, minHeight: number = 32) => {
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`
    }
  }, [])

  useEffect(() => {
    setName(shot.name)
    setDescription(shot.description)
  }, [shot])

  useEffect(() => {
    if (isExpanded) {
      autoResize(nameRef.current, 32)
      autoResize(descRef.current, 60)
    }
  }, [name, description, isExpanded, autoResize])

  const handleNameBlur = () => {
    if (name.trim() !== shot.name) {
      updateShot(sceneId, shot.id, { name: name.trim() || "Untitled Shot" })
    }
  }

  const handleDescriptionBlur = () => {
    if (description !== shot.description) {
      updateShot(sceneId, shot.id, { description })
    }
  }

  const handleGenerate = () => {
    // Navigate to Assets tab in create mode with the type pre-selected
    if (activeMediaModal) {
      startAssetCreation(activeMediaModal as "image" | "video" | "audio")
    }
    setActiveMediaModal(null)
  }

  const handleSelectExisting = () => {
    // Open the asset picker modal
    if (activeMediaModal) {
      setAssetPickerType(activeMediaModal as AssetType)
    }
    setActiveMediaModal(null)
  }

  const handleUpload = () => {
    if (!user || !activeMediaModal) return

    // Create file input and trigger click
    const input = document.createElement("input")
    input.type = "file"

    // Set accept based on media type
    if (activeMediaModal === "video") {
      input.accept = "video/*"
    } else if (activeMediaModal === "image") {
      input.accept = "image/*"
    } else if (activeMediaModal === "audio") {
      input.accept = "audio/*"
    }

    const currentMediaType = activeMediaModal
    setActiveMediaModal(null)

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setIsUploading(true)
      try {
        const asset = await uploadAndCreateAsset(user.id, file, {
          projectId: project?.id,
          bucket: "project-assets",
        })

        // Link the asset to the shot based on type
        if (currentMediaType === "video") {
          updateShot(sceneId, shot.id, {
            videoAssetId: asset.id,
            videoAsset: {
              id: asset.id,
              name: asset.name,
              type: asset.type as "image" | "video" | "audio",
              category: (asset.category || "scene") as any,
              url: asset.url,
              localPath: asset.local_path,
              storageType: (asset.storage_type || "cloud") as "local" | "cloud",
              duration: asset.duration || undefined,
              createdAt: asset.created_at,
            },
          })
        } else if (currentMediaType === "image") {
          updateShot(sceneId, shot.id, {
            imageAssetId: asset.id,
            imageAsset: {
              id: asset.id,
              name: asset.name,
              type: asset.type as "image" | "video" | "audio",
              category: (asset.category || "scene") as any,
              url: asset.url,
              localPath: asset.local_path,
              storageType: (asset.storage_type || "cloud") as "local" | "cloud",
              duration: asset.duration || undefined,
              createdAt: asset.created_at,
            },
          })
        } else if (currentMediaType === "audio") {
          updateShot(sceneId, shot.id, {
            audioAssetId: asset.id,
            audioAsset: {
              id: asset.id,
              name: asset.name,
              type: asset.type as "image" | "video" | "audio",
              category: (asset.category || "audio") as any,
              url: asset.url,
              localPath: asset.local_path,
              storageType: (asset.storage_type || "cloud") as "local" | "cloud",
              duration: asset.duration || undefined,
              createdAt: asset.created_at,
            },
          })
        }
      } catch (err) {
        console.error("Upload failed:", err)
      } finally {
        setIsUploading(false)
      }
    }

    input.click()
  }

  const handleAssetSelected = (asset: Asset) => {
    if (!assetPickerType) return

    // Link the selected asset to the shot
    if (assetPickerType === "video") {
      updateShot(sceneId, shot.id, {
        videoAssetId: asset.id,
        videoAsset: {
          id: asset.id,
          name: asset.name,
          type: asset.type as "image" | "video" | "audio",
          category: (asset.category || "scene") as any,
          url: asset.url,
          localPath: asset.local_path,
          storageType: (asset.storage_type || "cloud") as "local" | "cloud",
          duration: asset.duration || undefined,
          createdAt: asset.created_at,
        },
      })
    } else if (assetPickerType === "image") {
      updateShot(sceneId, shot.id, {
        imageAssetId: asset.id,
        imageAsset: {
          id: asset.id,
          name: asset.name,
          type: asset.type as "image" | "video" | "audio",
          category: (asset.category || "scene") as any,
          url: asset.url,
          localPath: asset.local_path,
          storageType: (asset.storage_type || "cloud") as "local" | "cloud",
          duration: asset.duration || undefined,
          createdAt: asset.created_at,
        },
      })
    } else if (assetPickerType === "audio") {
      updateShot(sceneId, shot.id, {
        audioAssetId: asset.id,
        audioAsset: {
          id: asset.id,
          name: asset.name,
          type: asset.type as "image" | "video" | "audio",
          category: (asset.category || "audio") as any,
          url: asset.url,
          localPath: asset.local_path,
          storageType: (asset.storage_type || "cloud") as "local" | "cloud",
          duration: asset.duration || undefined,
          createdAt: asset.created_at,
        },
      })
    }

    setAssetPickerType(null)
  }

  // Get the asset for each media type
  const getAssetForType = (type: MediaType): ProjectAsset | undefined => {
    switch (type) {
      case "video":
        return shot.videoAsset ?? undefined
      case "image":
        return shot.imageAsset ?? undefined
      case "audio":
        return shot.audioAsset ?? undefined
      default:
        return undefined
    }
  }

  // Remove/unlink asset from shot
  const handleRemoveAsset = (type: MediaType) => {
    if (type === "video") {
      updateShot(sceneId, shot.id, { videoAssetId: null, videoAsset: null })
    } else if (type === "image") {
      updateShot(sceneId, shot.id, { imageAssetId: null, imageAsset: null })
    } else if (type === "audio") {
      updateShot(sceneId, shot.id, { audioAssetId: null, audioAsset: null })
    }
  }

  return (
    <div
      draggable={!isExpanded}
      onDragStart={(e) => !isExpanded && onDragStart(e, shot.id)}
      onDragOver={(e) => !isExpanded && onDragOver(e, shot.id)}
      onDragEnd={onDragEnd}
      className={cn(
        "relative bg-zinc-800/30 border rounded-xl overflow-hidden transition-all",
        isDragging ? "opacity-50 border-orange-500" : "border-zinc-700/50",
        isDragOver && !isDragging && "border-orange-400 border-dashed bg-orange-500/5"
      )}
    >
      {/* Shot Header */}
      <div className={cn(
        "flex gap-3 p-3",
        isExpanded ? "items-start" : "items-center"
      )}>
        <button
          onClick={onToggle}
          className={cn(
            "w-6 h-6 rounded-md bg-orange-500/20 flex items-center justify-center flex-shrink-0",
            isExpanded && "mt-1"
          )}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-orange-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-orange-400" />
          )}
        </button>
        {!isExpanded && (
          <div className="cursor-grab active:cursor-grabbing flex-shrink-0">
            <GripVertical className="w-4 h-4 text-zinc-600 hover:text-zinc-400" />
          </div>
        )}

        {isExpanded ? (
          // Editable fields when expanded
          <div className="flex-1">
            {/* Title Field */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Title</label>
              <textarea
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
                placeholder="Shot title..."
                rows={1}
                className="w-full text-sm font-medium text-zinc-200 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500 resize-none overflow-hidden transition-colors h-9"
              />
            </div>
          </div>
        ) : (
          // Clickable display when collapsed
          <button
            onClick={onToggle}
            className="flex-1 text-left hover:bg-zinc-800/50 -my-1 py-1 px-2 rounded-lg transition-colors"
          >
            <p className="text-sm font-medium text-zinc-200">{shot.name}</p>
            <p className="text-xs text-zinc-500 truncate">{shot.description}</p>
          </button>
        )}

        {/* Show linked asset thumbnail when collapsed */}
        {!isExpanded && (shot.imageAsset || shot.videoAsset || shot.audioAsset || shot.media) && (
          <div className="w-10 h-10 rounded-lg bg-zinc-700 overflow-hidden flex-shrink-0 relative">
            {shot.videoAsset ? (
              <>
                <video
                  src={getAssetDisplayUrl(shot.videoAsset)}
                  className="w-full h-full object-cover"
                  preload="metadata"
                  muted
                  playsInline
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="w-3 h-3 text-white fill-white" />
                </div>
              </>
            ) : shot.imageAsset ? (
              <img
                src={getAssetDisplayUrl(shot.imageAsset)}
                alt={shot.imageAsset.name}
                className="w-full h-full object-cover"
              />
            ) : shot.media?.type === "video" ? (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                <Play className="w-4 h-4 text-zinc-500" />
              </div>
            ) : shot.media?.url ? (
              <img
                src={shot.media.url}
                alt="Shot media"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800" />
            )}
          </div>
        )}

        {/* Delete button */}
        <button
          onClick={() => removeShot(sceneId, shot.id)}
          className={cn(
            "w-8 h-8 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 flex items-center justify-center text-orange-400 hover:text-orange-300 transition-colors flex-shrink-0",
            isExpanded && "mt-0.5"
          )}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 border-t border-zinc-700/50 space-y-4">
          {/* Description */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Description</label>
            <textarea
              ref={descRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder="Describe what happens in this shot..."
              className="w-full text-sm text-zinc-300 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500 resize-none overflow-hidden transition-colors min-h-[60px]"
            />
          </div>

          {/* Media Types */}
          <div>
            <label className="block text-xs text-zinc-500 mb-2">Media</label>
            <div className="grid grid-cols-3 gap-3 pt-1">
              {MEDIA_TYPES.map((type) => (
                <MediaTypeSlot
                  key={type.id}
                  type={type}
                  asset={getAssetForType(type.id)}
                  onClick={() => setActiveMediaModal(type.id)}
                  onRemove={() => handleRemoveAsset(type.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Media Action Modal */}
      {activeMediaModal && (
        <MediaActionModal
          isOpen={true}
          onClose={() => setActiveMediaModal(null)}
          mediaType={activeMediaModal}
          onGenerate={handleGenerate}
          onSelectExisting={handleSelectExisting}
          onUpload={handleUpload}
        />
      )}

      {/* Asset Picker Modal */}
      {assetPickerType && (
        <AssetPickerModal
          isOpen={true}
          onClose={() => setAssetPickerType(null)}
          assetType={assetPickerType}
          onSelect={handleAssetSelected}
        />
      )}

      {/* Upload indicator */}
      {isUploading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
          <div className="flex items-center gap-2 text-white">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Uploading...</span>
          </div>
        </div>
      )}
    </div>
  )
}

interface SceneSectionProps {
  scene: Scene
  onDragStart: (e: React.DragEvent, sceneId: string) => void
  onDragOver: (e: React.DragEvent, sceneId: string) => void
  onDragEnd: () => void
  isDragging: boolean
  isDragOver: boolean
}

function SceneSection({ scene, onDragStart, onDragOver, onDragEnd, isDragging, isDragOver }: SceneSectionProps) {
  const { expandedSceneIds, toggleSceneExpanded, removeScene, addShot, updateScene, reorderShots } = useWorkspaceStore()
  const [expandedShots, setExpandedShots] = useState<string[]>([])
  const [name, setName] = useState(scene.name)
  const [description, setDescription] = useState(scene.description)
  const [draggingShotId, setDraggingShotId] = useState<string | null>(null)
  const [dragOverShotId, setDragOverShotId] = useState<string | null>(null)
  const nameRef = useRef<HTMLTextAreaElement>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)

  const isExpanded = expandedSceneIds.includes(scene.id)

  const autoResize = useCallback((textarea: HTMLTextAreaElement | null, minHeight: number = 32) => {
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`
    }
  }, [])

  useEffect(() => {
    setName(scene.name)
    setDescription(scene.description)
  }, [scene])

  useEffect(() => {
    if (isExpanded) {
      autoResize(nameRef.current, 36)
      autoResize(descRef.current, 60)
    }
  }, [name, description, isExpanded, autoResize])

  const toggleShot = (shotId: string) => {
    if (expandedShots.includes(shotId)) {
      setExpandedShots(expandedShots.filter((id) => id !== shotId))
    } else {
      setExpandedShots([...expandedShots, shotId])
    }
  }

  const handleNameBlur = () => {
    if (name.trim() !== scene.name) {
      updateScene(scene.id, { name: name.trim() || "Untitled Scene" })
    }
  }

  const handleDescriptionBlur = () => {
    if (description !== scene.description) {
      updateScene(scene.id, { description })
    }
  }

  const handleAddShot = () => {
    const newShot: Omit<Shot, "id"> = {
      name: `Shot ${scene.shots.length + 1}`,
      description: "New shot",
      duration: 3,
      order: scene.shots.length,
      assets: {
        characters: [],
        props: [],
        effects: [],
      },
      notes: "",
    }
    addShot(scene.id, newShot)
  }

  // Drag and drop handlers for shots
  const handleDragStart = (e: React.DragEvent, shotId: string) => {
    setDraggingShotId(shotId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, shotId: string) => {
    e.preventDefault()
    if (shotId !== draggingShotId) {
      setDragOverShotId(shotId)
    }
  }

  const handleDragEnd = () => {
    if (draggingShotId && dragOverShotId && draggingShotId !== dragOverShotId) {
      // Get current order of shots
      const sortedShots = [...scene.shots].sort((a, b) => a.order - b.order)
      const shotIds = sortedShots.map(s => s.id)

      // Find positions
      const fromIndex = shotIds.indexOf(draggingShotId)
      const toIndex = shotIds.indexOf(dragOverShotId)

      // Reorder
      shotIds.splice(fromIndex, 1)
      shotIds.splice(toIndex, 0, draggingShotId)

      // Save new order
      reorderShots(scene.id, shotIds)
    }
    setDraggingShotId(null)
    setDragOverShotId(null)
  }

  const sceneDuration = scene.shots.reduce((acc, s) => acc + s.duration, 0)

  return (
    <div
      draggable={!isExpanded}
      onDragStart={(e) => !isExpanded && onDragStart(e, scene.id)}
      onDragOver={(e) => !isExpanded && onDragOver(e, scene.id)}
      onDragEnd={onDragEnd}
      className={cn(
        "border rounded-2xl overflow-hidden transition-all",
        isDragging ? "opacity-50 border-sky-500" : "border-sky-500/30",
        isDragOver && !isDragging && "border-sky-400 border-dashed bg-sky-500/5"
      )}
    >
      {/* Scene Header */}
      <div className={cn(
        "flex gap-3 p-4 bg-sky-500/5",
        isExpanded ? "items-start" : "items-center"
      )}>
        {!isExpanded && (
          <div className="cursor-grab active:cursor-grabbing flex-shrink-0">
            <GripVertical className="w-5 h-5 text-zinc-600 hover:text-zinc-400" />
          </div>
        )}
        <button
          onClick={() => toggleSceneExpanded(scene.id)}
          className={cn(
            "w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center flex-shrink-0",
            isExpanded && "mt-1"
          )}
        >
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-sky-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-sky-400" />
          )}
        </button>

        {isExpanded ? (
          // Editable name and description when expanded
          <div className="flex-1 space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Title</label>
              <textarea
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
                placeholder="Scene title..."
                rows={1}
                className="w-full text-base font-semibold text-zinc-100 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500 resize-none overflow-hidden transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Description</label>
              <textarea
                ref={descRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder="Describe this scene..."
                className="w-full text-sm text-zinc-400 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500 resize-none overflow-hidden transition-colors min-h-[60px]"
              />
            </div>
          </div>
        ) : (
          // Clickable display when collapsed
          <button
            onClick={() => toggleSceneExpanded(scene.id)}
            className="flex-1 text-left hover:bg-sky-500/10 -my-2 py-2 px-2 rounded-lg transition-colors"
          >
            <h3 className="text-base font-semibold text-zinc-100">{scene.name}</h3>
            <p className="text-sm text-zinc-500">{scene.description}</p>
          </button>
        )}

        <div className={cn(
          "flex items-center gap-4 text-sm text-zinc-400 flex-shrink-0",
          isExpanded && "mt-2"
        )}>
          <span>{scene.shots.length} shots</span>
          <span>{sceneDuration}s</span>
        </div>
        {/* Delete button - top right */}
        <button
          onClick={() => removeScene(scene.id)}
          className={cn(
            "w-9 h-9 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 flex items-center justify-center text-orange-400 hover:text-orange-300 transition-colors flex-shrink-0",
            isExpanded && "mt-1"
          )}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-3 bg-zinc-900/50">
          {/* Voiceover Section */}
          {scene.voiceover && (
            <div className="p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                <Volume2 className="w-4 h-4 text-sky-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-zinc-500 mb-1">Scene Voiceover</p>
                <p className="text-sm text-zinc-300 italic">
                  "{scene.voiceover.script}"
                </p>
              </div>
              {scene.voiceover.duration && (
                <span className="text-xs text-zinc-500">
                  {scene.voiceover.duration}s
                </span>
              )}
            </div>
          )}

          {/* Shots List */}
          <div className="space-y-2">
            {scene.shots
              .sort((a, b) => a.order - b.order)
              .map((shot) => (
                <ShotCard
                  key={shot.id}
                  shot={shot}
                  sceneId={scene.id}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  isDragging={draggingShotId === shot.id}
                  isDragOver={dragOverShotId === shot.id}
                  isExpanded={expandedShots.includes(shot.id)}
                  onToggle={() => toggleShot(shot.id)}
                />
              ))}
          </div>

          {/* Add Shot Button */}
          <button
            onClick={handleAddShot}
            className="w-full py-3 border-2 border-dashed border-orange-500/30 hover:border-orange-500/60 rounded-xl flex items-center justify-center gap-2 text-orange-500/60 hover:text-orange-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Add Shot</span>
          </button>
        </div>
      )}
    </div>
  )
}

export function SceneManagerPage() {
  const { project, addScene, reorderScenes } = useWorkspaceStore()

  const [draggingSceneId, setDraggingSceneId] = useState<string | null>(null)
  const [dragOverSceneId, setDragOverSceneId] = useState<string | null>(null)

  if (!project) return null

  const { scenes } = project

  // Drag and drop handlers for scenes
  const handleSceneDragStart = (e: React.DragEvent, sceneId: string) => {
    setDraggingSceneId(sceneId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleSceneDragOver = (e: React.DragEvent, sceneId: string) => {
    e.preventDefault()
    if (sceneId !== draggingSceneId) {
      setDragOverSceneId(sceneId)
    }
  }

  const handleSceneDragEnd = () => {
    if (draggingSceneId && dragOverSceneId && draggingSceneId !== dragOverSceneId) {
      const sortedScenes = [...scenes].sort((a, b) => a.order - b.order)
      const sceneIds = sortedScenes.map(s => s.id)
      const fromIndex = sceneIds.indexOf(draggingSceneId)
      const toIndex = sceneIds.indexOf(dragOverSceneId)
      sceneIds.splice(fromIndex, 1)
      sceneIds.splice(toIndex, 0, draggingSceneId)
      reorderScenes(sceneIds)
    }
    setDraggingSceneId(null)
    setDragOverSceneId(null)
  }

  const handleAddScene = () => {
    const newScene: Scene = {
      id: crypto.randomUUID(),
      name: `Scene ${scenes.length + 1}`,
      description: "New scene",
      order: scenes.length,
      shots: [],
    }
    addScene(newScene)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Scene Manager</h1>
            <p className="text-zinc-400 mt-1">
              {scenes.length} scenes • {scenes.reduce((acc, s) => acc + s.shots.length, 0)} total shots
            </p>
          </div>
          <button
            onClick={handleAddScene}
            className="px-4 py-2 bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Scene
          </button>
        </div>

        {/* Scenes List */}
        <div className="space-y-4">
          {scenes
            .sort((a, b) => a.order - b.order)
            .map((scene) => (
              <SceneSection
                key={scene.id}
                scene={scene}
                onDragStart={handleSceneDragStart}
                onDragOver={handleSceneDragOver}
                onDragEnd={handleSceneDragEnd}
                isDragging={draggingSceneId === scene.id}
                isDragOver={dragOverSceneId === scene.id}
              />
            ))}
        </div>

        {scenes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
            <FolderOpen className="w-12 h-12 text-zinc-600 mb-3" />
            <p className="text-zinc-500 text-sm text-center mb-4">No scenes yet</p>
            <button
              onClick={handleAddScene}
              className="px-4 py-2 bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 rounded-lg text-white font-medium text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Scene
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
