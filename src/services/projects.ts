import { supabase } from '@/lib/supabase'
import type {
  Project,
  ProjectInsert,
  ProjectUpdate,
  ProjectBrief,
  ProjectBriefInsert,
  ProjectBriefUpdate,
  MoodBoard,
  MoodBoardInsert,
  MoodBoardUpdate,
  Storyboard,
  StoryboardInsert,
  StoryboardUpdate,
  StoryboardCard,
  StoryboardCardInsert,
  StoryboardCardUpdate,
  Scene,
  SceneInsert,
  SceneUpdate,
  Shot,
  ShotInsert,
  ShotUpdate,
  ExportSettings,
  ExportSettingsInsert,
  ExportSettingsUpdate,
  ProjectWithRelations,
  SceneWithShots,
  Platform,
} from '@/types/database'

// ============================================
// PROJECTS
// ============================================

export async function getProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data as Project[]
}

export async function getProject(projectId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as Project
}

export async function getProjectWithRelations(projectId: string): Promise<ProjectWithRelations | null> {
  // Fetch project with platform
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError) {
    if (projectError.code === 'PGRST116') return null
    throw projectError
  }

  const project = projectData as Project

  // Fetch platform if exists
  let platform: Platform | undefined
  if (project.platform_id) {
    const { data: platformData } = await supabase
      .from('platforms')
      .select('*')
      .eq('id', project.platform_id)
      .single()
    platform = platformData as Platform
  }

  // Fetch related data in parallel
  const [
    briefResult,
    moodBoardResult,
    storyboardResult,
    cardsResult,
    scenesResult,
    assetsResult,
    exportResult,
  ] = await Promise.all([
    supabase.from('project_briefs').select('*').eq('project_id', projectId).single(),
    supabase.from('mood_boards').select('*').eq('project_id', projectId).single(),
    supabase.from('storyboards').select('*').eq('project_id', projectId).single(),
    supabase.from('storyboard_cards').select('*').eq('project_id', projectId).order('sort_order'),
    supabase.from('scenes').select('*').eq('project_id', projectId).order('sort_order'),
    supabase.from('assets').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('export_settings').select('*').eq('project_id', projectId).single(),
  ])

  // Fetch shots for each scene
  const scenes: SceneWithShots[] = []
  if (scenesResult.data) {
    for (const scene of scenesResult.data) {
      const { data: shots } = await supabase
        .from('shots')
        .select('*')
        .eq('scene_id', scene.id)
        .order('sort_order')

      scenes.push({
        ...(scene as Scene),
        shots: (shots || []) as Shot[],
      })
    }
  }

  return {
    ...project,
    platform,
    brief: briefResult.data as ProjectBrief | undefined,
    mood_board: moodBoardResult.data as MoodBoard | undefined,
    storyboard: storyboardResult.data as Storyboard | undefined,
    storyboard_cards: (cardsResult.data || []) as StoryboardCard[],
    scenes,
    assets: (assetsResult.data || []) as any[],
    export_settings: exportResult.data as ExportSettings | undefined,
  }
}

export async function createProject(project: ProjectInsert): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single()

  if (error) throw error
  return data as Project
}

export async function updateProject(projectId: string, updates: ProjectUpdate): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single()

  if (error) throw error
  return data as Project
}

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) throw error
}

// ============================================
// PROJECT BRIEFS
// ============================================

export async function getProjectBrief(projectId: string): Promise<ProjectBrief | null> {
  const { data, error } = await supabase
    .from('project_briefs')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as ProjectBrief
}

export async function createProjectBrief(brief: ProjectBriefInsert): Promise<ProjectBrief> {
  const { data, error } = await supabase
    .from('project_briefs')
    .insert(brief)
    .select()
    .single()

  if (error) throw error
  return data as ProjectBrief
}

export async function updateProjectBrief(projectId: string, updates: ProjectBriefUpdate): Promise<ProjectBrief> {
  const { data, error } = await supabase
    .from('project_briefs')
    .update(updates)
    .eq('project_id', projectId)
    .select()
    .single()

  if (error) throw error
  return data as ProjectBrief
}

// ============================================
// MOOD BOARDS
// ============================================

export async function getMoodBoard(projectId: string): Promise<MoodBoard | null> {
  const { data, error } = await supabase
    .from('mood_boards')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as MoodBoard
}

