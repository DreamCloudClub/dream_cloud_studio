import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import {
  Mountain,
  Square,
  User,
  Cloud,
  Box,
  Sparkles,
  Music,
  Waves,
  Mic,
  Plus,
  Play,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Upload,
  Wand2,
  FolderOpen,
  ArrowLeft,
  Loader2,
  Trash2,
  AlertTriangle,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkspaceStore } from "@/state/workspaceStore"
import { useAssetWizardStore, ASSET_WIZARD_STEPS } from "@/state/assetWizardStore"
import { getAssets, deleteAsset } from "@/services/assets"
import { getAssetDisplayUrl } from "@/services/localStorage"
import { AssetDetailsModal, UploadAssetModal } from "@/components/library"
import {
  TypeStep,
  CategoryStep,
  PromptAndGenerateStep,
  ReviewStep,
} from "@/components/create-asset"
import type { Asset, AssetType, AssetCategory, VisualAssetCategory, AudioAssetCategory } from "@/types/database"

// Visual categories for Image and Video assets
const VISUAL_CATEGORIES: { id: VisualAssetCategory; label: string; icon: string }[] = [
  { id: "scene", label: "Scenes", icon: "Mountain" },
  { id: "stage", label: "Stages", icon: "Square" },
  { id: "character", label: "Characters", icon: "User" },
  { id: "weather", label: "Weather", icon: "Cloud" },
  { id: "prop", label: "Props", icon: "Box" },
  { id: "effect", label: "Effects", icon: "Sparkles" },
]

// Audio categories for Audio assets
const AUDIO_CATEGORIES: { id: AudioAssetCategory; label: string; icon: string }[] = [
  { id: "music", label: "Music", icon: "Music" },
  { id: "sound_effect", label: "Sound Effects", icon: "Waves" },
  { id: "voice", label: "Voice", icon: "Mic" },
]

// All categories combined
const ALL_CATEGORIES: { id: AssetCategory; label: string; icon: string }[] = [
  ...VISUAL_CATEGORIES,
  ...AUDIO_CATEGORIES,
]

const iconMap: Record<string, React.ElementType> = {
  Mountain,
  Square,
  User,
  Cloud,
  Box,
  Sparkles,
  Music,
  Waves,
  Mic,
}

interface CategorySectionProps {
  category: { id: AssetCategory; label: string; icon: string }
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
        <Icon className="w-4 h-4 text-sky-400" />
        <span className="text-sm font-medium">{category.label}</span>
        <span className="text-xs text-zinc-500">({assets.length})</span>
      </button>

