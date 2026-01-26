import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Mountain,
  Square,
  User,
  Cloud,
  Box,
  Sparkles,
  Volume2,
  Plus,
  Play,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Upload,
  Wand2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useWorkspaceStore,
  ASSET_CATEGORIES,
  AssetCategory,
  ProjectAsset,
} from "@/state/workspaceStore"
import { useLibraryStore } from "@/state/libraryStore"

const iconMap: Record<string, React.ElementType> = {
  Mountain,
  Square,
  User,
  Cloud,
  Box,
  Sparkles,
  Volume2,
}

interface CategorySectionProps {
  category: { id: AssetCategory; label: string; icon: string }
  assets: ProjectAsset[]
  onAddToProject: (asset: ProjectAsset) => void
}

function CategorySection({ category, assets, onAddToProject }: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const Icon = iconMap[category.icon]

  if (assets.length === 0) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors"
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
          <div className="ml-6 p-4 border border-dashed border-zinc-700 rounded-xl">
            <div className="text-center text-zinc-500 text-sm">
              <p>No {category.label.toLowerCase()} in your library</p>
              <button className="mt-2 text-sky-400 hover:text-sky-300 inline-flex items-center gap-1">
                <Plus className="w-3 h-3" />
                Create New
              </button>
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
              onAddToProject={() => onAddToProject(asset)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface AssetCardProps {
  asset: ProjectAsset
  onAddToProject: () => void
}

function AssetCard({ asset, onAddToProject }: AssetCardProps) {
  const isVideo = asset.type === "video"
  const isAudio = asset.type === "audio"

  return (
    <div className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700 hover:border-sky-500/50 transition-colors cursor-pointer">
      {/* Thumbnail */}
      {isAudio ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-500/20 to-blue-600/20">
          <Volume2 className="w-8 h-8 text-sky-400" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-800">
          <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
            <Mountain className="w-8 h-8" />
          </div>
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
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
        <button
          onClick={onAddToProject}
          className="px-3 py-1.5 rounded-lg bg-sky-500 text-white text-xs font-medium hover:bg-sky-400 transition-colors"
        >
          Add to Project
        </button>
      </div>

      {/* Name overlay */}
      <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-xs text-white truncate">{asset.name}</p>
      </div>
    </div>
  )
}

export function AssetsPage() {
  const navigate = useNavigate()
  const { project, addAsset } = useWorkspaceStore()
  const { assets: libraryAssets } = useLibraryStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<"all" | "image" | "video" | "audio">("all")

  // Convert library assets to project asset format
  const allUserAssets: ProjectAsset[] = libraryAssets.map((a) => ({
    ...a,
    category: a.category as AssetCategory,
  }))

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

  // Group by category - filter out empty categories when a type filter is active
  const assetsByCategory = ASSET_CATEGORIES.map((category) => ({
    category,
    assets: filteredAssets.filter((a) => a.category === category.id),
  })).filter(({ assets }) => {
    // When filtering by type, hide empty categories
    if (selectedType !== "all" || searchQuery) {
      return assets.length > 0
    }
    // Show all categories when no filter is active
    return true
  })

  const handleAddToProject = (asset: ProjectAsset) => {
    // Check if already in project
    if (project?.assets.some((a) => a.id === asset.id)) {
      return // Already exists
    }
    addAsset({ ...asset, id: crypto.randomUUID() })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Asset Library</h1>
            <p className="text-zinc-400 mt-1">
              Browse all your assets • {libraryAssets.length} total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 font-medium text-sm transition-colors inline-flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload
            </button>
            <button
              onClick={() => navigate("/create/asset")}
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

        {/* Category Sections */}
        <div className="space-y-6">
          {assetsByCategory.map(({ category, assets }) => (
            <CategorySection
              key={category.id}
              category={category}
              assets={assets}
              onAddToProject={handleAddToProject}
            />
          ))}
        </div>

        {filteredAssets.length === 0 && (
          <div className="text-center py-16">
            <p className="text-zinc-500">
              {searchQuery
                ? `No assets matching "${searchQuery}"`
                : "No assets in your library yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
