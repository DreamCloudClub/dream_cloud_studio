import { useState } from "react"
import { Wand2, FolderOpen, Upload, Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { useProjectWizardStore, type Asset } from "@/state/projectWizardStore"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type MediaSource = "generate" | "library" | "upload" | null

export function FilmingStep() {
  const {
    shots,
    shotMedia,
    filmingProgress,
    setCurrentShotIndex,
    setShotMedia,
    markShotComplete,
    goToNextStep,
    goToPreviousStep,
    markStepComplete,
  } = useProjectWizardStore()

  const [selectedSource, setSelectedSource] = useState<MediaSource>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedOptions, setGeneratedOptions] = useState<Asset[]>([])
  const [selectedOption, setSelectedOption] = useState<Asset | null>(null)

  const currentIndex = filmingProgress.currentShotIndex
  const currentShot = shots[currentIndex]
  const currentMedia = currentShot ? shotMedia[currentShot.id] : null
  const completedCount = filmingProgress.completedShots.length
  const isCurrentComplete = currentShot && filmingProgress.completedShots.includes(currentShot.id)

  const handleSourceSelect = (source: MediaSource) => {
    setSelectedSource(source)
    setGeneratedOptions([])
    setSelectedOption(null)

    if (source === "generate") {
      handleGenerate()
    }
  }

  const handleGenerate = () => {
    setIsGenerating(true)

    // Simulate AI generation with multiple options
    setTimeout(() => {
      const options: Asset[] = Array.from({ length: 4 }, (_, i) => ({
        id: crypto.randomUUID(),
        type: "image" as const,
        url: `https://picsum.photos/seed/${Math.random()}/800/450`,
        thumbnailUrl: `https://picsum.photos/seed/${Math.random()}/200/112`,
        name: `Option ${i + 1}`,
      }))
      setGeneratedOptions(options)
      setIsGenerating(false)
    }, 2000)
  }

  const handleSelectOption = (option: Asset) => {
    setSelectedOption(option)
  }

  const handleConfirmMedia = () => {
    if (!currentShot || !selectedOption) return

    setShotMedia(currentShot.id, selectedOption)
    markShotComplete(currentShot.id)
    setSelectedSource(null)
    setGeneratedOptions([])
    setSelectedOption(null)

    // Auto-advance to next shot
    if (currentIndex < shots.length - 1) {
      setCurrentShotIndex(currentIndex + 1)
    }
  }

  const handlePreviousShot = () => {
    if (currentIndex > 0) {
      setCurrentShotIndex(currentIndex - 1)
      setSelectedSource(null)
      setGeneratedOptions([])
      setSelectedOption(null)
    }
  }

  const handleNextShot = () => {
    if (currentIndex < shots.length - 1) {
      setCurrentShotIndex(currentIndex + 1)
      setSelectedSource(null)
      setGeneratedOptions([])
      setSelectedOption(null)
    }
  }

  const handleContinue = () => {
    markStepComplete("filming")
    goToNextStep()
  }

  const allShotsComplete = completedCount === shots.length

  if (!currentShot) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-zinc-400">No shots to film. Go back and add some shots first.</p>
          <Button onClick={goToPreviousStep} className="mt-4">
            &larr; Back to Shots
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header with Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl lg:text-3xl font-bold text-zinc-100">
              Create Media
            </h1>
            <span className="text-sm text-zinc-400 bg-zinc-800 px-3 py-1 rounded-full">
              Shot {currentIndex + 1} of {shots.length}
            </span>
          </div>
          <p className="text-zinc-400">
            Generate, select, or upload media for each shot in your video.
          </p>

          {/* Progress Bar */}
          <div className="mt-4 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-blue-600 transition-all duration-300"
              style={{ width: `${(completedCount / shots.length) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {completedCount} of {shots.length} shots complete
          </p>
        </div>

        {/* Current Shot Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            {/* Shot Number */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
              {currentIndex + 1}
            </div>

            {/* Shot Details */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                  {currentShot.shotType}
                </span>
                <span className="text-xs text-zinc-500">
                  {currentShot.duration}s
                </span>
              </div>
              <p className="text-zinc-200">{currentShot.description}</p>
              {currentShot.notes && (
                <p className="text-sm text-zinc-500 mt-1">Note: {currentShot.notes}</p>
              )}
            </div>

            {/* Status */}
            {isCurrentComplete && (
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-400" />
              </div>
            )}
          </div>
        </div>

        {/* Media Selection / Preview Area */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-6">
          {/* If media already assigned, show it */}
          {currentMedia && !selectedSource ? (
            <div className="p-6">
              <div className="aspect-video bg-zinc-800 rounded-lg overflow-hidden mb-4">
                <img
                  src={currentMedia.url}
                  alt={currentMedia.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-zinc-300">Media assigned</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSource("generate")}
                  className="border-zinc-700"
                >
                  Replace
                </Button>
              </div>
            </div>
          ) : !selectedSource ? (
            /* Source Selection */
            <div className="p-6">
              <h3 className="text-lg font-semibold text-zinc-200 mb-4">
                How would you like to create media for this shot?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Generate */}
                <button
                  onClick={() => handleSourceSelect("generate")}
                  className="p-6 bg-zinc-800/50 border-2 border-zinc-700 hover:border-sky-500/50 rounded-xl text-center transition-all hover:bg-zinc-800"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 flex items-center justify-center mx-auto mb-4">
                    <Wand2 className="w-7 h-7 text-white" />
                  </div>
                  <h4 className="font-semibold text-zinc-100 mb-1">Generate</h4>
                  <p className="text-xs text-zinc-500">Create with AI</p>
                </button>

                {/* From Library */}
                <button
                  onClick={() => handleSourceSelect("library")}
                  className="p-6 bg-zinc-800/50 border-2 border-zinc-700 hover:border-zinc-600 rounded-xl text-center transition-all hover:bg-zinc-800"
                >
                  <div className="w-14 h-14 rounded-xl bg-zinc-700 flex items-center justify-center mx-auto mb-4">
                    <FolderOpen className="w-7 h-7 text-zinc-400" />
                  </div>
                  <h4 className="font-semibold text-zinc-100 mb-1">From Library</h4>
                  <p className="text-xs text-zinc-500">Use existing asset</p>
                </button>

                {/* Upload */}
                <button
                  onClick={() => handleSourceSelect("upload")}
                  className="p-6 bg-zinc-800/50 border-2 border-zinc-700 hover:border-zinc-600 rounded-xl text-center transition-all hover:bg-zinc-800"
                >
                  <div className="w-14 h-14 rounded-xl bg-zinc-700 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-7 h-7 text-zinc-400" />
                  </div>
                  <h4 className="font-semibold text-zinc-100 mb-1">Upload</h4>
                  <p className="text-xs text-zinc-500">From your computer</p>
                </button>
              </div>
            </div>
          ) : selectedSource === "generate" ? (
            /* Generation View */
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-zinc-200">
                  Generated Options
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSource(null)}
                  className="text-zinc-400"
                >
                  Cancel
                </Button>
              </div>

              {isGenerating ? (
                <div className="aspect-video bg-zinc-800 rounded-lg flex flex-col items-center justify-center">
                  <Loader2 className="w-10 h-10 text-sky-400 animate-spin mb-4" />
                  <p className="text-zinc-400">Generating options...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {generatedOptions.map((option, idx) => (
                      <button
                        key={option.id}
                        onClick={() => handleSelectOption(option)}
                        className={cn(
                          "relative aspect-video bg-zinc-800 rounded-lg overflow-hidden transition-all",
                          selectedOption?.id === option.id
                            ? "ring-2 ring-sky-500 ring-offset-2 ring-offset-zinc-900"
                            : "hover:ring-2 hover:ring-zinc-600"
                        )}
                      >
                        <img
                          src={option.url}
                          alt={option.name}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-1 rounded">
                          Option {idx + 1}
                        </span>
                        {selectedOption?.id === option.id && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={handleGenerate}
                      className="border-zinc-700"
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Regenerate
                    </Button>
                    <Button
                      onClick={handleConfirmMedia}
                      disabled={!selectedOption}
                      className={cn(
                        selectedOption
                          ? "bg-sky-500 hover:bg-sky-400 text-white"
                          : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      )}
                    >
                      Use Selected
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : selectedSource === "library" ? (
            /* Library View */
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-zinc-200">
                  Select from Library
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSource(null)}
                  className="text-zinc-400"
                >
                  Cancel
                </Button>
              </div>
              <div className="aspect-video bg-zinc-800 rounded-lg flex flex-col items-center justify-center">
                <FolderOpen className="w-12 h-12 text-zinc-600 mb-4" />
                <p className="text-zinc-400">Asset library coming soon</p>
                <p className="text-sm text-zinc-600">Use Generate or Upload for now</p>
              </div>
            </div>
          ) : (
            /* Upload View */
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-zinc-200">
                  Upload Media
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSource(null)}
                  className="text-zinc-400"
                >
                  Cancel
                </Button>
              </div>
              <div className="aspect-video bg-zinc-800 border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-zinc-600 transition-colors">
                <Upload className="w-12 h-12 text-zinc-600 mb-4" />
                <p className="text-zinc-400">Click to upload or drag and drop</p>
                <p className="text-sm text-zinc-600">PNG, JPG, MP4 up to 100MB</p>
              </div>
            </div>
          )}
        </div>

        {/* Shot Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={handlePreviousShot}
            disabled={currentIndex === 0}
            className={cn(
              currentIndex === 0
                ? "text-zinc-600 cursor-not-allowed"
                : "text-zinc-400 hover:text-zinc-300"
            )}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous Shot
          </Button>

          {/* Shot Dots */}
          <div className="flex gap-1.5">
            {shots.map((shot, idx) => (
              <button
                key={shot.id}
                onClick={() => {
                  setCurrentShotIndex(idx)
                  setSelectedSource(null)
                  setGeneratedOptions([])
                  setSelectedOption(null)
                }}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all",
                  idx === currentIndex
                    ? "bg-sky-500 w-6"
                    : filmingProgress.completedShots.includes(shot.id)
                    ? "bg-green-500"
                    : "bg-zinc-700 hover:bg-zinc-600"
                )}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            onClick={handleNextShot}
            disabled={currentIndex === shots.length - 1}
            className={cn(
              currentIndex === shots.length - 1
                ? "text-zinc-600 cursor-not-allowed"
                : "text-zinc-400 hover:text-zinc-300"
            )}
          >
            Next Shot
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={goToPreviousStep}
            className="text-zinc-400 hover:text-zinc-300"
          >
            &larr; Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!allShotsComplete}
            className={cn(
              "px-8",
              allShotsComplete
                ? "bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 hover:from-sky-300 hover:via-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/20"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            {allShotsComplete ? "Continue" : `${completedCount}/${shots.length} Complete`}
          </Button>
        </div>
      </div>
    </div>
  )
}
