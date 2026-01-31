import { useState, useRef, useEffect, useCallback } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Mic, Send, Loader2, MessageSquare, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useProjectWizardStore, WIZARD_STEPS } from "@/state/projectWizardStore"
import { useAssetWizardStore } from "@/state/assetWizardStore"
import { useWorkspaceStore, type WorkspaceTab } from "@/state/workspaceStore"
import { useFoundationWizardStore } from "@/state/foundationWizardStore"
import { useAuth } from "@/contexts/AuthContext"
import { sendMessage, getInitialGreeting, type BubbleContext, type Message, type ToolCall, type ToolResult } from "@/services/claude"
import {
  createDraftProject,
  updateProject,
  getProjectBrief,
  createProjectBrief,
  updateProjectBrief,
  getMoodBoard,
  createMoodBoard,
  updateMoodBoard as updateMoodBoardDb,
  getStoryboard,
  createStoryboard,
  updateStoryboard as updateStoryboardDb,
  upsertProjectComposition,
} from "@/services/projects"
import { createAsset, incrementUsage } from "@/services/assets"
import { generateImages } from "@/services/replicate"
import { generateVoice, generateSoundEffect, DEFAULT_VOICES } from "@/services/elevenlabs"
import { generateMusic } from "@/services/replicate"
import {
  getScriptCharacters,
  getScriptSectionsWithCharacters,
  createScriptCharacter,
  createScriptSection,
  updateScriptSection,
} from "@/services/scripts"
import type { ScriptCharacter, ScriptSectionWithCharacter } from "@/types/database"

interface BubblePanelProps {
  className?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function BubblePanel({ className, isCollapsed = false, onToggleCollapse }: BubblePanelProps) {
  const [inputValue, setInputValue] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isCollapsedListening, setIsCollapsedListening] = useState(false)
  const [textareaHeight, setTextareaHeight] = useState(40)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const initialMessageSent = useRef(false)
  const collapsedRecognitionRef = useRef<SpeechRecognition | null>(null)
  const collapsedSilenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Script data for context
  const [scriptCharacters, setScriptCharacters] = useState<ScriptCharacter[]>([])
  const [scriptSections, setScriptSections] = useState<ScriptSectionWithCharacter[]>([])

  const location = useLocation()
  const navigate = useNavigate()

  // Workspace store - for editing existing projects
  const {
    project: workspaceProject,
    activeTab,
    setActiveTab: setWorkspaceTab,
    selectedClipId,
    isPlaying,
    setSelectedClip: setWorkspaceSelectedClip,
    setIsPlaying: setWorkspaceIsPlaying,
    startAssetCreation: workspaceStartAssetCreation,
    updateBrief: updateWorkspaceBrief,
    updateMoodBoard: updateWorkspaceMoodBoard,
    addClip: addWorkspaceClip,
    moveClip: moveWorkspaceClip,
    trimClip: trimWorkspaceClip,
    deleteClip: deleteWorkspaceClip,
    updateComposition: updateWorkspaceComposition,
    updateExportSettings: updateWorkspaceExportSettings,
    addStoryboardCard: addWorkspaceStoryboardCard,
    updateStoryboardCard: updateWorkspaceStoryboardCard,
    removeStoryboardCard: removeWorkspaceStoryboardCard,
  } = useWorkspaceStore()

  // Detect context based on route
  const isOnDashboard = location.pathname === "/"
  const isInWorkspace = location.pathname.startsWith("/project/")
  const isInAssetCreator = location.pathname.startsWith("/create/asset")
  const isInFoundationCreator = location.pathname.startsWith("/create/foundation")
  const isInCreateWizard = location.pathname.startsWith("/create/") && !isInAssetCreator && !isInFoundationCreator
  const isInLibraryAssets = location.pathname === "/library/assets"
  const isInLibraryProjects = location.pathname === "/library/projects"
  const isInLibrary = isInLibraryAssets || isInLibraryProjects

  // Auto-resize textarea based on content
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Wait if textarea not in DOM yet (width 0 means not rendered)
    if (textarea.offsetWidth === 0) return

    const minHeight = 40
    const maxHeight = 120

    // If empty, use min height
    if (!textarea.value) {
      textarea.style.height = `${minHeight}px`
      setTextareaHeight(minHeight)
      return
    }

