import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Video,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Save,
  Play,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react"
import { useProjectWizardStore } from "@/state/projectWizardStore"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getScenesWithShots, updateShot } from "@/services/projects"
import { generateVideo } from "@/services/replicate"
import type { Shot } from "@/types/database"

// Video generation models
const VIDEO_MODELS = [
  { id: "kling", label: "Kling v2.1", description: "Best quality, 5 or 10 sec" },
  { id: "minimax", label: "Minimax Video-01", description: "Good quality, 6 sec fixed" },
]

// Duration options (Kling only)
const DURATION_OPTIONS = [
  { id: 5, label: "5 seconds", description: "Quick clip" },
  { id: 10, label: "10 seconds", description: "Full scene" },
]

// Quality options (Kling only)
const QUALITY_OPTIONS = [
  { id: "pro", label: "1080p Pro", description: "$0.09/sec" },
  { id: "standard", label: "720p Standard", description: "$0.05/sec" },
]

// Motion prompt presets
const MOTION_PRESETS = [
  { id: "cinematic", label: "Cinematic", prompt: "Smooth cinematic motion, gentle camera movement, professional cinematography" },
  { id: "dynamic", label: "Dynamic", prompt: "Dynamic motion, energetic movement, exciting camera work" },
  { id: "subtle", label: "Subtle", prompt: "Subtle gentle motion, minimal movement, calm atmosphere" },
  { id: "zoom", label: "Slow Zoom", prompt: "Slow zoom in, dramatic reveal, focused movement" },
  { id: "pan", label: "Pan Shot", prompt: "Smooth horizontal pan, sweeping view, cinematic pan" },
]

interface ShotWithScene extends Shot {
  sceneName: string
  sceneDescription: string | null
  sceneIndex: number
  shotIndex: number
}

