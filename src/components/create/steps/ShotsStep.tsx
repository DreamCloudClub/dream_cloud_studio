import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Wand2,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Save,
  Image as ImageIcon,
  Sparkles,
  Trash2,
} from "lucide-react"
import { useProjectWizardStore } from "@/state/projectWizardStore"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  getScenesWithShots,
  updateShot,
} from "@/services/projects"
import { generateImages } from "@/services/replicate"
import type { SceneWithShots, Shot } from "@/types/database"

// Image generation styles
const IMAGE_STYLES = [
  { id: "realistic", label: "Realistic", description: "Photorealistic imagery" },
  { id: "cinematic", label: "Cinematic", description: "Film-like quality" },
  { id: "animated", label: "Animated", description: "3D animation style" },
  { id: "illustration", label: "Illustration", description: "Digital art style" },
  { id: "anime", label: "Anime", description: "Japanese animation style" },
]

// Image generation models
const IMAGE_MODELS = [
  { id: "flux-pro", label: "FLUX 1.1 Pro", description: "Best quality ($0.04/image)" },
  { id: "sdxl", label: "SDXL", description: "Good quality (fallback)" },
]

// Aspect ratios
const ASPECT_RATIOS = [
  { id: "16:9", label: "16:9", description: "Landscape" },
  { id: "9:16", label: "9:16", description: "Portrait" },
  { id: "1:1", label: "1:1", description: "Square" },
  { id: "4:3", label: "4:3", description: "Standard" },
]

interface ShotWithScene extends Shot {
  sceneName: string
  sceneDescription: string | null
  sceneIndex: number
  shotIndex: number
}

