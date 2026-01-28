import { useState, useEffect, useRef, useCallback } from "react"
import {
  Plus,
  Trash2,
  Loader2,
  X,
  ImagePlus,
  Upload,
  Layers,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkspaceStore } from "@/state/workspaceStore"
import { useAuth } from "@/contexts/AuthContext"
import {
  getStoryboardCards,
  createStoryboardCard,
  updateStoryboardCard,
  deleteStoryboardCard,
} from "@/services/storyboard"
import { getAssets, uploadAndCreateAsset } from "@/services/assets"
import { getAssetDisplayUrl } from "@/services/localStorage"
import type { StoryboardCard, Asset } from "@/types/database"

interface CardThumbnailProps {
  card: StoryboardCard
  displayNumber: number
  isSelected: boolean
  onClick: () => void
}

function CardThumbnail({ card, displayNumber, isSelected, onClick }: CardThumbnailProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all relative",
        isSelected
          ? "border-sky-500 ring-2 ring-sky-500/30"
          : "border-zinc-700 hover:border-zinc-500"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900">
        {card.thumbnail_url ? (
          <img
            src={card.thumbnail_url}
            alt={card.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-zinc-700">{displayNumber}</span>
          </div>
        )}
      </div>
      <div className="absolute top-1 left-1 w-5 h-5 rounded bg-black/70 flex items-center justify-center">
        <span className="text-[10px] text-white font-medium">{displayNumber}</span>
      </div>
    </button>
  )
}

// Image picker modal
interface ImagePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (url: string) => void
  projectId: string
}

