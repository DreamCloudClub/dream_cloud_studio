import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFoundationWizardStore, FOUNDATION_WIZARD_STEPS } from "@/state/foundationWizardStore"

export function FoundationStepTimeline() {
  const { currentStep, nextStep, name } = useFoundationWizardStore()

  const currentIndex = FOUNDATION_WIZARD_STEPS.findIndex((s) => s.id === currentStep)
  const isLastStep = currentIndex === FOUNDATION_WIZARD_STEPS.length - 1

  // Determine if continue should be enabled based on current step
  const canContinue = () => {
    if (currentStep === "basics") {
      return name.trim().length > 0
    }
    return true
  }

  const handleContinue = () => {
    if (canContinue() && !isLastStep) {
      nextStep()
    }
  }

  return (
    <nav className="bg-zinc-900/80 backdrop-blur-sm border-t border-zinc-800">
      <div className="h-full px-6 lg:px-8 flex items-center py-4">
        <div className="w-24" />

        {/* Step indicator */}
        <div className="flex-1 flex items-center justify-center gap-2">
          {FOUNDATION_WIZARD_STEPS.map((step, index) => {
            const isActive = step.id === currentStep
            const isCompleted = index < currentIndex

            return (
              <div
                key={step.id}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  isActive
                    ? "bg-sky-400"
                    : isCompleted
                      ? "bg-sky-400/50"
                      : "bg-zinc-700"
                )}
              />
            )
          })}
        </div>

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
    </nav>
  )
}
