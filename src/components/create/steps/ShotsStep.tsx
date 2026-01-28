import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
  Image as ImageIcon,
  Film,
  Clock,
  Pencil,
  Check,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react"
import { useProjectWizardStore } from "@/state/projectWizardStore"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  getScenesWithShots,
  createShot,
  updateShot,
  deleteShot,
} from "@/services/projects"
import type { SceneWithShots, Shot } from "@/types/database"

// Shot types for quick selection
const SHOT_TYPES = [
  { id: "Wide", label: "Wide", description: "Establishing shot" },
  { id: "Medium", label: "Medium", description: "Standard framing" },
  { id: "Close-up", label: "Close-up", description: "Detail focus" },
  { id: "Over-shoulder", label: "OTS", description: "Over the shoulder" },
  { id: "POV", label: "POV", description: "Point of view" },
]

interface ShotWithScene extends Shot {
  sceneName: string
  sceneIndex: number
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
  const [scenes, setScenes] = useState<SceneWithShots[]>([])
  const [editingShot, setEditingShot] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [expandedScene, setExpandedScene] = useState<string | null>(null)

  // Editing state
  const [editDescription, setEditDescription] = useState("")
  const [editDuration, setEditDuration] = useState(3)
  const [editShotType, setEditShotType] = useState("Medium")

