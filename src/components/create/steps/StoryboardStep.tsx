import { useState } from "react"
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from "lucide-react"
import { useProjectWizardStore, type Act } from "@/state/projectWizardStore"
import { Button } from "@/components/ui/button"

// Default story structure template
const defaultActs: Act[] = [
  {
    id: "act-1",
    name: "Beginning",
    description: "Hook the viewer and set up the context",
    beats: [
      { id: "beat-1-1", description: "Opening hook - grab attention" },
      { id: "beat-1-2", description: "Introduce the problem or opportunity" },
    ],
  },
  {
    id: "act-2",
    name: "Middle",
    description: "Develop the main content and value",
    beats: [
      { id: "beat-2-1", description: "Present the solution or journey" },
      { id: "beat-2-2", description: "Show key features or moments" },
      { id: "beat-2-3", description: "Build emotional connection" },
    ],
  },
  {
    id: "act-3",
    name: "End",
    description: "Wrap up and drive action",
    beats: [
      { id: "beat-3-1", description: "Reinforce key message" },
      { id: "beat-3-2", description: "Call to action" },
    ],
  },
]

export function StoryboardStep() {
  const { storyboard, setStoryboard, goToNextStep, goToPreviousStep, markStepComplete } =
    useProjectWizardStore()

  const [acts, setActs] = useState<Act[]>(storyboard?.acts || defaultActs)
  const [expandedActs, setExpandedActs] = useState<Set<string>>(
    new Set(acts.map((a) => a.id))
  )

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

  const updateBeat = (actId: string, beatId: string, description: string) => {
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

  const addBeat = (actId: string) => {
    setActs(
      acts.map((act) =>
        act.id === actId
          ? {
              ...act,
              beats: [
                ...act.beats,
                { id: crypto.randomUUID(), description: "" },
              ],
            }
          : act
      )
    )
  }

  const removeBeat = (actId: string, beatId: string) => {
    setActs(
      acts.map((act) =>
        act.id === actId
          ? { ...act, beats: act.beats.filter((b) => b.id !== beatId) }
          : act
      )
    )
  }

  const addAct = () => {
    const newAct: Act = {
      id: crypto.randomUUID(),
      name: `Act ${acts.length + 1}`,
      description: "",
      beats: [{ id: crypto.randomUUID(), description: "" }],
    }
    setActs([...acts, newAct])
    setExpandedActs(new Set([...expandedActs, newAct.id]))
  }

  const removeAct = (actId: string) => {
    if (acts.length > 1) {
      setActs(acts.filter((a) => a.id !== actId))
    }
  }

  const handleContinue = () => {
    setStoryboard({ acts })
    markStepComplete("story")
    goToNextStep()
  }

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-zinc-100 mb-2">
            Story Structure
          </h1>
          <p className="text-zinc-400">
            Organize your narrative into acts and key beats.
          </p>
        </div>

        {/* Acts */}
        <div className="space-y-4">
          {acts.map((act, actIndex) => (
            <div
              key={act.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
            >
              {/* Act Header */}
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
                    placeholder="Act name..."
                  />
                </div>

                <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-1 rounded">
                  {act.beats.length} beats
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

              {/* Act Content (Collapsible) */}
              {expandedActs.has(act.id) && (
                <div className="p-4 pt-0 space-y-4">
                  {/* Act Description */}
                  <input
                    type="text"
                    value={act.description}
                    onChange={(e) => updateActDescription(act.id, e.target.value)}
                    placeholder="Describe this act's purpose..."
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                  />

                  {/* Beats */}
                  <div className="space-y-2 pl-4 border-l-2 border-zinc-800">
                    {act.beats.map((beat, beatIndex) => (
                      <div key={beat.id} className="flex items-center gap-2">
                        <span className="text-xs text-zinc-600 w-6">
                          {actIndex + 1}.{beatIndex + 1}
                        </span>
                        <input
                          type="text"
                          value={beat.description}
                          onChange={(e) =>
                            updateBeat(act.id, beat.id, e.target.value)
                          }
                          placeholder="Describe this beat..."
                          className="flex-1 px-3 py-2 bg-zinc-800/30 border border-zinc-800 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
                        />
                        {act.beats.length > 1 && (
                          <button
                            onClick={() => removeBeat(act.id, beat.id)}
                            className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Beat Button */}
                  <button
                    onClick={() => addBeat(act.id)}
                    className="flex items-center gap-2 text-sm text-zinc-500 hover:text-sky-400 transition-colors ml-4"
                  >
                    <Plus className="w-4 h-4" />
                    Add beat
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Act Button */}
        <button
          onClick={addAct}
          className="w-full mt-4 p-4 border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-400 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Act
        </button>

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
