import { Link, useNavigate } from "react-router-dom"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFoundationWizardStore, FOUNDATION_WIZARD_STEPS } from "@/state/foundationWizardStore"
import { useUIStore } from "@/state/uiStore"
import { useAuth } from "@/contexts/AuthContext"
import { BubblePanel } from "@/components/create"
import { InspectorPanel } from "@/components/workspace"
import { DashboardNav } from "@/components/dashboard"
import { HeaderActions } from "@/components/shared"
import studioLogo from "@/assets/images/studio_logo.png"
import {
  BasicsStep,
  ColorsStep,
  StyleStep,
  MoodStep,
  ReviewStep,
} from "@/components/create-foundation"

export function CreateFoundationWizard() {
  const navigate = useNavigate()
  const { isBubbleCollapsed, toggleBubbleCollapsed, isInspectorCollapsed, toggleInspectorCollapsed } = useUIStore()
  const { user, profile, signOut } = useAuth()
  const { currentStep, editingId, prevStep, nextStep, resetWizard, name } = useFoundationWizardStore()

  const isEditing = editingId !== null
  const currentIndex = FOUNDATION_WIZARD_STEPS.findIndex((s) => s.id === currentStep)
  const isFirstStep = currentIndex === 0
  const isLastStep = currentIndex === FOUNDATION_WIZARD_STEPS.length - 1

  const canContinue = () => {
    if (currentStep === "basics") {
      return name.trim().length > 0
    }
    return true
  }

  const handleBack = () => {
    if (isFirstStep) {
      resetWizard()
      navigate("/library/foundations")
    } else {
      prevStep()
    }
  }

  const handleContinue = () => {
    if (canContinue() && !isLastStep) {
      nextStep()
    }
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
          {/* Secondary Header */}
          <div className="h-[72px] border-b border-zinc-800 flex-shrink-0">
            <div className="h-full px-6 lg:px-8 flex items-center">
              <div className="w-24">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="text-sm font-medium">Back</span>
                </button>
              </div>
              <h1 className="flex-1 text-center text-xl font-semibold text-zinc-100">
                {isEditing ? "Edit Foundation" : "Create Foundation"}
              </h1>
              <div className="w-24 flex justify-end">
                {!isLastStep && (
                  <button
                    onClick={handleContinue}
                    disabled={!canContinue()}
                    className={cn(
                      "flex items-center gap-1 transition-colors",
                      canContinue()
                        ? "text-sky-400 hover:opacity-80"
                        : "text-zinc-600 cursor-not-allowed"
                    )}
                  >
                    <span className="text-sm font-medium">Continue</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {renderStepContent()}
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
            libraryPage="foundations"
          />
        </div>
      </div>

      {/* Bottom Navigation */}
      <DashboardNav />
    </div>
  )
}
