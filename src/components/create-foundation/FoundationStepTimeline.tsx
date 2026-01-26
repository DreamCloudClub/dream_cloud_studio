import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFoundationWizardStore, FOUNDATION_WIZARD_STEPS } from "@/state/foundationWizardStore"

export function FoundationStepTimeline() {
  const { currentStep } = useFoundationWizardStore()

  const currentIndex = FOUNDATION_WIZARD_STEPS.findIndex((s) => s.id === currentStep)

  return (
    <nav className="bg-zinc-900/80 backdrop-blur-sm border-t border-zinc-800">
      <div className="flex items-center justify-center gap-1 px-4 py-4">
        {FOUNDATION_WIZARD_STEPS.map((step, index) => {
          const isActive = step.id === currentStep
          const isCompleted = index < currentIndex

          return (
            <div key={step.id} className="flex items-center">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sky-500 text-white"
                      : isCompleted
                        ? "bg-sky-500/20 text-sky-400"
                        : "bg-zinc-800 text-zinc-500"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs mt-1 font-medium",
                    isActive
                      ? "text-sky-400"
                      : isCompleted
                        ? "text-zinc-400"
                        : "text-zinc-600"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < FOUNDATION_WIZARD_STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-12 h-0.5 mx-2 mb-5",
                    index < currentIndex ? "bg-sky-500/50" : "bg-zinc-800"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )
}
