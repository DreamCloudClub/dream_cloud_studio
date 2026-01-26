import { useState, useEffect } from "react"
import { Upload, Wand2, X, Plus, Palette, ChevronDown, Check } from "lucide-react"
import { useProjectWizardStore } from "@/state/projectWizardStore"
import { useFoundationStore, Foundation } from "@/state/foundationStore"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Preset color palettes for quick selection
const presetPalettes = [
  { name: "Ocean", colors: ["#0ea5e9", "#0284c7", "#0369a1", "#075985"] },
  { name: "Sunset", colors: ["#f97316", "#ea580c", "#dc2626", "#9a3412"] },
  { name: "Forest", colors: ["#22c55e", "#16a34a", "#15803d", "#166534"] },
  { name: "Lavender", colors: ["#a855f7", "#9333ea", "#7c3aed", "#6d28d9"] },
  { name: "Monochrome", colors: ["#e4e4e7", "#a1a1aa", "#71717a", "#3f3f46"] },
  { name: "Warm", colors: ["#fbbf24", "#f59e0b", "#d97706", "#b45309"] },
]

// Preset style keywords
const styleKeywords = [
  "Cinematic",
  "Minimal",
  "Bold",
  "Organic",
  "Geometric",
  "Retro",
  "Futuristic",
  "Playful",
  "Elegant",
  "Raw",
  "Dreamy",
  "Dynamic",
]