function ImagePickerModal({ isOpen, onClose, onSelect, projectId }: ImagePickerModalProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<"library" | "upload">("library")
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    async function loadAssets() {
      if (!user || !isOpen) return
      setIsLoading(true)
      try {
        const allAssets = await getAssets(user.id)
        setAssets(allAssets.filter((a) => a.type === "image"))
      } catch (error) {
        console.error("Error loading assets:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadAssets()
  }, [user, isOpen])

  const handleSelectFromLibrary = () => {
    if (!selectedAssetId) return
    const asset = assets.find((a) => a.id === selectedAssetId)
    if (asset) {
      onSelect(getAssetDisplayUrl(asset))
      handleClose()
    }
  }

  const handleUpload = async () => {
    if (!user || !file) return
    setIsUploading(true)
    try {
      const asset = await uploadAndCreateAsset(user.id, file, {
        category: "scene",
        bucket: "project-assets",
        projectId,
      })
      onSelect(getAssetDisplayUrl(asset))
      handleClose()
    } catch (error) {
      console.error("Upload error:", error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setSelectedAssetId(null)
    setActiveTab("library")
    onClose()
  }

  const handleBrowse = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = (e) => {
      const selectedFile = (e.target as HTMLInputElement).files?.[0]
      if (selectedFile) setFile(selectedFile)
    }
    input.click()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Add Image</h2>
          <button onClick={handleClose} className="p-1 text-zinc-400 hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

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

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "library" ? (
            isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
              </div>
            ) : assets.length === 0 ? (
              <div className="text-center py-12">
                <Layers className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400 text-sm">No images in your library</p>
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
            )
          ) : (
            <div className="space-y-4">
              {!file ? (
                <div
                  onClick={handleBrowse}
                  className="border-2 border-dashed border-zinc-700 hover:border-zinc-600 rounded-xl p-8 text-center cursor-pointer"
                >
                  <Upload className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
                  <p className="text-zinc-300 font-medium mb-1">Drop your image here</p>
                  <p className="text-sm text-zinc-500">or click to browse</p>
                </div>
              ) : (
                <div className="bg-zinc-800/50 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-sky-500/20 flex items-center justify-center">
                    <ImagePlus className="w-6 h-6 text-sky-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-200 font-medium truncate">{file.name}</p>
                    <p className="text-xs text-zinc-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button onClick={() => setFile(null)} className="text-zinc-400 hover:text-zinc-200">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-zinc-800">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-zinc-300 hover:bg-zinc-800"
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
                  ? "bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white"
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
                  ? "bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white"
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

interface FullCardProps {
  card: StoryboardCard
  displayNumber: number
  onUpdate: (updates: Partial<StoryboardCard>) => void
  onDelete: () => void
  onAddImage: () => void
}

function FullCard({ card, displayNumber, onUpdate, onDelete, onAddImage }: FullCardProps) {
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description || "")
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  const autoResize = useCallback((textarea: HTMLTextAreaElement | null, minHeight: number = 80) => {
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`
    }
  }, [])

  useEffect(() => {
    setTitle(card.title)
    setDescription(card.description || "")
  }, [card])

  useEffect(() => {
    autoResize(titleRef.current, 42)
    autoResize(descriptionRef.current, 80)
  }, [title, description, autoResize])

  const handleTitleChange = (value: string) => {
    setTitle(value)
  }

  const handleTitleBlur = () => {
    if (title.trim() !== card.title) {
      onUpdate({ title: title.trim() || "Untitled" })
    }
  }

  const handleDescriptionChange = (value: string) => {
    setDescription(value)
  }

  const handleDescriptionBlur = () => {
    if (description !== (card.description || "")) {
      onUpdate({ description: description || null })
    }
  }

  return (
    <div className="relative bg-zinc-900/50 border border-zinc-800 rounded-2xl">
      {/* Card number - top left */}
      <div className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm">
        {displayNumber}
      </div>

      {/* Delete button - top right */}
      <button
        onClick={onDelete}
        className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-zinc-800/80 hover:bg-orange-500/20 flex items-center justify-center text-zinc-400 hover:text-orange-400 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Content - title sets the width, image and description align to it */}
      <div className="px-16 py-4 space-y-4">
        {/* Title */}
        <textarea
          ref={titleRef}
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="Card title..."
          rows={1}
          className="w-full text-lg font-semibold text-zinc-100 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500 resize-none overflow-hidden transition-colors"
        />

        {/* Image */}
        {card.thumbnail_url ? (
          <div className="relative group w-fit max-w-full mx-auto rounded-xl overflow-hidden border border-zinc-700">
            <img
              src={card.thumbnail_url}
              alt={card.title}
              className="max-w-[500px] max-h-[500px] w-auto h-auto"
            />
            <button
              onClick={onAddImage}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <span className="text-xs text-white font-medium">Change Image</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onAddImage}
            className="w-full h-48 border border-dashed border-zinc-700 hover:border-sky-500 rounded-xl flex flex-col items-center justify-center transition-colors"
          >
            <ImagePlus className="w-10 h-10 text-zinc-500 mb-2" />
            <span className="text-sky-400 text-sm">Add visual reference</span>
          </button>
        )}

        {/* Description */}
        <textarea
          ref={descriptionRef}
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          onBlur={handleDescriptionBlur}
          placeholder="Describe what happens in this scene..."
          className="w-full text-sm text-zinc-300 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500 resize-none overflow-hidden transition-colors min-h-[80px]"
        />
      </div>
    </div>
  )
}

export function StoryboardPage() {
  const { project } = useWorkspaceStore()
  const projectId = project?.id

  const [cards, setCards] = useState<StoryboardCard[]>([])
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showImagePicker, setShowImagePicker] = useState(false)

  // Load storyboard cards from database
  useEffect(() => {
    async function loadCards() {
      if (!projectId) {
        setIsLoading(false)
        return
      }

      try {
        const data = await getStoryboardCards(projectId)
        setCards(data)
        if (data.length > 0 && !selectedCardId) {
          setSelectedCardId(data[0].id)
        }
      } catch (error) {
        console.error("Error loading storyboard cards:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadCards()
  }, [projectId])

  const handleAddCard = async () => {
    if (!projectId) return

    try {
      const newCard = await createStoryboardCard({
        project_id: projectId,
        title: `Card ${cards.length + 1}`,
        description: "",
      })
      setCards((prev) => [...prev, newCard])
      setSelectedCardId(newCard.id)
    } catch (error) {
      console.error("Error creating card:", error)
    }
  }

  const handleUpdateCard = async (cardId: string, updates: Partial<StoryboardCard>) => {
    try {
      const updated = await updateStoryboardCard(cardId, updates)
      setCards((prev) => prev.map((c) => (c.id === cardId ? updated : c)))
    } catch (error) {
      console.error("Error updating card:", error)
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm("Delete this storyboard card?")) return

    try {
      await deleteStoryboardCard(cardId)
      setCards((prev) => prev.filter((c) => c.id !== cardId))
      if (selectedCardId === cardId) {
        const remaining = cards.filter((c) => c.id !== cardId)
        setSelectedCardId(remaining.length > 0 ? remaining[0].id : null)
      }
    } catch (error) {
      console.error("Error deleting card:", error)
    }
  }

  const handleImageSelect = async (url: string) => {
    if (!selectedCardId) return
    await handleUpdateCard(selectedCardId, { thumbnail_url: url })
    setShowImagePicker(false)
  }

  if (!project) return null

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    )
  }

  const sortedCards = [...cards].sort((a, b) => a.sort_order - b.sort_order)
  const selectedCardIndex = sortedCards.findIndex((c) => c.id === selectedCardId)
  const selectedCard = selectedCardIndex >= 0 ? sortedCards[selectedCardIndex] : null

  return (
    <div className="h-full flex flex-col">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 py-6 lg:py-8">
          {selectedCard ? (
            <FullCard
              card={selectedCard}
              displayNumber={selectedCardIndex + 1}
              onUpdate={(updates) => handleUpdateCard(selectedCard.id, updates)}
              onDelete={() => handleDeleteCard(selectedCard.id)}
              onAddImage={() => setShowImagePicker(true)}
            />
          ) : (
            <div className="text-center py-20">
              <Layers className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-500 mb-4">
                {cards.length === 0
                  ? "No storyboard cards yet"
                  : "Select a storyboard card below"}
              </p>
              <button
                onClick={handleAddCard}
                className="px-6 py-3 bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create First Card
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Timeline */}
      <div className="border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm px-4 py-2">
        <div className="overflow-x-auto">
          <div className="flex items-center justify-center gap-2 min-w-min">
            {sortedCards.map((card, index) => (
              <CardThumbnail
                key={card.id}
                card={card}
                displayNumber={index + 1}
                isSelected={card.id === selectedCardId}
                onClick={() => setSelectedCardId(card.id)}
              />
            ))}

            <button
              onClick={handleAddCard}
              className="flex-shrink-0 w-20 h-20 rounded-lg border-2 border-dashed border-zinc-700 hover:border-sky-500/50 flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-sky-400 transition-all hover:bg-sky-500/5"
            >
              <Plus className="w-5 h-5" />
              <span className="text-xs">Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Image Picker Modal */}
      {projectId && (
        <ImagePickerModal
          isOpen={showImagePicker}
          onClose={() => setShowImagePicker(false)}
          onSelect={handleImageSelect}
          projectId={projectId}
        />
      )}
    </div>
  )
}
