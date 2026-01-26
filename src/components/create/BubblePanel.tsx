import { useState, useRef, useEffect, useCallback } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Mic, Send, Loader2, MessageSquare, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useProjectWizardStore, WIZARD_STEPS } from "@/state/projectWizardStore"
import { useWorkspaceStore } from "@/state/workspaceStore"
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
  getScenesWithShots,
  createScene,
  updateScene,
  deleteScene,
  createShot as createShotDb,
  updateShot as updateShotDb,
  deleteShot as deleteShotDb,
  upsertProjectComposition,
} from "@/services/projects"
import { createAsset, incrementUsage } from "@/services/assets"
import { generateImages } from "@/services/replicate"
import { generateVoice, generateSoundEffect, DEFAULT_VOICES } from "@/services/elevenlabs"
import { generateMusic } from "@/services/replicate"

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

  const location = useLocation()
  const navigate = useNavigate()

  // Workspace store - for editing existing projects
  const {
    project: workspaceProject,
    activeTab,
    updateBrief: updateWorkspaceBrief,
    updateMoodBoard: updateWorkspaceMoodBoard,
    updateScene: updateWorkspaceScene,
    updateShot: updateWorkspaceShot,
    addScene: addWorkspaceScene,
    addShot: addWorkspaceShot,
    updateComposition: updateWorkspaceComposition,
    updateExportSettings: updateWorkspaceExportSettings,
  } = useWorkspaceStore()

  // Detect context based on route
  const isOnDashboard = location.pathname === "/"
  const isInWorkspace = location.pathname.startsWith("/project/")
  const isInCreateWizard = location.pathname.startsWith("/create/")

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

  // Determine current context step for greeting
  const getContextStep = (): string => {
    if (isOnDashboard) return 'home'
    if (isInWorkspace) return 'workspace'
    if (isInCreateWizard) return currentStep
    return 'home'
  }

  // Get prompt/name for greeting based on context
  const getContextPrompt = (): string | undefined => {
    if (isInWorkspace && workspaceProject) return workspaceProject.name
    if (isInCreateWizard) return initialPrompt || undefined
    return undefined
  }

  // Build context for Claude - adapts based on where we are
  const buildContext = (): BubbleContext => {
    // Workspace context (existing project)
    if (isInWorkspace && workspaceProject) {
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
        shotCount: workspaceProject.scenes.reduce((acc, s) => acc + s.shots.length, 0) || undefined,
      }
    }

    // Home/dashboard context
    if (isOnDashboard) {
      return {
        currentStep: 'home',
        currentRoute: location.pathname,
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
          case 'update_storyboard': {
            const acts = tool.input.acts as Array<{
              name: string
              description?: string
              beats: Array<{ title?: string; description: string }>
            }>

            // Persist to scenes/shots tables
            const pid = await ensureProjectId()
            if (pid) {
              try {
                // Get existing scenes to update/create appropriately
                const existingScenes = await getScenesWithShots(pid)

                // Create a map of existing scenes by name for matching
                const existingSceneMap = new Map(existingScenes.map(s => [s.name, s]))

                const formattedActs: Array<{
                  id: string
                  name: string
                  description: string
                  beats: Array<{ id: string; title: string; description: string }>
                }> = []

                for (let actIndex = 0; actIndex < acts.length; actIndex++) {
                  const act = acts[actIndex]
                  let sceneId: string

                  // Check if scene with this name already exists
                  const existingScene = existingSceneMap.get(act.name)

                  if (existingScene) {
                    // Update existing scene
                    await updateScene(existingScene.id, {
                      description: act.description || null,
                      sort_order: actIndex,
                    })
                    sceneId = existingScene.id

                    // Delete old shots for this scene
                    for (const oldShot of existingScene.shots) {
                      await deleteShotDb(oldShot.id)
                    }
                  } else {
                    // Create new scene
                    const newScene = await createScene({
                      project_id: pid,
                      name: act.name,
                      description: act.description || null,
                      sort_order: actIndex,
                    })
                    sceneId = newScene.id
                  }

                  // Create shots for this scene
                  const formattedBeats: Array<{ id: string; title: string; description: string }> = []
                  for (let beatIndex = 0; beatIndex < act.beats.length; beatIndex++) {
                    const beat = act.beats[beatIndex]
                    const newShot = await createShotDb({
                      scene_id: sceneId,
                      name: beat.title || `Shot ${beatIndex + 1}`,
                      description: beat.description || null,
                      sort_order: beatIndex,
                      duration: 3,
                    })
                    formattedBeats.push({
                      id: newShot.id,
                      title: beat.title || '',
                      description: beat.description,
                    })
                  }

                  formattedActs.push({
                    id: sceneId,
                    name: act.name,
                    description: act.description || '',
                    beats: formattedBeats,
                  })
                }

                // Update local state with real DB IDs
                setStoryboard({ acts: formattedActs })

                const totalShots = formattedActs.reduce((sum, act) => sum + act.beats.length, 0)
                resultContent = `Updated and saved ${acts.length} scene(s) with ${totalShots} total shots`
              } catch (dbError) {
                console.error('Failed to save scenes/shots:', dbError)
                resultContent = `Failed to save scenes: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
              }
            } else {
              // No project yet - just update local state with temp IDs
              const formattedActs = acts.map((act, actIndex) => ({
                id: `new-scene-${actIndex + 1}`,
                name: act.name,
                description: act.description || '',
                beats: act.beats.map((beat, beatIndex) => ({
                  id: `new-shot-${actIndex + 1}-${beatIndex + 1}`,
                  title: beat.title || '',
                  description: beat.description,
                })),
              }))
              setStoryboard({ acts: formattedActs })
              const totalShots = formattedActs.reduce((sum, act) => sum + act.beats.length, 0)
              resultContent = `Updated ${acts.length} scene(s) with ${totalShots} total shots (will save when project is created)`
            }
            break
          }
          case 'add_scene': {
            const sceneName = tool.input.name as string
            const sceneDescription = (tool.input.description as string) || ''
            const initialShots = (tool.input.shots as Array<{ title?: string; description: string }>) || []

            const pid = await ensureProjectId()
            if (pid) {
              try {
                // Get existing scenes to determine sort order
                const existingScenes = await getScenesWithShots(pid)
                const sortOrder = existingScenes.length

                // Create the new scene
                const newScene = await createScene({
                  project_id: pid,
                  name: sceneName,
                  description: sceneDescription || null,
                  sort_order: sortOrder,
                })

                // Create initial shots if provided
                const formattedBeats: Array<{ id: string; title: string; description: string }> = []
                for (let i = 0; i < initialShots.length; i++) {
                  const shot = initialShots[i]
                  const newShot = await createShotDb({
                    scene_id: newScene.id,
                    name: shot.title || `Shot ${i + 1}`,
                    description: shot.description || null,
                    sort_order: i,
                    duration: 3,
                  })
                  formattedBeats.push({
                    id: newShot.id,
                    title: shot.title || '',
                    description: shot.description,
                  })
                }

                // Update local state - add new scene to existing storyboard
                const currentActs = storyboard?.acts || []
                const newAct = {
                  id: newScene.id,
                  name: sceneName,
                  description: sceneDescription,
                  beats: formattedBeats,
                }
                setStoryboard({ acts: [...currentActs, newAct] })

                resultContent = `Added scene "${sceneName}" with ${initialShots.length} shot(s)`
              } catch (dbError) {
                console.error('Failed to add scene:', dbError)
                resultContent = `Failed to add scene: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
              }
            } else {
              // No project yet - add to local state with temp IDs
              const currentActs = storyboard?.acts || []
              const newAct = {
                id: `new-scene-${currentActs.length + 1}`,
                name: sceneName,
                description: sceneDescription,
                beats: initialShots.map((shot, i) => ({
                  id: `new-shot-${currentActs.length + 1}-${i + 1}`,
                  title: shot.title || '',
                  description: shot.description,
                })),
              }
              setStoryboard({ acts: [...currentActs, newAct] })
              resultContent = `Added scene "${sceneName}" (will save when project is created)`
            }
            break
          }
          case 'add_shot_to_scene': {
            const sceneName = tool.input.sceneName as string
            const shotTitle = (tool.input.title as string) || ''
            const shotDescription = tool.input.description as string

            const pid = await ensureProjectId()
            if (pid) {
              try {
                // Find the scene by name
                const existingScenes = await getScenesWithShots(pid)
                const targetScene = existingScenes.find(s => s.name === sceneName)

                if (!targetScene) {
                  resultContent = `Scene "${sceneName}" not found. Use add_scene to create it first.`
                  break
                }

                // Add the shot to this scene
                const sortOrder = targetScene.shots.length
                const newShot = await createShotDb({
                  scene_id: targetScene.id,
                  name: shotTitle || `Shot ${sortOrder + 1}`,
                  description: shotDescription || null,
                  sort_order: sortOrder,
                  duration: 3,
                })

                // Update local state - add shot to the matching scene
                const currentActs = storyboard?.acts || []
                const updatedActs = currentActs.map(act => {
                  if (act.name === sceneName || act.id === targetScene.id) {
                    return {
                      ...act,
                      beats: [...act.beats, {
                        id: newShot.id,
                        title: shotTitle,
                        description: shotDescription,
                      }],
                    }
                  }
                  return act
                })
                setStoryboard({ acts: updatedActs })

                resultContent = `Added shot "${shotTitle || shotDescription.slice(0, 30) + '...'}" to ${sceneName}`
              } catch (dbError) {
                console.error('Failed to add shot:', dbError)
                resultContent = `Failed to add shot: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
              }
            } else {
              // No project yet - add to local state
              const currentActs = storyboard?.acts || []
              const updatedActs = currentActs.map(act => {
                if (act.name === sceneName) {
                  return {
                    ...act,
                    beats: [...act.beats, {
                      id: `new-shot-${act.id}-${act.beats.length + 1}`,
                      title: shotTitle,
                      description: shotDescription,
                    }],
                  }
                }
                return act
              })

              if (JSON.stringify(updatedActs) === JSON.stringify(currentActs)) {
                resultContent = `Scene "${sceneName}" not found. Use add_scene to create it first.`
              } else {
                setStoryboard({ acts: updatedActs })
                resultContent = `Added shot to ${sceneName} (will save when project is created)`
              }
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

            // Helper to find and update the shot
            const updateShotInActs = (actList: typeof storyboard.acts) => {
              return actList?.map(act => {
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
              }) || []
            }

            const pid = await ensureProjectId()
            if (pid) {
              try {
                // Find the scene and shot in the database
                const existingScenes = await getScenesWithShots(pid)
                const targetScene = existingScenes.find(s => s.name === sceneName)

                if (!targetScene) {
                  resultContent = `Scene "${sceneName}" not found.`
                  break
                }

                // Find the shot
                const targetShot = shotTitle
                  ? targetScene.shots.find(s => s.name === shotTitle)
                  : shotIndex !== undefined ? targetScene.shots[shotIndex] : undefined

                if (!targetShot) {
                  resultContent = `Shot not found in "${sceneName}".`
                  break
                }

                // Build the update
                const updates: Record<string, unknown> = {}
                if (newTitle !== undefined) updates.name = newTitle
                if (newDescription !== undefined) {
                  updates.description = append
                    ? `${targetShot.description || ''} ${newDescription}`
                    : newDescription
                }

                // Update in database
                await updateShotDb(targetShot.id, updates)

                // Update local state
                const currentActs = storyboard?.acts || []
                const updatedActs = updateShotInActs(currentActs)
                setStoryboard({ acts: updatedActs })

                const shotIdentifier = shotTitle || `Shot ${(shotIndex || 0) + 1}`
                resultContent = append
                  ? `Appended to "${shotIdentifier}" in ${sceneName}`
                  : `Updated "${shotIdentifier}" in ${sceneName}`
              } catch (dbError) {
                console.error('Failed to update shot:', dbError)
                resultContent = `Failed to update shot: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
              }
            } else {
              // No project yet - update local state only
              const currentActs = storyboard?.acts || []
              const updatedActs = updateShotInActs(currentActs)
              setStoryboard({ acts: updatedActs })
              resultContent = `Updated shot (will save when project is created)`
            }
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

            // Persist to database
            const pid = await ensureProjectId()
            if (pid) {
              try {
                // Get or create a default scene
                let scenes = await getScenes(pid)
                let scene = scenes[0]
                if (!scene) {
                  scene = await createScene({
                    project_id: pid,
                    name: 'Main Scene',
                    sort_order: 0,
                  })
                }

                // Create shots in database
                for (let i = 0; i < formattedShots.length; i++) {
                  const shot = formattedShots[i]
                  await createShotDb({
                    scene_id: scene.id,
                    name: `Shot ${shot.shotNumber}`,
                    description: shot.description,
                    duration: shot.duration,
                    sort_order: i,
                    shot_type: shot.shotType,
                    notes: shot.notes || null,
                  })
                }
                resultContent = `Created and saved ${formattedShots.length} shots`
              } catch (dbError) {
                console.error('Failed to save shots:', dbError)
                resultContent = `Created shots locally (save failed)`
              }
            } else {
              resultContent = `Created ${formattedShots.length} shots`
            }
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

            // Persist to database
            const pid = await ensureProjectId()
            if (pid) {
              try {
                // Get or create a default scene
                let scenes = await getScenes(pid)
                let scene = scenes[newShot.sceneIndex] || scenes[0]
                if (!scene) {
                  scene = await createScene({
                    project_id: pid,
                    name: 'Main Scene',
                    sort_order: 0,
                  })
                }

                await createShotDb({
                  scene_id: scene.id,
                  name: `Shot ${newShot.shotNumber}`,
                  description: newShot.description,
                  duration: newShot.duration,
                  sort_order: shots.length,
                  shot_type: newShot.shotType,
                  notes: newShot.notes || null,
                })
                resultContent = `Added and saved shot: "${newShot.description.slice(0, 30)}..."`
              } catch (dbError) {
                console.error('Failed to save shot:', dbError)
                resultContent = `Added shot locally (save failed)`
              }
            } else {
              resultContent = `Added shot: "${newShot.description.slice(0, 30)}..."`
            }
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
            markStepComplete(currentStep as 'platform' | 'brief' | 'mood' | 'story' | 'shots' | 'filming' | 'audio' | 'review')
            goToNextStep()
            resultContent = `Moved to next step`
            break
          }
          case 'go_to_previous_step': {
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
          // ASSET GENERATION TOOLS
          // ============================================
          case 'generate_image': {
            if (!user) {
              resultContent = 'Error: User must be logged in to generate images'
              break
            }

            const prompt = tool.input.prompt as string
            const name = tool.input.name as string
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
              // Generate image (returns array, we take first)
              const imageUrls = await generateImages({
                prompt,
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

              // Save as asset in database
              const asset = await createAsset({
                user_id: user.id,
                project_id: pid || undefined,
                name,
                type: 'image',
                category: category as 'scene' | 'stage' | 'character' | 'weather' | 'prop' | 'effect',
                url: imageUrl,
                thumbnail_url: imageUrl,
                metadata: {
                  prompt,
                  style,
                  width,
                  height,
                  generated_by: 'replicate',
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

            const text = tool.input.text as string
            const name = tool.input.name as string
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

              // Save as asset in database
              const asset = await createAsset({
                user_id: user.id,
                project_id: pid || undefined,
                name,
                type: 'audio',
                category: 'voice',
                url: audioDataUrl,
                metadata: {
                  text,
                  voiceStyle,
                  voiceId,
                  sceneId,
                  generated_by: 'elevenlabs',
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

            const prompt = tool.input.prompt as string
            const name = tool.input.name as string
            const duration = Math.min(30, Math.max(5, (tool.input.duration as number) || 10))

            try {
              // Generate music
              const audioUrl = await generateMusic({
                prompt,
                duration,
              })

              // Get project ID
              const pid = isInWorkspace ? workspaceProject?.id : await ensureProjectId()

              // Save as asset in database
              const asset = await createAsset({
                user_id: user.id,
                project_id: pid || undefined,
                name,
                type: 'audio',
                category: 'music',
                url: audioUrl,
                duration,
                metadata: {
                  prompt,
                  duration,
                  generated_by: 'replicate_musicgen',
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

            const prompt = tool.input.prompt as string
            const name = tool.input.name as string
            const duration = tool.input.duration as number | undefined

            try {
              // Generate sound effect
              const audioDataUrl = await generateSoundEffect({
                text: prompt,
                duration_seconds: duration,
              })

              // Get project ID
              const pid = isInWorkspace ? workspaceProject?.id : await ensureProjectId()

              // Save as asset in database
              const asset = await createAsset({
                user_id: user.id,
                project_id: pid || undefined,
                name,
                type: 'audio',
                category: 'sound_effect',
                url: audioDataUrl,
                duration: duration || undefined,
                metadata: {
                  prompt,
                  duration,
                  generated_by: 'elevenlabs_sfx',
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

  // Track previous step to detect step changes
  const previousStepRef = useRef<string | null>(null)

  // Add initial message on mount
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
    // Initialize previous step
    if (previousStepRef.current === null) {
      previousStepRef.current = currentStep
    }
  }, []) // Only on mount

  // Add transition message when step changes in create wizard
  useEffect(() => {
    if (!isInCreateWizard) return

    // Skip if this is the first render (previousStep not set yet)
    if (previousStepRef.current === null) {
      previousStepRef.current = currentStep
      return
    }

    // Check if step actually changed
    if (previousStepRef.current !== currentStep) {
      previousStepRef.current = currentStep
      // Add a greeting for the new step
      const greeting = getInitialGreeting(currentStep, getContextPrompt())
      addBubbleMessage({
        role: "assistant",
        content: greeting,
      })
    }
  }, [currentStep, isInCreateWizard])

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

      // Add the assistant's final text message
      if (response.message) {
        addBubbleMessage({
          role: "assistant",
          content: response.message,
        })
      } else {
        // Fallback if no message
        addBubbleMessage({
          role: "assistant",
          content: "Done! What would you like to do next?",
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
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
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
              <p className="text-xs text-zinc-500">
                {currentStepMeta?.description || "Your production assistant"}
              </p>
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

