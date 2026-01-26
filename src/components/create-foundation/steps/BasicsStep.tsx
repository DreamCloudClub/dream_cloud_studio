import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFoundationWizardStore } from "@/state/foundationWizardStore"

export function BasicsStep() {
  const { name, description, setName, setDescription, nextStep } = useFoundationWizardStore()

  const canContinue = name.trim().length > 0

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-8">
      <div className="max-w-xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">
            Name your foundation
          </h1>
          <p className="text-zinc-400">
            Give it a memorable name that describes the visual style
          </p>
        </div>

        <div className="space-y-6">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Foundation Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Corporate Clean, Summer Vibes, Tech Dark"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Description
              <span className="text-zinc-500 font-normal ml-2">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the visual style and when to use this foundation..."
              rows={3}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-center mt-8">
          <button
            onClick={nextStep}
            disabled={!canContinue}
            className={cn(
              "px-8 py-3 rounded-xl font-medium transition-all inline-flex items-center gap-2",
              canContinue
                ? "bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white hover:opacity-90"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
