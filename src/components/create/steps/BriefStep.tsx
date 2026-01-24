import { useState, useEffect } from "react"
import { useProjectWizardStore, ASPECT_RATIOS } from "@/state/projectWizardStore"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function BriefStep() {
  const { brief, updateBrief, setBrief, goToNextStep, goToPreviousStep, markStepComplete } =
    useProjectWizardStore()

  const [formData, setFormData] = useState({
    name: brief?.name || "",
    description: brief?.description || "",
    audience: brief?.audience || "",
    tone: brief?.tone || "",
    duration: brief?.duration || "",
    aspectRatio: brief?.aspectRatio || "16:9",
  })

  // Update store when form changes
  useEffect(() => {
    updateBrief(formData)
  }, [formData])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleContinue = () => {
    setBrief(formData)
    markStepComplete("brief")
    goToNextStep()
  }

  const isValid = formData.name.trim() && formData.description.trim()

  const toneOptions = [
    "Professional",
    "Casual",
    "Energetic",
    "Inspiring",
    "Educational",
    "Humorous",
    "Dramatic",
    "Calm",
  ]

  const durationOptions = [
    "15 seconds",
    "30 seconds",
    "1 minute",
    "2-3 minutes",
    "5+ minutes",
  ]

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-zinc-100 mb-2">
            Project Brief
          </h1>
          <p className="text-zinc-400">
            Define the core elements of your video project.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Project Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-zinc-300 mb-2"
            >
              Project Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Summer Product Launch"
              className="w-full h-12 px-4 bg-zinc-900 border border-zinc-700 focus:border-sky-500 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-zinc-300 mb-2"
            >
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="What is this video about? What's the main message or goal?"
              rows={4}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 focus:border-sky-500 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all resize-none"
            />
          </div>

          {/* Target Audience */}
          <div>
            <label
              htmlFor="audience"
              className="block text-sm font-medium text-zinc-300 mb-2"
            >
              Target Audience
            </label>
            <input
              type="text"
              id="audience"
              name="audience"
              value={formData.audience}
              onChange={handleChange}
              placeholder="e.g., Small business owners, 25-45 years old"
              className="w-full h-12 px-4 bg-zinc-900 border border-zinc-700 focus:border-sky-500 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
            />
          </div>

          {/* Aspect Ratio, Tone, and Duration Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Aspect Ratio */}
            <div>
              <label
                htmlFor="aspectRatio"
                className="block text-sm font-medium text-zinc-300 mb-2"
              >
                Aspect Ratio <span className="text-red-400">*</span>
              </label>
              <select
                id="aspectRatio"
                name="aspectRatio"
                value={formData.aspectRatio}
                onChange={handleChange}
                className="w-full h-12 px-4 bg-zinc-900 border border-zinc-700 focus:border-sky-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all appearance-none cursor-pointer"
              >
                {ASPECT_RATIOS.map((ratio) => (
                  <option key={ratio.id} value={ratio.id}>
                    {ratio.label} - {ratio.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Tone */}
            <div>
              <label
                htmlFor="tone"
                className="block text-sm font-medium text-zinc-300 mb-2"
              >
                Tone / Mood
              </label>
              <select
                id="tone"
                name="tone"
                value={formData.tone}
                onChange={handleChange}
                className="w-full h-12 px-4 bg-zinc-900 border border-zinc-700 focus:border-sky-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all appearance-none cursor-pointer"
              >
                <option value="" className="text-zinc-500">
                  Select a tone...
                </option>
                {toneOptions.map((tone) => (
                  <option key={tone} value={tone.toLowerCase()}>
                    {tone}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div>
              <label
                htmlFor="duration"
                className="block text-sm font-medium text-zinc-300 mb-2"
              >
                Target Duration
              </label>
              <select
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                className="w-full h-12 px-4 bg-zinc-900 border border-zinc-700 focus:border-sky-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all appearance-none cursor-pointer"
              >
                <option value="" className="text-zinc-500">
                  Select duration...
                </option>
                {durationOptions.map((duration) => (
                  <option key={duration} value={duration}>
                    {duration}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

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
            disabled={!isValid}
            className={cn(
              "px-8",
              isValid
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
