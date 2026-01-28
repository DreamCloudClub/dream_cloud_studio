import { useState, useEffect, useCallback, useRef } from "react"
import {
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  User,
  FileText,
  MessageSquare,
  ChevronDown,
  FolderOpen,
  Mic,
  X,
  Check,
} from "lucide-react"
import { useWorkspaceStore } from "@/state/workspaceStore"
import {
  getScriptCharacters,
  getScriptSections,
  createScriptCharacter,
  updateScriptCharacter,
  deleteScriptCharacter,
  createScriptSection,
  updateScriptSection,
  deleteScriptSection,
  reorderScriptSections,
} from "@/services/scripts"
import type {
  ScriptCharacter,
  ScriptSection,
  ScriptSectionType,
} from "@/types/database"
import { cn } from "@/lib/utils"

interface CharacterFormData {
  name: string
  description: string
  voiceDescription: string
}

const emptyCharacter: CharacterFormData = {
  name: "",
  description: "",
  voiceDescription: "",
}

// Custom Dropdown Component
interface DropdownOption {
  value: string
  label: string
}

interface CustomDropdownProps {
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  placeholder?: string
  className?: string
}

function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

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
          "w-full px-3 py-1.5 bg-zinc-800 border rounded-lg text-left transition-all text-sm",
          "flex items-center justify-between gap-2",
          "hover:bg-zinc-700",
          isOpen ? "border-sky-500 ring-1 ring-sky-500/20" : "border-zinc-700 hover:border-zinc-600"
        )}
      >
        <span className={selectedOption ? "text-zinc-200" : "text-zinc-500"}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={cn("w-3 h-3 text-zinc-400 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 py-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl shadow-black/30 overflow-hidden min-w-[160px]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={cn(
                "w-full px-3 py-2 text-left transition-all text-sm",
                "flex items-center justify-between",
                option.value === value
                  ? "bg-sky-500/10 text-sky-400"
                  : "text-zinc-300 hover:bg-zinc-800"
              )}
            >
              <span>{option.label}</span>
              {option.value === value && <Check className="w-4 h-4 text-sky-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ScriptPage() {
  const { project } = useWorkspaceStore()
  const projectId = project?.id

  // State
  const [characters, setCharacters] = useState<ScriptCharacter[]>([])
  const [sections, setSections] = useState<ScriptSection[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Character modal state
  const [showCharacterModal, setShowCharacterModal] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<ScriptCharacter | null>(null)
  const [characterForm, setCharacterForm] = useState<CharacterFormData>(emptyCharacter)

  // Section type dropdown
  const [addingSectionType, setAddingSectionType] = useState<ScriptSectionType | null>(null)

  // Drag and drop state
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null)
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null)

  // Refs for auto-growing textareas
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map())

  // Auto-resize textarea to fit content
  const autoResize = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.max(textarea.scrollHeight, 80)}px`
    }
  }, [])

  // Auto-resize all textareas when sections change
  useEffect(() => {
    textareaRefs.current.forEach((textarea) => {
      autoResize(textarea)
    })
  }, [sections, autoResize])

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      if (!projectId) {
        setIsLoading(false)
        return
      }

      try {
        const [chars, sects] = await Promise.all([
          getScriptCharacters(projectId),
          getScriptSections(projectId),
        ])
        setCharacters(chars)
        setSections(sects)
      } catch (error) {
        console.error("Error loading script data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [projectId])

  // Character CRUD
  const handleSaveCharacter = async () => {
    if (!characterForm.name.trim() || !projectId) return

    try {
      if (editingCharacter) {
        const updated = await updateScriptCharacter(editingCharacter.id, {
          name: characterForm.name,
          description: characterForm.description || null,
          voice_description: characterForm.voiceDescription || null,
        })
        setCharacters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      } else {
        const newChar = await createScriptCharacter({
          project_id: projectId,
          name: characterForm.name,
          description: characterForm.description || null,
          voice_description: characterForm.voiceDescription || null,
        })
        setCharacters((prev) => [...prev, newChar])
      }

      setShowCharacterModal(false)
      setEditingCharacter(null)
      setCharacterForm(emptyCharacter)
    } catch (error) {
      console.error("Error saving character:", error)
    }
  }

  const handleEditCharacter = (character: ScriptCharacter) => {
    setEditingCharacter(character)
    setCharacterForm({
      name: character.name,
      description: character.description || "",
      voiceDescription: character.voice_description || "",
    })
    setShowCharacterModal(true)
  }

  const handleDeleteCharacter = async (characterId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!confirm("Delete this character? Their dialogue will remain but won't have a speaker."))
      return

    try {
      await deleteScriptCharacter(characterId)
      setCharacters((prev) => prev.filter((c) => c.id !== characterId))
    } catch (error) {
      console.error("Error deleting character:", error)
    }
  }

  // Section CRUD
  const handleAddSection = async (type: ScriptSectionType, characterId?: string) => {
    if (!projectId) return

    try {
      await createScriptSection({
        project_id: projectId,
        type,
        content: "",
        character_id: type === "dialogue" ? characterId : null,
        is_new_scene: type === "description" && sections.length === 0,
      })
      setAddingSectionType(null)
    } catch (error) {
      console.error("Error adding section:", error)
    }
  }

  const handleUpdateSectionContent = async (sectionId: string, content: string) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, content } : s)))

    try {
      await updateScriptSection(sectionId, { content })
    } catch (error) {
      console.error("Error updating section:", error)
    }
  }


  const handleDeleteSection = async (sectionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      await deleteScriptSection(sectionId)
      setSections((prev) => prev.filter((s) => s.id !== sectionId))
    } catch (error) {
      console.error("Error deleting section:", error)
    }
  }

  const handleChangeCharacter = async (sectionId: string, characterId: string | null) => {
    try {
      await updateScriptSection(sectionId, { character_id: characterId })
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, character_id: characterId } : s))
      )
    } catch (error) {
      console.error("Error changing character:", error)
    }
  }

  // Get character by ID
  const getCharacter = (characterId: string | null) => {
    if (!characterId) return null
    return characters.find((c) => c.id === characterId) || null
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    setDraggedSectionId(sectionId)
    e.dataTransfer.effectAllowed = "move"
    setTimeout(() => {
      const element = document.getElementById(`section-${sectionId}`)
      if (element) element.style.opacity = "0.5"
    }, 0)
  }

  const handleDragEnd = () => {
    if (draggedSectionId) {
      const element = document.getElementById(`section-${draggedSectionId}`)
      if (element) element.style.opacity = "1"
    }
    setDraggedSectionId(null)
    setDragOverSectionId(null)
  }

  const handleDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (sectionId !== draggedSectionId) {
      setDragOverSectionId(sectionId)
    }
  }

  const handleDragLeave = () => {
    setDragOverSectionId(null)
  }

  const handleDrop = async (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault()
    if (!draggedSectionId || draggedSectionId === targetSectionId || !projectId) return

    const draggedIndex = sections.findIndex((s) => s.id === draggedSectionId)
    const targetIndex = sections.findIndex((s) => s.id === targetSectionId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const newSections = [...sections]
    const [removed] = newSections.splice(draggedIndex, 1)
    newSections.splice(targetIndex, 0, removed)
    setSections(newSections)

    try {
      await reorderScriptSections(
        projectId,
        newSections.map((s) => s.id)
      )
    } catch (error) {
      console.error("Error reordering sections:", error)
      setSections(sections)
    }

    setDraggedSectionId(null)
    setDragOverSectionId(null)
  }

  // Render character avatar (simple initial-based)
  const CharacterAvatar = ({
    character,
    size = "sm",
  }: {
    character: ScriptCharacter
    size?: "sm" | "md"
  }) => {
    const sizeClasses = size === "sm" ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm"

    return (
      <div
        className={cn(
          sizeClasses,
          "rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300 font-medium flex-shrink-0"
        )}
      >
        {character.name.charAt(0).toUpperCase()}
      </div>
    )
  }

  if (!project) return null

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 py-6 lg:py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">Script</h1>
            <p className="text-zinc-400">
              Build your script with descriptions and dialogue. Chat with Bubble to help write it.
            </p>
          </div>

          {/* Characters Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
                <User className="w-5 h-5 text-zinc-400" />
                Characters
              </h2>
              <button
                onClick={() => {
                  setEditingCharacter(null)
                  setCharacterForm(emptyCharacter)
                  setShowCharacterModal(true)
                }}
                className="px-3 py-1.5 text-sm border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-lg inline-flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Character
              </button>
            </div>

            {characters.length === 0 ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 text-center">
                <User className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">
                  No characters yet. Add characters for dialogue sections.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {characters.map((char) => (
                  <div
                    key={char.id}
                    className="group flex items-center gap-2 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-full pl-1 pr-3 py-1 cursor-pointer transition-all"
                    onClick={() => handleEditCharacter(char)}
                  >
                    <CharacterAvatar character={char} />
                    <span className="text-sm text-zinc-200">{char.name}</span>
                    {char.voice_description && <Mic className="w-3 h-3 text-zinc-500" />}
                    <button
                      onClick={(e) => handleDeleteCharacter(char.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-orange-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Script Sections */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-zinc-400" />
              Script
            </h2>

            <div className="space-y-3">
              {sections.map((section) => (
                <div
                  key={section.id}
                  id={`section-${section.id}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, section.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, section.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, section.id)}
                  className={cn(
                    "group relative bg-zinc-900 border border-zinc-700 rounded-xl p-4 transition-all",
                    dragOverSectionId === section.id &&
                      draggedSectionId !== section.id &&
                      "border-sky-500",
                    draggedSectionId === section.id && "opacity-50"
                  )}
                >
                  {/* Section Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab active:cursor-grabbing" />

                    {section.type === "description" ? (
                      <>
                        <FileText className="w-4 h-4 text-sky-400" />
                        <span className="text-sm font-medium text-zinc-200">Description</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 text-orange-400" />
                        <span className="text-sm font-medium text-zinc-200">Dialogue</span>

                        <CustomDropdown
                          value={section.character_id || ""}
                          onChange={(val) => handleChangeCharacter(section.id, val || null)}
                          placeholder="Select character..."
                          options={characters.map((char) => ({
                            value: char.id,
                            label: char.name,
                          }))}
                          className="ml-2 min-w-[140px]"
                        />

                        {getCharacter(section.character_id) && (
                          <CharacterAvatar character={getCharacter(section.character_id)!} />
                        )}

                        <div className="flex-1" />
                      </>
                    )}

                    <button
                      onClick={(e) => handleDeleteSection(section.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-orange-400 transition-all p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Section Content */}
                  <textarea
                    ref={(el) => {
                      if (el) {
                        textareaRefs.current.set(section.id, el)
                        autoResize(el)
                      } else {
                        textareaRefs.current.delete(section.id)
                      }
                    }}
                    value={section.content}
                    onChange={(e) => {
                      handleUpdateSectionContent(section.id, e.target.value)
                      autoResize(e.target)
                    }}
                    placeholder={
                      section.type === "description"
                        ? "Describe the scene, action, or camera direction..."
                        : getCharacter(section.character_id)
                          ? `${getCharacter(section.character_id)!.name} says...`
                          : "Enter dialogue..."
                    }
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500 resize-none overflow-hidden min-h-[80px] transition-colors"
                  />
                </div>
              ))}

              {/* Add Section Button */}
              <div className="relative">
                {addingSectionType === null ? (
                  <button
                    onClick={() => setAddingSectionType("description")}
                    className="w-full py-3 border-2 border-dashed border-zinc-700 hover:border-zinc-600 rounded-lg text-zinc-500 hover:text-zinc-400 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Section
                  </button>
                ) : (
                  <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
                    <p className="text-sm text-zinc-400 mb-3">What type of section?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddSection("description")}
                        className="flex-1 px-4 py-2 border border-zinc-700 hover:bg-zinc-800 rounded-lg text-zinc-300 inline-flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4 text-zinc-400" />
                        Description
                      </button>
                      <div className="flex-1 relative">
                        {characters.length === 0 ? (
                          <button
                            onClick={() => {
                              setAddingSectionType(null)
                              setShowCharacterModal(true)
                            }}
                            className="w-full px-4 py-2 border border-zinc-700 hover:bg-zinc-800 rounded-lg text-zinc-300 inline-flex items-center justify-center gap-2"
                          >
                            <User className="w-4 h-4 text-zinc-400" />
                            Add Character First
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-orange-400 flex-shrink-0" />
                            <CustomDropdown
                              value=""
                              onChange={(val) => {
                                if (val) {
                                  handleAddSection("dialogue", val)
                                }
                              }}
                              placeholder="Dialogue for..."
                              options={characters.map((char) => ({
                                value: char.id,
                                label: char.name,
                              }))}
                              className="flex-1"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setAddingSectionType(null)}
                      className="mt-2 text-xs text-zinc-500 hover:text-zinc-400"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {sections.length === 0 && (
              <div className="mt-4 flex flex-col items-center justify-center py-12 px-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
                <FolderOpen className="w-12 h-12 text-zinc-600 mb-3" />
                <p className="text-zinc-500 text-sm text-center">No script sections yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Character Modal */}
      {showCharacterModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-100">
                {editingCharacter ? "Edit Character" : "New Character"}
              </h3>
              <button
                onClick={() => {
                  setShowCharacterModal(false)
                  setEditingCharacter(null)
                  setCharacterForm(emptyCharacter)
                }}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={characterForm.name}
                  onChange={(e) => setCharacterForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Character name"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Description</label>
                <textarea
                  value={characterForm.description}
                  onChange={(e) =>
                    setCharacterForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Physical appearance, personality, role in the story..."
                  rows={2}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  <Mic className="w-3 h-3 inline mr-1" />
                  Voice Description
                </label>
                <textarea
                  value={characterForm.voiceDescription}
                  onChange={(e) =>
                    setCharacterForm((prev) => ({ ...prev, voiceDescription: e.target.value }))
                  }
                  placeholder="Voice characteristics for AI generation (e.g., deep, warm, British accent...)"
                  rows={2}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCharacterModal(false)
                  setEditingCharacter(null)
                  setCharacterForm(emptyCharacter)
                }}
                className="px-4 py-2 text-zinc-400 hover:text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCharacter}
                disabled={!characterForm.name.trim()}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg"
              >
                {editingCharacter ? "Save Changes" : "Create Character"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
