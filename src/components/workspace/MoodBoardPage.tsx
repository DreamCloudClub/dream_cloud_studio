import { useState } from "react"
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
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useWorkspaceStore,
  ASSET_CATEGORIES,
  AssetCategory,
  ProjectAsset,
} from "@/state/workspaceStore"

const iconMap: Record<string, React.ElementType> = {
  Mountain,
  Square,
  User,
  Cloud,
  Box,
  Sparkles,
  Volume2,
}

// Helper to get singular form of category label
function getSingular(label: string): string {
  if (label === "Audio") return "Audio"
  if (label.endsWith("s")) return label.slice(0, -1)
  return label
}

interface CategorySectionProps {
  category: { id: AssetCategory; label: string; icon: string }
  assets: ProjectAsset[]
}

function CategorySection({ category, assets }: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const Icon = iconMap[category.icon]

  if (assets.length === 0) {
    return (
      <div className="space-y-3">
        {/* Category Header */}
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
              <p>No {category.label.toLowerCase()} assets yet</p>
              <button className="mt-2 text-sky-400 hover:text-sky-300 inline-flex items-center gap-1">
                <Plus className="w-3 h-3" />
                Add {getSingular(category.label)}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Category Header */}
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

      {/* Assets Grid */}
      {isExpanded && (
        <div className="ml-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
          {/* Add New Card */}
          <button className="aspect-square rounded-xl border-2 border-dashed border-zinc-700 hover:border-sky-500/50 flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-sky-400 transition-all hover:bg-sky-500/5">
            <Plus className="w-6 h-6" />
            <span className="text-xs">Add {getSingular(category.label)}</span>
          </button>
        </div>
      )}
    </div>
  )
}

interface AssetCardProps {
  asset: ProjectAsset
}

function AssetCard({ asset }: AssetCardProps) {
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
          {/* Placeholder for image */}
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

      {/* Duration badge for video/audio */}
      {asset.duration && (
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-xs text-white">
          {Math.floor(asset.duration / 60)}:{String(asset.duration % 60).padStart(2, "0")}
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <button className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
          <MoreHorizontal className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Name overlay */}
      <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-xs text-white truncate">{asset.name}</p>
      </div>
    </div>
  )
}

export function MoodBoardPage() {
  const { project } = useWorkspaceStore()

  if (!project) return null

  // Group assets by category
  const assetsByCategory = ASSET_CATEGORIES.map((category) => ({
    category,
    assets: project.assets.filter((a) => a.category === category.id),
  }))

  const totalAssets = project.assets.length

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Mood Board</h1>
            <p className="text-zinc-400 mt-1">
              {totalAssets} assets deployed in this project
            </p>
          </div>
          <button className="px-4 py-2 bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Asset
          </button>
        </div>

        {/* Category Sections */}
        <div className="space-y-6">
          {assetsByCategory.map(({ category, assets }) => (
            <CategorySection
              key={category.id}
              category={category}
              assets={assets}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
