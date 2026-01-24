import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, X } from "lucide-react"
import { useProjectWizardStore } from "@/state/projectWizardStore"
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
  const [isBubbleCollapsed, setIsBubbleCollapsed] = useState(false)

  const { currentStep, setInitialPrompt, resetWizard } = useProjectWizardStore()

  // Extract initial prompt from URL params
  useEffect(() => {
    const prompt = searchParams.get("prompt")
    if (prompt) {
      setInitialPrompt(prompt)
    }
  }, [searchParams, setInitialPrompt])

  const handleBack = () => {
    navigate("/")
  }

  const handleCancel = () => {
    if (
      window.confirm(
        "Are you sure you want to cancel? Your progress will be lost."
      )
    ) {
      resetWizard()
      navigate("/")
    }
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
      <header className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Dashboard</span>
        </button>

        <h1 className="text-lg font-semibold text-zinc-100">
          Create New Project
        </h1>

        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <span className="text-sm">Cancel</span>
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* Main Content */}
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

        {/* Step Content (Main Area) */}
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
          <div className="flex-1 overflow-y-auto">
            {renderStepContent()}
          </div>
        </main>
      </div>

      {/* Step Timeline (Bottom) */}
      <StepTimeline />
    </div>
  )
}
