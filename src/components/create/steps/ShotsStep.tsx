import { useState, useEffect } from "react"
import { Wand2, Plus, Trash2, GripVertical, Loader2 } from "lucide-react"
import { useProjectWizardStore, type Shot } from "@/state/projectWizardStore"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Shot type options
const shotTypes = [
  "Wide shot",
  "Medium shot",
  "Close-up",
  "Extreme close-up",
  "Over the shoulder",
  "POV",
  "Aerial",
  "Tracking",
  "Static",
  "Pan",
  "Tilt",
  "Dolly",
]

export function ShotsStep() {
  const {
    shots,
    setShots,
    updateShot,
    addShot,
    removeShot,
    storyboard,
    goToNextStep,
    goToPreviousStep,
    markStepComplete,
  } = useProjectWizardStore()

  const [isGenerating, setIsGenerating] = useState(false)
  const [localShots, setLocalShots] = useState<Shot[]>(shots)

  // Sync local state with store
  useEffect(() => {
    setLocalShots(shots)
  }, [shots])

  const generateShots = () => {
    setIsGenerating(true)

    // Simulate AI generating shots based on storyboard
    setTimeout(() => {
      const generatedShots: Shot[] = []
      let shotNumber = 1

      // Generate 2-3 shots per beat
      storyboard?.acts.forEach((act, actIndex) => {
        act.beats.forEach((beat) => {
          // Add 1-3 shots per beat
          const numShots = Math.floor(Math.random() * 2) + 1
          for (let i = 0; i < numShots; i++) {
            generatedShots.push({
              id: crypto.randomUUID(),
              sceneIndex: actIndex,
              shotNumber: shotNumber++,
              description: generateShotDescription(beat.description, i),
              duration: Math.floor(Math.random() * 3) + 2, // 2-5 seconds
              shotType: shotTypes[Math.floor(Math.random() * shotTypes.length)],
              notes: "",
            })
          }
        })
      })

      // If no storyboard, generate some default shots
      if (generatedShots.length === 0) {
        generatedShots.push(
          {
            id: crypto.randomUUID(),
            sceneIndex: 0,
            shotNumber: 1,
            description: "Opening wide shot establishing the scene",
            duration: 3,
            shotType: "Wide shot",
            notes: "",
          },
          {
            id: crypto.randomUUID(),
            sceneIndex: 0,
            shotNumber: 2,
            description: "Medium shot of main subject",
            duration: 4,
            shotType: "Medium shot",
            notes: "",
          },
          {
            id: crypto.randomUUID(),
            sceneIndex: 1,
            shotNumber: 3,
            description: "Close-up detail shot",
            duration: 2,
            shotType: "Close-up",
            notes: "",
          },
          {
            id: crypto.randomUUID(),
            sceneIndex: 2,
            shotNumber: 4,
            description: "Final wide shot with call to action",
            duration: 5,
            shotType: "Wide shot",
            notes: "",
          }
        )
      }

      setLocalShots(generatedShots)
      setShots(generatedShots)
      setIsGenerating(false)
    }, 2000)
  }

  const handleUpdateShot = (shotId: string, field: keyof Shot, value: string | number) => {
    const updated = localShots.map((shot) =>
      shot.id === shotId ? { ...shot, [field]: value } : shot
    )
    setLocalShots(updated)
    updateShot(shotId, { [field]: value })
  }

  const handleAddShot = () => {
    const newShot: Shot = {
      id: crypto.randomUUID(),
      sceneIndex: 0,
      shotNumber: localShots.length + 1,
      description: "",
      duration: 3,
      shotType: "Medium shot",
      notes: "",
    }
    const updated = [...localShots, newShot]
    setLocalShots(updated)
    addShot(newShot)
  }

  const handleRemoveShot = (shotId: string) => {
    const updated = localShots.filter((s) => s.id !== shotId)
    setLocalShots(updated)
    removeShot(shotId)
  }

  const handleContinue = () => {
    setShots(localShots)
    markStepComplete("shots")
    goToNextStep()
  }

  const totalDuration = localShots.reduce((sum, shot) => sum + shot.duration, 0)

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-zinc-100 mb-2">
            Shot List
          </h1>
          <p className="text-zinc-400">
            Plan each shot in your video. Generate a list automatically or build it manually.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-6 p-4 bg-zinc-900 border border-zinc-800 rounded-xl mb-6">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Shots</p>
            <p className="text-xl font-semibold text-zinc-100">{localShots.length}</p>
          </div>
          <div className="w-px h-10 bg-zinc-800" />
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Est. Duration</p>
            <p className="text-xl font-semibold text-zinc-100">
              {totalDuration}s
              <span className="text-sm text-zinc-500 ml-1">
                ({Math.floor(totalDuration / 60)}:{(totalDuration % 60).toString().padStart(2, "0")})
              </span>
            </p>
          </div>
          <div className="flex-1" />
          <Button
            onClick={generateShots}
            disabled={isGenerating}
            className="bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 hover:from-sky-300 hover:via-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/20"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Shots
              </>
            )}
          </Button>
        </div>

        {/* Shots List */}
        {localShots.length > 0 ? (
          <div className="space-y-3">
            {localShots.map((shot, index) => (
              <div
                key={shot.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Drag Handle & Number */}
                  <div className="flex items-center gap-2 pt-2">
                    <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab" />
                    <span className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-sm font-semibold text-zinc-400">
                      {index + 1}
                    </span>
                  </div>

                  {/* Shot Details */}
                  <div className="flex-1 space-y-3">
                    {/* Description */}
                    <textarea
                      value={shot.description}
                      onChange={(e) =>
                        handleUpdateShot(shot.id, "description", e.target.value)
                      }
                      placeholder="Describe this shot..."
                      rows={2}
                      className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
                    />

                    {/* Shot Properties */}
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Shot Type */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-zinc-500">Type:</label>
                        <select
                          value={shot.shotType}
                          onChange={(e) =>
                            handleUpdateShot(shot.id, "shotType", e.target.value)
                          }
                          className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300 focus:outline-none"
                        >
                          {shotTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Duration */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-zinc-500">Duration:</label>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={shot.duration}
                          onChange={(e) =>
                            handleUpdateShot(
                              shot.id,
                              "duration",
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-16 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300 focus:outline-none text-center"
                        />
                        <span className="text-xs text-zinc-500">sec</span>
                      </div>

                      {/* Notes */}
                      <div className="flex-1">
                        <input
                          type="text"
                          value={shot.notes}
                          onChange={(e) =>
                            handleUpdateShot(shot.id, "notes", e.target.value)
                          }
                          placeholder="Notes..."
                          className="w-full px-2 py-1 bg-zinc-800/50 border border-zinc-800 rounded text-xs text-zinc-400 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleRemoveShot(shot.id)}
                    className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
            <Wand2 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-300 mb-2">
              No shots yet
            </h3>
            <p className="text-sm text-zinc-500 mb-6">
              Generate shots based on your story structure, or add them manually.
            </p>
            <div className="flex justify-center gap-3">
              <Button
                onClick={generateShots}
                disabled={isGenerating}
                className="bg-sky-500 hover:bg-sky-400 text-white"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Shots
              </Button>
              <Button
                variant="outline"
                onClick={handleAddShot}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Manually
              </Button>
            </div>
          </div>
        )}

        {/* Add Shot Button */}
        {localShots.length > 0 && (
          <button
            onClick={handleAddShot}
            className="w-full mt-4 p-4 border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-400 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Shot
          </button>
        )}

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
            disabled={localShots.length === 0}
            className={cn(
              "px-8",
              localShots.length > 0
                ? "bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 hover:from-sky-300 hover:via-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/20"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}

// Helper to generate shot descriptions based on beat content
function generateShotDescription(beatDescription: string, variant: number): string {
  const prefixes = [
    "Establishing shot:",
    "Close-up of",
    "Wide angle showing",
    "Detail shot:",
    "Tracking shot following",
    "POV shot:",
  ]
  const prefix = prefixes[variant % prefixes.length]

  if (beatDescription.length > 50) {
    return `${prefix} ${beatDescription.slice(0, 50)}...`
  }
  return `${prefix} ${beatDescription}`
}
