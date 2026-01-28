import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, Save, User, MapPin, Cloud, Clapperboard, Package, ChevronDown, Check } from "lucide-react"
import { useProjectWizardStore, ASPECT_RATIOS } from "@/state/projectWizardStore"
import { useAuth } from "@/contexts/AuthContext"
import { updateProject, createProjectBrief, updateProjectBrief, getProjectBrief, createDraftProject } from "@/services/projects"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Custom Dropdown Component
interface DropdownOption {
  value: string
  label: string
  description?: string
}

interface CustomDropdownProps {
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  placeholder?: string
  className?: string
}

function CustomDropdown({ value, onChange, options, placeholder = "Select...", className }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value)

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full h-12 px-4 bg-zinc-900 border rounded-lg text-left transition-all",
          "flex items-center justify-between gap-2",
          "hover:bg-zinc-800",
          isOpen
            ? "border-sky-500 ring-2 ring-sky-500/20"
            : "border-zinc-700 hover:border-zinc-600"
        )}
      >
        <span className={selectedOption ? "text-white" : "text-zinc-500"}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-zinc-400 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 py-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl shadow-black/30 overflow-hidden">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={cn(
                "w-full px-4 py-2.5 text-left transition-all",
                "flex items-center justify-between",
                option.value === value
                  ? "bg-sky-500/10 text-sky-400"
                  : "text-zinc-300 hover:bg-zinc-800"
              )}
            >
              <div className="flex flex-col">
                <span className="font-medium">{option.label}</span>
                {option.description && (
                  <span className="text-xs text-zinc-500">{option.description}</span>
                )}
              </div>
              {option.value === value && (
                <Check className="w-4 h-4 text-sky-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Structured content categories that Bubble will fill in
export interface VideoContent {
  characters: string[]
  setting: string
  timeOfDay: string
  weather: string
  action: string
  props: string[]
  dialogue: string
}

const emptyContent: VideoContent = {
  characters: [],
  setting: "",
  timeOfDay: "",
  weather: "",
  action: "",
  props: [],
  dialogue: "",
}

export function BriefStep() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    brief,
    projectId,
    platform,
    updateBrief,
    setBrief,
    setProjectId,
    goToNextStep,
    goToPreviousStep,
    markStepComplete,
    resetWizard,
  } = useProjectWizardStore()

  const [projectName, setProjectName] = useState(brief?.name || "")
  const [videoContent, setVideoContent] = useState<VideoContent>(
    brief?.videoContent || emptyContent
  )
  const [formData, setFormData] = useState({
    audience: brief?.audience || "",
    tone: brief?.tone || "",
    duration: brief?.duration || "",
    aspectRatio: brief?.aspectRatio || "16:9",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  // Initialize briefExists from store - if brief has name, it was likely loaded from DB
  const [briefExists, setBriefExists] = useState(!!brief?.name)

  // Check if brief exists in DB (for cases where we have projectId but store brief wasn't set)
  useEffect(() => {
    async function checkBrief() {
      if (projectId) {
        const existing = await getProjectBrief(projectId)
        setBriefExists(!!existing)
      }
    }
    checkBrief()
  }, [projectId])

  // Listen for Bubble updates to video content (from chat parsing)
  useEffect(() => {
    if (brief?.videoContent) {
      setVideoContent(brief.videoContent)
    }
  }, [brief?.videoContent])

  // Sync form fields from store (when Bubble updates via chat)
  useEffect(() => {
    if (brief) {
      // Sync project name
      if (brief.name && brief.name !== projectName) {
        setProjectName(brief.name)
      }
      // Sync other fields
      setFormData(prev => ({
        audience: brief.audience || prev.audience,
        tone: brief.tone || prev.tone,
        duration: brief.duration || prev.duration,
        aspectRatio: brief.aspectRatio || prev.aspectRatio,
      }))
    }
  }, [brief])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setProjectName(name)
    updateBrief({ name })
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    updateBrief({ [name]: value })
  }

  // Convert structured content to description string for storage
  const buildDescription = (): string => {
    const parts: string[] = []

    if (videoContent.action) {
      parts.push(videoContent.action)
    }
    if (videoContent.characters.length > 0) {
      parts.push(`Characters: ${videoContent.characters.join(", ")}`)
    }
    if (videoContent.setting) {
      parts.push(`Setting: ${videoContent.setting}`)
    }
    if (videoContent.timeOfDay || videoContent.weather) {
      const timeWeather = [videoContent.timeOfDay, videoContent.weather].filter(Boolean).join(", ")
      parts.push(`Environment: ${timeWeather}`)
    }
    if (videoContent.props.length > 0) {
      parts.push(`Props: ${videoContent.props.join(", ")}`)
    }
    if (videoContent.dialogue) {
      parts.push(`Dialogue: "${videoContent.dialogue}"`)
    }

    return parts.join("\n")
  }

  const handleContinue = async () => {
    if (!user) {
      console.error("No user found")
      return
    }

    setIsSaving(true)
    try {
      // Read from store directly to avoid stale closure values
      let currentProjectId = useProjectWizardStore.getState().projectId

      // Create draft project if we don't have one yet
      if (!currentProjectId) {
        // Double-check store in case another operation just created it
        currentProjectId = useProjectWizardStore.getState().projectId
        if (!currentProjectId) {
          console.log("Creating new draft project...")
          const platformId = platform?.type === "existing" ? platform.platformId : undefined
          const draft = await createDraftProject(user.id, platformId)
          currentProjectId = draft.id
          setProjectId(draft.id)
          console.log("Draft project created:", currentProjectId)
        }
      }

      const description = buildDescription()

      // Update project name
      console.log("Updating project name...")
      await updateProject(currentProjectId, { name: projectName })

      // Create or update brief in DB - check database directly to avoid race conditions
      const briefData = {
        name: projectName,
        description,
        audience: formData.audience,
        tone: formData.tone,
        duration: formData.duration,
        aspect_ratio: formData.aspectRatio,
        video_content: videoContent as import("@/types/database").Json,
      }

      // Always check DB for existing brief to handle race conditions
      const existingBrief = await getProjectBrief(currentProjectId)
      if (existingBrief) {
        console.log("Updating existing brief...")
        await updateProjectBrief(currentProjectId, briefData)
      } else {
        console.log("Creating new brief...")
        await createProjectBrief({
          project_id: currentProjectId,
          ...briefData,
        })
      }
      setBriefExists(true)
      console.log("Brief saved successfully")

      // Update local state
      setBrief({
        name: projectName,
        description,
        audience: formData.audience,
        tone: formData.tone,
        duration: formData.duration,
        aspectRatio: formData.aspectRatio,
        videoContent,
      })
      markStepComplete("brief")
      goToNextStep()
    } catch (error) {
      console.error("Error saving brief:", error)
      alert("Error saving: " + (error instanceof Error ? error.message : "Unknown error"))
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!user) return

    // Read from store directly to avoid stale closure values
    const storeProjectId = useProjectWizardStore.getState().projectId

    if (!projectName && !storeProjectId) {
      // Nothing to save
      return
    }

    setIsSavingDraft(true)
    try {
      let currentProjectId = storeProjectId

      if (!currentProjectId) {
        const platformId = platform?.type === "existing" ? platform.platformId : undefined
        const draft = await createDraftProject(user.id, platformId)
        currentProjectId = draft.id
        setProjectId(draft.id) // Store the ID so Bubble and other operations use the same project
      }

      const description = buildDescription()

      await updateProject(currentProjectId, { name: projectName || "Untitled Project" })

      // Check DB directly for existing brief to avoid race conditions
      const existingBrief = await getProjectBrief(currentProjectId)
      if (existingBrief) {
        await updateProjectBrief(currentProjectId, {
          name: projectName,
          description,
          audience: formData.audience,
          tone: formData.tone,
          duration: formData.duration,
          aspect_ratio: formData.aspectRatio,
          video_content: videoContent as import("@/types/database").Json,
        })
      } else if (projectName || description) {
        await createProjectBrief({
          project_id: currentProjectId,
          name: projectName,
          description,
          audience: formData.audience,
          tone: formData.tone,
          duration: formData.duration,
          aspect_ratio: formData.aspectRatio,
          video_content: videoContent as import("@/types/database").Json,
        })
      }

      // Stay on page - user can use back button to exit
    } catch (error) {
      console.error("Error saving draft:", error)
    } finally {
      setIsSavingDraft(false)
    }
  }

  // Save and go back
  const handleBack = async () => {
    if (!user || !projectId) {
      goToPreviousStep()
      return
    }

    try {
      const description = buildDescription()
      const briefData = {
        name: projectName,
        description,
        audience: formData.audience,
        tone: formData.tone,
        duration: formData.duration,
        aspect_ratio: formData.aspectRatio,
        video_content: videoContent as import("@/types/database").Json,
      }

      // Check DB directly for existing brief to avoid race conditions
      const existingBrief = await getProjectBrief(projectId)
      if (existingBrief) {
        await updateProjectBrief(projectId, briefData)
      } else if (projectName || description) {
        await createProjectBrief({ project_id: projectId, ...briefData })
        setBriefExists(true)
      }
    } catch (error) {
      console.error("Error saving on back:", error)
    }
    goToPreviousStep()
  }

  // Check if video content has been filled in (for UI hint, not validation)
  const hasContent = videoContent.action || videoContent.characters.length > 0 || videoContent.setting
  // Only require project name - video content can be filled in later via Bubble or in workspace
  const isValid = !!projectName.trim()

  const toneOptions: DropdownOption[] = [
    { value: "professional", label: "Professional" },
    { value: "casual", label: "Casual" },
    { value: "energetic", label: "Energetic" },
    { value: "inspiring", label: "Inspiring" },
    { value: "educational", label: "Educational" },
    { value: "humorous", label: "Humorous" },
    { value: "dramatic", label: "Dramatic" },
    { value: "calm", label: "Calm" },
  ]

  const durationOptions: DropdownOption[] = [
    { value: "15 seconds", label: "15 seconds" },
    { value: "30 seconds", label: "30 seconds" },
    { value: "1 minute", label: "1 minute" },
    { value: "2-3 minutes", label: "2-3 minutes" },
    { value: "5+ minutes", label: "5+ minutes" },
  ]

  const aspectRatioOptions: DropdownOption[] = ASPECT_RATIOS.map(ratio => ({
    value: ratio.id,
    label: ratio.label,
    description: ratio.description,
  }))

  // Handle dropdown changes
  const handleDropdownChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    updateBrief({ [name]: value })
  }

  // Handle video content field changes
  const handleContentChange = (field: keyof VideoContent, value: string | string[]) => {
    const newContent = { ...videoContent, [field]: value }
    setVideoContent(newContent)
    updateBrief({ videoContent: newContent })
  }

  // Editable content section component
  const ContentSection = ({
    icon: Icon,
    label,
    field,
    value,
    placeholder,
    isArray = false
  }: {
    icon: React.ElementType
    label: string
    field: keyof VideoContent
    value: string | string[]
    placeholder: string
    isArray?: boolean
  }) => {
    const displayValue = isArray ? (value as string[]).join(", ") : (value as string)

    return (
      <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800/70 transition-all">
        <Icon className="w-4 h-4 mt-2.5 text-sky-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-xs text-zinc-500 uppercase tracking-wide">{label}</span>
          <input
            type="text"
            value={displayValue}
            onChange={(e) => {
              const newValue = isArray
                ? e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                : e.target.value
              handleContentChange(field, newValue)
            }}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none mt-0.5"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-zinc-100 mb-2">
            Project Brief
          </h1>
          <p className="text-zinc-400">
            Tell Bubble about your video and she'll help structure it.
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
              value={projectName}
              onChange={handleNameChange}
              placeholder="e.g., Summer Product Launch"
              className="w-full h-12 px-4 bg-zinc-900 border border-zinc-700 focus:border-sky-500 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
            />
          </div>

          {/* Video Content - Structured from Bubble conversation */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Video Content <span className="text-red-400">*</span>
              <span className="text-zinc-500 font-normal ml-2">
                (Chat with Bubble to fill this in)
              </span>
            </label>
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 space-y-2">
              <ContentSection
                icon={Clapperboard}
                label="Action"
                field="action"
                value={videoContent.action}
                placeholder="What's happening in this scene?"
              />
              <ContentSection
                icon={User}
                label="Characters"
                field="characters"
                value={videoContent.characters}
                placeholder="Who's in it? (comma separated)"
                isArray
              />
              <ContentSection
                icon={MapPin}
                label="Setting"
                field="setting"
                value={videoContent.setting}
                placeholder="Where does it take place?"
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800/70 transition-all">
                  <Cloud className="w-4 h-4 mt-2.5 text-sky-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-zinc-500 uppercase tracking-wide">Time</span>
                    <input
                      type="text"
                      value={videoContent.timeOfDay}
                      onChange={(e) => handleContentChange("timeOfDay", e.target.value)}
                      placeholder="Morning, night..."
                      className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none mt-0.5"
                    />
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800/70 transition-all">
                  <Cloud className="w-4 h-4 mt-2.5 text-sky-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-zinc-500 uppercase tracking-wide">Weather</span>
                    <input
                      type="text"
                      value={videoContent.weather}
                      onChange={(e) => handleContentChange("weather", e.target.value)}
                      placeholder="Sunny, rainy..."
                      className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none mt-0.5"
                    />
                  </div>
                </div>
              </div>
              <ContentSection
                icon={Package}
                label="Props"
                field="props"
                value={videoContent.props}
                placeholder="Important objects (comma separated)"
                isArray
              />
              <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800/70 transition-all">
                <span className="text-sky-400 mt-2.5">"</span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-zinc-500 uppercase tracking-wide">Dialogue</span>
                  <input
                    type="text"
                    value={videoContent.dialogue}
                    onChange={(e) => handleContentChange("dialogue", e.target.value)}
                    placeholder="Any spoken words or narration"
                    className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none mt-0.5 italic"
                  />
                </div>
              </div>
              {!hasContent && (
                <p className="text-xs text-zinc-500 text-center pt-2">
                  Type directly or chat with Bubble to fill this in
                </p>
              )}
            </div>
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
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Aspect Ratio
              </label>
              <CustomDropdown
                value={formData.aspectRatio}
                onChange={(value) => handleDropdownChange("aspectRatio", value)}
                options={aspectRatioOptions}
                placeholder="Select ratio..."
              />
            </div>

            {/* Tone */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Tone / Mood
              </label>
              <CustomDropdown
                value={formData.tone}
                onChange={(value) => handleDropdownChange("tone", value)}
                options={toneOptions}
                placeholder="Select a tone..."
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Target Duration
              </label>
              <CustomDropdown
                value={formData.duration}
                onChange={(value) => handleDropdownChange("duration", value)}
                options={durationOptions}
                placeholder="Select duration..."
              />
            </div>
          </div>
        </div>

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
              disabled={isSavingDraft || !projectName.trim()}
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
              disabled={!isValid || isSaving}
              className={cn(
                "px-8",
                isValid && !isSaving
                  ? "bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 hover:from-sky-300 hover:via-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/20"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              )}
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
