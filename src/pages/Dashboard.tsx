import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  DashboardHeader,
  CreateNewHero,
  ContentRow,
  DashboardNav,
} from "@/components/dashboard"
import { BubblePanel } from "@/components/create"
import { useUIStore } from "@/state/uiStore"
import { useProjectWizardStore } from "@/state/projectWizardStore"
import { useAuth } from "@/contexts/AuthContext"
import { getCompletedProjects, getDraftProjects } from "@/services/projects"
import { getAssets } from "@/services/assets"
import { getPlatforms } from "@/services/platforms"
import type { Project, Asset, Platform } from "@/types/database"

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
  const { isBubbleCollapsed, toggleBubbleCollapsed, setBubbleCollapsed } = useUIStore()
  const resetWizard = useProjectWizardStore((state) => state.resetWizard)

  const [projects, setProjects] = useState<Project[]>([])
  const [draftProjects, setDraftProjects] = useState<Project[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch data from Supabase
  useEffect(() => {
    async function fetchData() {
      if (!user) return

      setIsLoading(true)
      try {
        const [completedData, draftsData, assetsData, platformsData] = await Promise.all([
          getCompletedProjects(user.id),
          getDraftProjects(user.id),
          getAssets(user.id),
          getPlatforms(user.id),
        ])
        setProjects(completedData)
        setDraftProjects(draftsData)
        setAssets(assetsData)
        setPlatforms(platformsData)
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
    updatedAt: formatRelativeTime(project.updated_at),
  }))

  // Transform draft projects for ContentRow
  const recentDrafts = draftProjects.slice(0, 12).map(project => ({
    id: project.id,
    name: project.name,
    updatedAt: formatRelativeTime(project.updated_at),
  }))

  // Transform assets for ContentRow (show most recent 12)
  const recentAssets = assets.slice(0, 12).map(asset => ({
    id: asset.id,
    name: asset.name,
    type: asset.type,
    updatedAt: formatRelativeTime(asset.created_at),
  }))

  // Transform platforms (foundations) for ContentRow (show most recent 12)
  const recentFoundations = platforms.slice(0, 12).map(platform => ({
    id: platform.id,
    name: platform.name,
    updatedAt: formatRelativeTime(platform.updated_at),
  }))

  const handleNewProject = () => {
    // Always reset wizard for a fresh start
    resetWizard()
    navigate("/create/project")
  }

  const handleContinueDraft = (projectId: string) => {
    // TODO: Load draft into wizard and navigate to the right step
    navigate(`/create/project?draft=${projectId}`)
  }

  const handleNewAsset = () => {
    navigate("/create/asset")
  }

  const handleStartWithBubble = () => {
    // Open the Bubble panel
    setBubbleCollapsed(false)
  }

  const handleProjectClick = (projectId: string) => {
    navigate(`/project/${projectId}`)
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
              onNewProject={handleNewProject}
              onNewAsset={handleNewAsset}
              onStartWithBubble={handleStartWithBubble}
            />

            {/* Draft Projects - Continue Setup */}
            {recentDrafts.length > 0 && (
              <>
                <div className="border-t border-zinc-800/50" />
                <ContentRow
                  title="Continue Setup"
                  type="projects"
                  items={recentDrafts}
                  onItemClick={handleContinueDraft}
                  isDraft
                />
              </>
            )}

            <div className="border-t border-zinc-800/50" />

            <ContentRow
              title="Recent Projects"
              type="projects"
              items={recentProjects}
              onItemClick={handleProjectClick}
            />

            <div className="border-t border-zinc-800/50" />

            <ContentRow
              title="Recent Assets"
              type="assets"
              items={recentAssets}
            />

            <div className="border-t border-zinc-800/50" />

            <ContentRow
              title="Foundations"
              type="foundations"
              items={recentFoundations}
              onItemClick={(id) => navigate(`/foundation/${id}`)}
            />
          </div>
        </main>
      </div>

      <DashboardNav />
    </div>
  )
}