export function FilmingStep() {
  const navigate = useNavigate()
  const {
    goToNextStep,
    goToPreviousStep,
    markStepComplete,
    projectId,
  } = useProjectWizardStore()

  const [isLoading, setIsLoading] = useState(true)
  const [shots, setShots] = useState<ShotWithScene[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Video generation options
  const [selectedModel, setSelectedModel] = useState("kling")
  const [selectedDuration, setSelectedDuration] = useState<5 | 10>(5)
  const [selectedQuality, setSelectedQuality] = useState<"standard" | "pro">("pro")
  const [selectedMotionPreset, setSelectedMotionPreset] = useState("cinematic")

  // Load shots with images from database
  useEffect(() => {
    async function loadShots() {
      if (!projectId) {
        setIsLoading(false)
        return
      }

      try {
        const scenesWithShots = await getScenesWithShots(projectId)

        // Flatten and filter to only shots that have images
        const shotQueue: ShotWithScene[] = []
        scenesWithShots.forEach((scene, sceneIdx) => {
          scene.shots.forEach((shot, shotIdx) => {
            // Only include shots that have a source image
            if (shot.media_url && shot.media_type === "image") {
              shotQueue.push({
                ...shot,
                sceneName: scene.name,
                sceneDescription: scene.description,
                sceneIndex: sceneIdx,
                shotIndex: shotIdx,
              })
            }
          })
        })

        setShots(shotQueue)

        // Find first shot without video
        const firstIncomplete = shotQueue.findIndex((s) => !s.video_url)
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
  const completedCount = shots.filter((s) => s.video_url).length

  const handleGenerate = async () => {
    if (!currentShot?.media_url) return

    setIsGenerating(true)
    setGeneratedVideoUrl(null)

    try {
      console.log("Generating video from image:", currentShot.media_url)

      // Get the motion prompt from the preset
      const motionPreset = MOTION_PRESETS.find(p => p.id === selectedMotionPreset)
      const motionPrompt = motionPreset?.prompt || ""

      // Combine shot description with motion prompt
      const fullPrompt = currentShot.description
        ? `${currentShot.description}. ${motionPrompt}`
        : motionPrompt

      const videoUrl = await generateVideo({
        imageUrl: currentShot.media_url,
        prompt: fullPrompt,
        duration: selectedModel === "kling" ? selectedDuration : undefined,
        quality: selectedModel === "kling" ? selectedQuality : undefined,
        model: selectedModel as "kling" | "minimax",
      })

      setGeneratedVideoUrl(videoUrl)
    } catch (error) {
      console.error("Error generating video:", error)
      alert("Error generating video: " + (error instanceof Error ? error.message : "Unknown error"))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSelectAndNext = async () => {
    if (!generatedVideoUrl || !currentShot) return

    setIsSaving(true)
    try {
      // Save video URL to database
      await updateShot(currentShot.id, {
        video_url: generatedVideoUrl,
      })

      // Update local state
      const updatedShots = [...shots]
      updatedShots[currentIndex] = {
        ...updatedShots[currentIndex],
        video_url: generatedVideoUrl,
      }
      setShots(updatedShots)

      // Reset for next shot
      setGeneratedVideoUrl(null)

      // Move to next shot or finish
      if (currentIndex < shots.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    } catch (error) {
      console.error("Error saving video:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveDraft = () => {
    navigate("/library/projects")
  }

  const handleContinue = () => {
    markStepComplete("filming")
    goToNextStep()
  }

  const handleSkip = () => {
    setGeneratedVideoUrl(null)
    if (currentIndex < shots.length - 1) {
      setCurrentIndex(currentIndex + 1)
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
        <h2 className="text-xl font-semibold text-zinc-200 mb-2">No images to animate</h2>
        <p className="text-zinc-400 mb-6">Go back and generate some images first.</p>
        <Button onClick={goToPreviousStep} variant="outline">
          &larr; Back to Generate
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
            <h1 className="text-xl font-bold text-zinc-100">Create Videos</h1>
            <div className="text-sm text-zinc-400">
              <span className="text-sky-400 font-medium">{completedCount}</span> of{" "}
              <span className="font-medium">{shots.length}</span> videos complete
            </div>
          </div>

          {/* Shot Queue Carousel */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCurrentIndex(Math.max(0, currentIndex - 1))
                setGeneratedVideoUrl(null)
              }}
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
                    setGeneratedVideoUrl(null)
                  }}
                  className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all",
                    idx === currentIndex
                      ? "bg-sky-500 text-white ring-2 ring-sky-400/50"
                      : shot.video_url
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  )}
                >
                  {shot.video_url ? <Check className="w-4 h-4" /> : idx + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setCurrentIndex(Math.min(shots.length - 1, currentIndex + 1))
                setGeneratedVideoUrl(null)
              }}
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
                  {currentShot.video_url && (
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Complete
                    </span>
                  )}
                </div>
              </div>

              {/* Source Image Preview */}
              <div className="p-6 border-b border-zinc-800">
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon className="w-4 h-4 text-zinc-400" />
                  <label className="text-xs text-zinc-500 uppercase tracking-wide font-medium">
                    Source Image
                  </label>
                </div>
                <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800">
                  <img
                    src={currentShot.media_url!}
                    alt={currentShot.name || "Source image"}
                    className="w-full h-full object-cover"
                  />
                </div>

                {currentShot.description && (
                  <div className="mt-4">
                    <label className="text-xs text-zinc-500 uppercase tracking-wide font-medium">
                      Shot Description
                    </label>
                    <p className="mt-1 text-sm text-zinc-300">{currentShot.description}</p>
                  </div>
                )}
              </div>

              {/* Video Generation Options */}
              <div className="p-6 border-b border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-300 mb-4">Video Options</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Model */}
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wide">Model</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
                    >
                      {VIDEO_MODELS.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Duration (Kling only) */}
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wide">Duration</label>
                    <select
                      value={selectedDuration}
                      onChange={(e) => setSelectedDuration(Number(e.target.value) as 5 | 10)}
                      disabled={selectedModel !== "kling"}
                      className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-sky-500 disabled:opacity-50"
                    >
                      {DURATION_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quality (Kling only) */}
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wide">Quality</label>
                    <select
                      value={selectedQuality}
                      onChange={(e) => setSelectedQuality(e.target.value as "standard" | "pro")}
                      disabled={selectedModel !== "kling"}
                      className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-sky-500 disabled:opacity-50"
                    >
                      {QUALITY_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Motion Preset */}
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wide">Motion Style</label>
                    <select
                      value={selectedMotionPreset}
                      onChange={(e) => setSelectedMotionPreset(e.target.value)}
                      className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
                    >
                      {MOTION_PRESETS.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Info box */}
                <div className="mt-4 p-4 bg-zinc-800/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <label className="text-xs text-purple-400 uppercase tracking-wide font-medium">
                      {selectedModel === "kling" ? "Kling v2.1" : "Minimax Video-01"}
                    </label>
                  </div>
                  <p className="text-sm text-zinc-400">
                    {selectedModel === "kling"
                      ? `Creates high-quality ${selectedDuration} second videos at ${selectedQuality === "pro" ? "1080p" : "720p"}. Generation takes 2-4 minutes.`
                      : "Creates 6 second videos at high quality. Generation takes 1-2 minutes."
                    }
                  </p>
                </div>
              </div>

              {/* Generate Button */}
              <div className="p-6 border-b border-zinc-800">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-purple-400 via-purple-500 to-indigo-600 hover:from-purple-300 hover:via-purple-400 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20 py-6 text-lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating Video...
                    </>
                  ) : (
                    <>
                      <Video className="w-5 h-5 mr-2" />
                      Generate Video
                    </>
                  )}
                </Button>
              </div>

              {/* Generated Video Preview */}
              {generatedVideoUrl && (
                <div className="p-6">
                  <h3 className="text-sm font-medium text-zinc-300 mb-4">Generated Video</h3>
                  <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-sky-500 bg-zinc-800">
                    <video
                      src={generatedVideoUrl}
                      controls
                      autoPlay
                      loop
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 rounded text-xs text-white flex items-center gap-1">
                      <Play className="w-3 h-3" />
                      Preview
                    </div>
                  </div>

                  {/* Action Buttons */}
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
                      disabled={isSaving}
                      className="px-8 bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-300 hover:to-emerald-400 text-white"
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

              {/* Show existing video if already generated */}
              {!generatedVideoUrl && currentShot.video_url && (
                <div className="p-6">
                  <h3 className="text-sm font-medium text-zinc-300 mb-4">Current Video</h3>
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-700">
                    <video
                      src={currentShot.video_url}
                      controls
                      loop
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Button
                      onClick={handleGenerate}
                      variant="outline"
                      className="border-zinc-700 text-zinc-300"
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Regenerate
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
