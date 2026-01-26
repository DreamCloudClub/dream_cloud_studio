import { useState } from "react"
import {
  Check,
  Image,
  Music,
  Volume2,
  Mic,
  Loader2,
  Sparkles,
  AlertCircle,
  Box,
  FileText,
  Palette,
  BookOpen,
  Clapperboard,
  Video,
} from "lucide-react"
import { useProjectWizardStore } from "@/state/projectWizardStore"
import { useFoundationStore } from "@/state/foundationStore"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"

export function ReviewStep() {
  const navigate = useNavigate()
  const {
    platform,
    brief,
    moodBoard,
    storyboard,
    shots,
    shotMedia,
    audio,
    filmingProgress,
    goToPreviousStep,
    resetWizard,
  } = useProjectWizardStore()
  const { incrementProjectCount } = useFoundationStore()

  const [isCreating, setIsCreating] = useState(false)

  const handleCreateProject = () => {
    setIsCreating(true)

    // Simulate project creation and assembly
    setTimeout(() => {
      // In a real app, this would:
      // 1. Save the project to Supabase
      // 2. Upload all assets
      // 3. Create initial timeline
      // 4. Navigate to workspace

      const newProjectId = crypto.randomUUID()

      // Increment foundation project count if one was used
      if (moodBoard?.foundationId) {
        incrementProjectCount(moodBoard.foundationId)
      }

      // Reset wizard state
      resetWizard()

      // Navigate to project workspace
      navigate(`/project/${newProjectId}`)
    }, 3000)
  }

  const totalDuration = shots.reduce((sum, shot) => sum + shot.duration, 0)
  const completedShots = filmingProgress.completedShots.length
  const hasAllMedia = completedShots === shots.length

  // Summary sections
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
      title: "Mood Board",
      icon: Palette,
      status: moodBoard && (moodBoard.images.length > 0 || moodBoard.colors.length > 0) ? "complete" : "optional",
      content: moodBoard?.images.length
        ? `${moodBoard.images.length} reference images`
        : "No references added",
      extras: moodBoard?.keywords.length ? moodBoard.keywords.slice(0, 3).join(", ") : null,
    },
    {
      title: "Story",
      icon: BookOpen,
      status: storyboard?.acts.length ? "complete" : "incomplete",
      content: storyboard?.acts.length
        ? `${storyboard.acts.length} acts, ${storyboard.acts.reduce((sum, a) => sum + a.beats.length, 0)} beats`
        : "No story structure",
    },
    {
      title: "Shots",
      icon: Clapperboard,
      status: shots.length > 0 ? "complete" : "incomplete",
      content: shots.length > 0
        ? `${shots.length} shots (${totalDuration}s total)`
        : "No shots defined",
    },
    {
      title: "Media",
      icon: Video,
      status: hasAllMedia ? "complete" : completedShots > 0 ? "partial" : "incomplete",
      content: hasAllMedia
        ? `All ${shots.length} shots have media`
        : `${completedShots}/${shots.length} shots have media`,
    },
    {
      title: "Audio",
      icon: Volume2,
      status: audio.voiceovers.length > 0 || audio.soundtrack ? "complete" : "optional",
      content: [
        audio.voiceovers.length > 0 && `${audio.voiceovers.length} voiceover(s)`,
        audio.soundtrack && "Soundtrack",
        audio.sfx.length > 0 && `${audio.sfx.length} SFX`,
      ].filter(Boolean).join(", ") || "No audio added",
    },
  ]

  const hasIncomplete = sections.some((s) => s.status === "incomplete")

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
            Review your project setup before we assemble your raw edit.
          </p>
        </div>

        {/* Project Name Display */}
        {brief?.name && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6 text-center">
            <p className="text-sm text-zinc-500 mb-1">Project Name</p>
            <h2 className="text-2xl font-bold text-zinc-100">{brief.name}</h2>
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
                  : section.status === "partial"
                  ? "bg-amber-500/5 border-amber-500/20"
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
                  {section.status === "partial" && (
                    <span className="text-xs text-amber-400">Partial</span>
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

        {/* Shot Thumbnails Preview */}
        {Object.keys(shotMedia).length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">
              Shot Preview
            </h3>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {shots.slice(0, 8).map((shot, index) => {
                const media = shotMedia[shot.id]
                return (
                  <div
                    key={shot.id}
                    className="relative aspect-video bg-zinc-800 rounded-lg overflow-hidden"
                  >
                    {media ? (
                      <img
                        src={media.url}
                        alt={`Shot ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-4 h-4 text-zinc-600" />
                      </div>
                    )}
                    <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1 rounded">
                      {index + 1}
                    </span>
                  </div>
                )
              })}
              {shots.length > 8 && (
                <div className="aspect-video bg-zinc-800 rounded-lg flex items-center justify-center">
                  <span className="text-xs text-zinc-500">
                    +{shots.length - 8}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audio Summary */}
        {(audio.voiceovers.length > 0 || audio.soundtrack || audio.sfx.length > 0) && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">
              Audio Tracks
            </h3>
            <div className="flex flex-wrap gap-2">
              {audio.voiceovers.map((vo) => (
                <div
                  key={vo.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-full text-sm"
                >
                  <Mic className="w-3 h-3 text-sky-400" />
                  <span className="text-zinc-300">{vo.name}</span>
                </div>
              ))}
              {audio.soundtrack && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-full text-sm">
                  <Music className="w-3 h-3 text-purple-400" />
                  <span className="text-zinc-300">{audio.soundtrack.name}</span>
                </div>
              )}
              {audio.sfx.map((sfx) => (
                <div
                  key={sfx.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-full text-sm"
                >
                  <Volume2 className="w-3 h-3 text-orange-400" />
                  <span className="text-zinc-300">{sfx.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning for incomplete */}
        {hasIncomplete && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-200">
                  Some sections are incomplete. You can still create the project,
                  but you may want to go back and fill in the missing information.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Create Button */}
        <div className="text-center mb-8">
          <Button
            onClick={handleCreateProject}
            disabled={isCreating || !hasAllMedia}
            className={cn(
              "px-12 py-6 text-lg font-semibold rounded-xl shadow-lg transition-all",
              isCreating
                ? "bg-zinc-800 text-zinc-400"
                : hasAllMedia
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

          {!hasAllMedia && (
            <p className="text-sm text-zinc-500 mt-3">
              Complete all shot media before creating the project
            </p>
          )}
        </div>

        {/* What happens next */}
        <div className="text-center text-sm text-zinc-500">
          <p className="mb-2">What happens next:</p>
          <ol className="inline-flex flex-col items-start text-left">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-xs">1</span>
              We'll assemble your raw edit in the timeline
            </li>
            <li className="flex items-center gap-2 mt-1">
              <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-xs">2</span>
              You can refine and polish in the workspace
            </li>
            <li className="flex items-center gap-2 mt-1">
              <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-xs">3</span>
              Export your finished video when ready
            </li>
          </ol>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-start">
          <Button
            variant="ghost"
            onClick={goToPreviousStep}
            disabled={isCreating}
            className="text-zinc-400 hover:text-zinc-300"
          >
            &larr; Back
          </Button>
        </div>
      </div>
    </div>
  )
}