      {isExpanded && (
        <div className="ml-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {assets.map((asset) => (
            <AssetCard
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

interface AssetCardProps {
  asset: Asset
  onDelete: () => void
  onViewDetails: () => void
}

function AssetCard({ asset, onDelete, onViewDetails }: AssetCardProps) {
  const isVideo = asset.type === "video"
  const isAudio = asset.type === "audio"

  // Get the display URL for this asset (handles local vs cloud storage)
  const displayUrl = getAssetDisplayUrl(asset)

  // Get the appropriate icon for audio assets based on category
  const getAudioIcon = () => {
    switch (asset.category) {
      case "music":
        return <Music className="w-8 h-8 text-zinc-600" />
      case "sound_effect":
        return <Waves className="w-8 h-8 text-zinc-600" />
      case "voice":
        return <Mic className="w-8 h-8 text-zinc-600" />
      default:
        return <Music className="w-8 h-8 text-zinc-600" />
    }
  }

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
      <div className="aspect-square bg-zinc-800 relative">
        {/* Delete button - shows on hover */}
        <button
          onClick={handleDelete}
          className="absolute top-2 left-2 z-10 p-1.5 bg-zinc-900/80 hover:bg-orange-500 text-zinc-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
          title="Delete asset"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {isAudio ? (
          <div className="absolute inset-0 flex items-center justify-center">
            {getAudioIcon()}
          </div>
        ) : isVideo && displayUrl ? (
          <video
            src={displayUrl}
            className="absolute inset-0 w-full h-full object-cover"
            preload="metadata"
            muted
            playsInline
          />
        ) : displayUrl ? (
          <img
            src={displayUrl}
            alt={asset.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Mountain className="w-8 h-8 text-zinc-700" />
          </div>
        )}

        {/* Video indicator */}
        {isVideo && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
            <Play className="w-3 h-3 text-white fill-white" />
          </div>
        )}

        {/* Duration badge */}
        {asset.duration && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-xs text-white">
            {asset.duration >= 60
              ? `${Math.floor(asset.duration / 60)}:${String(asset.duration % 60).padStart(2, "0")}`
              : `${asset.duration}s`}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-zinc-200 group-hover:text-sky-400 transition-colors truncate">{asset.name}</p>
        <p className="text-xs text-zinc-500 mt-0.5">
          <span className="capitalize">{asset.type}</span>
          {asset.category && <> · <span className="capitalize">{asset.category.replace('_', ' ')}</span></>}
        </p>
      </div>
    </div>
  )
}

// Asset Creation Wizard embedded in workspace
function AssetCreationWizard({
  onBack,
  onComplete,
  initialType
}: {
  onBack: () => void
  onComplete: () => void
  initialType?: "image" | "video" | "audio" | "animation" | null
}) {
  const { currentStep, resetWizard, initWithType } = useAssetWizardStore()
  const hasInitialized = useRef(false)

  // Reset wizard and optionally skip to category step if type is pre-selected
  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    if (initialType) {
      // Skip type step - init with type and start at category
      initWithType(initialType)
    } else {
      // Normal flow - start from beginning
      resetWizard()
    }
  }, [resetWizard, initWithType, initialType])

  const handleComplete = () => {
    onComplete()
    onBack()
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case "type":
        return <TypeStep />
      case "category":
        return <CategoryStep />
      case "prompt":
        return <PromptAndGenerateStep />
      case "review":
        return <ReviewStep onComplete={handleComplete} />
      default:
        return <TypeStep />
    }
  }

  const handleBack = () => {
    resetWizard()
    onBack()
  }

  const currentIndex = ASSET_WIZARD_STEPS.findIndex((s) => s.id === currentStep)

