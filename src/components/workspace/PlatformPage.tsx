import { useState, useEffect, useRef } from "react"
import {
  Plus,
  ChevronDown,
  Check,
  X,
  Loader2,
  FolderOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkspaceStore } from "@/state/workspaceStore"
import { useAuth } from "@/contexts/AuthContext"
import { getPlatforms, createPlatform } from "@/services/platforms"
import { updateProject } from "@/services/projects"
import type { Platform } from "@/types/database"

// Custom Dropdown for Platforms
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

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  if (platforms.length === 0 && !isLoading) return null

  return (
    <div ref={dropdownRef} className="relative">
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
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-zinc-500" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-zinc-300">
              {selectedPlatform ? selectedPlatform.name : "Select existing platform"}
            </p>
            <p className="text-xs text-zinc-500">
              {selectedPlatform ? "Currently selected" : "Choose from your platforms"}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn("w-5 h-5 text-zinc-500 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
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
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    {platform.logo_url ? (
                      <img
                        src={platform.logo_url}
                        alt={platform.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <FolderOpen className="w-5 h-5 text-zinc-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200">{platform.name}</p>
                    {platform.description && (
                      <p className="text-xs text-zinc-500 truncate">{platform.description}</p>
                    )}
                  </div>
                  {selectedPlatform?.id === platform.id && (
                    <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />
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
interface CreatePlatformModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, description: string) => Promise<void>
  isSaving: boolean
}

function CreatePlatformModal({ isOpen, onClose, onSave, isSaving }: CreatePlatformModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (isOpen) {
      setName("")
      setDescription("")
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!name.trim()) return
    await onSave(name.trim(), description.trim())
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Create New Platform</h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Platform"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this platform for?"
              rows={3}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500 resize-none transition-colors"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || isSaving}
            className={cn(
              "px-6 py-2 rounded-lg font-medium transition-all inline-flex items-center gap-2",
              name.trim() && !isSaving
                ? "bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white hover:opacity-90"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export function PlatformPage() {
  const { user } = useAuth()
  const { project } = useWorkspaceStore()

  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Load platforms
  useEffect(() => {
    async function loadPlatforms() {
      if (!user) return
      setIsLoading(true)
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
        setIsLoading(false)
      }
    }
    loadPlatforms()
  }, [user, project?.platform_id])

  const handleSelectPlatform = async (platform: Platform) => {
    setSelectedPlatform(platform)
    if (project) {
      await updateProject(project.id, { platform_id: platform.id })
    }
  }

  const handleCreatePlatform = async (name: string, description: string) => {
    if (!user) return
    setIsSaving(true)
    try {
      const newPlatform = await createPlatform({
        user_id: user.id,
        name,
        description: description || null,
      })
      setPlatforms((prev) => [newPlatform, ...prev])
      setSelectedPlatform(newPlatform)
      if (project) {
        await updateProject(project.id, { platform_id: newPlatform.id })
      }
      setShowModal(false)
    } catch (error) {
      console.error("Error creating platform:", error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!project) return null

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Platform</h1>
          <p className="text-zinc-400 mt-1">
            Select or create a platform for this project.
          </p>
        </div>

        {/* Create New Button */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full p-4 bg-zinc-900 border-2 border-dashed border-zinc-700 hover:border-sky-500 rounded-xl flex items-center justify-center gap-2 text-zinc-400 hover:text-sky-400 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Create New Platform</span>
        </button>

        {/* Platform Dropdown */}
        <PlatformDropdown
          platforms={platforms}
          selectedPlatform={selectedPlatform}
          onSelect={handleSelectPlatform}
          isLoading={isLoading}
        />
      </div>

      {/* Create Modal */}
      <CreatePlatformModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleCreatePlatform}
        isSaving={isSaving}
      />
    </div>
  )
}