export function ShotsStep() {
  const navigate = useNavigate()
  const {
    goToNextStep,
    goToPreviousStep,
    markStepComplete,
    projectId,
    brief,
  } = useProjectWizardStore()

  const [isLoading, setIsLoading] = useState(true)
  const [shots, setShots] = useState<ShotWithScene[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Model options
  const [selectedStyle, setSelectedStyle] = useState("cinematic")
  const [selectedModel, setSelectedModel] = useState("sdxl")
  const [selectedAspect, setSelectedAspect] = useState(brief?.aspectRatio || "16:9")

  // Load shots from database
  useEffect(() => {
    async function loadShots() {
      if (!projectId) {
        setIsLoading(false)
        return
      }

      try {
        const scenesWithShots = await getScenesWithShots(projectId)

        // Flatten scenes and shots into a single queue
        const shotQueue: ShotWithScene[] = []
        scenesWithShots.forEach((scene, sceneIdx) => {
          scene.shots.forEach((shot, shotIdx) => {
            shotQueue.push({
              ...shot,
              sceneName: scene.name,
              sceneDescription: scene.description,
              sceneIndex: sceneIdx,
              shotIndex: shotIdx,
            })
          })
        })

        setShots(shotQueue)

        // Find first shot without media
        const firstIncomplete = shotQueue.findIndex((s) => !s.media_url)
        if (firstIncomplete >= 0) {
          setCurrentIndex(firstIncomplete)
        }
      } catch (error) {
        console.error("Error loading shots:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadShots()
  }, [projectId])

  const currentShot = shots[currentIndex]
  const completedCount = shots.filter((s) => s.media_url).length

  // Build the optimized prompt from scene and shot context
  const buildPrompt = (): string => {
    if (!currentShot) return ""

    const parts: string[] = []

    // Add style prefix
    const style = IMAGE_STYLES.find((s) => s.id === selectedStyle)
    if (style) {
      parts.push(`${style.label} style.`)
    }

    // Add scene context if available
    if (currentShot.sceneDescription) {
      parts.push(`Scene context: ${currentShot.sceneDescription}.`)
    }

    // Add shot description (main prompt)
    if (currentShot.description) {
      parts.push(currentShot.description)
    }

    // Add technical details
    parts.push("High quality, detailed, professional lighting.")

    return parts.join(" ")
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setGeneratedImages([])
    setSelectedImageIndex(null)

    try {
      const prompt = buildPrompt()
      console.log("Generating with prompt:", prompt)

      // Calculate dimensions based on aspect ratio
      let width = 1024
      let height = 1024
      switch (selectedAspect) {
        case "16:9":
          width = 1024
          height = 576
          break
        case "9:16":
          width = 576
          height = 1024
          break
        case "4:3":
          width = 1024
          height = 768
          break
        case "1:1":
        default:
          width = 1024
          height = 1024
      }

      // Call the real Replicate API with selected model
      const images = await generateImages({
        prompt,
        style: selectedStyle,
        width,
        height,
        numOutputs: 4,
        model: selectedModel as "flux-pro" | "sdxl",
      })

      setGeneratedImages(images)
    } catch (error) {
      console.error("Error generating images:", error)
      alert("Error generating images: " + (error instanceof Error ? error.message : "Unknown error"))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSelectAndNext = async () => {
    if (selectedImageIndex === null || !currentShot) return

    setIsSaving(true)
    try {
      const selectedUrl = generatedImages[selectedImageIndex]

      // Save to database
      await updateShot(currentShot.id, {
        media_url: selectedUrl,
        media_type: "image",
      })

      // Update local state
      const updatedShots = [...shots]
      updatedShots[currentIndex] = {
        ...updatedShots[currentIndex],
        media_url: selectedUrl,
        media_type: "image",
      }
      setShots(updatedShots)

      // Reset for next shot
      setGeneratedImages([])
      setSelectedImageIndex(null)

      // Move to next shot or finish
      if (currentIndex < shots.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    } catch (error) {
      console.error("Error saving selection:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveDraft = async () => {
    navigate("/library/projects")
  }

  const handleContinue = () => {
    markStepComplete("shots")
    goToNextStep()
  }

  const handleSkip = () => {
    // Move to next shot without saving
    setGeneratedImages([])
    setSelectedImageIndex(null)
    if (currentIndex < shots.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleDeleteImage = async () => {
    if (!currentShot) return

    setIsDeleting(true)
    try {
      // Clear from database
      await updateShot(currentShot.id, {
        media_url: null,
        media_type: null,
      })

      // Update local state
      const updatedShots = [...shots]
      updatedShots[currentIndex] = {
        ...updatedShots[currentIndex],
        media_url: null,
        media_type: null,
      }
      setShots(updatedShots)

      // Clear any generated images
      setGeneratedImages([])
      setSelectedImageIndex(null)
    } catch (error) {
      console.error("Error deleting image:", error)
      alert("Error deleting image")
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    )
  }

  if (shots.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <ImageIcon className="w-16 h-16 text-zinc-600 mb-4" />
        <h2 className="text-xl font-semibold text-zinc-200 mb-2">No shots to generate</h2>
        <p className="text-zinc-400 mb-6">Go back and add some shots to your scenes first.</p>
        <Button onClick={goToPreviousStep} variant="outline">
          &larr; Back to Scenes
        </Button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with Progress */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-zinc-100">Generate Assets</h1>
            <div className="text-sm text-zinc-400">
              <span className="text-sky-400 font-medium">{completedCount}</span> of{" "}
              <span className="font-medium">{shots.length}</span> shots complete
            </div>
          </div>

          {/* Shot Queue Carousel */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 flex items-center gap-1.5 overflow-x-auto py-1 px-2">
              {shots.map((shot, idx) => (
                <button
                  key={shot.id}
                  onClick={() => {
                    setCurrentIndex(idx)
                    setGeneratedImages([])
                    setSelectedImageIndex(null)
                  }}
                  className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all",
                    idx === currentIndex
                      ? "bg-sky-500 text-white ring-2 ring-sky-400/50"
                      : shot.media_url
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  )}
                >
                  {shot.media_url ? <Check className="w-4 h-4" /> : idx + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentIndex(Math.min(shots.length - 1, currentIndex + 1))}
              disabled={currentIndex === shots.length - 1}
              className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {currentShot && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              {/* Shot Header */}
              <div className="p-6 border-b border-zinc-800">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-sky-400 font-medium mb-1">
                      {currentShot.sceneName} &middot; Shot {currentShot.shotIndex + 1}
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-100">
                      {currentShot.name || `Shot ${currentShot.shotIndex + 1}`}
                    </h2>
                  </div>
                  {currentShot.media_url && (
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Complete
                    </span>
                  )}
                </div>
              </div>

              {/* Scene & Shot Context */}
              <div className="p-6 border-b border-zinc-800 space-y-4">
                {currentShot.sceneDescription && (
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wide font-medium">
                      Scene Context
                    </label>
                    <p className="mt-1 text-sm text-zinc-400">
                      {currentShot.sceneDescription}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wide font-medium">
                    Shot Description (Prompt)
                  </label>
                  <p className="mt-1 text-zinc-200">
                    {currentShot.description || "No description provided"}
                  </p>
                </div>

                {/* Optimized Prompt Preview */}
                <div className="p-4 bg-zinc-800/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <label className="text-xs text-sky-400 uppercase tracking-wide font-medium">
                      Optimized Prompt
                    </label>
                  </div>
                  <p className="text-sm text-zinc-300">{buildPrompt()}</p>
                </div>
              </div>

              {/* Model Options */}
              <div className="p-6 border-b border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-300 mb-4">Generation Options</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Style */}
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wide">Style</label>
                    <select
                      value={selectedStyle}
                      onChange={(e) => setSelectedStyle(e.target.value)}
                      className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
                    >
                      {IMAGE_STYLES.map((style) => (
                        <option key={style.id} value={style.id}>
                          {style.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Model */}
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wide">Model</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
                    >
                      {IMAGE_MODELS.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Aspect Ratio */}
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wide">
                      Aspect Ratio
                    </label>
                    <select
                      value={selectedAspect}
                      onChange={(e) => setSelectedAspect(e.target.value)}
                      className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
                    >
                      {ASPECT_RATIOS.map((ratio) => (
                        <option key={ratio.id} value={ratio.id}>
                          {ratio.label} - {ratio.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <div className="p-6 border-b border-zinc-800">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 hover:from-sky-300 hover:via-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/20 py-6 text-lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating 4 Options...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5 mr-2" />
                      Generate 4 Options
                    </>
                  )}
                </Button>
              </div>

              {/* Generated Images Grid */}
              {generatedImages.length > 0 && (
                <div className="p-6">
                  <h3 className="text-sm font-medium text-zinc-300 mb-4">
                    Select the best option
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {generatedImages.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={cn(
                          "relative aspect-video rounded-xl overflow-hidden border-2 transition-all",
                          selectedImageIndex === idx
                            ? "border-sky-500 ring-4 ring-sky-500/30"
                            : "border-zinc-700 hover:border-zinc-500"
                        )}
                      >
                        <img
                          src={url}
                          alt={`Option ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {selectedImageIndex === idx && (
                          <div className="absolute top-2 right-2 w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white">
                          Option {idx + 1}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Select & Next Button */}
                  <div className="mt-6 flex items-center gap-3">
                    <Button
                      onClick={handleSkip}
                      variant="ghost"
                      className="text-zinc-400 hover:text-zinc-300"
                    >
                      Skip this shot
                    </Button>
                    <Button
                      onClick={handleGenerate}
                      variant="outline"
                      className="border-zinc-700 text-zinc-300"
                    >
                      Regenerate
                    </Button>
                    <div className="flex-1" />
                    <Button
                      onClick={handleSelectAndNext}
                      disabled={selectedImageIndex === null || isSaving}
                      className={cn(
                        "px-8",
                        selectedImageIndex !== null
                          ? "bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-300 hover:to-emerald-400 text-white"
                          : "bg-zinc-800 text-zinc-500"
                      )}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : currentIndex < shots.length - 1 ? (
                        <>
                          Select & Next
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Select & Finish
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Show existing image if already generated */}
              {!generatedImages.length && currentShot.media_url && (
                <div className="p-6">
                  <h3 className="text-sm font-medium text-zinc-300 mb-4">Current Image</h3>
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-700">
                    <img
                      src={currentShot.media_url}
                      alt={currentShot.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Button
                      onClick={handleGenerate}
                      variant="outline"
                      className="border-zinc-700 text-zinc-300"
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Regenerate
                    </Button>
                    <Button
                      onClick={handleDeleteImage}
                      variant="outline"
                      disabled={isDeleting}
                      className="border-red-900/50 text-red-400 hover:bg-red-900/20 hover:text-red-300"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={goToPreviousStep}
            className="text-zinc-400 hover:text-zinc-300"
          >
            &larr; Back
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>

            <Button
              onClick={handleContinue}
              className="bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 hover:from-sky-300 hover:via-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/20 px-8"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
