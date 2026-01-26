import { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { useAssetWizardStore } from "@/state/assetWizardStore"
import { useUIStore } from "@/state/uiStore"
import { useAuth } from "@/contexts/AuthContext"
import { BubblePanel } from "@/components/create"
import { HeaderActions } from "@/components/shared"
import {
  AssetStepTimeline,
  TypeStep,
  CategoryStep,
  PromptStep,
  GenerateStep,
  ReviewStep,
} from "@/components/create-asset"

export function CreateAssetWizard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isBubbleCollapsed, toggleBubbleCollapsed } = useUIStore()
  const { user, profile, signOut } = useAuth()

  const { currentStep, setPrompt, resetWizard } = useAssetWizardStore()

  // Extract initial prompt from URL params
  useEffect(() => {
    const prompt = searchParams.get("prompt")
    if (prompt) {
      setPrompt(prompt)
    }
  }, [searchParams, setPrompt])

  const handleBack = () => {
    resetWizard()
    navigate("/library/assets")
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case "type":
        return <TypeStep />
      case "category":
        return <CategoryStep />
      case "prompt":
        return <PromptStep />
      case "generate":
        return <GenerateStep />
      case "review":
        return <ReviewStep />
      default:
        return <TypeStep />
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
          <span className="text-sm font-medium">Back to Assets</span>
        </button>

        <h1 className="text-lg font-semibold text-zinc-100 absolute left-1/2 -translate-x-1/2">
          Create New Asset
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
      <AssetStepTimeline />
    </div>
  )
}
