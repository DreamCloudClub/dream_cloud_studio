import { Check, Box, FileText, Palette, BookOpen, Sparkles, ScrollText } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useProjectWizardStore,
  WIZARD_STEPS,
  type WizardStep,
} from "@/state/projectWizardStore"

// Map step IDs to Lucide icons
const stepIcons: Record<WizardStep, React.ElementType> = {
  platform: Box,
  brief: FileText,
  script: ScrollText,
  mood: Palette,
  story: BookOpen,
  review: Sparkles,
}

interface StepTimelineProps {
  className?: string
}

export function StepTimeline({ className }: StepTimelineProps) {
  const { currentStep, completedSteps, setStep, canNavigateToStep } =
    useProjectWizardStore()

  const currentIndex = WIZARD_STEPS.findIndex((s) => s.id === currentStep)

  const handleStepClick = (step: WizardStep) => {
    if (canNavigateToStep(step)) {
      setStep(step)
    }
  }

  return (
    <div
      className={cn(
        "w-full bg-zinc-900/80 backdrop-blur-sm border-t border-zinc-800",
        className
      )}
    >
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Steps */}
        <div className="flex items-center justify-between">
          {WIZARD_STEPS.map((step, index) => {
            const isActive = step.id === currentStep
            const isCompleted = completedSteps.includes(step.id)
            const canNavigate = canNavigateToStep(step.id)
            const isPast = index < currentIndex
            const StepIcon = stepIcons[step.id]

            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* Step indicator */}
                <button
                  onClick={() => handleStepClick(step.id)}
                  disabled={!canNavigate}
                  className={cn(
                    "flex flex-col items-center gap-1.5 transition-all group",
                    canNavigate ? "cursor-pointer" : "cursor-not-allowed"
                  )}
                >
                  {/* Circle with icon/check */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                      isActive &&
                        "bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30 ring-4 ring-sky-500/20",
                      isCompleted &&
                        !isActive &&
                        "bg-sky-500/20 text-sky-400 border border-sky-500/50",
                      !isActive &&
                        !isCompleted &&
                        "bg-zinc-800/50 text-sky-400/60 border border-zinc-700",
                      canNavigate &&
                        !isActive &&
                        "group-hover:border-sky-500/30 group-hover:text-sky-400"
                    )}
                  >
                    {isCompleted && !isActive ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      "text-xs font-medium transition-colors",
                      isActive && "text-sky-400",
                      isCompleted && !isActive && "text-zinc-400",
                      !isActive && !isCompleted && "text-zinc-600",
                      canNavigate && !isActive && "group-hover:text-zinc-400"
                    )}
                  >
                    {step.label}
                  </span>
                </button>

                {/* Connector line */}
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-2 rounded-full transition-colors",
                      isPast || isCompleted ? "bg-sky-500/40" : "bg-zinc-800"
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