  return (
    <div className="h-full flex flex-col">
      {/* Header with Steps */}
      <div className="px-6 lg:px-8 py-4 border-b border-zinc-800 flex items-center">
        {/* Back Button - Left */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Assets</span>
        </button>

        {/* Step Timeline - Centered */}
        <div className="flex-1 flex items-center justify-center gap-1">
          {ASSET_WIZARD_STEPS.map((step, index) => {
            const isActive = step.id === currentStep
            const isCompleted = index < currentIndex

            return (
              <div key={step.id} className="flex items-center">
                {/* Step indicator */}
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                      isActive
                        ? "bg-sky-500 text-white"
                        : isCompleted
                          ? "bg-sky-500/20 text-sky-400"
                          : "bg-zinc-800 text-zinc-500"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium hidden sm:block",
                      isActive
                        ? "text-sky-400"
                        : isCompleted
                          ? "text-zinc-400"
                          : "text-zinc-600"
                    )}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector line */}
                {index < ASSET_WIZARD_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "w-6 sm:w-10 h-0.5 mx-2",
                      index < currentIndex ? "bg-sky-500/50" : "bg-zinc-800"
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Spacer to balance the back button */}
        <div className="w-[120px] flex-shrink-0" />
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto">
        {renderStepContent()}
      </div>
    </div>
  )
}

export function AssetsPage() {
  const { user } = useAuth()
  const { project, assetCreationMode, assetCreationType, clearAssetCreationMode } = useWorkspaceStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<"all" | AssetType>("all")
  const [isCreating, setIsCreating] = useState(false)
  const [creationInitialType, setCreationInitialType] = useState<"image" | "video" | "audio" | "animation" | null>(null)
  const [allUserAssets, setAllUserAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; asset: Asset | null }>({
    isOpen: false,
    asset: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [detailsModal, setDetailsModal] = useState<{ isOpen: boolean; asset: Asset | null }>({
    isOpen: false,
    asset: null,
  })

  // Check if we should start in creation mode (e.g., from Scene Manager's Generate button)
  useEffect(() => {
    if (assetCreationMode) {
      // Capture the type before clearing (so we can skip to category step)
      setCreationInitialType(assetCreationType)
      setIsCreating(true)
      clearAssetCreationMode()
    }
  }, [assetCreationMode, assetCreationType, clearAssetCreationMode])

  // Fetch assets from Supabase
  const fetchAssets = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const data = await getAssets(user.id)
      setAllUserAssets(data)
    } catch (error) {
      console.error("Error fetching assets:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAssets()
  }, [user])

  const handleDeleteClick = (asset: Asset) => {
    setDeleteModal({ isOpen: true, asset })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal.asset) return

    setIsDeleting(true)
    try {
      await deleteAsset(deleteModal.asset.id)
      // Remove from local state
      setAllUserAssets(prev => prev.filter(a => a.id !== deleteModal.asset!.id))
      setDeleteModal({ isOpen: false, asset: null })
    } catch (error) {
      console.error("Error deleting asset:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, asset: null })
  }

  const handleViewDetails = (asset: Asset) => {
    setDetailsModal({ isOpen: true, asset })
  }

  const handleAssetUpdate = (updatedAsset: Asset) => {
    setAllUserAssets(prev =>
      prev.map(a => a.id === updatedAsset.id ? updatedAsset : a)
    )
    // Update the details modal with the new asset data
    setDetailsModal(prev => ({ ...prev, asset: updatedAsset }))
  }

  const handleAssetDeleteFromDetails = (assetId: string) => {
    setAllUserAssets(prev => prev.filter(a => a.id !== assetId))
  }

  // Filter assets
  let filteredAssets = allUserAssets
  if (searchQuery) {
    filteredAssets = filteredAssets.filter((a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }
  if (selectedType !== "all") {
    filteredAssets = filteredAssets.filter((a) => a.type === selectedType)
  }

  // Get relevant categories based on type filter
  const relevantCategories = selectedType === "all"
    ? ALL_CATEGORIES
    : selectedType === "audio"
      ? AUDIO_CATEGORIES
      : VISUAL_CATEGORIES

  // Group by category
  const assetsByCategory = relevantCategories.map((category) => ({
    category,
    assets: filteredAssets.filter((a) => a.category === category.id),
  }))

  // Reload assets after creating
  const handleCreationComplete = () => {
    fetchAssets()
  }

  // Show creation wizard if in create mode
  if (isCreating) {
    return (
      <AssetCreationWizard
        onBack={() => {
          setIsCreating(false)
          setCreationInitialType(null)
        }}
        onComplete={handleCreationComplete}
        initialType={creationInitialType}
      />
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Asset Library</h1>
            <p className="text-zinc-400 mt-1">
              Browse all your assets · {allUserAssets.length} total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 font-medium text-sm transition-colors inline-flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            >
              <Wand2 className="w-4 h-4" />
              Generate
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <div className="flex items-center bg-zinc-800/50 rounded-xl p-1">
              {(["all", "image", "video", "audio"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    selectedType === type
                      ? "bg-sky-500 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
          </div>
        )}

        {/* Category Sections */}
        {!isLoading && (
          <div className="space-y-6">
            {assetsByCategory.map(({ category, assets }) => (
              <CategorySection
                key={category.id}
                category={category}
                assets={assets}
                onDeleteAsset={handleDeleteClick}
                onViewAsset={handleViewDetails}
              />
            ))}
          </div>
        )}

        {!isLoading && filteredAssets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
            <FolderOpen className="w-12 h-12 text-zinc-600 mb-3" />
            <p className="text-zinc-500 text-sm text-center">
              {searchQuery
                ? `No assets matching "${searchQuery}"`
                : "No assets in your library yet"}
            </p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadAssetModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={fetchAssets}
      />

      {/* Asset Details Modal */}
      <AssetDetailsModal
        isOpen={detailsModal.isOpen}
        asset={detailsModal.asset}
        onClose={() => setDetailsModal({ isOpen: false, asset: null })}
        onUpdate={handleAssetUpdate}
        onDelete={handleAssetDeleteFromDetails}
      />

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleDeleteCancel}
          />

          {/* Modal */}
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-zinc-100">
                  Delete Asset
                </h3>
                <p className="text-sm text-zinc-400 mt-1">
                  Are you sure you want to delete <span className="text-zinc-200 font-medium">"{deleteModal.asset?.name}"</span>? This action cannot be undone.
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
