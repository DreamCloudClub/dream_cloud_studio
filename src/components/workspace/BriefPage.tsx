import { useState, useEffect, useRef, useCallback } from "react"
import { ChevronDown, Check, Plus, X, Loader2, FolderOpen } from "lucide-react"
import { useWorkspaceStore } from "@/state/workspaceStore"
import { ASPECT_RATIOS } from "@/state/projectWizardStore"
import { useAuth } from "@/contexts/AuthContext"
import { getPlatforms, createPlatform } from "@/services/platforms"
import type { Platform } from "@/types/database"
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

// Platform Dropdown Component
interface PlatformDropdownProps {
  platforms: Platform[]
  selectedPlatform: Platform | null
  onSelect: (platform: Platform) => void
  isLoading: boolean
}

function PlatformDropdown({
  platforms,
  selectedPlatform,
  onSelect,
  isLoading,
}: PlatformDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (platforms.length === 0 && !isLoading) return null

  return (
    <div ref={dropdownRef} className="relative flex-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-4 py-3 bg-zinc-900 border rounded-xl text-left transition-all",
          "flex items-center justify-between gap-2",
          "hover:bg-zinc-800",
          isOpen
            ? "border-sky-500 ring-2 ring-sky-500/20"
            : "border-zinc-700 hover:border-zinc-600"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
            {selectedPlatform?.logo_url ? (
              <img src={selectedPlatform.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
            ) : (
              <FolderOpen className="w-4 h-4 text-zinc-500" />
            )}
          </div>
          <span className={selectedPlatform ? "text-zinc-200" : "text-zinc-500"}>
            {selectedPlatform?.name || "Select platform"}
          </span>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-zinc-500 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
              </div>
            ) : (
              platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => {
                    onSelect(platform)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 hover:bg-zinc-800 transition-colors text-left",
                    selectedPlatform?.id === platform.id && "bg-sky-500/10"
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    {platform.logo_url ? (
                      <img src={platform.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <FolderOpen className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>
                  <span className="text-sm text-zinc-200">{platform.name}</span>
                  {selectedPlatform?.id === platform.id && (
                    <Check className="w-4 h-4 text-sky-400 ml-auto flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Create Platform Modal
function CreatePlatformModal({
  isOpen,
  onClose,
  onSave,
  isSaving,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, description: string) => Promise<void>
  isSaving: boolean
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (isOpen) {
      setName("")
      setDescription("")
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Create New Platform</h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Platform"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this platform for?"
              rows={2}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-4 border-t border-zinc-800">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onSave(name.trim(), description.trim())}
            disabled={!name.trim() || isSaving}
            className={cn(
              "px-6 py-2 rounded-lg font-medium transition-all inline-flex items-center gap-2",
              name.trim() && !isSaving
                ? "bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white hover:opacity-90"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : "Save"}
          </button>
        </div>
      </div>
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
  const { user } = useAuth()
  const { project, updateBrief, updateProjectInfo } = useWorkspaceStore()
  const [saveError, setSaveError] = useState<string | null>(null)

  // Platform state
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [isPlatformLoading, setIsPlatformLoading] = useState(true)
  const [showPlatformModal, setShowPlatformModal] = useState(false)
  const [isPlatformSaving, setIsPlatformSaving] = useState(false)

  // Load platforms
  useEffect(() => {
    async function loadPlatforms() {
      if (!user) return
      setIsPlatformLoading(true)
      try {
        const data = await getPlatforms(user.id)
        setPlatforms(data)
        // If project has a platform_id, select it
        if (project?.platform_id) {
          const found = data.find((p) => p.id === project.platform_id)
          if (found) setSelectedPlatform(found)
        }
      } catch (error) {
        console.error("Error loading platforms:", error)
      } finally {
        setIsPlatformLoading(false)
      }
    }
    loadPlatforms()
  }, [user, project?.platform_id])

  const handleSelectPlatform = async (platform: Platform) => {
    setSelectedPlatform(platform)
    await updateProjectInfo({ platform_id: platform.id })
  }

  const handleCreatePlatform = async (name: string, description: string) => {
    if (!user) return
    setIsPlatformSaving(true)
    try {
      const newPlatform = await createPlatform({
        user_id: user.id,
        name,
        description: description || null,
      })
      setPlatforms((prev) => [newPlatform, ...prev])
      setSelectedPlatform(newPlatform)
      await updateProjectInfo({ platform_id: newPlatform.id })
      setShowPlatformModal(false)
    } catch (error) {
      console.error("Error creating platform:", error)
    } finally {
      setIsPlatformSaving(false)
    }
  }

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
          {/* Platform Selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Platform
            </label>
            <div className="flex gap-2">
              <PlatformDropdown
                platforms={platforms}
                selectedPlatform={selectedPlatform}
                onSelect={handleSelectPlatform}
                isLoading={isPlatformLoading}
              />
              <button
                onClick={() => setShowPlatformModal(true)}
                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New</span>
              </button>
            </div>
          </div>

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

      {/* Create Platform Modal */}
      <CreatePlatformModal
        isOpen={showPlatformModal}
        onClose={() => setShowPlatformModal(false)}
        onSave={handleCreatePlatform}
        isSaving={isPlatformSaving}
      />
    </div>
  )
}
