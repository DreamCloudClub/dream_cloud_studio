import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LibraryLayout } from "@/components/library"
import { useAuth } from "@/contexts/AuthContext"
import { getAssets, deleteAsset } from "@/services/assets"
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

export function AnimationLibrary() {
  const navigate = useNavigate()
  const { user } = useAuth()
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

  return (
    <LibraryLayout libraryPage="assets">
      <div className="h-full flex flex-col">
        {/* Secondary Header */}
        <div className="h-[72px] border-b border-zinc-800 flex-shrink-0">
          <div className="h-full max-w-4xl mx-auto px-6 lg:px-8 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-zinc-100">Animations</h1>

            <button
              onClick={() => navigate("/animations/new")}
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
                        onClick={() => navigate("/animations/new")}
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
                    navigate(`/animations/${previewModal.asset!.id}`)
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
    </LibraryLayout>
  )
}
