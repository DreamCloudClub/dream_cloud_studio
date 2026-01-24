import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  DashboardHeader,
  CreateNewHero,
  ContentRow,
  UsageBar,
} from "@/components/dashboard"
import { BubblePanel } from "@/components/create"

// Mock usage data for demonstration
const mockUsage = {
  images: { used: 82, limit: 500 },
  videos: { used: 45, limit: 150 },
  storage: { used: 12, limit: 50, unit: "GB" },
}

// Mock projects for demonstration
const mockProjects = [
  { id: "project-1", name: "Product Launch Video", updatedAt: "2 hours ago" },
  { id: "project-2", name: "Brand Story", updatedAt: "1 day ago" },
  { id: "project-3", name: "Tutorial Series Ep.1", updatedAt: "3 days ago" },
]

// Mock assets for demonstration
const mockAssets = [
  { id: "asset-1", name: "Hero Background", type: "image" as const, updatedAt: "1 hour ago" },
  { id: "asset-2", name: "Product Intro", type: "video" as const, updatedAt: "4 hours ago" },
  { id: "asset-3", name: "Background Music", type: "audio" as const, updatedAt: "1 day ago" },
]

// Mock foundations for demonstration
const mockFoundations = [
  { id: "foundation-1", name: "Corporate Clean", updatedAt: "1 week ago" },
  { id: "foundation-2", name: "Playful Social", updatedAt: "2 weeks ago" },
]

export function Dashboard() {
  const navigate = useNavigate()
  const [isBubbleCollapsed, setIsBubbleCollapsed] = useState(false)

  const handleNewProject = (prompt: string) => {
    // Navigate to /create/project with prompt context
    const params = prompt ? `?prompt=${encodeURIComponent(prompt)}` : ""
    navigate(`/create/project${params}`)
  }

  const handleNewAsset = (prompt: string) => {
    // TODO: Navigate to /create/asset with prompt context (show asset type grid)
    console.log("New Asset with prompt:", prompt)
  }

  const handleProjectClick = (projectId: string) => {
    navigate(`/project/${projectId}`)
  }

  const handleViewAllProjects = () => {
    console.log("View all projects")
  }

  const handleViewAllAssets = () => {
    console.log("View all assets")
  }

  const handleViewAllFoundations = () => {
    console.log("View all foundations")
  }

  const handleUpgrade = () => {
    console.log("Upgrade clicked")
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      <DashboardHeader />

      {/* Main Content with Bubble Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Bubble Panel (Left Sidebar) */}
        <div
          className={`${
            isBubbleCollapsed ? "w-16" : "w-80 lg:w-96"
          } flex-shrink-0 hidden md:flex transition-all duration-300`}
        >
          <BubblePanel
            isCollapsed={isBubbleCollapsed}
            onToggleCollapse={() => setIsBubbleCollapsed(!isBubbleCollapsed)}
          />
        </div>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-auto">
          <div className="w-full max-w-[90%] md:max-w-[80%] lg:max-w-3xl mx-auto px-4">
            <CreateNewHero onNewProject={handleNewProject} onNewAsset={handleNewAsset} />

            <div className="border-t border-zinc-800/50" />

            <ContentRow
              title="Recent Projects"
              type="projects"
              items={mockProjects}
              onViewAll={handleViewAllProjects}
              onItemClick={handleProjectClick}
            />

            <div className="border-t border-zinc-800/50" />

            <ContentRow
              title="Recent Assets"
              type="assets"
              items={mockAssets}
              onViewAll={handleViewAllAssets}
            />

            <div className="border-t border-zinc-800/50" />

            <ContentRow
              title="Foundations"
              type="foundations"
              items={mockFoundations}
              onViewAll={handleViewAllFoundations}
            />
          </div>
        </main>
      </div>

      <UsageBar usage={mockUsage} plan="Basic" onUpgrade={handleUpgrade} />
    </div>
  )
}
