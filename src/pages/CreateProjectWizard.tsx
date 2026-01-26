import { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useProjectWizardStore } from "@/state/projectWizardStore"
import { useUIStore } from "@/state/uiStore"
import { useAuth } from "@/contexts/AuthContext"
import { HeaderActions } from "@/components/shared"
import {
  StepTimeline,
  BubblePanel,
  PlatformStep,
  BriefStep,
  MoodBoardStep,
  StoryboardStep,
  ShotsStep,
  FilmingStep,
  AudioStep,
  ReviewStep,
} from "@/components/create"

export function CreateProjectWizard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isBubbleCollapsed, toggleBubbleCollapsed } = useUIStore()
  const { user, profile, signOut } = useAuth()

  const { currentStep, setInitialPrompt, loadDraft, isLoadingDraft, resetWizard } = useProjectWizardStore()

  // Load draft if draft param is present
  useEffect(() => {
    const draftId = searchParams.get("draft")
    if (draftId) {
      loadDraft(draftId)
    }
  }, [searchParams, loadDraft])

  // Extract initial prompt from URL params (only for new projects)
  useEffect(() => {
    const prompt = searchParams.get("prompt")
    const draftId = searchParams.get("draft")
    if (prompt && !draftId) {
      setInitialPrompt(prompt)
    }
  }, [searchParams, setInitialPrompt])

  const handleBack = () => {
    resetWizard()
    navigate("/library/projects")
  }

  // Render the current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case "platform":
        return <PlatformStep />
      case "brief":
        return <BriefStep />
      case "mood":
        return <MoodBoardStep />
      case "story":
        return <StoryboardStep />
      case "shots":
        return <ShotsStep />
      case "filming":
        return <FilmingStep />
      case "audio":
        return <AudioStep />
      case "review":
        return <ReviewStep />
      default:
        return <PlatformStep />
    }
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm flex-shrink-0">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Projects</span>
        </button>

        <h1 className="text-lg font-semibold text-zinc-100 absolute left-1/2 -translate-x-1/2">
          {searchParams.get("draft") ? "Continue Setup" : "Create New Project"}
        </h1>

        <HeaderActions
          userName={profile?.full_name || user?.email?.split("@")[0] || "User"}
          userEmail={user?.email || ""}
          userAvatar={profile?.avatar_url}
          onSignOut={signOut}
        />
      </header>

      {/* Main Content */}
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

        {/* Step Content (Main Area) */}
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
          <div className="flex-1 overflow-y-auto">
            {isLoadingDraft ? (
              <div className="flex-1 flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-sky-400 animate-spin mx-auto mb-3" />
                  <p className="text-zinc-400">Loading project...</p>
                </div>
              </div>
            ) : (
              renderStepContent()
            )}
          </div>
        </main>
      </div>

      {/* Step Timeline (Bottom) */}
      <StepTimeline />
    </div>
  )
}