export async function createMoodBoard(moodBoard: MoodBoardInsert): Promise<MoodBoard> {
  const { data, error } = await supabase
    .from('mood_boards')
    .insert(moodBoard)
    .select()
    .single()

  if (error) throw error
  return data as MoodBoard
}

export async function updateMoodBoard(projectId: string, updates: MoodBoardUpdate): Promise<MoodBoard> {
  const { data, error } = await supabase
    .from('mood_boards')
    .update(updates)
    .eq('project_id', projectId)
    .select()
    .single()

  if (error) throw error
  return data as MoodBoard
}

// ============================================
// STORYBOARDS
// ============================================

export async function getStoryboard(projectId: string): Promise<Storyboard | null> {
  const { data, error } = await supabase
    .from('storyboards')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as Storyboard
}

export async function createStoryboard(storyboard: StoryboardInsert): Promise<Storyboard> {
  const { data, error } = await supabase
    .from('storyboards')
    .insert(storyboard)
    .select()
    .single()

  if (error) throw error
  return data as Storyboard
}

export async function updateStoryboard(projectId: string, updates: StoryboardUpdate): Promise<Storyboard> {
  const { data, error } = await supabase
    .from('storyboards')
    .update(updates)
    .eq('project_id', projectId)
    .select()
    .single()

  if (error) throw error
  return data as Storyboard
}

// ============================================
// STORYBOARD CARDS
// ============================================

export async function getStoryboardCards(projectId: string): Promise<StoryboardCard[]> {
  const { data, error } = await supabase
    .from('storyboard_cards')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order')

  if (error) throw error
  return data as StoryboardCard[]
}

export async function createStoryboardCard(card: StoryboardCardInsert): Promise<StoryboardCard> {
  const { data, error } = await supabase
    .from('storyboard_cards')
    .insert(card)
    .select()
    .single()

  if (error) throw error
  return data as StoryboardCard
}

export async function updateStoryboardCard(cardId: string, updates: StoryboardCardUpdate): Promise<StoryboardCard> {
  const { data, error } = await supabase
    .from('storyboard_cards')
    .update(updates)
    .eq('id', cardId)
    .select()
    .single()

  if (error) throw error
  return data as StoryboardCard
}

export async function deleteStoryboardCard(cardId: string): Promise<void> {
  const { error } = await supabase
    .from('storyboard_cards')
    .delete()
    .eq('id', cardId)

  if (error) throw error
}

export async function reorderStoryboardCards(projectId: string, cardIds: string[]): Promise<void> {
  for (let i = 0; i < cardIds.length; i++) {
    const { error } = await supabase
      .from('storyboard_cards')
      .update({ sort_order: i })
      .eq('id', cardIds[i])

    if (error) throw error
  }
}

// ============================================
// SCENES
// ============================================

export async function getScenes(projectId: string): Promise<Scene[]> {
  const { data, error } = await supabase
    .from('scenes')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order')

  if (error) throw error
  return data as Scene[]
}

export async function getScenesWithShots(projectId: string): Promise<SceneWithShots[]> {
  const { data: scenes, error: scenesError } = await supabase
    .from('scenes')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order')

  if (scenesError) throw scenesError

  const result: SceneWithShots[] = []
  for (const scene of scenes || []) {
    const { data: shots, error: shotsError } = await supabase
      .from('shots')
      .select('*')
      .eq('scene_id', scene.id)
      .order('sort_order')

    if (shotsError) throw shotsError
    result.push({ ...(scene as Scene), shots: (shots || []) as Shot[] })
  }

  return result
}

export async function createScene(scene: SceneInsert): Promise<Scene> {
  const { data, error } = await supabase
    .from('scenes')
    .insert(scene)
    .select()
    .single()

  if (error) throw error
  return data as Scene
}

export async function updateScene(sceneId: string, updates: SceneUpdate): Promise<Scene> {
  const { data, error } = await supabase
    .from('scenes')
    .update(updates)
    .eq('id', sceneId)
    .select()
    .single()

  if (error) throw error
  return data as Scene
}

export async function deleteScene(sceneId: string): Promise<void> {
  const { error } = await supabase
    .from('scenes')
    .delete()
    .eq('id', sceneId)

  if (error) throw error
}

export async function reorderScenes(projectId: string, sceneIds: string[]): Promise<void> {
  for (let i = 0; i < sceneIds.length; i++) {
    const { error } = await supabase
      .from('scenes')
      .update({ sort_order: i })
      .eq('id', sceneIds[i])

    if (error) throw error
  }
}