export function MoodBoardStep() {
  const { moodBoard, setMoodBoard, goToNextStep, goToPreviousStep, markStepComplete } =
    useProjectWizardStore()
  const { foundations } = useFoundationStore()

  const [images, setImages] = useState<{ id: string; url: string; name: string }[]>(
    moodBoard?.images || []
  )
  const [selectedColors, setSelectedColors] = useState<string[]>(
    moodBoard?.colors || []
  )
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(
    moodBoard?.keywords || []
  )
  const [selectedFoundation, setSelectedFoundation] = useState<Foundation | null>(null)
  const [showFoundationPicker, setShowFoundationPicker] = useState(false)

  // Sync store changes back to local state (when Bubble updates via chat)
  useEffect(() => {
    if (moodBoard) {
      if (moodBoard.images) setImages(moodBoard.images)
      if (moodBoard.colors) setSelectedColors(moodBoard.colors)
      if (moodBoard.keywords) setSelectedKeywords(moodBoard.keywords)
    }
  }, [moodBoard])

  const handleAddImage = () => {
    // In a real app, this would open a file picker or generate with AI
    const mockImage = {
      id: crypto.randomUUID(),
      url: `https://picsum.photos/seed/${Math.random()}/400/300`,
      name: `Reference ${images.length + 1}`,
    }
    setImages([...images, mockImage])
  }

  const handleRemoveImage = (imageId: string) => {
    setImages(images.filter((img) => img.id !== imageId))
  }

  const handleSelectPalette = (colors: string[]) => {
    setSelectedColors(colors)
  }

  const handleToggleKeyword = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      setSelectedKeywords(selectedKeywords.filter((k) => k !== keyword))
    } else {
      setSelectedKeywords([...selectedKeywords, keyword])
    }
  }

  const handleApplyFoundation = (foundation: Foundation) => {
    setSelectedFoundation(foundation)
    setSelectedColors(foundation.colorPalette)
    // Map foundation style to keywords if it exists
    const keywords: string[] = []
    if (foundation.style) {
      const styleMap: Record<string, string> = {
        minimal: "Minimal",
        bold: "Bold",
        cinematic: "Cinematic",
        organic: "Organic",
        retro: "Retro",
        futuristic: "Futuristic",
      }
      if (styleMap[foundation.style]) keywords.push(styleMap[foundation.style])
    }
    if (foundation.mood) {
      const moodMap: Record<string, string> = {
        professional: "Elegant",
        energetic: "Dynamic",
        calm: "Dreamy",
        innovative: "Futuristic",
        playful: "Playful",
        luxurious: "Elegant",
      }
      if (moodMap[foundation.mood]) keywords.push(moodMap[foundation.mood])
    }
    setSelectedKeywords(keywords)
    // Add foundation mood images if any
    if (foundation.moodImages.length > 0) {
      setImages(foundation.moodImages)
    }
    setShowFoundationPicker(false)
  }

  const handleClearFoundation = () => {
    setSelectedFoundation(null)
  }

  const handleContinue = () => {
    setMoodBoard({
      images,
      colors: selectedColors,
      keywords: selectedKeywords,
      foundationId: selectedFoundation?.id,
    })
    markStepComplete("mood")
    goToNextStep()
  }

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-zinc-100 mb-2">
            Visual Direction
          </h1>
          <p className="text-zinc-400">
            Set the mood with reference images, colors, and style keywords.
          </p>
        </div>

        {/* Foundation Quick Apply */}
        {foundations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">
              Apply Foundation
            </h2>
            <div className="relative">
              {selectedFoundation ? (
                <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-sky-500/50 rounded-xl">
                  <div className="w-10 h-10 rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 flex-shrink-0">
                    {selectedFoundation.colorPalette.slice(0, 4).map((color, i) => (
                      <div key={i} style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-100">{selectedFoundation.name}</p>
                    <p className="text-xs text-zinc-500">Foundation applied</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-sky-400" />
                    <button
                      onClick={handleClearFoundation}
                      className="text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowFoundationPicker(!showFoundationPicker)}
                  className="w-full flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <Palette className="w-5 h-5 text-zinc-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-zinc-300">Use a saved foundation</p>
                      <p className="text-xs text-zinc-500">Apply existing visual style</p>
                    </div>
                  </div>
                  <ChevronDown className={cn(
                    "w-5 h-5 text-zinc-500 transition-transform",
                    showFoundationPicker && "rotate-180"
                  )} />
                </button>
              )}

              {/* Foundation Dropdown */}
              {showFoundationPicker && !selectedFoundation && (
                <div className="absolute z-10 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    {foundations.map((foundation) => (
                      <button
                        key={foundation.id}
                        onClick={() => handleApplyFoundation(foundation)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 flex-shrink-0">
                          {foundation.colorPalette.slice(0, 4).map((color, i) => (
                            <div key={i} style={{ backgroundColor: color }} />
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200">{foundation.name}</p>
                          {foundation.description && (
                            <p className="text-xs text-zinc-500 truncate">{foundation.description}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Or customize below to create a unique look
            </p>
          </div>
        )}

        {/* Reference Images */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">
            Reference Images
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative aspect-video bg-zinc-800 rounded-lg overflow-hidden group"
              >
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleRemoveImage(image.id)}
                  className="absolute top-2 right-2 w-6 h-6 bg-zinc-900/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}

            {/* Add Image Buttons */}
            <button
              onClick={handleAddImage}
              className="aspect-video bg-zinc-900 border-2 border-dashed border-zinc-700 hover:border-zinc-600 rounded-lg flex flex-col items-center justify-center gap-2 transition-colors"
            >
              <Upload className="w-6 h-6 text-zinc-500" />
              <span className="text-xs text-zinc-500">Upload</span>
            </button>

            <button
              onClick={handleAddImage}
              className="aspect-video bg-zinc-900 border-2 border-dashed border-zinc-700 hover:border-sky-500/50 rounded-lg flex flex-col items-center justify-center gap-2 transition-colors group"
            >
              <Wand2 className="w-6 h-6 text-zinc-500 group-hover:text-sky-400" />
              <span className="text-xs text-zinc-500 group-hover:text-sky-400">
                Generate
              </span>
            </button>
          </div>
        </div>

        {/* Color Palette */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">
            Color Palette
          </h2>
          <div className="space-y-4">
            {/* Preset Palettes */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {presetPalettes.map((palette) => (
                <button
                  key={palette.name}
                  onClick={() => handleSelectPalette(palette.colors)}
                  className={cn(
                    "p-3 bg-zinc-900 border rounded-lg transition-all",
                    JSON.stringify(selectedColors) === JSON.stringify(palette.colors)
                      ? "border-sky-500 ring-2 ring-sky-500/20"
                      : "border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <div className="flex gap-1 mb-2">
                    {palette.colors.map((color) => (
                      <div
                        key={color}
                        className="flex-1 h-6 rounded"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-zinc-400 text-center">{palette.name}</p>
                </button>
              ))}
            </div>

            {/* Selected Colors Display */}
            {selectedColors.length > 0 && (
              <div className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                <span className="text-sm text-zinc-400">Selected:</span>
                <div className="flex gap-2">
                  {selectedColors.map((color) => (
                    <div
                      key={color}
                      className="w-8 h-8 rounded-lg shadow-inner"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Style Keywords */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">
            Style Keywords
          </h2>
          <div className="flex flex-wrap gap-2">
            {styleKeywords.map((keyword) => (
              <button
                key={keyword}
                onClick={() => handleToggleKeyword(keyword)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all",
                  selectedKeywords.includes(keyword)
                    ? "bg-sky-500 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"
                )}
              >
                {keyword}
              </button>
            ))}
            <button className="px-4 py-2 rounded-full text-sm font-medium bg-zinc-900 text-zinc-500 border border-dashed border-zinc-700 hover:border-zinc-600 flex items-center gap-1">
              <Plus className="w-4 h-4" />
              Custom
            </button>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between">
          <Button
            variant="ghost"
            onClick={goToPreviousStep}
            className="text-zinc-400 hover:text-zinc-300"
          >
            &larr; Back
          </Button>
          <Button
            onClick={handleContinue}
            className="bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 hover:from-sky-300 hover:via-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/20 px-8"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
