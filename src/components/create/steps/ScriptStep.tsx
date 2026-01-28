import { useState, useEffect, useCallback, useRef } from "react"
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  GripVertical,
  User,
  FileText,
  MessageSquare,
  ChevronDown,
  FolderOpen,
  Mic,
  Image,
  X
} from "lucide-react"
import { useProjectWizardStore } from "@/state/projectWizardStore"
import { useAuth } from "@/contexts/AuthContext"
import {
  getScriptCharactersWithAssets,
  getScriptSectionsWithCharacters,
  createScriptCharacter,
  updateScriptCharacter,
  deleteScriptCharacter,
  linkCharacterToAsset,
  createScriptSection,
  updateScriptSection,
  deleteScriptSection,
  reorderScriptSections,
  subscribeToScriptSections,
  subscribeToScriptCharacters,
} from "@/services/scripts"
import { getAssets } from "@/services/assets"
import { createDraftProject } from "@/services/projects"
import type {
  ScriptCharacterWithAsset,
  ScriptSectionWithCharacter,
  ScriptSectionType,
  Asset,
} from "@/types/database"
import { Button } from "@/components/ui/button"
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

export function ScriptStep() {
  const { user } = useAuth()
  const {
    projectId,
    platform,
    setProjectId,
    goToNextStep,
    goToPreviousStep,
    markStepComplete,
  } = useProjectWizardStore()

  // State
  const [characters, setCharacters] = useState<ScriptCharacterWithAsset[]>([])
  const [sections, setSections] = useState<ScriptSectionWithCharacter[]>([])
  const [characterAssets, setCharacterAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  // Character modal state
  const [showCharacterModal, setShowCharacterModal] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<ScriptCharacterWithAsset | null>(null)
  const [characterForm, setCharacterForm] = useState<CharacterFormData>(emptyCharacter)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)

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
      textarea.style.height = 'auto'
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
        const [chars, sects, assets] = await Promise.all([
          getScriptCharactersWithAssets(projectId),
          getScriptSectionsWithCharacters(projectId),
          getAssets(projectId),
        ])
        setCharacters(chars)
        setSections(sects)
        // Filter to only character assets
        setCharacterAssets(assets.filter(a => a.category === 'character'))
      } catch (error) {
        console.error("Error loading script data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [projectId])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!projectId) return

    const unsubscribeSections = subscribeToScriptSections(projectId, (payload) => {
      if (payload.eventType === "INSERT" && payload.new) {
        setSections(prev => {
          const updated = [...prev, payload.new as ScriptSectionWithCharacter]
          return updated.sort((a, b) => a.sort_order - b.sort_order)
        })
      } else if (payload.eventType === "UPDATE" && payload.new) {
        setSections(prev =>
          prev.map(s => s.id === payload.new!.id ? { ...s, ...payload.new } : s)
        )
      } else if (payload.eventType === "DELETE" && payload.old) {
        setSections(prev => prev.filter(s => s.id !== payload.old!.id))
      }
    })

    const unsubscribeCharacters = subscribeToScriptCharacters(projectId, (payload) => {
      if (payload.eventType === "INSERT" && payload.new) {
        setCharacters(prev => [...prev, payload.new as ScriptCharacterWithAsset])
      } else if (payload.eventType === "UPDATE" && payload.new) {
        setCharacters(prev =>
          prev.map(c => c.id === payload.new!.id ? { ...c, ...payload.new } as ScriptCharacterWithAsset : c)
        )
      } else if (payload.eventType === "DELETE" && payload.old) {
        setCharacters(prev => prev.filter(c => c.id !== payload.old!.id))
      }
    })

    return () => {
      unsubscribeSections()
      unsubscribeCharacters()
    }
  }, [projectId])

  // Ensure project exists
  const ensureProject = useCallback(async (): Promise<string> => {
    if (projectId) return projectId

    if (!user) throw new Error("No user found")

    const platformId = platform?.type === "existing" ? platform.platformId : undefined
    const draft = await createDraftProject(user.id, platformId)
    setProjectId(draft.id)
    return draft.id
  }, [projectId, user, platform, setProjectId])

  // Character CRUD
  const handleSaveCharacter = async () => {
    if (!characterForm.name.trim()) return

    try {
      const currentProjectId = await ensureProject()

      if (editingCharacter) {
        await updateScriptCharacter(editingCharacter.id, {
          name: characterForm.name,
          description: characterForm.description || null,
          voice_description: characterForm.voiceDescription || null,
        })
        // Update asset link if changed
        if (selectedAssetId !== editingCharacter.avatar_asset_id) {
          await linkCharacterToAsset(editingCharacter.id, selectedAssetId)
        }
      } else {
        const newChar = await createScriptCharacter({
          project_id: currentProjectId,
          name: characterForm.name,
          description: characterForm.description || null,
          voice_description: characterForm.voiceDescription || null,
          avatar_asset_id: selectedAssetId,
        })
        // If asset was selected, link it
        if (selectedAssetId) {
          await linkCharacterToAsset(newChar.id, selectedAssetId)
        }
      }

      setShowCharacterModal(false)
      setEditingCharacter(null)
      setCharacterForm(emptyCharacter)
      setSelectedAssetId(null)

      // Reload characters to get updated asset data
      if (currentProjectId) {
        const chars = await getScriptCharactersWithAssets(currentProjectId)
        setCharacters(chars)
      }
    } catch (error) {
      console.error("Error saving character:", error)
    }
  }

  const handleEditCharacter = (character: ScriptCharacterWithAsset) => {
    setEditingCharacter(character)
    setCharacterForm({
      name: character.name,
      description: character.description || "",
      voiceDescription: character.voice_description || "",
    })
    setSelectedAssetId(character.avatar_asset_id || null)
    setShowCharacterModal(true)
  }

  const handleDeleteCharacter = async (characterId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!confirm("Delete this character? Their dialogue will remain but won't have a speaker.")) return

    try {
      await deleteScriptCharacter(characterId)
      // Update local state immediately
      setCharacters(prev => prev.filter(c => c.id !== characterId))
    } catch (error) {
      console.error("Error deleting character:", error)
    }
  }

  // Section CRUD
  const handleAddSection = async (type: ScriptSectionType, characterId?: string) => {
    try {
      const currentProjectId = await ensureProject()

      await createScriptSection({
        project_id: currentProjectId,
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
    setSections(prev =>
      prev.map(s => s.id === sectionId ? { ...s, content } : s)
    )

    try {
      await updateScriptSection(sectionId, { content })
    } catch (error) {
      console.error("Error updating section:", error)
    }
  }

  const handleToggleNewScene = async (sectionId: string, isNewScene: boolean) => {
    try {
      await updateScriptSection(sectionId, { is_new_scene: isNewScene })
      setSections(prev =>
        prev.map(s => s.id === sectionId ? { ...s, is_new_scene: isNewScene } : s)
      )
    } catch (error) {
      console.error("Error updating section:", error)
    }
  }

  const handleDeleteSection = async (sectionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      await deleteScriptSection(sectionId)
      setSections(prev => prev.filter(s => s.id !== sectionId))
    } catch (error) {
      console.error("Error deleting section:", error)
    }
  }

  const handleChangeCharacter = async (sectionId: string, characterId: string | null) => {
    try {
      await updateScriptSection(sectionId, { character_id: characterId })
      setSections(prev =>
        prev.map(s => {
          if (s.id === sectionId) {
            const character = characterId ? characters.find(c => c.id === characterId) : null
            return { ...s, character_id: characterId, character: character || null }
          }
          return s
        })
      )
    } catch (error) {
      console.error("Error changing character:", error)
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    setDraggedSectionId(sectionId)
    e.dataTransfer.effectAllowed = "move"
    // Add a slight delay to allow the drag image to be captured
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

    // Find indices
    const draggedIndex = sections.findIndex(s => s.id === draggedSectionId)
    const targetIndex = sections.findIndex(s => s.id === targetSectionId)

    if (draggedIndex === -1 || targetIndex === -1) return

    // Reorder locally first for immediate feedback
    const newSections = [...sections]
    const [removed] = newSections.splice(draggedIndex, 1)
    newSections.splice(targetIndex, 0, removed)
    setSections(newSections)

    // Persist to database
    try {
      await reorderScriptSections(projectId, newSections.map(s => s.id))
    } catch (error) {
      console.error("Error reordering sections:", error)
      // Revert on error
      setSections(sections)
    }

    setDraggedSectionId(null)
    setDragOverSectionId(null)
  }

  // Navigation
  const handleContinue = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      await ensureProject()
      // Save all sections to ensure everything is persisted
      for (const section of sections) {
        await updateScriptSection(section.id, {
          content: section.content,
          scene_context: section.scene_context,
          is_new_scene: section.is_new_scene,
        })
      }
      markStepComplete("script")
      goToNextStep()
    } catch (error) {
      console.error("Error continuing:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!user) return
    setIsSavingDraft(true)
    try {
      await ensureProject()
      // Save all sections to ensure everything is persisted
      for (const section of sections) {
        await updateScriptSection(section.id, {
          content: section.content,
          scene_context: section.scene_context,
          is_new_scene: section.is_new_scene,
        })
      }
    } catch (error) {
      console.error("Error saving draft:", error)
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleBack = () => {
    goToPreviousStep()
  }

  // Render character avatar
  const CharacterAvatar = ({ character, size = "sm" }: { character: ScriptCharacterWithAsset; size?: "sm" | "md" }) => {
    const sizeClasses = size === "sm" ? "w-8 h-8 text-sm" : "w-12 h-12 text-lg"

    if (character.avatar_asset?.url) {
      return (
        <img
          src={character.avatar_asset.url}
          alt={character.name}
          className={cn(sizeClasses, "rounded-full object-cover flex-shrink-0")}
        />
      )
    }

    return (
      <div className={cn(sizeClasses, "rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300 font-medium flex-shrink-0")}>
        {character.name.charAt(0).toUpperCase()}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-zinc-100 mb-2">
            Script
          </h1>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingCharacter(null)
                setCharacterForm(emptyCharacter)
                setSelectedAssetId(null)
                setShowCharacterModal(true)
              }}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Character
            </Button>
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
                  {char.voice_description && (
                    <Mic className="w-3 h-3 text-zinc-500" />
                  )}
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
                  dragOverSectionId === section.id && draggedSectionId !== section.id
                    ? "border-sky-500"
                    : "",
                  draggedSectionId === section.id && "opacity-50"
                )}
              >
                {/* Section Header - Title on top */}
                <div className="flex items-center gap-2 mb-3">
                  <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab active:cursor-grabbing" />

                  {section.type === "description" ? (
                    <>
                      <FileText className="w-4 h-4 text-sky-400" />
                      <span className="text-sm font-medium text-zinc-200">Description</span>
                      <label className="ml-auto flex items-center gap-2 text-xs text-zinc-500">
                        <input
                          type="checkbox"
                          checked={section.is_new_scene}
                          onChange={(e) => handleToggleNewScene(section.id, e.target.checked)}
                          className="rounded border-zinc-700 bg-zinc-800 text-sky-500 focus:ring-sky-500"
                        />
                        New Scene
                      </label>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-zinc-200">Dialogue</span>

                      {/* Character selector */}
                      <div className="relative ml-2">
                        <select
                          value={section.character_id || ""}
                          onChange={(e) => handleChangeCharacter(section.id, e.target.value || null)}
                          className="appearance-none bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 pr-7 focus:outline-none focus:border-sky-500"
                        >
                          <option value="">Select character...</option>
                          {characters.map((char) => (
                            <option key={char.id} value={char.id}>
                              {char.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
                      </div>

                      {section.character && (
                        <CharacterAvatar character={section.character as ScriptCharacterWithAsset} />
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

                {/* Scene context for descriptions - shown above content */}
                {section.type === "description" && section.is_new_scene && (
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Scene context (location, mood, time of day...)"
                      value={section.scene_context || ""}
                      onChange={(e) => updateScriptSection(section.id, { scene_context: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-300 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>
                )}

                {/* Section Content - Styled text box */}
                <textarea
                  ref={(el) => {
                    if (el) {
                      textareaRefs.current.set(section.id, el)
                      // Auto-resize on mount
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
                      : section.character
                        ? `${section.character.name} says...`
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
                    <Button
                      variant="outline"
                      onClick={() => handleAddSection("description")}
                      className="flex-1 border-zinc-700 hover:bg-zinc-800"
                    >
                      <FileText className="w-4 h-4 mr-2 text-zinc-400" />
                      Description
                    </Button>
                    <div className="flex-1 relative">
                      {characters.length === 0 ? (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setAddingSectionType(null)
                            setShowCharacterModal(true)
                          }}
                          className="w-full border-zinc-700 hover:bg-zinc-800"
                        >
                          <User className="w-4 h-4 mr-2 text-zinc-400" />
                          Add Character First
                        </Button>
                      ) : (
                        <div className="relative">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAddSection("dialogue", e.target.value)
                              }
                            }}
                            className="w-full appearance-none bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none cursor-pointer"
                            defaultValue=""
                          >
                            <option value="" disabled>
                              Dialogue for...
                            </option>
                            {characters.map((char) => (
                              <option key={char.id} value={char.id}>
                                {char.name}
                              </option>
                            ))}
                          </select>
                          <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
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
              <p className="text-zinc-500 text-sm text-center">
                No script sections yet
              </p>
            </div>
          )}
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
              disabled={isSavingDraft}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
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
              disabled={isSaving}
              className="px-8 bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 hover:from-sky-300 hover:via-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/20"
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
                  setSelectedAssetId(null)
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
                  onChange={(e) => setCharacterForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Character name"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Description
                </label>
                <textarea
                  value={characterForm.description}
                  onChange={(e) => setCharacterForm(prev => ({ ...prev, description: e.target.value }))}
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
                  onChange={(e) => setCharacterForm(prev => ({ ...prev, voiceDescription: e.target.value }))}
                  placeholder="Voice characteristics for AI generation (e.g., deep, warm, British accent...)"
                  rows={2}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500 resize-none"
                />
                <p className="text-xs text-zinc-600 mt-1">
                  Used for voice generation in Workspace
                </p>
              </div>

              {/* Character Asset Selection */}
              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  <Image className="w-3 h-3 inline mr-1" />
                  Character Image
                </label>
                {characterAssets.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    No character assets available. Create character images in the Asset Creator.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {/* No image option */}
                    <button
                      onClick={() => setSelectedAssetId(null)}
                      className={cn(
                        "aspect-square rounded-lg border-2 flex items-center justify-center transition-all",
                        selectedAssetId === null
                          ? "border-sky-500 bg-zinc-800"
                          : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                      )}
                    >
                      <User className="w-6 h-6 text-zinc-500" />
                    </button>
                    {characterAssets.map((asset) => (
                      <button
                        key={asset.id}
                        onClick={() => setSelectedAssetId(asset.id)}
                        className={cn(
                          "aspect-square rounded-lg border-2 overflow-hidden transition-all",
                          selectedAssetId === asset.id
                            ? "border-sky-500"
                            : "border-zinc-700 hover:border-zinc-600"
                        )}
                      >
                        <img
                          src={asset.url || ""}
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCharacterModal(false)
                  setEditingCharacter(null)
                  setCharacterForm(emptyCharacter)
                  setSelectedAssetId(null)
                }}
                className="text-zinc-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCharacter}
                disabled={!characterForm.name.trim()}
                className="bg-sky-500 hover:bg-sky-400 text-white"
              >
                {editingCharacter ? "Save Changes" : "Create Character"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