// ============================================
// SHOTS
// ============================================

export async function getShots(sceneId: string): Promise<Shot[]> {
  const { data, error } = await supabase
    .from('shots')
    .select('*')
    .eq('scene_id', sceneId)
    .order('sort_order')

  if (error) throw error
  return data as Shot[]
}

export async function createShot(shot: ShotInsert): Promise<Shot> {
  const { data, error } = await supabase
    .from('shots')
    .insert(shot)
    .select()
    .single()

  if (error) throw error
  return data as Shot
}

export async function updateShot(shotId: string, updates: ShotUpdate): Promise<Shot> {
  const { data, error } = await supabase
    .from('shots')
    .update(updates)
    .eq('id', shotId)
    .select()
    .single()

  if (error) throw error
  return data as Shot
}

export async function deleteShot(shotId: string): Promise<void> {
  const { error } = await supabase
    .from('shots')
    .delete()
    .eq('id', shotId)

  if (error) throw error
}

export async function reorderShots(sceneId: string, shotIds: string[]): Promise<void> {
  for (let i = 0; i < shotIds.length; i++) {
    const { error } = await supabase
      .from('shots')
      .update({ sort_order: i })
      .eq('id', shotIds[i])

    if (error) throw error
  }
}

// ============================================
// EXPORT SETTINGS
// ============================================

export async function getExportSettings(projectId: string): Promise<ExportSettings | null> {
  const { data, error } = await supabase
    .from('export_settings')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as ExportSettings
}

export async function createExportSettings(settings: ExportSettingsInsert): Promise<ExportSettings> {
  const { data, error } = await supabase
    .from('export_settings')
    .insert(settings)
    .select()
    .single()

  if (error) throw error
  return data as ExportSettings
}

export async function updateExportSettings(projectId: string, updates: ExportSettingsUpdate): Promise<ExportSettings> {
  const { data, error } = await supabase
    .from('export_settings')
    .update(updates)
    .eq('project_id', projectId)
    .select()
    .single()

  if (error) throw error
  return data as ExportSettings
}

// ============================================
// HELPER: Create full project with all related data
// ============================================

export interface CreateFullProjectInput {
  userId: string
  platformId?: string
  name: string
  brief: Omit<ProjectBriefInsert, 'project_id'>
  moodBoard?: Omit<MoodBoardInsert, 'project_id'>
  storyboard?: Omit<StoryboardInsert, 'project_id'>
  scenes?: Array<Omit<SceneInsert, 'project_id'> & { shots?: Omit<ShotInsert, 'scene_id'>[] }>
}

export async function createFullProject(input: CreateFullProjectInput): Promise<ProjectWithRelations> {
  // Create project
  const project = await createProject({
    user_id: input.userId,
    platform_id: input.platformId,
    name: input.name,
  })

  // Create brief
  const brief = await createProjectBrief({
    ...input.brief,
    project_id: project.id,
  })

  // Create mood board if provided
  let moodBoard: MoodBoard | undefined
  if (input.moodBoard) {
    moodBoard = await createMoodBoard({
      ...input.moodBoard,
      project_id: project.id,
    })
  }

  // Create storyboard if provided
  let storyboard: Storyboard | undefined
  if (input.storyboard) {
    storyboard = await createStoryboard({
      ...input.storyboard,
      project_id: project.id,
    })
  }

  // Create scenes and shots if provided
  const scenes: SceneWithShots[] = []
  if (input.scenes) {
    for (let i = 0; i < input.scenes.length; i++) {
      const sceneInput = input.scenes[i]
      const { shots: shotInputs, ...sceneData } = sceneInput

      const scene = await createScene({
        ...sceneData,
        project_id: project.id,
        sort_order: i,
      })

      const shots: Shot[] = []
      if (shotInputs) {
        for (let j = 0; j < shotInputs.length; j++) {
          const shot = await createShot({
            ...shotInputs[j],
            scene_id: scene.id,
            sort_order: j,
          })
          shots.push(shot)
        }
      }

      scenes.push({ ...scene, shots })
    }
  }

  // Create default export settings
  const exportSettings = await createExportSettings({
    project_id: project.id,
  })

  return {
    ...project,
    brief,
    mood_board: moodBoard,
    storyboard,
    scenes,
    export_settings: exportSettings,
  }
}
