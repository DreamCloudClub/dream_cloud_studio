import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Edit3,
  FolderOpen,
  Clock,
  PenLine,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronRight,
  Mountain,
  Square,
  User,
  Cloud,
  Box,
  Sparkles,
  Music,
  Waves,
  Mic,
  Play,
  Palette,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LibraryLayout } from "@/components/library"
import { useAuth } from "@/contexts/AuthContext"
import { getPlatform } from "@/services/platforms"
import { getProjectsByPlatform } from "@/services/projects"
import { getAssetsByPlatform } from "@/services/assets"
import { getFoundationsByPlatform } from "@/services/foundations"
import type { Platform, Project, Asset } from "@/types/database"
import type { Foundation } from "@/services/foundations"

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`
  return date.toLocaleDateString()
}

// Asset category icons
const categoryIcons: Record<string, React.ElementType> = {
  scene: Mountain,
  stage: Square,
  character: User,
  weather: Cloud,
  prop: Box,
  effect: Sparkles,
  music: Music,
  sound_effect: Waves,
  voice: Mic,
}

interface ProjectCardProps {
  project: Project
  onClick: () => void
}

function ProjectCard({ project, onClick }: ProjectCardProps) {
  const isDraft = project.status === "draft"

  return (
    <div
      onClick={onClick}
      className={cn(
        "group text-left bg-zinc-900 rounded-xl overflow-hidden transition-colors focus:outline-none flex flex-col cursor-pointer relative",
        isDraft
          ? "border-2 border-dashed border-orange-500/50 hover:border-orange-400/70"
          : "border border-zinc-800 hover:border-zinc-700"
      )}
    >
      <div className="aspect-square bg-zinc-800 relative flex-shrink-0">
        <div className="absolute inset-0 flex items-center justify-center">
          {isDraft ? (
            <PenLine className="w-10 h-10 text-orange-500/70" />
          ) : (
            <FolderOpen className="w-12 h-12 text-zinc-700" />
          )}
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        {isDraft && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-orange-500/90 text-white text-[10px] font-medium rounded">
            Draft
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className={cn(
          "text-sm font-medium truncate transition-colors",
          isDraft
            ? "text-orange-200 group-hover:text-orange-300"
            : "text-zinc-200 group-hover:text-sky-400"
        )}>
          {project.name}
        </h3>
        <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
          <Clock className="w-3 h-3" />
          <span>{formatRelativeTime(project.updated_at)}</span>
        </div>
      </div>
    </div>
  )
}

interface AssetCardProps {
  asset: Asset
  onClick: () => void
}

function AssetCard({ asset, onClick }: AssetCardProps) {
  const Icon = categoryIcons[asset.category || "scene"] || Box
  const isVideo = asset.type === "video"
  const isAudio = asset.type === "audio"

  return (
    <div
      onClick={onClick}
      className="group text-left bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
    >
      <div className="aspect-square bg-zinc-800 relative">
        {asset.url ? (
          isAudio ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <Music className="w-10 h-10 text-purple-400" />
            </div>
          ) : (
            <>
              <img
                src={asset.url}
                alt={asset.name}
                className="w-full h-full object-cover"
              />
              {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="w-8 h-8 text-white" />
                </div>
              )}
            </>
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon className="w-10 h-10 text-zinc-600" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-zinc-200 truncate group-hover:text-sky-400 transition-colors">
          {asset.name}
        </h3>
        <p className="text-xs text-zinc-500 mt-1 capitalize">
          {asset.category?.replace("_", " ") || asset.type}
        </p>
      </div>
    </div>
  )
}

interface FoundationCardProps {
  foundation: Foundation
  onClick: () => void
}

function FoundationCard({ foundation, onClick }: FoundationCardProps) {
  const colorPalette = foundation.color_palette || []

  return (
    <div
      onClick={onClick}
      className="group text-left bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
    >
      <div className="aspect-square bg-zinc-800 relative">
        {colorPalette.length > 0 ? (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2">
            {colorPalette.slice(0, 4).map((color, i) => (
              <div key={i} style={{ backgroundColor: color }} />
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Palette className="w-10 h-10 text-zinc-600" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-zinc-200 truncate group-hover:text-sky-400 transition-colors">
          {foundation.name}
        </h3>
        {foundation.description && (
          <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
            {foundation.description}
          </p>
        )}
      </div>
    </div>
  )
}

export function PlatformDetail() {
  const { platformId } = useParams<{ platformId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [platform, setPlatform] = useState<Platform | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [foundations, setFoundations] = useState<Foundation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [expandedSections, setExpandedSections] = useState({
    drafts: true,
    active: true,
    completed: true,
    assets: true,
    foundations: true,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      if (!platformId || !user) return
      setIsLoading(true)
      try {
        const [platformData, projectsData, assetsData, foundationsData] = await Promise.all([
          getPlatform(platformId),
          getProjectsByPlatform(platformId),
          getAssetsByPlatform(platformId),
          getFoundationsByPlatform(platformId),
        ])
        setPlatform(platformData)
        setProjects(projectsData)
        setAssets(assetsData)
        setFoundations(foundationsData)
      } catch (error) {
        console.error("Error fetching platform data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [platformId, user])

  // Group projects by status
  const draftProjects = projects.filter((p) => p.status === "draft")
  const activeProjects = projects.filter((p) => p.status === "in_progress")
  const completedProjects = projects.filter((p) => p.status === "completed")

  const handleProjectClick = (project: Project) => {
    if (project.status === "draft") {
      navigate(`/create/project?draft=${project.id}`)
    } else {
      navigate(`/project/${project.id}`)
    }
  }

  const handleAssetClick = (asset: Asset) => {
    // TODO: Open asset detail modal
    console.log("Asset clicked:", asset.id)
  }

  const handleFoundationClick = (foundation: Foundation) => {
    navigate(`/foundation/${foundation.id}`)
  }

  if (isLoading) {
    return (
      <LibraryLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
        </div>
      </LibraryLayout>
    )
  }

  if (!platform) {
    return (
      <LibraryLayout>
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6 lg:py-8">
          <div className="flex flex-col items-center justify-center py-12 px-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
            <FolderOpen className="w-12 h-12 text-zinc-600 mb-3" />
            <p className="text-zinc-500 text-sm text-center">Platform not found</p>
          </div>
        </div>
      </LibraryLayout>
    )
  }

  return (
    <LibraryLayout>
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6 lg:py-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate("/library/platforms")}
              className="mt-1 p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">{platform.name}</h1>
              {platform.description && (
                <p className="text-zinc-400 mt-1">{platform.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                <span>{projects.length} project{projects.length !== 1 ? "s" : ""}</span>
                <span>{assets.length} asset{assets.length !== 1 ? "s" : ""}</span>
                <span>{foundations.length} foundation{foundations.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/platform/${platformId}/edit`)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 font-medium text-sm transition-colors inline-flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </button>
        </div>

        {/* Drafts Section */}
        {draftProjects.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => toggleSection("drafts")}
              className="flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors"
            >
              {expandedSections.drafts ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <PenLine className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase tracking-wide">
                Drafts
              </span>
              <span className="text-xs text-zinc-500">({draftProjects.length})</span>
            </button>
            {expandedSections.drafts && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 ml-6">
                {draftProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => handleProjectClick(project)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active Section */}
        {activeProjects.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => toggleSection("active")}
              className="flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors"
            >
              {expandedSections.active ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <FolderOpen className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase tracking-wide">
                Active
              </span>
              <span className="text-xs text-zinc-500">({activeProjects.length})</span>
            </button>
            {expandedSections.active && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 ml-6">
                {activeProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => handleProjectClick(project)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Completed Section */}
        {completedProjects.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => toggleSection("completed")}
              className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {expandedSections.completed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase tracking-wide">
                Completed
              </span>
              <span className="text-xs text-zinc-500">({completedProjects.length})</span>
            </button>
            {expandedSections.completed && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 ml-6">
                {completedProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => handleProjectClick(project)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Assets Section */}
        {assets.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => toggleSection("assets")}
              className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
            >
              {expandedSections.assets ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <Box className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase tracking-wide">
                Assets
              </span>
              <span className="text-xs text-zinc-500">({assets.length})</span>
            </button>
            {expandedSections.assets && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 ml-6">
                {assets.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    onClick={() => handleAssetClick(asset)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Foundations Section */}
        {foundations.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => toggleSection("foundations")}
              className="flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors"
            >
              {expandedSections.foundations ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <Palette className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase tracking-wide">
                Foundations
              </span>
              <span className="text-xs text-zinc-500">({foundations.length})</span>
            </button>
            {expandedSections.foundations && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 ml-6">
                {foundations.map((foundation) => (
                  <FoundationCard
                    key={foundation.id}
                    foundation={foundation}
                    onClick={() => handleFoundationClick(foundation)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {projects.length === 0 && assets.length === 0 && foundations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
            <FolderOpen className="w-12 h-12 text-zinc-600 mb-3" />
            <p className="text-zinc-500 text-sm text-center">
              No items in this platform yet
            </p>
          </div>
        )}
      </div>
    </LibraryLayout>
  )
}