    // Set to minHeight first to measure true scrollHeight
    textarea.style.height = `${minHeight}px`
    textarea.style.overflow = 'hidden'
    const scrollHeight = textarea.scrollHeight
    const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight))

    textarea.style.height = `${newHeight}px`
    textarea.style.overflow = newHeight >= maxHeight ? 'auto' : 'hidden'
    setTextareaHeight(newHeight)
  }, [])

  const { user } = useAuth()

  const {
    currentStep,
    initialPrompt,
    platform,
    brief,
    moodBoard,
    storyboard,
    shots,
    bubbleMessages,
    isBubbleTyping,
    addBubbleMessage,
    setBubbleTyping,
    clearBubbleMessages,
    // Project persistence
    projectId,
    setProjectId,
    // Actions for tool calls
    setPlatform,
    updateBrief,
    updateVideoContent,
    updateMoodBoard,
    setStoryboard,
    setShots,
    addShot,
    audio,
    setAudioPlans,
    goToNextStep,
    goToPreviousStep,
    markStepComplete,
    // Composition actions
    composition,
    setTitleCard,
    setOutroCard,
    setDefaultTransition,
    addTextOverlay,
  } = useProjectWizardStore()

  // Asset wizard store - for Create Asset flow
  const {
    currentStep: assetWizardStep,
    assetType: wizardAssetType,
    category: wizardCategory,
    assetName: wizardAssetName,
    userDescription: wizardUserDescription,
    aiPrompt: wizardAiPrompt,
    stylePreset: wizardStylePreset,
    setAssetType: setWizardAssetType,
    setCategory: setWizardCategory,
    setAssetName: setWizardAssetName,
    setUserDescription: setWizardUserDescription,
    setAiPrompt: setWizardAiPrompt,
    setStylePreset: setWizardStylePreset,
    nextStep: nextAssetStep,
  } = useAssetWizardStore()

  // Foundation wizard store - for Create Foundation flow
  const {
    currentStep: foundationWizardStep,
    editingId: foundationEditingId,
    name: foundationName,
    description: foundationDescription,
    colorPalette: foundationColorPalette,
    style: foundationStyle,
    mood: foundationMood,
    typography: foundationTypography,
    tone: foundationTone,
    moodImages: foundationMoodImages,
    setName: setFoundationName,
    setDescription: setFoundationDescription,
    setColorPalette: setFoundationColorPalette,
    addColor: addFoundationColor,
    removeColor: removeFoundationColor,
    setStyle: setFoundationStyle,
    setMood: setFoundationMood,
    setTypography: setFoundationTypography,
    setTone: setFoundationTone,
    nextStep: nextFoundationStep,
    prevStep: prevFoundationStep,
  } = useFoundationWizardStore()

  // Load script data when on script step
  useEffect(() => {
    async function loadScriptData() {
      if (currentStep === 'script' && projectId) {
        try {
          const [chars, sects] = await Promise.all([
            getScriptCharacters(projectId),
            getScriptSectionsWithCharacters(projectId),
          ])
          setScriptCharacters(chars)
          setScriptSections(sects)
        } catch (error) {
          console.error('Error loading script data:', error)
        }
      }
    }
    loadScriptData()
  }, [currentStep, projectId])

  // Determine current context step for greeting
  const getContextStep = (): string => {
    if (isOnDashboard) return 'home'
    if (isInWorkspace) return 'workspace'
    if (isInAssetCreator) return `asset-${assetWizardStep}`
    if (isInFoundationCreator) return `foundation-${foundationWizardStep}`
    if (isInCreateWizard) return currentStep
    return 'home'
  }

  // Get prompt/name for greeting based on context
  const getContextPrompt = (): string | undefined => {
    if (isInWorkspace && workspaceProject) return workspaceProject.name
    if (isInAssetCreator) return wizardAssetName || undefined
    if (isInCreateWizard) return initialPrompt || undefined
    return undefined
  }

  // Build context for Claude - adapts based on where we are
  const buildContext = (): BubbleContext => {
    // Workspace context (existing project)
    if (isInWorkspace && workspaceProject) {
      // Count assets by type
      const assetsByType: { image?: number; video?: number; audio?: number } = {}
      workspaceProject.assets.forEach(a => {
        if (a.type === 'image') assetsByType.image = (assetsByType.image || 0) + 1
        else if (a.type === 'video') assetsByType.video = (assetsByType.video || 0) + 1
        else if (a.type === 'audio') assetsByType.audio = (assetsByType.audio || 0) + 1
      })

      return {
        currentStep: 'workspace',
        currentRoute: location.pathname,
        initialPrompt: workspaceProject.name,
        brief: {
          name: workspaceProject.brief.name,
          description: workspaceProject.brief.description,
          audience: workspaceProject.brief.audience,
          tone: workspaceProject.brief.tone,
          duration: workspaceProject.brief.duration,
          aspectRatio: workspaceProject.brief.aspectRatio,
        },
        storyboard: workspaceProject.storyboardCards.length > 0 ? {
          acts: workspaceProject.storyboardCards.map(c => ({
            name: c.title,
            description: c.description
          })),
        } : undefined,
        clipCount: workspaceProject.timeline.clips.length || undefined,
        // Full workspace context
        workspace: {
          activeTab,
          projectId: workspaceProject.id,
          projectName: workspaceProject.name,
          selectedClipId,
          isPlaying,
          timeline: {
            clips: workspaceProject.timeline.clips.map(clip => {
              const asset = workspaceProject.assets.find(a => a.id === clip.assetId)
              return {
                id: clip.id,
                assetId: clip.assetId,
                assetName: asset?.name,
                assetType: asset?.type,
                startTime: clip.startTime,
                duration: clip.duration,
              }
            }),
          },
          assetCount: workspaceProject.assets.length,
          assetsByType,
        },
      }
    }

    // Home/dashboard context
    if (isOnDashboard) {
      return {
        currentStep: 'home',
        currentRoute: location.pathname,
      }
    }

    // Asset Creator context (single page)
    if (isInAssetCreator) {
      return {
        currentStep: 'asset-creator',
        currentRoute: location.pathname,
        assetWizard: {
          type: wizardAssetType || undefined,
          category: wizardCategory || undefined,
          name: wizardAssetName || undefined,
          userDescription: wizardUserDescription || undefined,
          aiPrompt: wizardAiPrompt || undefined,
          style: wizardStylePreset || undefined,
        },
      }
    }

    // Library context
    if (isInLibrary) {
      return {
        currentStep: isInLibraryAssets ? 'library-assets' : 'library-projects',
        currentRoute: location.pathname,
        library: {
          // Note: Library data is passed from outside via callbacks
          // The view_library_asset and update_library_asset tools are handled by callbacks
        },
      }
    }

    // Foundation creator context
    if (isInFoundationCreator) {
      return {
        currentStep: `foundation-${foundationWizardStep}`,
        currentRoute: location.pathname,
        foundationWizard: {
          step: foundationWizardStep,
          editingId: foundationEditingId,
          name: foundationName || undefined,
          description: foundationDescription || undefined,
          colorPalette: foundationColorPalette,
          style: foundationStyle,
          mood: foundationMood,
          typography: foundationTypography,
          tone: foundationTone,
          moodImageCount: foundationMoodImages.length,
        },
      }
    }

    // Create wizard context (new project)
    return {
      currentStep,
      currentRoute: location.pathname,
      initialPrompt: initialPrompt || undefined,
      platform: platform ? {
        type: platform.type,
        name: platform.platformName,
      } : undefined,
      brief: brief ? {
        name: brief.name,
        description: brief.description,
        audience: brief.audience,
        tone: brief.tone,
        duration: brief.duration,
        aspectRatio: brief.aspectRatio,
      } : undefined,
      videoContent: brief?.videoContent ? {
        characters: brief.videoContent.characters,
        setting: brief.videoContent.setting,
        timeOfDay: brief.videoContent.timeOfDay,
        weather: brief.videoContent.weather,
        action: brief.videoContent.action,
        props: brief.videoContent.props,
        dialogue: brief.videoContent.dialogue,
      } : undefined,
      script: (scriptCharacters.length > 0 || scriptSections.length > 0) ? {
        characters: scriptCharacters.map(c => ({
          id: c.id,
          name: c.name,
          voiceDescription: c.voice_description || undefined,
        })),
        sections: scriptSections.map(s => ({
          id: s.id,
          type: s.type,
          content: s.content,
          characterName: s.character?.name,
          isNewScene: s.is_new_scene,
        })),
      } : undefined,
      moodBoard: moodBoard ? {
        keywords: moodBoard.keywords,
        colors: moodBoard.colors,
      } : undefined,
      storyboard: storyboard ? {
        acts: storyboard.acts.map(a => ({ name: a.name, description: a.description })),
      } : undefined,
      shotCount: shots.length || undefined,
      composition: {
        hasTitle: !!composition.title,
        titleText: composition.title?.text,
        hasOutro: !!composition.outro,
        outroText: composition.outro?.text,
        defaultTransition: composition.defaultTransition,
        overlayCount: composition.textOverlays.length,
      },
    }
  }

  // Helper to ensure we have a project ID (creates draft if needed)
  // IMPORTANT: Read from store directly to avoid stale closure values
  const ensureProjectId = async (): Promise<string | null> => {
    // Read current value from store, not from closure (which may be stale)
    const currentProjectId = useProjectWizardStore.getState().projectId
    if (currentProjectId) return currentProjectId
    if (!user) return null

    try {
      // Double-check the store again right before creating (in case of race condition)
      const recheckProjectId = useProjectWizardStore.getState().projectId
      if (recheckProjectId) return recheckProjectId

      const currentPlatform = useProjectWizardStore.getState().platform
      const platformId = currentPlatform?.type === 'existing' ? currentPlatform.platformId : undefined
      const draft = await createDraftProject(user.id, platformId)
      setProjectId(draft.id)
      return draft.id
    } catch (error) {
      console.error('Failed to create draft project:', error)
      return null
    }
  }

  // Execute tool calls from Bubble's response and return results
  const executeToolCalls = async (toolCalls: ToolCall[]): Promise<ToolResult[]> => {
    const results: ToolResult[] = []

    for (const tool of toolCalls) {
      console.log('Executing tool:', tool.name, tool.input)
      let resultContent = 'success'

      try {
        switch (tool.name) {
          case 'navigate': {
            const route = tool.input.route as string
            navigate(route)
            resultContent = `Navigated to ${route}`
            break
          }
          case 'select_platform': {
            const type = tool.input.type as 'new' | 'existing'
            const platformId = tool.input.platformId as string | undefined
            setPlatform({
              type,
              platformId,
              platformName: type === 'new' ? undefined : platformId,
            })
            markStepComplete('platform')
            goToNextStep()
            resultContent = `Platform set to ${type}. Moving to brief step.`
            break
          }
          case 'update_brief': {
            const briefData: Record<string, string> = {}
            const updatedFields: string[] = []
            if (tool.input.name) { briefData.name = tool.input.name as string; updatedFields.push('name') }
            if (tool.input.audience) { briefData.audience = tool.input.audience as string; updatedFields.push('audience') }
            if (tool.input.tone) { briefData.tone = tool.input.tone as string; updatedFields.push('tone') }
            if (tool.input.duration) { briefData.duration = tool.input.duration as string; updatedFields.push('duration') }
            if (tool.input.aspectRatio) { briefData.aspectRatio = tool.input.aspectRatio as string; updatedFields.push('aspectRatio') }

            // WORKSPACE MODE: Use workspace store (auto-saves to DB)
            if (isInWorkspace && workspaceProject) {
              await updateWorkspaceBrief(briefData)
              resultContent = `Updated brief: ${updatedFields.join(', ')}`
              break
            }

            // WIZARD MODE: Update local state and persist to database
            updateBrief(briefData)

            const pid = await ensureProjectId()
            if (pid) {
              try {
                if (briefData.name) {
                  await updateProject(pid, { name: briefData.name })
                }
                const existingBrief = await getProjectBrief(pid)
                if (existingBrief) {
                  await updateProjectBrief(pid, {
                    name: briefData.name,
                    audience: briefData.audience,
                    tone: briefData.tone,
                    duration: briefData.duration,
                    aspect_ratio: briefData.aspectRatio as '16:9' | '9:16' | '1:1' | '4:5' | '4:3' | '21:9' | undefined,
                  })
                } else {
                  await createProjectBrief({
                    project_id: pid,
                    name: briefData.name || 'Untitled',
                    audience: briefData.audience,
                    tone: briefData.tone,
                    duration: briefData.duration,
                    aspect_ratio: (briefData.aspectRatio as '16:9' | '9:16' | '1:1' | '4:5' | '4:3' | '21:9') || '16:9',
                  })
                }
                resultContent = `Updated and saved brief: ${updatedFields.join(', ')}`
              } catch (dbError) {
                console.error('Failed to save brief to database:', dbError)
                resultContent = `Updated brief locally (save failed): ${updatedFields.join(', ')}`
              }
            } else {
              resultContent = `Updated brief fields: ${updatedFields.join(', ')}`
            }
            break
          }
          case 'update_video_content': {
            const contentData: Record<string, unknown> = {}
            const updatedFields: string[] = []
            if (tool.input.characters) { contentData.characters = tool.input.characters as string[]; updatedFields.push('characters') }
            if (tool.input.setting) { contentData.setting = tool.input.setting as string; updatedFields.push('setting') }
            if (tool.input.timeOfDay) { contentData.timeOfDay = tool.input.timeOfDay as string; updatedFields.push('timeOfDay') }
            if (tool.input.weather) { contentData.weather = tool.input.weather as string; updatedFields.push('weather') }
            if (tool.input.action) { contentData.action = tool.input.action as string; updatedFields.push('action') }
            if (tool.input.props) { contentData.props = tool.input.props as string[]; updatedFields.push('props') }
            if (tool.input.dialogue) { contentData.dialogue = tool.input.dialogue as string; updatedFields.push('dialogue') }

            // WORKSPACE MODE: Use workspace store (auto-saves to DB)
            if (isInWorkspace && workspaceProject) {
              const existingVideoContent = workspaceProject.brief.videoContent || {}
              const mergedVideoContent = { ...existingVideoContent, ...contentData }
              await updateWorkspaceBrief({ videoContent: mergedVideoContent as any })
              resultContent = `Updated video content: ${updatedFields.join(', ')}`
              break
            }

            // WIZARD MODE: Update local state and persist to database
            updateVideoContent(contentData)

            const pid = await ensureProjectId()
            if (pid) {
              try {
                const existingBrief = await getProjectBrief(pid)
                const existingVideoContent = (existingBrief?.video_content as Record<string, unknown>) || {}
                const mergedVideoContent = { ...existingVideoContent, ...contentData }

                if (existingBrief) {
                  await updateProjectBrief(pid, {
                    video_content: mergedVideoContent as import("@/types/database").Json,
                  })
                } else {
                  await createProjectBrief({
                    project_id: pid,
                    name: 'Untitled',
                    video_content: mergedVideoContent as import("@/types/database").Json,
                  })
                }
                resultContent = `Updated and saved video content: ${updatedFields.join(', ')}`
              } catch (dbError) {
                console.error('Failed to save video content:', dbError)
                resultContent = `Updated video content locally: ${updatedFields.join(', ')}`
              }
            } else {
              resultContent = `Updated video content: ${updatedFields.join(', ')}`
            }
            break
          }
          case 'update_mood_board': {
            const moodData: { keywords?: string[]; colors?: string[] } = {}
            if (tool.input.keywords) moodData.keywords = tool.input.keywords as string[]
            if (tool.input.colors) moodData.colors = tool.input.colors as string[]

            // WORKSPACE MODE: Use workspace store (auto-saves to DB)
            if (isInWorkspace && workspaceProject) {
              await updateWorkspaceMoodBoard(moodData)
              resultContent = `Updated mood board`
              break
            }

            // WIZARD MODE: Update local state and persist to database
            updateMoodBoard(moodData)

            const pid = await ensureProjectId()
            if (pid) {
              try {
                const existingMoodBoard = await getMoodBoard(pid)
                const dbData = {
                  keywords: moodData.keywords as unknown as import("@/types/database").Json,
                  colors: moodData.colors as unknown as import("@/types/database").Json,
                }
                if (existingMoodBoard) {
                  await updateMoodBoardDb(pid, dbData)
                } else {
                  await createMoodBoard({ project_id: pid, ...dbData })
                }
                resultContent = `Updated and saved mood board`
              } catch (dbError) {
                console.error('Failed to save mood board:', dbError)
                resultContent = `Updated mood board locally (save failed)`
              }
            } else {
              resultContent = `Updated mood board`
            }
            break
          }
          // ============================================
          // SCRIPT TOOLS
          // ============================================
          case 'create_script_character': {
            const name = tool.input.name as string
            const description = tool.input.description as string | undefined
            const voiceDescription = tool.input.voiceDescription as string | undefined

            const pid = await ensureProjectId()
            if (!pid) {
              resultContent = 'Error: Could not create project'
              break
            }

            try {
              const character = await createScriptCharacter({
                project_id: pid,
                name,
                description: description || null,
                voice_description: voiceDescription || null,
              })

              // Update local state
              setScriptCharacters(prev => [...prev, character])

              resultContent = `Created character "${name}"${voiceDescription ? ` with voice: ${voiceDescription}` : ''}`
            } catch (error) {
              console.error('Failed to create character:', error)
              resultContent = `Error creating character: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
            break
          }
          case 'create_script_section': {
            const type = tool.input.type as 'description' | 'dialogue'
            const content = tool.input.content as string
            const characterName = tool.input.characterName as string | undefined
            const isNewScene = tool.input.isNewScene as boolean | undefined
            const sceneContext = tool.input.sceneContext as string | undefined

            const pid = await ensureProjectId()
            if (!pid) {
              resultContent = 'Error: Could not create project'
              break
            }

            try {
              // If it's dialogue, find the character ID
              let characterId: string | null = null
              if (type === 'dialogue' && characterName) {
                const character = scriptCharacters.find(c => c.name.toLowerCase() === characterName.toLowerCase())
                if (character) {
                  characterId = character.id
                } else {
                  resultContent = `Error: Character "${characterName}" not found. Create the character first.`
                  break
                }
              }

              const section = await createScriptSection({
                project_id: pid,
                type,
                content,
                character_id: characterId,
                is_new_scene: type === 'description' ? (isNewScene ?? false) : false,
                scene_context: sceneContext || null,
              })

              // Fetch the section with character data for local state
              const sectionWithChar: ScriptSectionWithCharacter = {
                ...section,
                character: characterId ? scriptCharacters.find(c => c.id === characterId) || null : null,
              }

              // Update local state
              setScriptSections(prev => [...prev, sectionWithChar].sort((a, b) => a.sort_order - b.sort_order))

              if (type === 'dialogue') {
                resultContent = `Added dialogue for ${characterName}: "${content.slice(0, 40)}${content.length > 40 ? '...' : ''}"`
              } else {
                resultContent = `Added description${isNewScene ? ' (new scene)' : ''}: "${content.slice(0, 40)}${content.length > 40 ? '...' : ''}"`
              }
            } catch (error) {
              console.error('Failed to create section:', error)
              resultContent = `Error creating section: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
            break
          }
          case 'update_script_section': {
            const sectionIndex = tool.input.sectionIndex as number
            const content = tool.input.content as string | undefined
            const characterName = tool.input.characterName as string | undefined
            const isNewScene = tool.input.isNewScene as boolean | undefined

            if (sectionIndex < 0 || sectionIndex >= scriptSections.length) {
              resultContent = `Error: Section index ${sectionIndex} is out of range`
              break
            }

            const section = scriptSections[sectionIndex]

            try {
              const updates: Record<string, unknown> = {}

              if (content !== undefined) {
                updates.content = content
              }

              if (characterName !== undefined && section.type === 'dialogue') {
                const character = scriptCharacters.find(c => c.name.toLowerCase() === characterName.toLowerCase())
                if (character) {
                  updates.character_id = character.id
                } else {
                  resultContent = `Error: Character "${characterName}" not found`
                  break
                }
              }

              if (isNewScene !== undefined && section.type === 'description') {
                updates.is_new_scene = isNewScene
              }

              await updateScriptSection(section.id, updates)

              // Update local state
              setScriptSections(prev =>
                prev.map((s, i) => {
                  if (i === sectionIndex) {
                    return {
                      ...s,
                      ...updates,
                      character: characterName
                        ? scriptCharacters.find(c => c.name.toLowerCase() === characterName.toLowerCase()) || null
                        : s.character,
                    } as ScriptSectionWithCharacter
                  }
                  return s
                })
              )

              resultContent = `Updated section ${sectionIndex + 1}`
            } catch (error) {
              console.error('Failed to update section:', error)
              resultContent = `Error updating section: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
            break
          }
          case 'update_storyboard': {
            const acts = tool.input.acts as Array<{
              name: string
              description?: string
              beats: Array<{ title?: string; description: string }>
            }>

            // Update local state with temp IDs
            const formattedActs = acts.map((act, actIndex) => ({
              id: `scene-${actIndex + 1}`,
              name: act.name,
              description: act.description || '',
              beats: act.beats.map((beat, beatIndex) => ({
                id: `shot-${actIndex + 1}-${beatIndex + 1}`,
                title: beat.title || '',
                description: beat.description,
              })),
            }))
            setStoryboard({ acts: formattedActs })
            const totalShots = formattedActs.reduce((sum, act) => sum + act.beats.length, 0)
            resultContent = `Updated ${acts.length} scene(s) with ${totalShots} total shots`
            break
          }
          case 'add_scene': {
            const sceneName = tool.input.name as string
            const sceneDescription = (tool.input.description as string) || ''
            const initialShots = (tool.input.shots as Array<{ title?: string; description: string }>) || []

            // Add to local state
            const currentActs = storyboard?.acts || []
            const newAct = {
              id: `scene-${currentActs.length + 1}`,
              name: sceneName,
              description: sceneDescription,
              beats: initialShots.map((shot, i) => ({
                id: `shot-${currentActs.length + 1}-${i + 1}`,
                title: shot.title || '',
                description: shot.description,
              })),
            }
            setStoryboard({ acts: [...currentActs, newAct] })
            resultContent = `Added scene "${sceneName}" with ${initialShots.length} shot(s)`
            break
          }
          case 'add_shot_to_scene': {
            const sceneName = tool.input.sceneName as string
            const shotTitle = (tool.input.title as string) || ''
            const shotDescription = tool.input.description as string

            // Add to local state
            const currentActs = storyboard?.acts || []
            let sceneFound = false
            const updatedActs = currentActs.map(act => {
              if (act.name === sceneName) {
                sceneFound = true
                return {
                  ...act,
                  beats: [...act.beats, {
                    id: `shot-${act.id}-${act.beats.length + 1}`,
                    title: shotTitle,
                    description: shotDescription,
                  }],
                }
              }
              return act
            })

            if (!sceneFound) {
              resultContent = `Scene "${sceneName}" not found. Use add_scene to create it first.`
            } else {
              setStoryboard({ acts: updatedActs })
              resultContent = `Added shot "${shotTitle || shotDescription.slice(0, 30) + '...'}" to ${sceneName}`
            }
            break
          }
          case 'update_scene_shot': {
            const sceneName = tool.input.sceneName as string
            const shotTitle = tool.input.shotTitle as string | undefined
            const shotIndex = tool.input.shotIndex as number | undefined
            const newTitle = tool.input.newTitle as string | undefined
            const newDescription = tool.input.newDescription as string | undefined
            const append = tool.input.append as boolean | undefined

            // Update local state
            const currentActs = storyboard?.acts || []
            const updatedActs = currentActs.map(act => {
              if (act.name !== sceneName) return act

              const updatedBeats = act.beats.map((beat, idx) => {
                // Match by title or index
                const isMatch = shotTitle
                  ? beat.title === shotTitle
                  : shotIndex !== undefined && idx === shotIndex

                if (!isMatch) return beat

                return {
                  ...beat,
                  title: newTitle !== undefined ? newTitle : beat.title,
                  description: newDescription !== undefined
                    ? (append ? `${beat.description} ${newDescription}` : newDescription)
                    : beat.description,
                }
              })

              return { ...act, beats: updatedBeats }
            })

            setStoryboard({ acts: updatedActs })
            const shotIdentifier = shotTitle || `Shot ${(shotIndex || 0) + 1}`
            resultContent = append
              ? `Appended to "${shotIdentifier}" in ${sceneName}`
              : `Updated "${shotIdentifier}" in ${sceneName}`
            break
          }
          case 'update_shots': {
            const inputShots = tool.input.shots as Array<{
              description: string
              duration?: number
              shotType?: string
              notes?: string
            }>

            // Transform to the format expected by the store
            const formattedShots = inputShots.map((shot, index) => ({
              id: crypto.randomUUID(),
              sceneIndex: 0,
              shotNumber: index + 1,
              description: shot.description,
              duration: shot.duration || 3,
              shotType: shot.shotType || 'Medium shot',
              notes: shot.notes || '',
            }))

            // Update local state
            setShots(formattedShots)
            resultContent = `Created ${formattedShots.length} shots`
            break
          }
          case 'add_shot': {
            const newShot = {
              id: crypto.randomUUID(),
              sceneIndex: (tool.input.sceneIndex as number) || 0,
              shotNumber: shots.length + 1,
              description: tool.input.description as string,
              duration: (tool.input.duration as number) || 3,
              shotType: (tool.input.shotType as string) || 'Medium shot',
              notes: (tool.input.notes as string) || '',
            }

            // Update local state
            addShot(newShot)
            resultContent = `Added shot: "${newShot.description.slice(0, 30)}..."`
            break
          }
          case 'set_audio': {
            const audioData: { voiceoverScript?: string; musicStyle?: string; soundEffects?: string[] } = {}
            if (tool.input.voiceoverScript) audioData.voiceoverScript = tool.input.voiceoverScript as string
            if (tool.input.musicStyle) audioData.musicStyle = tool.input.musicStyle as string
            if (tool.input.soundEffects) audioData.soundEffects = tool.input.soundEffects as string[]

            // Update local state
            setAudioPlans(audioData)

            // Persist to database
            const pid = await ensureProjectId()
            if (pid && user) {
              try {
                // Save audio_plans as JSONB in project_briefs for easy restoration
                const existingBrief = await getProjectBrief(pid)
                if (existingBrief) {
                  await updateProjectBrief(pid, {
                    audio_plans: audioData as import("@/types/database").Json,
                  })
                } else {
                  await createProjectBrief({
                    project_id: pid,
                    name: 'Untitled',
                    audio_plans: audioData as import("@/types/database").Json,
                  })
                }
                resultContent = `Saved audio plans to project`
              } catch (dbError) {
                console.error('Failed to save audio plans:', dbError)
                resultContent = `Updated audio plans locally (save failed)`
              }
            } else {
              resultContent = `Updated audio plans`
            }
            break
          }
          case 'go_to_next_step': {
            // Foundation wizard navigation
            if (isInFoundationCreator) {
              nextFoundationStep()
              resultContent = `Moved to next foundation step`
              break
            }
            // Project wizard navigation
            markStepComplete(currentStep as 'platform' | 'brief' | 'script' | 'mood' | 'story' | 'review')
            goToNextStep()
            resultContent = `Moved to next step`
            break
          }
          case 'go_to_previous_step': {
            // Foundation wizard navigation
            if (isInFoundationCreator) {
              prevFoundationStep()
              resultContent = `Moved to previous foundation step`
              break
            }
            // Project wizard navigation
            goToPreviousStep()
            resultContent = `Moved to previous step`
            break
          }
          case 'set_title_card': {
            const titleConfig = {
              text: tool.input.text as string,
              subtitle: tool.input.subtitle as string | undefined,
              font: tool.input.font as string | undefined,
              animation: tool.input.animation as "fade" | "slide-up" | "zoom" | "typewriter" | undefined,
              backgroundColor: tool.input.backgroundColor as string | undefined,
            }

            // WORKSPACE MODE: Use workspace store (auto-saves to DB)
            if (isInWorkspace && workspaceProject) {
              await updateWorkspaceComposition({ titleCard: titleConfig })
              resultContent = `Set title card: "${tool.input.text}"`
              break
            }

            // WIZARD MODE
            setTitleCard(titleConfig)
            const pid = await ensureProjectId()
            if (pid) {
              try {
                await upsertProjectComposition(pid, {
                  title_card: titleConfig as import("@/types/database").Json,
                })
              } catch (dbError) {
                console.error('Failed to save title card to database:', dbError)
              }
            }
            resultContent = `Set title card: "${tool.input.text}"`
            break
          }
          case 'set_outro_card': {
            const outroConfig = {
              text: tool.input.text as string,
              subtitle: tool.input.subtitle as string | undefined,
              animation: tool.input.animation as "fade" | "slide-up" | "zoom" | "typewriter" | undefined,
            }

            // WORKSPACE MODE: Use workspace store (auto-saves to DB)
            if (isInWorkspace && workspaceProject) {
              await updateWorkspaceComposition({ outroCard: outroConfig })
              resultContent = `Set outro card: "${tool.input.text}"`
              break
            }

            // WIZARD MODE
            setOutroCard(outroConfig)
            const pid = await ensureProjectId()
            if (pid) {
              try {
                await upsertProjectComposition(pid, {
                  outro_card: outroConfig as import("@/types/database").Json,
                })
              } catch (dbError) {
                console.error('Failed to save outro card to database:', dbError)
              }
            }
            resultContent = `Set outro card: "${tool.input.text}"`
            break
          }
          case 'set_transition': {
            const transitionType = tool.input.type as "none" | "fade" | "wipe-left" | "wipe-right" | "zoom"
            const transitionDuration = tool.input.duration as number | undefined

            // WORKSPACE MODE: Use workspace store (auto-saves to DB)
            if (isInWorkspace && workspaceProject) {
              await updateWorkspaceComposition({
                defaultTransition: transitionType,
                transitionDuration: transitionDuration || 0.5,
              })
              resultContent = `Set transition to ${tool.input.type}`
              break
            }

            // WIZARD MODE
            setDefaultTransition(transitionType, transitionDuration)
            const pid = await ensureProjectId()
            if (pid) {
              try {
                await upsertProjectComposition(pid, {
                  default_transition: transitionType,
                  transition_duration: transitionDuration || 0.5,
                })
              } catch (dbError) {
                console.error('Failed to save transition to database:', dbError)
              }
            }
            resultContent = `Set transition to ${tool.input.type}`
            break
          }
          case 'add_text_overlay': {
            const overlayConfig = {
              id: crypto.randomUUID(),
              text: tool.input.text as string,
              position: tool.input.position as "top" | "center" | "bottom" | "lower-third" | undefined,
              animation: tool.input.animation as "fade" | "slide-up" | "slide-left" | "typewriter" | "glitch" | undefined,
              shotId: tool.input.shotId as string | undefined,
              startTime: tool.input.startTime as number | undefined,
              duration: tool.input.duration as number | undefined,
            }

            // WORKSPACE MODE: Use workspace store (auto-saves to DB)
            if (isInWorkspace && workspaceProject) {
              const currentOverlays = workspaceProject.composition.textOverlays || []
              await updateWorkspaceComposition({
                textOverlays: [...currentOverlays, overlayConfig],
              })
              resultContent = `Added text overlay: "${tool.input.text}"`
              break
            }

            // WIZARD MODE
            addTextOverlay(overlayConfig)
            const pid = await ensureProjectId()
            if (pid) {
              try {
                const currentComposition = useProjectWizardStore.getState().composition
                const allOverlays = [...currentComposition.textOverlays]
                await upsertProjectComposition(pid, {
                  text_overlays: allOverlays as import("@/types/database").Json,
                })
              } catch (dbError) {
                console.error('Failed to save text overlay to database:', dbError)
              }
            }
            resultContent = `Added text overlay: "${tool.input.text}"`
            break
          }
          // ============================================
          // WORKSPACE TOOLS (for editing existing projects)
          // ============================================
          case 'switch_workspace_tab': {
            const tab = tool.input.tab as WorkspaceTab
            setWorkspaceTab(tab)
            resultContent = `Switched to ${tab} tab`
            break
          }
          case 'workspace_select_scene':
          case 'workspace_select_shot':
          case 'workspace_add_scene':
          case 'workspace_add_shot':
          case 'workspace_update_shot':
          case 'workspace_delete_shot':
          case 'workspace_delete_scene': {
            // Deprecated: scenes/shots model replaced with timeline clips
            resultContent = 'This tool is deprecated. Use timeline clip tools instead (timeline_add_clip, timeline_move_clip, etc.)'
            break
          }
          case 'workspace_play_preview': {
            const action = tool.input.action as string
            if (action === 'play') {
              setWorkspaceIsPlaying(true)
              resultContent = 'Started playback'
            } else if (action === 'pause') {
              setWorkspaceIsPlaying(false)
              resultContent = 'Paused playback'
            } else if (action === 'toggle') {
              setWorkspaceIsPlaying(!isPlaying)
              resultContent = isPlaying ? 'Paused playback' : 'Started playback'
            }
            break
          }
          case 'workspace_start_asset_creation': {
            workspaceStartAssetCreation()
            resultContent = 'Switched to Assets tab in creation mode'
            break
          }
          case 'workspace_link_asset_to_shot':
          case 'workspace_reorder_scenes':
          case 'workspace_reorder_shots':
          case 'workspace_update_scene':
          case 'workspace_unlink_asset_from_shot': {
            // Deprecated: scenes/shots model replaced with timeline clips
            resultContent = 'This tool is deprecated. Use timeline clip tools instead.'
            break
          }
          case 'workspace_update_export_settings': {
            if (!workspaceProject) {
              resultContent = 'Error: No project loaded in workspace'
              break
            }
            const updates: Record<string, unknown> = {}
            const updatedFields: string[] = []

            if (tool.input.resolution) { updates.resolution = tool.input.resolution as string; updatedFields.push('resolution') }
            if (tool.input.format) { updates.format = tool.input.format as string; updatedFields.push('format') }
            if (tool.input.frameRate) { updates.frameRate = tool.input.frameRate as number; updatedFields.push('frameRate') }
            if (tool.input.quality) { updates.quality = tool.input.quality as string; updatedFields.push('quality') }

            try {
              await updateWorkspaceExportSettings(updates)
              resultContent = `Updated export settings: ${updatedFields.join(', ')}`
            } catch (err) {
              console.error('Failed to update export settings:', err)
              resultContent = `Error updating export settings: ${err instanceof Error ? err.message : 'Unknown error'}`
            }
            break
          }
          case 'workspace_add_storyboard_card': {
            if (!workspaceProject) {
              resultContent = 'Error: No project loaded in workspace'
              break
            }
            const title = tool.input.title as string
            const description = (tool.input.description as string) || ''
            const content = (tool.input.content as string) || ''
            const order = workspaceProject.storyboardCards.length

            try {
              await addWorkspaceStoryboardCard({
                title,
                description,
                content,
                order,
              })
              resultContent = `Added storyboard card: ${title}`
            } catch (err) {
              console.error('Failed to add storyboard card:', err)
              resultContent = `Error adding storyboard card: ${err instanceof Error ? err.message : 'Unknown error'}`
            }
            break
          }
          case 'workspace_update_storyboard_card': {
            if (!workspaceProject) {
              resultContent = 'Error: No project loaded in workspace'
              break
            }
            const cardId = tool.input.card_id as string
            const updates: Record<string, unknown> = {}
            const updatedFields: string[] = []

            if (tool.input.title) { updates.title = tool.input.title as string; updatedFields.push('title') }
            if (tool.input.description) { updates.description = tool.input.description as string; updatedFields.push('description') }
            if (tool.input.content) { updates.content = tool.input.content as string; updatedFields.push('content') }

            try {
              await updateWorkspaceStoryboardCard(cardId, updates)
              resultContent = `Updated storyboard card: ${updatedFields.join(', ')}`
            } catch (err) {
              console.error('Failed to update storyboard card:', err)
              resultContent = `Error updating storyboard card: ${err instanceof Error ? err.message : 'Unknown error'}`
            }
            break
          }
          case 'workspace_delete_storyboard_card': {
            if (!workspaceProject) {
              resultContent = 'Error: No project loaded in workspace'
              break
            }
            const cardId = tool.input.card_id as string
            const card = workspaceProject.storyboardCards.find(c => c.id === cardId)

            try {
              await removeWorkspaceStoryboardCard(cardId)
              resultContent = `Deleted storyboard card: ${card?.title || cardId}`
            } catch (err) {
              console.error('Failed to delete storyboard card:', err)
              resultContent = `Error deleting storyboard card: ${err instanceof Error ? err.message : 'Unknown error'}`
            }
            break
          }
          // ============================================
          // ASSET WIZARD TOOLS (for Create Asset flow)
          // ============================================
          case 'set_asset_type': {
            const type = tool.input.type as 'image' | 'video' | 'audio'
            setWizardAssetType(type)
            resultContent = `Set asset type to ${type}`
            break
          }
          case 'set_asset_category': {
            const category = tool.input.category as string
            setWizardCategory(category as any)
            resultContent = `Set asset category to ${category}`
            break
          }
          case 'update_asset_details': {
            const updatedFields: string[] = []
            if (tool.input.name) {
              setWizardAssetName(tool.input.name as string)
              updatedFields.push('name')
            }
            if (tool.input.user_description) {
              setWizardUserDescription(tool.input.user_description as string)
              updatedFields.push('description')
            }
            if (tool.input.ai_prompt) {
              setWizardAiPrompt(tool.input.ai_prompt as string)
              updatedFields.push('ai_prompt')
            }
            if (tool.input.style) {
              setWizardStylePreset(tool.input.style as string)
              updatedFields.push('style')
            }
            if (tool.input.refinement) {
              // Emit custom event for the PromptAndGenerateStep to listen to
              window.dispatchEvent(new CustomEvent('bubble-update-refinement', {
                detail: { refinement: tool.input.refinement as string }
              }))
              updatedFields.push('refinement')
            }
            if (tool.input.category_option) {
              // Emit custom event for the PromptAndGenerateStep to update category option
              window.dispatchEvent(new CustomEvent('bubble-update-category-option', {
                detail: { categoryOption: tool.input.category_option as string }
              }))
              updatedFields.push('category_option')
            }
            resultContent = updatedFields.length > 0
              ? `Updated asset details: ${updatedFields.join(', ')}`
              : 'No fields to update'
            break
          }
          // ============================================
          // ASSET GENERATION TOOLS
          // ============================================
          case 'generate_image': {
            if (!user) {
              resultContent = 'Error: User must be logged in to generate images'
              break
            }

            const name = tool.input.name as string
            const userDescription = tool.input.user_description as string
            const aiPrompt = tool.input.ai_prompt as string
            const category = (tool.input.category as string) || 'scene'
            const style = tool.input.style as string | undefined
            const aspectRatioInput = tool.input.aspectRatio as string | undefined

            // Determine dimensions based on aspect ratio
            let width = 1024
            let height = 1024
            const projectAspectRatio = brief?.aspectRatio || workspaceProject?.brief?.aspectRatio
            if (aspectRatioInput === 'landscape' || (!aspectRatioInput && projectAspectRatio === '16:9')) {
              width = 1344
              height = 768
            } else if (aspectRatioInput === 'portrait' || (!aspectRatioInput && projectAspectRatio === '9:16')) {
              width = 768
              height = 1344
            }

            try {
              // Generate image using the AI prompt
              const imageUrls = await generateImages({
                prompt: aiPrompt,
                style,
                width,
                height,
                numOutputs: 1,
              })

              const imageUrl = imageUrls[0]
              if (!imageUrl) {
                resultContent = 'Error: No image was generated'
                break
              }

              // Get project ID
              const pid = isInWorkspace ? workspaceProject?.id : await ensureProjectId()

              // Save as asset in database with both descriptions
              const asset = await createAsset({
                user_id: user.id,
                project_id: pid || undefined,
                name,
                type: 'image',
                category: category as 'scene' | 'stage' | 'character' | 'weather' | 'prop' | 'effect',
                url: imageUrl,
                user_description: userDescription,
                ai_prompt: aiPrompt,
                generation_model: 'replicate_flux',
                generation_settings: {
                  style,
                  width,
                  height,
                },
              })

              // Track usage
              await incrementUsage(user.id, 'image', 1)

              resultContent = `Generated and saved image "${name}" (ID: ${asset.id})`
            } catch (error) {
              console.error('Failed to generate image:', error)
              resultContent = `Error generating image: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
            break
          }
          case 'generate_voiceover': {
            if (!user) {
              resultContent = 'Error: User must be logged in to generate voiceovers'
              break
            }

            const name = tool.input.name as string
            const userDescription = tool.input.user_description as string
            const text = tool.input.text as string
            const voiceStyle = (tool.input.voiceStyle as string) || 'calm_female'
            const sceneId = tool.input.sceneId as string | undefined

            // Map voice style to ElevenLabs voice ID
            const voiceMap: Record<string, string> = {
              calm_female: DEFAULT_VOICES.rachel,
              warm_male: DEFAULT_VOICES.drew,
              deep_male: DEFAULT_VOICES.josh,
              friendly_female: DEFAULT_VOICES.bella,
              authoritative_male: DEFAULT_VOICES.adam,
              energetic_female: DEFAULT_VOICES.elli,
            }
            const voiceId = voiceMap[voiceStyle] || DEFAULT_VOICES.rachel

            try {
              // Generate voiceover
              const audioDataUrl = await generateVoice({
                text,
                voiceId,
              })

              // Get project ID
              const pid = isInWorkspace ? workspaceProject?.id : await ensureProjectId()

              // Save as asset in database with both descriptions
              const asset = await createAsset({
                user_id: user.id,
                project_id: pid || undefined,
                name,
                type: 'audio',
                category: 'voice',
                url: audioDataUrl,
                user_description: userDescription,
                ai_prompt: text,
                generation_model: 'elevenlabs',
                generation_settings: {
                  voiceStyle,
                  voiceId,
                  sceneId,
                },
              })

              // Track usage (estimate minutes from text length)
              const estimatedMinutes = Math.ceil(text.split(/\s+/).length / 150)
              await incrementUsage(user.id, 'audio', estimatedMinutes)

              resultContent = `Generated and saved voiceover "${name}" (ID: ${asset.id})`
            } catch (error) {
              console.error('Failed to generate voiceover:', error)
              resultContent = `Error generating voiceover: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
            break
          }
          case 'generate_music': {
            if (!user) {
              resultContent = 'Error: User must be logged in to generate music'
              break
            }

            const name = tool.input.name as string
            const userDescription = tool.input.user_description as string
            const aiPrompt = tool.input.ai_prompt as string
            const duration = Math.min(30, Math.max(5, (tool.input.duration as number) || 10))

            try {
              // Generate music using AI prompt
              const audioUrl = await generateMusic({
                prompt: aiPrompt,
                duration,
              })

              // Get project ID
              const pid = isInWorkspace ? workspaceProject?.id : await ensureProjectId()

              // Save as asset in database with both descriptions
              const asset = await createAsset({
                user_id: user.id,
                project_id: pid || undefined,
                name,
                type: 'audio',
                category: 'music',
                url: audioUrl,
                duration,
                user_description: userDescription,
                ai_prompt: aiPrompt,
                generation_model: 'replicate_musicgen',
                generation_settings: {
                  duration,
                },
              })

              // Track usage
              const minutes = Math.ceil(duration / 60)
              await incrementUsage(user.id, 'audio', minutes)

              resultContent = `Generated and saved music "${name}" (${duration}s, ID: ${asset.id})`
            } catch (error) {
              console.error('Failed to generate music:', error)
              resultContent = `Error generating music: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
            break
          }
          case 'generate_sound_effect': {
            if (!user) {
              resultContent = 'Error: User must be logged in to generate sound effects'
              break
            }

            const name = tool.input.name as string
            const userDescription = tool.input.user_description as string
            const aiPrompt = tool.input.ai_prompt as string
            const duration = tool.input.duration as number | undefined

            try {
              // Generate sound effect using AI prompt
              const audioDataUrl = await generateSoundEffect({
                text: aiPrompt,
                duration_seconds: duration,
              })

              // Get project ID
              const pid = isInWorkspace ? workspaceProject?.id : await ensureProjectId()

              // Save as asset in database with both descriptions
              const asset = await createAsset({
                user_id: user.id,
                project_id: pid || undefined,
                name,
                type: 'audio',
                category: 'sound_effect',
                url: audioDataUrl,
                duration: duration || undefined,
                user_description: userDescription,
                ai_prompt: aiPrompt,
                generation_model: 'elevenlabs_sfx',
                generation_settings: {
                  duration,
                },
              })

              // Track usage
              await incrementUsage(user.id, 'audio', 1)

              resultContent = `Generated and saved sound effect "${name}" (ID: ${asset.id})`
            } catch (error) {
              console.error('Failed to generate sound effect:', error)
              resultContent = `Error generating sound effect: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
            break
          }
          // ============================================
          // LIBRARY ASSET TOOLS
          // ============================================
          case 'view_library_asset': {
            const assetId = tool.input.asset_id as string
            // Dispatch custom event for library page to handle
            window.dispatchEvent(new CustomEvent('bubble-view-asset', {
              detail: { assetId }
            }))
            resultContent = `Opening asset details for ID: ${assetId}`
            break
          }
          case 'update_library_asset': {
            const assetId = tool.input.asset_id as string
            const updates: Record<string, unknown> = {}
            const updatedFields: string[] = []

            if (tool.input.name) {
              updates.name = tool.input.name as string
              updatedFields.push('name')
            }
            if (tool.input.category) {
              updates.category = tool.input.category as string
              updatedFields.push('category')
            }
            if (tool.input.user_description) {
              updates.user_description = tool.input.user_description as string
              updatedFields.push('description')
            }
            if (tool.input.ai_prompt) {
              updates.ai_prompt = tool.input.ai_prompt as string
              updatedFields.push('ai_prompt')
            }

            // Dispatch custom event for library page to handle
            window.dispatchEvent(new CustomEvent('bubble-update-asset', {
              detail: { assetId, updates }
            }))
            resultContent = updatedFields.length > 0
              ? `Updating asset: ${updatedFields.join(', ')}`
              : 'No fields to update'
            break
          }
          case 'delete_library_asset': {
            const assetId = tool.input.asset_id as string
            // Dispatch custom event for library page to handle
            window.dispatchEvent(new CustomEvent('bubble-delete-asset', {
              detail: { assetId }
            }))
            resultContent = `Requested deletion of asset ID: ${assetId}`
            break
          }
          // ============================================
          // FOUNDATION WIZARD TOOLS
          // ============================================
          case 'update_foundation_basics': {
            const updatedFields: string[] = []
            if (tool.input.name) {
              setFoundationName(tool.input.name as string)
              updatedFields.push('name')
            }
            if (tool.input.description) {
              setFoundationDescription(tool.input.description as string)
              updatedFields.push('description')
            }
            resultContent = updatedFields.length > 0
              ? `Updated foundation: ${updatedFields.join(', ')}`
              : 'No fields to update'
            break
          }
          case 'update_foundation_colors': {
            if (tool.input.colors) {
              setFoundationColorPalette(tool.input.colors as string[])
              resultContent = `Set color palette to ${(tool.input.colors as string[]).length} colors`
            } else if (tool.input.addColor) {
              addFoundationColor(tool.input.addColor as string)
              resultContent = `Added color ${tool.input.addColor}`
            } else if (typeof tool.input.removeIndex === 'number') {
              removeFoundationColor(tool.input.removeIndex as number)
              resultContent = `Removed color at index ${tool.input.removeIndex}`
            } else {
              resultContent = 'No color changes specified'
            }
            break
          }
          case 'update_foundation_style': {
            const updatedFields: string[] = []
            if (tool.input.style) {
              setFoundationStyle(tool.input.style as string)
              updatedFields.push(`style: ${tool.input.style}`)
            }
            if (tool.input.typography) {
              setFoundationTypography(tool.input.typography as string)
              updatedFields.push(`typography: ${tool.input.typography}`)
            }
            resultContent = updatedFields.length > 0
              ? `Updated ${updatedFields.join(', ')}`
              : 'No style changes specified'
            break
          }
          case 'update_foundation_mood': {
            const updatedFields: string[] = []
            if (tool.input.mood) {
              setFoundationMood(tool.input.mood as string)
              updatedFields.push(`mood: ${tool.input.mood}`)
            }
            if (tool.input.tone) {
              setFoundationTone(tool.input.tone as string)
              updatedFields.push(`tone: ${tool.input.tone}`)
            }
            resultContent = updatedFields.length > 0
              ? `Updated ${updatedFields.join(', ')}`
              : 'No mood changes specified'
            break
          }
          default:
            console.warn('Unknown tool:', tool.name)
            resultContent = `Unknown tool: ${tool.name}`
        }
      } catch (error) {
        resultContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }

      results.push({
        tool_use_id: tool.id,
        content: resultContent,
      })
    }

    return results
  }

  // Add initial message on mount only (no auto-prompts on step changes)
  useEffect(() => {
    // Only add if no messages exist and we haven't sent one yet
    if (bubbleMessages.length === 0 && !initialMessageSent.current) {
      initialMessageSent.current = true
      const greeting = getInitialGreeting(getContextStep(), getContextPrompt())
      addBubbleMessage({
        role: "assistant",
        content: greeting,
      })
    }
  }, []) // Only on mount

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [bubbleMessages, isBubbleTyping])

  // Adjust textarea height when panel is open and input changes
  useEffect(() => {
    if (!isCollapsed) {
      // Retries with longer delays to let panel width transition complete (~300ms)
      const timers = [0, 50, 150, 300, 350].map(delay =>
        setTimeout(adjustTextareaHeight, delay)
      )
      return () => timers.forEach(clearTimeout)
    }
  }, [isCollapsed, inputValue, adjustTextareaHeight])

  const handleSend = async () => {
    if (!inputValue.trim()) return

    // Stop microphone if listening
    if (isListening && recognitionRef.current) {
      shouldIgnoreResults.current = true
      recognitionRef.current.stop()
      setIsListening(false)
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
    }

    const userMessage = inputValue.trim()

    // Add user message
    addBubbleMessage({
      role: "user",
      content: userMessage,
    })

    setInputValue("")
    setBubbleTyping(true)

    try {
      // Build message history for Claude (exclude the message we just added since it's not in state yet)
      const messageHistory: Message[] = [
        ...bubbleMessages.map(m => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: userMessage }
      ]

      let response = await sendMessage(messageHistory, buildContext())

      // Loop while Claude wants to use tools
      while (response.stopReason === 'tool_use' && response.toolCalls.length > 0) {
        // Execute the tool calls
        const toolResults = await executeToolCalls(response.toolCalls)

        // Give React time to update state after tool execution
        await new Promise(resolve => setTimeout(resolve, 100))

        // Send tool results back to Claude with the assistant's tool_use response
        // This maintains proper conversation flow: user -> assistant(tool_use) -> user(tool_result) -> assistant
        response = await sendMessage(
          messageHistory,
          buildContext(),
          response.rawContent,
          toolResults
        )
      }

      // Add the assistant's final text message (only if there is one)
      if (response.message && response.message.trim()) {
        addBubbleMessage({
          role: "assistant",
          content: response.message,
        })
      }
    } catch (error) {
      console.error("Claude API error:", error)
      addBubbleMessage({
        role: "assistant",
        content: "Sorry, I'm having trouble connecting right now. Please try again.",
      })
    } finally {
      setBubbleTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const shouldIgnoreResults = useRef(false)

  const handleMicClick = () => {
    // Web Speech API for voice input
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Try Chrome.")
      return
    }

    // If already listening, stop
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
      return
    }

    // Capture existing input to append to
    const existingInput = inputValue

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = true

    let finalTranscript = ''

    const resetSilenceTimeout = () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
      // Stop after 30 seconds of silence
      silenceTimeoutRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.stop()
        }
      }, 30000)
    }

    recognition.onstart = () => {
      setIsListening(true)
      finalTranscript = ''
      shouldIgnoreResults.current = false
      resetSilenceTimeout()
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Ignore results if we've already sent the message
      if (shouldIgnoreResults.current) return

      resetSilenceTimeout()

      let interimTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      // Append to existing input
      const newText = finalTranscript + interimTranscript
      const combined = existingInput ? `${existingInput} ${newText}`.trim() : newText.trim()
      setInputValue(combined)

      // Scroll textarea to bottom to show new content
      if (textareaRef.current) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
    }

    recognition.start()
  }

  // Handler for collapsed mic - opens panel and starts listening to fill chat input
  const handleCollapsedMicClick = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Try Chrome.")
      return
    }

    // If already listening, stop
    if (isCollapsedListening && collapsedRecognitionRef.current) {
      collapsedRecognitionRef.current.stop()
      setIsCollapsedListening(false)
      if (collapsedSilenceTimeoutRef.current) {
        clearTimeout(collapsedSilenceTimeoutRef.current)
      }
      return
    }

    // Capture existing text to append to
    const existingInput = inputValue

    const recognition = new SpeechRecognition()
    collapsedRecognitionRef.current = recognition
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = true

    let finalTranscript = ''

    const resetSilenceTimeout = () => {
      if (collapsedSilenceTimeoutRef.current) {
        clearTimeout(collapsedSilenceTimeoutRef.current)
      }
      collapsedSilenceTimeoutRef.current = setTimeout(() => {
        if (collapsedRecognitionRef.current) {
          collapsedRecognitionRef.current.stop()
        }
      }, 30000)
    }

    recognition.onstart = () => {
      setIsCollapsedListening(true)
      finalTranscript = ''
      resetSilenceTimeout()
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      resetSilenceTimeout()

      let interimTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      const newText = finalTranscript + interimTranscript
      const combined = existingInput
        ? `${existingInput} ${newText.trim()}`
        : newText.trim()
      setInputValue(combined)

      // Scroll textarea to bottom to show new content (if panel is open)
      if (textareaRef.current) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      setIsCollapsedListening(false)
    }

    recognition.onend = () => {
      setIsCollapsedListening(false)
      if (collapsedSilenceTimeoutRef.current) {
        clearTimeout(collapsedSilenceTimeoutRef.current)
      }
    }

    recognition.start()
  }

  const handleRefresh = () => {
    clearBubbleMessages()
    initialMessageSent.current = false
    // Add initial greeting after clearing
    setTimeout(() => {
      const greeting = getInitialGreeting(getContextStep(), getContextPrompt())
      addBubbleMessage({
        role: "assistant",
        content: greeting,
      })
      initialMessageSent.current = true
    }, 0)
  }

  const currentStepMeta = WIZARD_STEPS.find((s) => s.id === currentStep)

  // Collapsed state - show chat button at top, mic at bottom
  if (isCollapsed) {
    return (
      <div
        className={cn(
          "flex flex-col h-full bg-zinc-900 border-r border-zinc-800 w-16 items-center py-4 justify-between",
          className
        )}
      >
        <button
          onClick={onToggleCollapse}
          className="w-11 h-11 rounded-lg bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 transition-all hover:scale-105"
          title="Open Bubble chat"
        >
          <MessageSquare className="w-5 h-5 text-white" />
        </button>

        <button
          onClick={handleCollapsedMicClick}
          className={cn(
            "w-11 h-11 rounded-lg flex items-center justify-center transition-all bg-orange-500 text-white hover:bg-orange-400",
            isCollapsedListening && "shadow-lg shadow-orange-500/50 ring-4 ring-orange-500/30 animate-pulse"
          )}
          title={isOnDashboard ? "Voice input to prompt" : "Voice input to chat"}
        >
          <Mic className="w-5 h-5" />
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full w-full bg-zinc-900 border-r border-zinc-800",
        className
      )}
    >
      {/* Header */}
      <div className="h-[72px] px-4 border-b border-zinc-800 flex items-center">
        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 hover:scale-105 transition-all"
              title="Reset conversation"
            >
              <MessageSquare className="w-5 h-5 text-white" />
            </button>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Bubble</h3>
              <p className="text-xs text-zinc-500">Production Assistant AI</p>
            </div>
          </div>

          {/* Collapse Button */}
          <button
            onClick={onToggleCollapse}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Collapse chat panel"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pl-4 pr-2 py-4 space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-600">
        {bubbleMessages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                message.role === "user"
                  ? "bg-sky-500 text-white rounded-br-md"
                  : "bg-zinc-800 text-zinc-100 rounded-bl-md"
              )}
            >
              {message.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isBubbleTyping && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" />
                <span
                  className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <span
                  className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-end gap-2">
          <button
            onClick={handleMicClick}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 bg-orange-500 text-white hover:bg-orange-400",
              isListening && "shadow-lg shadow-orange-500/50 ring-4 ring-orange-500/30 animate-pulse"
            )}
          >
            <Mic className="w-4 h-4" />
          </button>

          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Bubble..."
            rows={1}
            style={{ height: `${textareaHeight}px`, overflow: textareaHeight >= 120 ? 'auto' : 'hidden' }}
            className="flex-1 py-2.5 px-4 bg-zinc-800 border border-zinc-700 focus:border-zinc-600 rounded-2xl text-sm text-white placeholder:text-zinc-500 focus:outline-none transition-colors resize-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          />

          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isBubbleTyping}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 bg-sky-500 text-white hover:bg-sky-400"
          >
            {isBubbleTyping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4 translate-x-[1px]" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

