import { useState } from "react"
import { ArrowLeft, ArrowRight, Plus, X, Pipette } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFoundationWizardStore } from "@/state/foundationWizardStore"

const PRESET_PALETTES = [
  { name: "Ocean", colors: ["#0ea5e9", "#06b6d4", "#14b8a6", "#0f172a"] },
  { name: "Sunset", colors: ["#f97316", "#ef4444", "#ec4899", "#1e1b4b"] },
  { name: "Forest", colors: ["#22c55e", "#84cc16", "#365314", "#052e16"] },
  { name: "Corporate", colors: ["#3b82f6", "#1e40af", "#f8fafc", "#64748b"] },
  { name: "Minimal", colors: ["#18181b", "#27272a", "#fafafa", "#a1a1aa"] },
  { name: "Neon", colors: ["#22d3ee", "#a855f7", "#f43f5e", "#020617"] },
]

export function ColorsStep() {
  const { colorPalette, addColor, removeColor, updateColor, nextStep, prevStep } =
    useFoundationWizardStore()
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const handlePresetSelect = (colors: string[]) => {
    // Replace current palette with preset
    colors.forEach((color, index) => {
      if (index < colorPalette.length) {
        updateColor(index, color)
      }
    })
    // Adjust palette length to match preset
    while (colorPalette.length > colors.length) {
      removeColor(colorPalette.length - 1)
    }
    while (colorPalette.length < colors.length) {
      addColor(colors[colorPalette.length])
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">
            Define your color palette
          </h1>
          <p className="text-zinc-400">
            Choose colors that represent your brand or visual style
          </p>
        </div>

        {/* Current Palette */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-zinc-300 mb-3">
            Your Colors
          </label>
          <div className="flex flex-wrap gap-3">
            {colorPalette.map((color, index) => (
              <div key={index} className="relative group">
                <button
                  onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                  className="w-16 h-16 rounded-xl border-2 border-zinc-700 hover:border-zinc-500 transition-colors overflow-hidden"
                  style={{ backgroundColor: color }}
                />
                {colorPalette.length > 1 && (
                  <button
                    onClick={() => removeColor(index)}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-zinc-400" />
                  </button>
                )}
                {editingIndex === index && (
                  <div className="absolute top-full left-0 mt-2 p-2 bg-zinc-800 border border-zinc-700 rounded-lg z-10">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => updateColor(index, e.target.value)}
                      className="w-24 h-8 cursor-pointer"
                    />
                    <p className="text-xs text-zinc-400 mt-1 text-center">{color}</p>
                  </div>
                )}
              </div>
            ))}
            {colorPalette.length < 8 && (
              <button
                onClick={() => addColor("#6b7280")}
                className="w-16 h-16 rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-500 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Preset Palettes */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-zinc-300 mb-3">
            Or start with a preset
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PRESET_PALETTES.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePresetSelect(preset.colors)}
                className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors text-left"
              >
                <div className="flex gap-1 mb-2">
                  {preset.colors.map((color, i) => (
                    <div
                      key={i}
                      className="flex-1 h-6 first:rounded-l-md last:rounded-r-md"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="text-sm text-zinc-300">{preset.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="mb-8 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <p className="text-sm text-zinc-500 mb-3">Preview</p>
          <div className="flex gap-1 h-12 rounded-lg overflow-hidden">
            {colorPalette.map((color, i) => (
              <div
                key={i}
                className="flex-1"
                style={{ backgroundColor: color }}
              />
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
