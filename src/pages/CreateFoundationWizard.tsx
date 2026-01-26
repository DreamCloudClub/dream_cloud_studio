import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { useFoundationWizardStore } from "@/state/foundationWizardStore"
import { useUIStore } from "@/state/uiStore"
import { useAuth } from "@/contexts/AuthContext"
import { BubblePanel } from "@/components/create"
import { HeaderActions } from "@/components/shared"
import {
  FoundationStepTimeline,
  BasicsStep,
  ColorsStep,
  StyleStep,
  MoodStep,
  ReviewStep,
} from "@/components/create-foundation"

export function CreateFoundationWizard() {
  const navigate = useNavigate()
  const { isBubbleCollapsed, toggleBubbleCollapsed } = useUIStore()
  const { user, profile, signOut } = useAuth()
  const { currentStep, editingId } = useFoundationWizardStore()

  const isEditing = editingId !== null

  const handleBack = () => {
    navigate("/library/foundations")
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case "basics":
        return <BasicsStep />
      case "colors":
        return <ColorsStep />
      case "style":
        return <StyleStep />
      case "mood":
        return <MoodStep />
      case "review":
        return <ReviewStep />
      default:
        return <BasicsStep />
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
          <span className="text-sm font-medium">Back to Foundations</span>
        </button>

        <h1 className="text-lg font-semibold text-zinc-100 absolute left-1/2 -translate-x-1/2">
          {isEditing ? "Edit Foundation" : "Create Foundation"}
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

        {/* Step Content */}
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
          <div className="flex-1 overflow-y-auto">
            {renderStepContent()}
          </div>
        </main>
      </div>

      {/* Step Timeline */}
      <FoundationStepTimeline />
    </div>
  )
}
