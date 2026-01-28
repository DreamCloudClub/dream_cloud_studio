import { useState } from "react"
import {
  Check,
  Loader2,
  Sparkles,
  AlertCircle,
  Box,
  FileText,
  Palette,
  BookOpen,
  ScrollText,
  Save,
} from "lucide-react"
import { useProjectWizardStore } from "@/state/projectWizardStore"
import { useFoundationStore } from "@/state/foundationStore"
import { updateProject } from "@/services/projects"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"

export function ReviewStep() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    projectId,
    platform,
    brief,
    moodBoard,
    storyboard,
    completedSteps,
    goToPreviousStep,
    resetWizard,
  } = useProjectWizardStore()
  const { incrementProjectCount } = useFoundationStore()

  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateProject = async () => {
    if (!projectId) {
      setError("No project found. Please start over.")
      return
    }

    if (!user) {
      setError("You must be logged in to create a project.")
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      // Update project status from 'draft' to 'in_progress' (active)
      // Scenes and shots are created manually in the Workspace
      await updateProject(projectId, {
        status: "in_progress",
        name: brief?.name || "Untitled Project",
      })

      // Increment foundation project count if one was used
      if (moodBoard?.foundationId) {
        incrementProjectCount(moodBoard.foundationId)
      }

      // Reset wizard state
      resetWizard()

      // Navigate to project workspace
      navigate(`/project/${projectId}`)
    } catch (err) {
      console.error("Error creating project:", err)
      setError("Failed to create project. Please try again.")
      setIsCreating(false)
    }
  }

  // Check completed steps for script (script data is in DB, not in store)
  const scriptCompleted = completedSteps.includes("script")

  // Summary sections matching the simplified wizard flow
  const sections = [
    {
      title: "Platform",
      icon: Box,
      status: platform ? "complete" : "incomplete",
      content: platform?.type === "new"
        ? "New platform (will be created)"
        : platform?.platformName || "Not selected",
    },
    {
      title: "Brief",
      icon: FileText,
      status: brief?.name ? "complete" : "incomplete",
      content: brief?.name || "Not defined",
      details: brief?.description,
    },
    {
      title: "Script",
      icon: ScrollText,
      status: scriptCompleted ? "complete" : "optional",
      content: scriptCompleted
        ? "Script created"
        : "No script (optional)",
    },
    {
      title: "Mood Board",
      icon: Palette,
      status: moodBoard && (moodBoard.images.length > 0 || moodBoard.colors.length > 0) ? "complete" : "optional",
      content: moodBoard?.images.length
        ? `${moodBoard.images.length} reference images`
        : "No references added",
      extras: moodBoard?.keywords.length ? moodBoard.keywords.slice(0, 3).join(", ") : null,
    },
    {
      title: "Storyboard",
      icon: BookOpen,
      status: completedSteps.includes("story") ? "complete" : "optional",
      content: storyboard?.acts.length
        ? `${storyboard.acts.length} acts, ${storyboard.acts.reduce((sum, a) => sum + a.beats.length, 0)} beats`
        : "Visual planning (optional)",
    },
  ]

  // Only Platform and Brief are required
  const requiredIncomplete = sections.some(
    (s) => s.status === "incomplete" && (s.title === "Platform" || s.title === "Brief")
  )

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-500/30">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-zinc-100 mb-2">
            Review & Create
          </h1>
          <p className="text-zinc-400">
            Review your pre-production setup before creating the project.
          </p>
        </div>

        {/* Project Name Display */}
        {brief?.name && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6 text-center">
            <p className="text-sm text-zinc-500 mb-1">Project Name</p>
            <h2 className="text-2xl font-bold text-zinc-100">{brief.name}</h2>
            {brief.duration && (
              <p className="text-sm text-zinc-400 mt-2">
                Target duration: {brief.duration}s • {brief.aspectRatio || "16:9"}
              </p>
            )}
          </div>
        )}

        {/* Summary Sections */}
        <div className="space-y-3 mb-8">
          {sections.map((section) => (
            <div
              key={section.title}
              className={cn(
                "flex items-start gap-4 p-4 rounded-xl border transition-colors",
                section.status === "complete"
                  ? "bg-zinc-900/50 border-zinc-800"
                  : section.status === "optional"
                  ? "bg-zinc-900/30 border-zinc-800/50"
                  : "bg-red-500/5 border-red-500/20"
              )}
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <section.icon className="w-5 h-5 text-zinc-400" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-zinc-200">{section.title}</h3>
                  {section.status === "complete" && (
                    <Check className="w-4 h-4 text-green-400" />
                  )}
                  {section.status === "optional" && (
                    <span className="text-xs text-zinc-500">(optional)</span>
                  )}
                  {section.status === "incomplete" && (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <p className="text-sm text-zinc-400">{section.content}</p>
                {section.details && (
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                    {section.details}
                  </p>
                )}
                {section.extras && (
                  <p className="text-xs text-zinc-500 mt-1">
                    Style: {section.extras}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Warning for incomplete required fields */}
        {requiredIncomplete && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-200">
                  Some required sections are incomplete. Please go back and fill in the
                  missing information before creating the project.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Create Button */}
        <div className="text-center mb-8">
          <Button
            onClick={handleCreateProject}
            disabled={isCreating || requiredIncomplete || !projectId}
            className={cn(
              "px-12 py-6 text-lg font-semibold rounded-xl shadow-lg transition-all",
              isCreating
                ? "bg-zinc-800 text-zinc-400"
                : !requiredIncomplete && projectId
                ? "bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 hover:from-sky-300 hover:via-sky-400 hover:to-blue-500 text-white shadow-sky-500/30 hover:shadow-sky-500/40 hover:scale-105"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                Creating Project...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-3" />
                Create Project
              </>
            )}
          </Button>
        </div>

        {/* What happens next */}
        <div className="text-center text-sm text-zinc-500">
          <p className="mb-2">What happens next:</p>
          <ol className="inline-flex flex-col items-start text-left">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-xs">1</span>
              Your project will be created in the Workspace
            </li>
            <li className="flex items-center gap-2 mt-1">
              <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-xs">2</span>
              Generate images and videos for your shots
            </li>
            <li className="flex items-center gap-2 mt-1">
              <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-xs">3</span>
              Assemble and export your finished video
            </li>
          </ol>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between">
          <Button
            variant="ghost"
            onClick={goToPreviousStep}
            disabled={isCreating}
            className="text-zinc-400 hover:text-zinc-300"
          >
            &larr; Back
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/library/projects")}
            disabled={isCreating}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
        </div>
      </div>
    </div>
  )
}
