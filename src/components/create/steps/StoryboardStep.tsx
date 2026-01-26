import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight, Loader2, Save } from "lucide-react"
import { useProjectWizardStore, type Act } from "@/state/projectWizardStore"
import { Button } from "@/components/ui/button"
import {
  getScenesWithShots,
  createScene,
  updateScene,
  deleteScene,
  createShot,
  updateShot,
  deleteShot,
} from "@/services/projects"

// Default scene structure - start with 1 empty scene and 3 placeholder shots
const defaultActs: Act[] = [
  {
    id: "new-scene-1",
    name: "Scene 1",
    description: "",
    beats: [
      { id: "new-shot-1-1", title: "", description: "" },
      { id: "new-shot-1-2", title: "", description: "" },
      { id: "new-shot-1-3", title: "", description: "" },
    ],
  },
]

// Check if an ID is a valid UUID (from database) vs a local placeholder
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

// Check if this is a new item (not yet in database)
const isNewItem = (id: string): boolean => {
  return id.startsWith("new-") || !isValidUUID(id)
}

export function StoryboardStep() {
  const navigate = useNavigate()
  const { storyboard, setStoryboard, goToNextStep, goToPreviousStep, markStepComplete, projectId } =
    useProjectWizardStore()

  const [acts, setActs] = useState<Act[]>(storyboard?.acts || defaultActs)
  const [expandedActs, setExpandedActs] = useState<Set<string>>(
    new Set(acts.map((a) => a.id))
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [deletedSceneIds, setDeletedSceneIds] = useState<string[]>([])
  const [deletedShotIds, setDeletedShotIds] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-resize all description textareas when data changes
  useEffect(() => {
    if (isLoading) return
    // Small delay to ensure DOM is updated
    const timer = setTimeout(() => {
      const textareas = containerRef.current?.querySelectorAll('textarea')
      textareas?.forEach((textarea) => {
        textarea.style.height = 'auto'
        textarea.style.height = textarea.scrollHeight + 'px'
      })
    }, 50)
    return () => clearTimeout(timer)
  }, [acts, isLoading, expandedActs])

  // Load existing scenes and shots from database
  useEffect(() => {
    async function loadScenesAndShots() {
      if (!projectId) {
        setIsLoading(false)
        return
      }

      try {
        const scenesWithShots = await getScenesWithShots(projectId)

        if (scenesWithShots.length > 0) {
          // Convert DB format to our local state format
          const loadedActs: Act[] = scenesWithShots.map((scene) => ({
            id: scene.id, // Use actual DB ID
            name: scene.name,
            description: scene.description || "",
            beats: scene.shots.map((shot) => ({
              id: shot.id, // Use actual DB ID
              title: shot.name,
              description: shot.description || "",
            })),
          }))
          setActs(loadedActs)
          setStoryboard({ acts: loadedActs })
          setExpandedActs(new Set(loadedActs.map((a) => a.id)))
        }
      } catch (error) {
        console.error("Error loading scenes:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadScenesAndShots()
  }, [projectId])

  // Sync local state when store's storyboard changes (e.g., from Bubble AI)
  useEffect(() => {
    if (storyboard?.acts && storyboard.acts.length > 0) {
      // Build a fingerprint that includes scenes AND shots
      const getFingerprint = (actList: typeof acts) =>
        actList.map(a => `${a.id}:${a.beats.map(b => b.id).join(',')}`).join('|')

      const storeFingerprint = getFingerprint(storyboard.acts)
      const localFingerprint = getFingerprint(acts)

      if (storeFingerprint !== localFingerprint) {
        setActs(storyboard.acts)
        setExpandedActs(new Set(storyboard.acts.map((a) => a.id)))
      }
    }
  }, [storyboard])

  const toggleActExpanded = (actId: string) => {
    const newExpanded = new Set(expandedActs)
    if (newExpanded.has(actId)) {
      newExpanded.delete(actId)
    } else {
      newExpanded.add(actId)
    }
    setExpandedActs(newExpanded)
  }

  const updateActName = (actId: string, name: string) => {
    setActs(acts.map((act) => (act.id === actId ? { ...act, name } : act)))
  }

  const updateActDescription = (actId: string, description: string) => {
    setActs(
      acts.map((act) => (act.id === actId ? { ...act, description } : act))
    )
  }

  const updateShotTitle = (actId: string, beatId: string, title: string) => {
    setActs(
      acts.map((act) =>
        act.id === actId
          ? {
              ...act,
              beats: act.beats.map((beat) =>
                beat.id === beatId ? { ...beat, title } : beat
              ),
            }
          : act
      )
    )
  }

  const updateShotDescription = (actId: string, beatId: string, description: string) => {
    setActs(
      acts.map((act) =>
        act.id === actId
          ? {
              ...act,
              beats: act.beats.map((beat) =>
                beat.id === beatId ? { ...beat, description } : beat
              ),
            }
          : act
      )
    )
  }

  const addShot = (actId: string) => {
    setActs(
      acts.map((a) =>
        a.id === actId
          ? {
              ...a,
              beats: [
                ...a.beats,
                { id: `new-shot-${crypto.randomUUID()}`, title: "", description: "" },
              ],
            }
          : a
      )
    )
  }

  const removeBeat = (actId: string, beatId: string) => {
    // Track deleted shots that exist in DB (have valid UUID)
    if (!isNewItem(beatId)) {
      setDeletedShotIds([...deletedShotIds, beatId])
    }
    setActs(
      acts.map((act) =>
        act.id === actId
          ? { ...act, beats: act.beats.filter((b) => b.id !== beatId) }
          : act
      )
    )
  }

  const addScene = () => {
    const sceneNum = acts.length + 1
    const newAct: Act = {
      id: `new-scene-${crypto.randomUUID()}`,
      name: `Scene ${sceneNum}`,
      description: "",
      beats: [
        { id: `new-shot-${crypto.randomUUID()}`, title: "", description: "" },
      ],
    }
    setActs([...acts, newAct])
    setExpandedActs(new Set([...expandedActs, newAct.id]))
  }

  const removeAct = (actId: string) => {
    if (acts.length > 1) {
      // Track deleted scenes that exist in DB (have valid UUID)
      if (!isNewItem(actId)) {
        setDeletedSceneIds([...deletedSceneIds, actId])
        // Also track all shots in this scene for deletion
        const act = acts.find(a => a.id === actId)
        if (act) {
          const shotIdsToDelete = act.beats
            .filter(b => !isNewItem(b.id))
            .map(b => b.id)
          setDeletedShotIds([...deletedShotIds, ...shotIdsToDelete])
        }
      }
      setActs(acts.filter((a) => a.id !== actId))
    }
  }

  // Save scenes and shots to database
  const saveToDatabase = async () => {
    // Read from store directly to avoid stale closure
    const currentProjectId = useProjectWizardStore.getState().projectId
    console.log("Saving to database, projectId:", currentProjectId)
    console.log("Acts to save:", acts)

    if (!currentProjectId) {
      throw new Error("No project ID found")
    }

    // Delete removed shots first
    for (const shotId of deletedShotIds) {
      try {
        await deleteShot(shotId)
      } catch (error) {
        console.error("Error deleting shot:", error)
      }
    }

    // Delete removed scenes
    for (const sceneId of deletedSceneIds) {
      try {
        await deleteScene(sceneId)
      } catch (error) {
        console.error("Error deleting scene:", error)
      }
    }

    // Create/update scenes and shots
    for (let sceneIndex = 0; sceneIndex < acts.length; sceneIndex++) {
      const act = acts[sceneIndex]
      let sceneId = act.id

      // Check if this is a new scene or existing (valid UUID = exists in DB)
      if (isNewItem(act.id)) {
        // Create new scene
        const newScene = await createScene({
          project_id: currentProjectId,
          name: act.name || `Scene ${sceneIndex + 1}`,
          description: act.description || null,
          sort_order: sceneIndex,
        })
        sceneId = newScene.id
        // Update local ID to the real DB ID
        act.id = sceneId
      } else {
        // Update existing scene
        await updateScene(act.id, {
          name: act.name,
          description: act.description || null,
          sort_order: sceneIndex,
        })
      }

      // Create/update shots for this scene
      for (let shotIndex = 0; shotIndex < act.beats.length; shotIndex++) {
        const shot = act.beats[shotIndex]

        if (isNewItem(shot.id)) {
          // Create new shot
          const newShot = await createShot({
            scene_id: sceneId,
            name: shot.title || `Shot ${shotIndex + 1}`,
            description: shot.description || null,
            sort_order: shotIndex,
            duration: 3, // default duration
          })
          // Update local ID to the real DB ID
          shot.id = newShot.id
        } else {
          // Update existing shot
          await updateShot(shot.id, {
            name: shot.title || `Shot ${shotIndex + 1}`,
            description: shot.description || null,
            sort_order: shotIndex,
          })
        }
      }
    }

    // Clear deleted tracking
    setDeletedSceneIds([])
    setDeletedShotIds([])

    // Update local store with the updated IDs
    setStoryboard({ acts })
  }

  const handleSaveDraft = async () => {
    // Read from store directly to avoid stale closure
    const currentProjectId = useProjectWizardStore.getState().projectId
    if (!currentProjectId) {
      alert("No project found. Please go back and complete the Brief step first.")
      return
    }

    setIsSavingDraft(true)
    try {
      await saveToDatabase()
      navigate("/library/projects")
    } catch (error) {
      console.error("Error saving draft:", error)
      alert("Error saving draft: " + (error instanceof Error ? error.message : "Unknown error"))
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleContinue = async () => {
    // Read from store directly to avoid stale closure
    const currentProjectId = useProjectWizardStore.getState().projectId
    if (!currentProjectId) {
      alert("No project found. Please go back and complete the Brief step first.")
      return
    }

    setIsSaving(true)
    try {
      await saveToDatabase()
      markStepComplete("story")
      goToNextStep()
    } catch (error) {
      console.error("Error saving scenes:", error)
      alert("Error saving: " + (error instanceof Error ? error.message : "Unknown error"))
    } finally {
      setIsSaving(false)
    }
  }

  // Save and go back
  const handleBack = async () => {
    const currentProjectId = useProjectWizardStore.getState().projectId
    if (!currentProjectId) {
      goToPreviousStep()
      return
    }

    try {
      await saveToDatabase()
    } catch (error) {
      console.error("Error saving on back:", error)
    }
    goToPreviousStep()
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-zinc-100 mb-2">
            Scenes & Shots
          </h1>
          <p className="text-zinc-400">
            Outline your video's scenes and the shots within each scene.
          </p>
        </div>

        {/* Scenes */}
        <div ref={containerRef} className="space-y-4">
          {acts.map((act, actIndex) => (
            <div
              key={act.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
            >
              {/* Scene Header */}
              <div className="flex items-center gap-3 p-4 bg-zinc-900/50">
                <button
                  onClick={() => toggleActExpanded(act.id)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {expandedActs.has(act.id) ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>

                <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab" />

                <div className="flex-1">
                  <input
                    type="text"
                    value={act.name}
                    onChange={(e) => updateActName(act.id, e.target.value)}
                    className="bg-transparent text-lg font-semibold text-zinc-100 focus:outline-none w-full"
                    placeholder="Scene name..."
                  />
                </div>

                <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-1 rounded">
                  {act.beats.length} shot{act.beats.length !== 1 ? 's' : ''}
                </span>

                {acts.length > 1 && (
                  <button
                    onClick={() => removeAct(act.id)}
                    className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Scene Content (Collapsible) */}
              {expandedActs.has(act.id) && (
                <div className="p-4 pt-0 space-y-4">
                  {/* Scene Description */}
                  <input
                    type="text"
                    value={act.description}
                    onChange={(e) => updateActDescription(act.id, e.target.value)}
                    placeholder="Describe this scene (optional)..."
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                  />

                  {/* Shots */}
                  <div className="space-y-4 pl-4 border-l-2 border-zinc-800">
                    {act.beats.map((shot, shotIndex) => (
                      <div key={shot.id} className="flex gap-3">
                        {/* Shot label */}
                        <span className="text-xs text-zinc-500 font-medium w-14 pt-2.5 flex-shrink-0">
                          Shot {shotIndex + 1}
                        </span>

                        {/* Title and Description fields */}
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={shot.title || ""}
                            onChange={(e) =>
                              updateShotTitle(act.id, shot.id, e.target.value)
                            }
                            placeholder={`Shot ${shotIndex + 1} title...`}
                            className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                          />
                          <textarea
                            value={shot.description}
                            onChange={(e) => {
                              updateShotDescription(act.id, shot.id, e.target.value)
                              // Auto-resize
                              e.target.style.height = 'auto'
                              e.target.style.height = e.target.scrollHeight + 'px'
                            }}
                            onFocus={(e) => {
                              // Auto-resize on focus in case content was set programmatically
                              e.target.style.height = 'auto'
                              e.target.style.height = e.target.scrollHeight + 'px'
                            }}
                            placeholder={`Describe shot ${shotIndex + 1}... (This will be used as the image generation prompt)`}
                            className="w-full px-3 py-2 bg-zinc-800/30 border border-zinc-800 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 resize-none min-h-[80px] overflow-hidden"
                          />
                        </div>

                        {/* Delete button */}
                        {act.beats.length > 1 && (
                          <button
                            onClick={() => removeBeat(act.id, shot.id)}
                            className="p-1 text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0 mt-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Shot Button */}
                  <button
                    onClick={() => addShot(act.id)}
                    className="flex items-center gap-2 text-sm text-zinc-500 hover:text-sky-400 transition-colors ml-4"
                  >
                    <Plus className="w-4 h-4" />
                    Add Shot
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Scene Button */}
        <button
          onClick={addScene}
          className="w-full mt-4 p-4 border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-400 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Scene
        </button>

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="text-zinc-400 hover:text-zinc-300"
          >
            &larr; Back
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || !projectId}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingDraft ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Draft
            </Button>
            <Button
              onClick={handleContinue}
              disabled={isSaving}
              className="bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 hover:from-sky-300 hover:via-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/20 px-8"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
