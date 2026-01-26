import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useFoundationWizardStore,
  STYLE_OPTIONS,
  TYPOGRAPHY_OPTIONS,
  TONE_OPTIONS,
} from "@/state/foundationWizardStore"

export function StyleStep() {
  const {
    style,
    typography,
    tone,
    setStyle,
    setTypography,
    setTone,
    nextStep,
    prevStep,
  } = useFoundationWizardStore()

  return (
    <div className="flex-1 flex flex-col items-center p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">
            Define your style
          </h1>
          <p className="text-zinc-400">
            Choose the visual and tonal characteristics
          </p>
        </div>

        {/* Visual Style */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-zinc-300 mb-3">
            Visual Style
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {STYLE_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setStyle(style === option.id ? null : option.id)}
                className={cn(
                  "relative p-4 rounded-xl border-2 text-left transition-all",
                  style === option.id
                    ? "border-sky-500 bg-sky-500/10"
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                )}
              >
                {style === option.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <h3 className="font-medium text-zinc-100 mb-1">{option.label}</h3>
                <p className="text-xs text-zinc-500">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Typography */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-zinc-300 mb-3">
            Typography Style
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {TYPOGRAPHY_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setTypography(typography === option.id ? null : option.id)}
                className={cn(
                  "relative p-3 rounded-xl border-2 text-left transition-all",
                  typography === option.id
                    ? "border-sky-500 bg-sky-500/10"
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                )}
              >
                {typography === option.id && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
                <h3 className="font-medium text-zinc-100 text-sm">{option.label}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Tone of Voice */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-zinc-300 mb-3">
            Tone of Voice
            <span className="text-zinc-500 font-normal ml-2">(for scripts & copy)</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {TONE_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setTone(tone === option.id ? null : option.id)}
                className={cn(
                  "relative p-3 rounded-xl border-2 text-left transition-all",
                  tone === option.id
                    ? "border-sky-500 bg-sky-500/10"
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                )}
              >
                {tone === option.id && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
                <h3 className="font-medium text-zinc-100 text-sm">{option.label}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={prevStep}
            className="px-6 py-3 rounded-xl font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={nextStep}
            className="px-8 py-3 rounded-xl font-medium bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white hover:opacity-90 transition-opacity inline-flex items-center gap-2"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
