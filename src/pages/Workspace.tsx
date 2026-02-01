import { useEffect } from "react"
import { useParams, useSearchParams, Link } from "react-router-dom"
import { Loader2 } from "lucide-react"
import studioLogo from "@/assets/images/studio_logo.png"
import { useWorkspaceStore } from "@/state/workspaceStore"
import { useUIStore } from "@/state/uiStore"
import { useAuth } from "@/contexts/AuthContext"
import { BubblePanel } from "@/components/create"
import { HeaderActions } from "@/components/shared"
import {
  WorkspaceNav,
  BriefPage,
  ScriptPage,
  MoodBoardPage,
  StoryboardPage,
  PlatformPage,
  EditorPage,
  AssetsPage,
  AnimationsPage,
  ExportPage,
  InspectorPanel,
} from "@/components/workspace"

export function Workspace() {
  const { projectId } = useParams<{ projectId: string }>()
  const [searchParams] = useSearchParams()
  const { user, profile, signOut } = useAuth()
  const { project, isLoading, activeTab, setActiveTab, loadProject } = useWorkspaceStore()
  const { isBubbleCollapsed, toggleBubbleCollapsed, isInspectorCollapsed, toggleInspectorCollapsed } = useUIStore()

  // Load project on mount
  useEffect(() => {
    if (projectId) {
      loadProject(projectId)
    }
  }, [projectId, loadProject])

  // Handle tab from URL params (e.g., ?tab=assets)
  useEffect(() => {
    const tabParam = searchParams.get("tab")
    if (tabParam && ["brief", "script", "moodboard", "storyboard", "platform", "editor", "assets", "animations", "export"].includes(tabParam)) {
      setActiveTab(tabParam as any)
    }
  }, [searchParams, setActiveTab])

  // Render the current tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "brief":
        return <BriefPage />
      case "script":
        return <ScriptPage />
      case "moodboard":
        return <MoodBoardPage />
      case "storyboard":
        return <StoryboardPage />
      case "platform":
        return <PlatformPage />
      case "editor":
        return <EditorPage />
      case "assets":
        return <AssetsPage />
      case "animations":
        return <AnimationsPage />
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
          <Link
            to="/"
            className="text-sky-400 hover:text-sky-300"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-zinc-800 bg-zinc-950 flex-shrink-0 relative">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
          <img
            src={studioLogo}
            alt="Dream Cloud Studio"
            className="w-8 h-8 rounded-lg object-contain flex-shrink-0"
          />
          <span className="text-base sm:text-lg font-semibold text-zinc-100 truncate hidden sm:inline">Dream Cloud Studio</span>
        </Link>

        <div className="flex items-center gap-3 absolute left-1/2 -translate-x-1/2">
          <h1 className="text-base font-semibold text-zinc-100 truncate">
            {project.name}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <HeaderActions
            userName={profile?.full_name || user?.email?.split("@")[0] || "User"}
            userEmail={user?.email || ""}
            userAvatar={profile?.avatar_url}
            onSignOut={signOut}
          />
        </div>
      </header>

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

        {/* Tab Content (Main Area) */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-zinc-950">
          {renderTabContent()}
        </main>

        {/* Inspector Panel (Right Sidebar) - always visible, content swaps based on tab */}
        <div
          className={`${
            isInspectorCollapsed ? "w-16" : "w-80"
          } flex-shrink-0 hidden md:flex transition-all duration-300 overflow-hidden`}
        >
          <InspectorPanel
            isCollapsed={isInspectorCollapsed}
            onToggleCollapse={toggleInspectorCollapsed}
          />
        </div>
      </div>

      {/* Bottom Navigation */}
      <WorkspaceNav />
    </div>
  )
}
