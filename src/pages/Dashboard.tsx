import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  DashboardHeader,
  CreateNewHero,
  ContentRow,
  DashboardNav,
} from "@/components/dashboard"
import { AssetDetailsModal } from "@/components/library/AssetDetailsModal"
import { BubblePanel } from "@/components/create"
import { InspectorPanel } from "@/components/workspace"
import { useUIStore } from "@/state/uiStore"
import { useAuth } from "@/contexts/AuthContext"
import { getCompletedProjects, ProjectWithThumbnail } from "@/services/projects"
import { getAssets } from "@/services/assets"
import { getAssetDisplayUrl } from "@/services/localStorage"
import type { Asset, AssetCategory } from "@/types/database"

// Asset categories in display order (same as Assets page)
const ASSET_CATEGORIES: { id: AssetCategory; label: string }[] = [
  { id: "scene", label: "Scenes" },
  { id: "stage", label: "Stages" },
  { id: "character", label: "Characters" },
  { id: "weather", label: "Weather" },
  { id: "prop", label: "Props" },
  { id: "effect", label: "Effects" },
  { id: "music", label: "Music" },
  { id: "sound_effect", label: "Sound Effects" },
  { id: "voice", label: "Voice" },
]

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

export function Dashboard() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const { isBubbleCollapsed, toggleBubbleCollapsed, setBubbleCollapsed, isInspectorCollapsed, toggleInspectorCollapsed } = useUIStore()

  const [projects, setProjects] = useState<ProjectWithThumbnail[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)

  // Fetch data from Supabase
  useEffect(() => {
    async function fetchData() {
      if (!user) return

      setIsLoading(true)
      try {
        const [completedData, assetsData] = await Promise.all([
          getCompletedProjects(user.id),
          getAssets(user.id),
        ])
        setProjects(completedData)
        setAssets(assetsData)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user])

  // Transform projects for ContentRow (show most recent 12 - 4 per row, max 3 rows)
  const recentProjects = projects.slice(0, 12).map(project => ({
    id: project.id,
    name: project.name,
    thumbnail: null,
    updatedAt: formatRelativeTime(project.updated_at),
  }))

  // Group assets by category and get 12 most recent for each
  const assetsByCategory = ASSET_CATEGORIES.map(category => {
    const categoryAssets = assets
      .filter(asset => asset.category === category.id)
      .slice(0, 12)
      .map(asset => ({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        category: asset.category,
        thumbnail: asset.type !== 'audio' ? getAssetDisplayUrl(asset) : null,
        updatedAt: formatRelativeTime(asset.created_at),
      }))

    return {
      ...category,
      assets: categoryAssets,
    }
  }).filter(category => category.assets.length > 0)


  const handleStartWithBubble = () => {
    // Open the Bubble panel
    setBubbleCollapsed(false)
  }

  const handleProjectClick = (projectId: string) => {
    navigate(`/project/${projectId}`)
  }

  const handleAssetClick = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId)
    if (asset) {
      setSelectedAsset(asset)
    }
  }

  const handleAssetUpdate = (updatedAsset: Asset) => {
    setAssets(prev => prev.map(a => a.id === updatedAsset.id ? updatedAsset : a))
    setSelectedAsset(updatedAsset)
  }

  const handleAssetDelete = (assetId: string) => {
    setAssets(prev => prev.filter(a => a.id !== assetId))
    setSelectedAsset(null)
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      <DashboardHeader
        userName={profile?.full_name || user?.email?.split("@")[0] || "User"}
        userEmail={user?.email || ""}
        userAvatar={profile?.avatar_url}
        onSignOut={signOut}
      />

      {/* Main Content with Bubble Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Bubble Panel (Left Sidebar) */}
        <div
          className={`${
            isBubbleCollapsed ? "w-16" : "w-80"
          } flex-shrink-0 hidden md:flex transition-all duration-300`}
        >
          <BubblePanel
            isCollapsed={isBubbleCollapsed}
            onToggleCollapse={toggleBubbleCollapsed}
          />
        </div>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-auto">
          <div className="w-full max-w-[90%] md:max-w-[80%] lg:max-w-3xl mx-auto px-4">
            <CreateNewHero
              onStartWithBubble={handleStartWithBubble}
            />

            <div className="border-t border-zinc-800/50" />

            <ContentRow
              title="Recent Projects"
              type="projects"
              items={recentProjects}
              onItemClick={handleProjectClick}
            />

            {/* Asset Categories - only show categories with assets */}
            {assetsByCategory.map(category => (
              <div key={category.id}>
                <div className="border-t border-zinc-800/50" />
                <ContentRow
                  title={category.label}
                  type="assets"
                  items={category.assets}
                  onItemClick={handleAssetClick}
                />
              </div>
            ))}

          </div>
        </main>

        {/* Inspector Panel (Right Sidebar) */}
        <div
          className={`${
            isInspectorCollapsed ? "w-16" : "w-80"
          } flex-shrink-0 hidden md:flex transition-all duration-300 overflow-hidden`}
        >
          <InspectorPanel
            isCollapsed={isInspectorCollapsed}
            onToggleCollapse={toggleInspectorCollapsed}
            libraryPage="dashboard"
          />
        </div>
      </div>

      <DashboardNav />

      <AssetDetailsModal
        isOpen={selectedAsset !== null}
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onUpdate={handleAssetUpdate}
        onDelete={handleAssetDelete}
      />
    </div>
  )
}
