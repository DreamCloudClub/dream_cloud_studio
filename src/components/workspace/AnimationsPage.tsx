import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { useWorkspaceStore } from "@/state/workspaceStore"
import { useAssetWizardStore } from "@/state/assetWizardStore"
import {
  Type,
  Hexagon,
  ArrowRightLeft,
  Subtitles,
  LayoutTemplate,
  Layers,
  Play,
  ChevronDown,
  ChevronRight,
  Search,
  Wand2,
  Trash2,
  AlertTriangle,
  FolderOpen,
  Clock,
  Edit3,
  X,
  ChevronLeft,
  Save,
  Loader2,
  Sparkles,
  MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getAssets, getAsset, createAsset, updateAsset, deleteAsset } from "@/services/assets"
import { Player } from "@remotion/player"
import { AnimationComposition } from "@/remotion/AnimationComposition"
import type { AnimationConfig } from "@/remotion/AnimationComposition"
import type { Asset } from "@/types/database"

// Animation categories
const ANIMATION_CATEGORIES = [
  { id: "text", label: "Text", icon: "Type" },
  { id: "logo", label: "Logo", icon: "Hexagon" },
  { id: "transition", label: "Transitions", icon: "ArrowRightLeft" },
  { id: "lower_third", label: "Lower Thirds", icon: "Subtitles" },
  { id: "title_card", label: "Title Cards", icon: "LayoutTemplate" },
  { id: "overlay", label: "Overlays", icon: "Layers" },
]

const iconMap: Record<string, React.ElementType> = {
  Type,
  Hexagon,
  ArrowRightLeft,
  Subtitles,
  LayoutTemplate,
  Layers,
}

type ViewMode = "library" | "editor"

interface CategorySectionProps {
  category: { id: string; label: string; icon: string }
  assets: Asset[]
  onDeleteAsset: (asset: Asset) => void
  onViewAsset: (asset: Asset) => void
}

