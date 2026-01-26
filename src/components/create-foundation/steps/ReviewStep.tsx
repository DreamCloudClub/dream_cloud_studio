import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Save, Palette } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFoundationWizardStore, STYLE_OPTIONS, MOOD_OPTIONS, TYPOGRAPHY_OPTIONS, TONE_OPTIONS } from "@/state/foundationWizardStore"
import { useFoundationStore, Foundation } from "@/state/foundationStore"

export function ReviewStep() {
  const navigate = useNavigate()
  const {
    editingId,
    name,
    description,
    colorPalette,
    style,
    mood,
    typography,
    tone,
    moodImages,
    prevStep,
    resetWizard,
  } = useFoundationWizardStore()
  const { addFoundation, updateFoundation } = useFoundationStore()

  const [isSaving, setIsSaving] = useState(false)

  const getLabel = (options: { id: string; label: string }[], id: string | null) => {
    return options.find((o) => o.id === id)?.label || "Not set"
  }

  const handleSave = async () => {
    setIsSaving(true)

    if (editingId) {
      // Update existing foundation
      updateFoundation(editingId, {
        name,
        description: description || undefined,
        colorPalette,
        style,
        mood,
        typography,
        tone,
        moodImages,
      })
    } else {
      // Create new foundation
      const newFoundation: Foundation = {
        id: `foundation-${Date.now()}`,
        name,
        description: description || undefined,
        colorPalette,
        style,
        mood,
        typography,
        tone,
        moodImages,
        projectCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      addFoundation(newFoundation)
    }

    // Brief delay for UX
    await new Promise((resolve) => setTimeout(resolve, 500))

    resetWizard()
    navigate("/library/foundations")
  }

  return (
    <div className="flex-1 flex flex-col items-center p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">
            Review your foundation
          </h1>
          <p className="text-zinc-400">
            Make sure everything looks good before saving
          </p>
        </div>

        {/* Preview Card */}
        <div className="mb-8 p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 rounded-xl overflow-hidden grid grid-cols-2 grid-rows-2 flex-shrink-0">
              {colorPalette.slice(0, 4).map((color, i) => (
                <div key={i} style={{ backgroundColor: color }} />
              ))}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">{name}</h2>
              {description && (
                <p className="text-sm text-zinc-400 mt-1">{description}</p>
              )}
            </div>
          </div>

          {/* Color Palette */}
          <div className="mb-6">
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Color Palette</p>
            <div className="flex gap-2">
              {colorPalette.map((color, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className="w-12 h-12 rounded-lg border border-zinc-700"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-zinc-500 mt-1">{color}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Attributes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Style</p>
              <p className="text-sm text-zinc-200">{getLabel(STYLE_OPTIONS, style)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Mood</p>
              <p className="text-sm text-zinc-200">{getLabel(MOOD_OPTIONS, mood)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Typography</p>
              <p className="text-sm text-zinc-200">{getLabel(TYPOGRAPHY_OPTIONS, typography)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Tone</p>
              <p className="text-sm text-zinc-200">{getLabel(TONE_OPTIONS, tone)}</p>
            </div>
          </div>

          {/* Mood Images */}
          {moodImages.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Reference Images</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {moodImages.map((image) => (
                  <img
                    key={image.id}
                    src={image.url}
                    alt={image.name}
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                  />
                ))}
              </div>
            </div>
          )}
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
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              "px-8 py-3 rounded-xl font-medium transition-all inline-flex items-center gap-2",
              "bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white hover:opacity-90"
            )}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {editingId ? "Updating..." : "Saving..."}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {editingId ? "Update Foundation" : "Save Foundation"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
