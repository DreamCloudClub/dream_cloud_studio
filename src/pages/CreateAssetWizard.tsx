import { useEffect } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { useAssetWizardStore } from "@/state/assetWizardStore"
import { useUIStore } from "@/state/uiStore"
import { useAuth } from "@/contexts/AuthContext"
import { HeaderActions } from "@/components/shared"
import { BubblePanel } from "@/components/create"
import { InspectorPanel, WorkspaceNav } from "@/components/workspace"
import { DashboardNav } from "@/components/dashboard"
import studioLogo from "@/assets/images/studio_logo.png"
import {
  TypeStep,
  PromptTypeStep,
  SaveStep,
} from "@/components/create-asset"

export function CreateAssetWizard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, profile, signOut } = useAuth()
  const { isBubbleCollapsed, toggleBubbleCollapsed, isInspectorCollapsed, toggleInspectorCollapsed } = useUIStore()

  const { currentStep, assetType, promptType, setUserDescription, initWithType, resetWizard } = useAssetWizardStore()

  // Get URL params
  const projectId = searchParams.get("projectId")
  const initialType = searchParams.get("type") as "image" | "video" | "audio" | "animation" | null

  // Initialize wizard based on URL type param
  useEffect(() => {
    // If we're on save step, don't reset - we're coming from CreatorPage with generated assets
    if (currentStep === "save") {
      return
    }

    // Extract prompt from URL if provided
    const prompt = searchParams.get("prompt")
    if (prompt) {
      setUserDescription(prompt)
    }

    // Initialize with type from URL, or reset to start
    if (initialType) {
      initWithType(initialType)
    } else {
      resetWizard()
    }
  }, [initialType]) // Re-run when type param changes

  // When we reach the generate step, redirect to the CreatorPage
  useEffect(() => {
    if (currentStep === "generate" && assetType && promptType) {
      const url = projectId
        ? `/create/${assetType}/${promptType}?projectId=${projectId}`
        : `/create/${assetType}/${promptType}`
      navigate(url)
    }
  }, [currentStep, assetType, promptType, navigate, projectId])

  const renderStepContent = () => {
    switch (currentStep) {
      case "type":
        return <TypeStep />
      case "promptType":
        return <PromptTypeStep />
      case "save":
        return <SaveStep />
      default:
        return <TypeStep />
    }
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      {/* Primary Header - Dream Cloud Studio + User */}
      <header className="h-14 border-b border-zinc-800 px-4 sm:px-6 flex items-center justify-between bg-zinc-950 flex-shrink-0">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
          <img
            src={studioLogo}
            alt="Dream Cloud Studio"
            className="w-8 h-8 rounded-lg object-contain flex-shrink-0"
          />
          <h1 className="text-base sm:text-lg font-semibold text-zinc-100 truncate">Dream Cloud Studio</h1>
        </Link>

        <HeaderActions
          userName={profile?.full_name || user?.email?.split("@")[0] || "User"}
          userEmail={user?.email || ""}
          userAvatar={profile?.avatar_url}
          onSignOut={signOut}
        />
      </header>

      {/* Main Content with Panels */}
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

        {/* Step Content */}
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
          {renderStepContent()}
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

      {/* Show appropriate bottom nav based on context */}
      {projectId ? <WorkspaceNav activeTabOverride="assets" projectId={projectId} /> : <DashboardNav />}
    </div>
  )
}
