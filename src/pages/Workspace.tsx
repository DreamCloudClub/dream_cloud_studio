import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useWorkspaceStore } from "@/state/workspaceStore"
import { BubblePanel } from "@/components/create"
import {
  WorkspaceNav,
  BriefPage,
  MoodBoardPage,
  StoryboardPage,
  EditorPage,
  SceneManagerPage,
  AssetsPage,
  ExportPage,
} from "@/components/workspace"

export function Workspace() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { project, isLoading, activeTab, loadProject } = useWorkspaceStore()
  const [isBubbleCollapsed, setIsBubbleCollapsed] = useState(false)

  // Load project on mount
  useEffect(() => {
    if (projectId) {
      loadProject(projectId)
    }
  }, [projectId, loadProject])

  const handleBack = () => {
    navigate("/")
  }

  // Render the current tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "brief":
        return <BriefPage />
      case "moodboard":
        return <MoodBoardPage />
      case "storyboard":
        return <StoryboardPage />
      case "editor":
        return <EditorPage />
      case "scenes":
        return <SceneManagerPage />
      case "assets":
        return <AssetsPage />
      case "export":
        return <ExportPage />
      default:
        return <EditorPage />
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading project...</p>
        </div>
      </div>
    )
  }

  // No project found
  if (!project) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Project not found</p>
          <button
            onClick={handleBack}
            className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">Dashboard</span>
        </button>

        <div className="flex-1 text-center">
          <h1 className="text-base font-semibold text-zinc-100 truncate px-4">
            {project.name}
          </h1>
        </div>

        {/* Spacer for centering */}
        <div className="w-20" />
      </header>

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

        {/* Tab Content (Main Area) */}
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
          {renderTabContent()}
        </main>
      </div>

      {/* Bottom Navigation */}
      <WorkspaceNav />
    </div>
  )
}