  // Load scenes and shots from database
  useEffect(() => {
    async function loadScenes() {
      if (!projectId) {
        setIsLoading(false)
        return
      }

      try {
        const scenesWithShots = await getScenesWithShots(projectId)
        setScenes(scenesWithShots)

        // Expand first scene by default
        if (scenesWithShots.length > 0) {
          setExpandedScene(scenesWithShots[0].id)
        }
      } catch (error) {
        console.error("Error loading scenes:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadScenes()
  }, [projectId])

  const totalShots = scenes.reduce((acc, scene) => acc + scene.shots.length, 0)
  const totalDuration = scenes.reduce(
    (acc, scene) => acc + scene.shots.reduce((shotAcc, shot) => shotAcc + (shot.duration || 3), 0),
    0
  )

  const handleStartEdit = (shot: Shot) => {
    setEditingShot(shot.id)
    setEditDescription(shot.description || "")
    setEditDuration(shot.duration || 3)
    setEditShotType(shot.shot_type || "Medium")
  }

  const handleSaveEdit = async () => {
    if (!editingShot) return

    setIsSaving(true)
    try {
      await updateShot(editingShot, {
        description: editDescription,
        duration: editDuration,
        shot_type: editShotType,
      })

      // Update local state
      setScenes(scenes.map(scene => ({
        ...scene,
        shots: scene.shots.map(shot =>
          shot.id === editingShot
            ? { ...shot, description: editDescription, duration: editDuration, shot_type: editShotType }
            : shot
        ),
      })))

      setEditingShot(null)
    } catch (error) {
      console.error("Error saving shot:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingShot(null)
    setEditDescription("")
    setEditDuration(3)
    setEditShotType("Medium")
  }

  const handleAddShot = async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId)
    if (!scene) return

    setIsSaving(true)
    try {
      const newShot = await createShot({
        scene_id: sceneId,
        name: `Shot ${scene.shots.length + 1}`,
        description: "",
        duration: 3,
        sort_order: scene.shots.length,
        shot_type: "Medium",
      })

      // Update local state
      setScenes(scenes.map(s =>
        s.id === sceneId
          ? { ...s, shots: [...s.shots, newShot] }
          : s
      ))

      // Start editing the new shot
      handleStartEdit(newShot)
    } catch (error) {
      console.error("Error adding shot:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteShot = async (shotId: string) => {
    if (!confirm("Delete this shot?")) return

    setIsSaving(true)
    try {
      await deleteShot(shotId)

      // Update local state
      setScenes(scenes.map(scene => ({
        ...scene,
        shots: scene.shots.filter(shot => shot.id !== shotId),
      })))
    } catch (error) {
      console.error("Error deleting shot:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveDraft = () => {
    // Data is already saved to database as you edit - nothing more needed
  }

  const handleContinue = () => {
    // Note: "shots" step removed from wizard - this file kept for legacy
    goToNextStep()
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    )
  }

  if (scenes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <Film className="w-16 h-16 text-zinc-600 mb-4" />
        <h2 className="text-xl font-semibold text-zinc-200 mb-2">No scenes found</h2>
        <p className="text-zinc-400 mb-6">Go back and create your storyboard first.</p>
        <Button onClick={goToPreviousStep} variant="outline">
          &larr; Back to Storyboard
        </Button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with Stats */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-zinc-100">Shot Planning</h1>
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" />
                <span className="text-sky-400 font-medium">{totalShots}</span> shots
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span className="text-sky-400 font-medium">{totalDuration}s</span> total
              </span>
            </div>
          </div>

          <p className="text-sm text-zinc-500">
            Review and refine your shots. You'll generate images and videos in the Workspace.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {scenes.map((scene, sceneIdx) => (
            <div
              key={scene.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
            >
              {/* Scene Header */}
              <button
                onClick={() => setExpandedScene(expandedScene === scene.id ? null : scene.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-sky-500/20 text-sky-400 rounded-lg flex items-center justify-center text-sm font-medium">
                    {sceneIdx + 1}
                  </span>
                  <div className="text-left">
                    <h3 className="font-medium text-zinc-200">{scene.name}</h3>
                    <p className="text-xs text-zinc-500">
                      {scene.shots.length} shot{scene.shots.length !== 1 ? "s" : ""} &middot;{" "}
                      {scene.shots.reduce((acc, s) => acc + (s.duration || 3), 0)}s
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className={cn(
                    "w-5 h-5 text-zinc-500 transition-transform",
                    expandedScene === scene.id && "rotate-90"
                  )}
                />
              </button>

              {/* Shots List */}
              {expandedScene === scene.id && (
                <div className="border-t border-zinc-800">
                  {scene.shots.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-sm text-zinc-500 mb-3">No shots in this scene yet.</p>
                      <Button
                        onClick={() => handleAddShot(scene.id)}
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 text-zinc-300"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Shot
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800">
                      {scene.shots.map((shot, shotIdx) => (
                        <div
                          key={shot.id}
                          className={cn(
                            "p-4 transition-colors",
                            editingShot === shot.id ? "bg-zinc-800/50" : "hover:bg-zinc-800/30"
                          )}
                        >
                          {editingShot === shot.id ? (
                            // Edit Mode
                            <div className="space-y-4">
                              <div className="flex items-start gap-3">
                                <span className="w-6 h-6 bg-zinc-700 text-zinc-400 rounded flex items-center justify-center text-xs font-medium flex-shrink-0 mt-1">
                                  {shotIdx + 1}
                                </span>
                                <div className="flex-1 space-y-3">
                                  <textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    placeholder="Describe what happens in this shot..."
                                    rows={3}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 focus:border-sky-500 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
                                  />
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs text-zinc-500">Type:</label>
                                      <select
                                        value={editShotType}
                                        onChange={(e) => setEditShotType(e.target.value)}
                                        className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
                                      >
                                        {SHOT_TYPES.map((type) => (
                                          <option key={type.id} value={type.id}>
                                            {type.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs text-zinc-500">Duration:</label>
                                      <input
                                        type="number"
                                        min={1}
                                        max={60}
                                        value={editDuration}
                                        onChange={(e) => setEditDuration(Number(e.target.value))}
                                        className="w-16 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
                                      />
                                      <span className="text-xs text-zinc-500">sec</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-end gap-2 pt-2">
                                <Button
                                  onClick={handleCancelEdit}
                                  variant="ghost"
                                  size="sm"
                                  className="text-zinc-400"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleSaveEdit}
                                  size="sm"
                                  disabled={isSaving}
                                  className="bg-sky-500 hover:bg-sky-400 text-white"
                                >
                                  {isSaving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Check className="w-4 h-4 mr-1" />
                                      Save
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <div className="flex items-start gap-3">
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab" />
                                <span className="w-6 h-6 bg-zinc-700 text-zinc-400 rounded flex items-center justify-center text-xs font-medium">
                                  {shotIdx + 1}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-zinc-300">
                                  {shot.description || (
                                    <span className="text-zinc-600 italic">No description</span>
                                  )}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                                  <span className="px-1.5 py-0.5 bg-zinc-800 rounded">
                                    {shot.shot_type || "Medium"}
                                  </span>
                                  <span>{shot.duration || 3}s</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => handleStartEdit(shot)}
                                  className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteShot(shot.id)}
                                  className="p-1.5 text-zinc-500 hover:text-orange-400 hover:bg-zinc-800 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add Shot Button */}
                      <div className="p-3">
                        <Button
                          onClick={() => handleAddShot(scene.id)}
                          variant="ghost"
                          size="sm"
                          className="w-full text-zinc-500 hover:text-zinc-300 border border-dashed border-zinc-800 hover:border-zinc-700"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Shot
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Info Banner */}
      <div className="px-6 pb-2">
        <div className="max-w-4xl mx-auto">
          <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-xl">
            <p className="text-sm text-sky-300">
              <strong>Next step:</strong> After reviewing, you'll be taken to the Workspace where you
              can generate images, create videos, and add audio for each shot.
            </p>
          </div>
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
              Continue to Review
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
