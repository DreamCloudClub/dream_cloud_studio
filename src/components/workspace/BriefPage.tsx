import { useWorkspaceStore } from "@/state/workspaceStore"
import { Target, Users, Clock, Sparkles } from "lucide-react"

export function BriefPage() {
  const { project, updateBrief } = useWorkspaceStore()

  if (!project) return null

  const { brief } = project

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Project Brief</h1>
          <p className="text-zinc-400 mt-1">
            Define the core elements of your video project
          </p>
        </div>

        {/* Project Name */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">
            Project Name
          </label>
          <input
            type="text"
            value={brief.name}
            onChange={(e) => updateBrief({ name: e.target.value })}
            className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
            placeholder="Enter project name..."
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">
            Description
          </label>
          <textarea
            value={brief.description}
            onChange={(e) => updateBrief({ description: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500 transition-colors resize-none"
            placeholder="What is this video about? Describe the main concept..."
          />
        </div>

        {/* Two column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target Audience */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Users className="w-4 h-4 text-sky-400" />
              Target Audience
            </label>
            <input
              type="text"
              value={brief.audience}
              onChange={(e) => updateBrief({ audience: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
              placeholder="Who is this video for?"
            />
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Sparkles className="w-4 h-4 text-sky-400" />
              Tone & Mood
            </label>
            <input
              type="text"
              value={brief.tone}
              onChange={(e) => updateBrief({ tone: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
              placeholder="Modern, professional, fun..."
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Clock className="w-4 h-4 text-sky-400" />
              Target Duration
            </label>
            <input
              type="text"
              value={brief.duration}
              onChange={(e) => updateBrief({ duration: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
              placeholder="30 seconds, 1 minute..."
            />
          </div>
        </div>

        {/* Goals */}
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Target className="w-4 h-4 text-sky-400" />
            Project Goals
          </label>
          <div className="space-y-3">
            {brief.goals.map((goal, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => {
                    const newGoals = [...brief.goals]
                    newGoals[index] = e.target.value
                    updateBrief({ goals: newGoals })
                  }}
                  className="flex-1 px-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
                  placeholder="Enter a goal..."
                />
                <button
                  onClick={() => {
                    const newGoals = brief.goals.filter((_, i) => i !== index)
                    updateBrief({ goals: newGoals })
                  }}
                  className="text-zinc-500 hover:text-red-400 transition-colors"
                >
                  &times;
                </button>
              </div>
            ))}
            <button
              onClick={() => updateBrief({ goals: [...brief.goals, ""] })}
              className="text-sm text-sky-400 hover:text-sky-300 transition-colors"
            >
              + Add goal
            </button>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-2xl p-6">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-4">
            Brief Summary
          </h3>
          <div className="prose prose-invert prose-sm">
            <p className="text-zinc-300">
              <strong className="text-zinc-100">{brief.name || "Untitled Project"}</strong>
              {brief.description && ` — ${brief.description}`}
            </p>
            {brief.audience && (
              <p className="text-zinc-400">
                Targeting <span className="text-zinc-200">{brief.audience}</span>
                {brief.tone && ` with a ${brief.tone.toLowerCase()} approach`}
                {brief.duration && `. Duration: ${brief.duration}`}.
              </p>
            )}
            {brief.goals.filter(Boolean).length > 0 && (
              <p className="text-zinc-400">
                Goals: {brief.goals.filter(Boolean).join(", ")}.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