function CategorySection({ category, assets, onDeleteAsset, onViewAsset }: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const Icon = iconMap[category.icon]

  if (assets.length === 0) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-400 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <Icon className="w-4 h-4" />
          <span className="text-sm font-medium">{category.label}</span>
          <span className="text-xs text-zinc-600">(0)</span>
        </button>

        {isExpanded && (
          <div className="ml-6 p-4 border border-dashed border-zinc-700/50 rounded-xl">
            <div className="flex items-center justify-center text-zinc-600">
              <Icon className="w-6 h-6" />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-zinc-300 hover:text-zinc-100 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <Icon className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-medium">{category.label}</span>
        <span className="text-xs text-zinc-500">({assets.length})</span>
      </button>

      {isExpanded && (
        <div className="ml-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {assets.map((asset) => (
            <AnimationCard
              key={asset.id}
              asset={asset}
              onDelete={() => onDeleteAsset(asset)}
              onViewDetails={() => onViewAsset(asset)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface AnimationCardProps {
  asset: Asset
  onDelete: () => void
  onViewDetails: () => void
}

function AnimationCard({ asset, onDelete, onViewDetails }: AnimationCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }

  return (
    <div
      onClick={onViewDetails}
      className="group bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-zinc-800 relative flex items-center justify-center">
        {/* Delete button - shows on hover */}
        <button
          onClick={handleDelete}
          className="absolute top-2 left-2 z-10 p-1.5 bg-zinc-900/80 hover:bg-orange-500 text-zinc-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
          title="Delete animation"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <Play className="w-10 h-10 text-zinc-600 group-hover:text-emerald-400 transition-colors" />

        {/* Duration badge */}
        {asset.duration && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-xs text-white flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {asset.duration}s
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-zinc-200 group-hover:text-emerald-400 transition-colors truncate">
          {asset.name}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5 capitalize">
          {asset.category?.replace("_", " ") || "Animation"}
        </p>
      </div>
    </div>
  )
}

export function AnimationsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { project } = useWorkspaceStore()
  const { animationConfig, setAnimationConfig } = useAssetWizardStore()

  // View mode: library or editor
  const [viewMode, setViewMode] = useState<ViewMode>("library")
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null)

  // Library state
  const [searchQuery, setSearchQuery] = useState("")
  const [animations, setAnimations] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; asset: Asset | null }>({
    isOpen: false,
    asset: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [previewModal, setPreviewModal] = useState<{ isOpen: boolean; asset: Asset | null }>({
    isOpen: false,
    asset: null,
  })

  // Editor state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<string>("text")
  const [isSaving, setIsSaving] = useState(false)
  const [existingAsset, setExistingAsset] = useState<Asset | null>(null)

  // Fetch animations
  const fetchAnimations = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const allAssets = await getAssets(user.id)
      // Filter to animation categories
      const animationAssets = allAssets.filter(
        (a) => a.category && ANIMATION_CATEGORIES.some((c) => c.id === a.category)
      )
      setAnimations(animationAssets)
    } catch (error) {
      console.error("Error fetching animations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAnimations()
  }, [user])

  // Load animation for editing
  const loadAnimationForEdit = async (assetId: string) => {
    try {
      const asset = await getAsset(assetId)
      if (asset) {
        setExistingAsset(asset)
        setName(asset.name)
        setDescription(asset.user_description || "")
        setCategory(asset.category || "text")

        // Load animation config from generation_settings
        const settings = asset.generation_settings as Record<string, unknown> | null
        if (settings?.animationConfig) {
          setAnimationConfig(settings.animationConfig as AnimationConfig)
        }
      }
    } catch (error) {
      console.error("Error loading animation:", error)
    }
  }

  // Switch to editor mode
  const openEditor = (assetId?: string) => {
    if (assetId) {
      setEditingAssetId(assetId)
      loadAnimationForEdit(assetId)
    } else {
      // New animation
      setEditingAssetId(null)
      setExistingAsset(null)
      setName("")
      setDescription("")
      setCategory("text")
      setAnimationConfig(null)
    }
    setViewMode("editor")
  }

  // Switch back to library
  const closeEditor = () => {
    setViewMode("library")
    setEditingAssetId(null)
    setExistingAsset(null)
    setAnimationConfig(null)
    fetchAnimations() // Refresh list
  }

  // Build composition props for the player
  const compositionProps = useMemo(() => {
    if (!animationConfig) return null

    return {
      segments: [
        {
          id: "preview",
          type: "animation" as const,
          config: animationConfig,
        },
      ],
      backgroundColor: animationConfig.background?.color || "#000000",
    }
  }, [animationConfig])

  const handleSave = async () => {
    if (!user || !name.trim()) return

    try {
      setIsSaving(true)

      const assetData = {
        user_id: user.id,
        project_id: project?.id || null,
        name: name.trim(),
        type: "video" as const,
        category: category as Asset["category"],
        user_description: description.trim() || null,
        duration: animationConfig?.duration || null,
        generation_settings: {
          animationConfig,
          generatedBy: "remotion",
        },
      }

      if (existingAsset) {
        await updateAsset(existingAsset.id, assetData)
      } else {
        await createAsset(assetData)
      }

      closeEditor()
    } catch (error) {
      console.error("Error saving animation:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteClick = (asset: Asset) => {
    setDeleteModal({ isOpen: true, asset })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal.asset) return

    setIsDeleting(true)
    try {
      await deleteAsset(deleteModal.asset.id)
      setAnimations((prev) => prev.filter((a) => a.id !== deleteModal.asset!.id))
      setDeleteModal({ isOpen: false, asset: null })
    } catch (error) {
      console.error("Error deleting animation:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, asset: null })
  }

  const handleViewDetails = (asset: Asset) => {
    setPreviewModal({ isOpen: true, asset })
  }

  // Filter animations
  let filteredAnimations = animations
  if (searchQuery) {
    filteredAnimations = filteredAnimations.filter((a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  // Group by category
  const animationsByCategory = ANIMATION_CATEGORIES.map((category) => ({
    category,
    assets: filteredAnimations.filter((a) => a.category === category.id),
  }))

  const canSave = name.trim().length > 0

  // EDITOR VIEW
  if (viewMode === "editor") {
    return (
      <div className="h-full flex flex-col">
        {/* Secondary Header */}
        <div className="h-[72px] border-b border-zinc-800 flex-shrink-0">
          <div className="h-full max-w-4xl mx-auto px-6 lg:px-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={closeEditor}
                className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Back</span>
              </button>
              <div className="h-6 w-px bg-zinc-800" />
              <h1 className="text-xl font-semibold text-zinc-100">
                {editingAssetId ? "Edit Animation" : "Create Animation"}
              </h1>
            </div>

            <button
              onClick={handleSave}
              disabled={!canSave || isSaving}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all",
                canSave && !isSaving
                  ? "bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 text-white hover:opacity-90"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              )}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Animation
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 py-8 space-y-6">
            {/* Name & Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Animation"
                  className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="text">Text</option>
                  <option value="logo">Logo</option>
                  <option value="transition">Transition</option>
                  <option value="lower_third">Lower Third</option>
                  <option value="title_card">Title Card</option>
                  <option value="overlay">Overlay</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this animation is for..."
                rows={2}
                className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            {/* Animation Preview */}
            <div className="aspect-video relative bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800">
              {compositionProps ? (
                <Player
                  component={AnimationComposition}
                  inputProps={compositionProps}
                  durationInFrames={Math.round((animationConfig?.duration || 4) * 30)}
                  fps={30}
                  compositionWidth={1920}
                  compositionHeight={1080}
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                  controls
                  autoPlay={false}
                  loop
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-zinc-500">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium text-zinc-400">No animation yet</p>
                    <p className="text-sm mt-2 max-w-sm mx-auto">
                      Use the chat panel on the left to describe your animation
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-zinc-800/50 rounded-lg text-zinc-400">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-sm">
                        Try: "Create a fade-in title that says Welcome"
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Animation Info */}
            {animationConfig && (
              <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-300">Animation Details</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {animationConfig.duration}s duration •{" "}
                      {animationConfig.layers.length} layer
                      {animationConfig.layers.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Layers</p>
                    <div className="flex flex-wrap gap-1 mt-1 justify-end">
                      {animationConfig.layers.map((layer, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-zinc-700/50 rounded text-xs text-zinc-400"
                        >
                          {layer.type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // LIBRARY VIEW
  return (
    <div className="h-full flex flex-col">
      {/* Secondary Header */}
      <div className="h-[72px] border-b border-zinc-800 flex-shrink-0">
        <div className="h-full max-w-4xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-zinc-100">Animations</h1>

          <button
            onClick={() => openEditor()}
            className="px-4 py-2 bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
          >
            <Wand2 className="w-4 h-4" />
            Create New
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 pt-10 pb-6 space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search animations..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Category Sections */}
              <div className="space-y-6">
                {animationsByCategory.map(({ category, assets }) => (
                  <CategorySection
                    key={category.id}
                    category={category}
                    assets={assets}
                    onDeleteAsset={handleDeleteClick}
                    onViewAsset={handleViewDetails}
                  />
                ))}
              </div>

              {/* Empty State */}
              {filteredAnimations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
                  <FolderOpen className="w-12 h-12 text-zinc-600 mb-3" />
                  <p className="text-zinc-500 text-sm text-center">
                    {searchQuery
                      ? `No animations matching "${searchQuery}"`
                      : "No animations yet. Create your first one!"}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => openEditor()}
                      className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-medium text-sm transition-colors inline-flex items-center gap-2"
                    >
                      <Wand2 className="w-4 h-4" />
                      Create Animation
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewModal.isOpen && previewModal.asset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setPreviewModal({ isOpen: false, asset: null })}
          />

          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl max-w-2xl w-full mx-4 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">
                  {previewModal.asset.name}
                </h3>
                <p className="text-sm text-zinc-500 capitalize">
                  {previewModal.asset.category?.replace("_", " ") || "Animation"}
                  {previewModal.asset.duration && ` · ${previewModal.asset.duration}s`}
                </p>
              </div>
              <button
                onClick={() => setPreviewModal({ isOpen: false, asset: null })}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Area */}
            <div className="aspect-video bg-black flex items-center justify-center">
              <Play className="w-16 h-16 text-zinc-600" />
            </div>

            {/* Description */}
            {previewModal.asset.user_description && (
              <div className="p-4 border-t border-zinc-800">
                <p className="text-sm text-zinc-400">
                  {previewModal.asset.user_description}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="p-4 border-t border-zinc-800 flex gap-3">
              <button
                onClick={() => {
                  openEditor(previewModal.asset!.id)
                  setPreviewModal({ isOpen: false, asset: null })
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-medium transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit Animation
              </button>
              <button
                onClick={() => {
                  setPreviewModal({ isOpen: false, asset: null })
                  handleDeleteClick(previewModal.asset!)
                }}
                className="p-2.5 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleDeleteCancel}
          />

          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-zinc-100">Delete Animation</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  Are you sure you want to delete{" "}
                  <span className="text-zinc-200 font-medium">
                    "{deleteModal.asset?.name}"
                  </span>
                  ? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
