import { useState, useEffect, useRef, useCallback } from "react"
import { ChevronDown, Check } from "lucide-react"
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
  const [saveError, setSaveError] = useState<string | null>(null)

  if (!project) return null

  const { brief } = project

  // Wrapper to handle save errors
  const handleUpdateBrief = async (data: Parameters<typeof updateBrief>[0]) => {
    setSaveError(null)
    try {
      await updateBrief(data)
    } catch (error) {
      console.error("Failed to save:", error)
      setSaveError("Failed to save changes. Check your connection.")
    }
  }

  // Parse video content from brief if stored (merge with defaults for safety)
  const [videoContent, setVideoContent] = useState<VideoContent>(() => {
    if (brief.videoContent) {
      return { ...emptyContent, ...(brief.videoContent as VideoContent) }
    }
    return emptyContent
  })

  // Sync video content when brief changes
  useEffect(() => {
    if (brief.videoContent) {
      setVideoContent({ ...emptyContent, ...(brief.videoContent as VideoContent) })
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
    handleUpdateBrief({ videoContent: newContent })
  }

  // Auto-resize textarea (3 lines min, 10 lines max, then scroll)
  const autoResizeTextarea = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return
    textarea.style.height = 'auto'
    const lineHeight = 24 // approximate line height
    const minHeight = lineHeight * 3
    const maxHeight = lineHeight * 10
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
    textarea.style.height = `${newHeight}px`
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Secondary Header */}
      <div className="h-[72px] border-b border-zinc-800 flex-shrink-0">
        <div className="h-full max-w-2xl mx-auto px-6 lg:px-8 flex items-center">
          <h1 className="text-xl font-semibold text-zinc-100">Brief</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 lg:px-8 pt-10 pb-6">
          {/* Error Message */}
        {saveError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {saveError}
          </div>
        )}

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
              onChange={(e) => handleUpdateBrief({ name: e.target.value })}
              placeholder="e.g., Summer Product Launch"
              className="w-full h-12 px-4 bg-zinc-900 border border-zinc-700 focus:border-sky-500 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
            />
          </div>

          {/* Action */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Action
            </label>
            <textarea
              value={videoContent.action}
              onChange={(e) => {
                handleContentChange("action", e.target.value)
                autoResizeTextarea(e.target)
              }}
              onFocus={(e) => autoResizeTextarea(e.target)}
              placeholder="What's happening in this scene?"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 focus:border-sky-500 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all resize-none overflow-y-auto"
              style={{ minHeight: '72px', maxHeight: '240px' }}
            />
          </div>

          {/* Characters */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Characters
            </label>
            <textarea
              value={videoContent.characters.join(", ")}
              onChange={(e) => {
                const chars = e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                handleContentChange("characters", chars)
                autoResizeTextarea(e.target)
              }}
              onFocus={(e) => autoResizeTextarea(e.target)}
              placeholder="Who's in it? (comma separated)"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 focus:border-sky-500 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all resize-none overflow-y-auto"
              style={{ minHeight: '72px', maxHeight: '240px' }}
            />
          </div>

          {/* Setting */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Setting
            </label>
            <textarea
              value={videoContent.setting}
              onChange={(e) => {
                handleContentChange("setting", e.target.value)
                autoResizeTextarea(e.target)
              }}
              onFocus={(e) => autoResizeTextarea(e.target)}
              placeholder="Where does it take place?"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 focus:border-sky-500 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all resize-none overflow-y-auto"
              style={{ minHeight: '72px', maxHeight: '240px' }}
            />
          </div>

          {/* Time & Weather Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Time of Day
              </label>
              <input
                type="text"
                value={videoContent.timeOfDay}
                onChange={(e) => handleContentChange("timeOfDay", e.target.value)}
                placeholder="Morning, night..."
                className="w-full h-12 px-4 bg-zinc-900 border border-zinc-700 focus:border-sky-500 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Weather
              </label>
              <input
                type="text"
                value={videoContent.weather}
                onChange={(e) => handleContentChange("weather", e.target.value)}
                placeholder="Sunny, rainy..."
                className="w-full h-12 px-4 bg-zinc-900 border border-zinc-700 focus:border-sky-500 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
            </div>
          </div>

          {/* Props */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Props
            </label>
            <textarea
              value={videoContent.props.join(", ")}
              onChange={(e) => {
                const props = e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                handleContentChange("props", props)
                autoResizeTextarea(e.target)
              }}
              onFocus={(e) => autoResizeTextarea(e.target)}
              placeholder="Important objects (comma separated)"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 focus:border-sky-500 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all resize-none overflow-y-auto"
              style={{ minHeight: '72px', maxHeight: '240px' }}
            />
          </div>

          {/* Dialogue */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Dialogue
            </label>
            <textarea
              value={videoContent.dialogue}
              onChange={(e) => {
                handleContentChange("dialogue", e.target.value)
                autoResizeTextarea(e.target)
              }}
              onFocus={(e) => autoResizeTextarea(e.target)}
              placeholder="Any spoken words or narration"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 focus:border-sky-500 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all resize-none overflow-y-auto"
              style={{ minHeight: '72px', maxHeight: '240px' }}
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
              value={brief.audience}
              onChange={(e) => handleUpdateBrief({ audience: e.target.value })}
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
                onChange={(value) => handleUpdateBrief({ aspectRatio: value as import("@/types/database").AspectRatio })}
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
                onChange={(value) => handleUpdateBrief({ tone: value })}
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
                onChange={(value) => handleUpdateBrief({ duration: value })}
                options={durationOptions}
                placeholder="Select duration..."
              />
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
