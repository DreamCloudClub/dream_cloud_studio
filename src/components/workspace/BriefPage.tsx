import { useState, useEffect, useRef } from "react"
import { User, MapPin, Cloud, Clapperboard, Package, ChevronDown, Check } from "lucide-react"
import { useWorkspaceStore } from "@/state/workspaceStore"
import { ASPECT_RATIOS } from "@/state/projectWizardStore"
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

// Video content structure
interface VideoContent {
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

export function BriefPage() {
  const { project, updateBrief } = useWorkspaceStore()

  if (!project) return null

  const { brief } = project

  // Parse video content from brief if stored
  const [videoContent, setVideoContent] = useState<VideoContent>(() => {
    if (brief.videoContent) {
      return brief.videoContent as VideoContent
    }
    return emptyContent
  })

  // Sync video content when brief changes
  useEffect(() => {
    if (brief.videoContent) {
      setVideoContent(brief.videoContent as VideoContent)
    }
  }, [brief.videoContent])

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

  // Handle video content field changes
  const handleContentChange = (field: keyof VideoContent, value: string | string[]) => {
    const newContent = { ...videoContent, [field]: value }
    setVideoContent(newContent)
    updateBrief({ videoContent: newContent })
  }

  // Check if video content has been filled in
  const hasContent = videoContent.action || videoContent.characters.length > 0 || videoContent.setting

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
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 lg:p-8">
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
              Project Name
            </label>
            <input
              type="text"
              id="name"
              value={brief.name}
              onChange={(e) => updateBrief({ name: e.target.value })}
              placeholder="e.g., Summer Product Launch"
              className="w-full h-12 px-4 bg-zinc-900 border border-zinc-700 focus:border-sky-500 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
            />
          </div>

          {/* Video Content - Structured */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Video Content
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
                  Fill in the details of what your video will show
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
              value={brief.audience}
              onChange={(e) => updateBrief({ audience: e.target.value })}
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
                value={brief.aspectRatio || "16:9"}
                onChange={(value) => updateBrief({ aspectRatio: value })}
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
                value={brief.tone}
                onChange={(value) => updateBrief({ tone: value })}
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
                value={brief.duration}
                onChange={(value) => updateBrief({ duration: value })}
                options={durationOptions}
                placeholder="Select duration..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
