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
  ProjectComposition,
  ProjectCompositionInsert,
  ProjectCompositionUpdate,
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

export interface ProjectWithThumbnail extends Project {
  thumbnail_url?: string | null
}

export async function getCompletedProjects(userId: string): Promise<ProjectWithThumbnail[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      scenes (
        id,
        sort_order,
        shots (
          id,
          sort_order,
          image_asset_id,
          video_asset_id,
          image_asset:assets!shots_image_asset_id_fkey (
            url,
            local_path,
            storage_type
          ),
          video_asset:assets!shots_video_asset_id_fkey (
            url,
            local_path,
            storage_type
          )
        )
      )
    `)
    .eq('user_id', userId)
    .in('status', ['completed', 'in_progress'])
    .order('updated_at', { ascending: false })

  if (error) throw error

  // Extract thumbnail from first scene's first shot (prefer image, fallback to video)
  return (data || []).map(project => {
    const scenes = (project.scenes || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
    const firstScene = scenes[0]
    const shots = firstScene?.shots?.sort((a: any, b: any) => a.sort_order - b.sort_order) || []

    // Find first shot with an asset (image or video)
    let thumbnail_url: string | null = null
    for (const shot of shots) {
      const asset = shot.image_asset || shot.video_asset
      if (asset) {
        thumbnail_url = asset.storage_type === 'local' ? asset.local_path : asset.url
        break
      }
    }

    // Remove nested data, just return project with thumbnail
    const { scenes: _, ...projectData } = project
    return { ...projectData, thumbnail_url } as ProjectWithThumbnail
  })
}

export async function getDraftProjects(userId: string): Promise<ProjectWithThumbnail[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      scenes (
        id,
        sort_order,
        shots (
          id,
          sort_order,
          image_asset_id,
          video_asset_id,
          image_asset:assets!shots_image_asset_id_fkey (
            url,
            local_path,
            storage_type
          ),
          video_asset:assets!shots_video_asset_id_fkey (
            url,
            local_path,
            storage_type
          )
        )
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })

  if (error) throw error

  // Extract thumbnail from first scene's first shot (prefer image, fallback to video)
  return (data || []).map(project => {
    const scenes = (project.scenes || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
    const firstScene = scenes[0]
    const shots = firstScene?.shots?.sort((a: any, b: any) => a.sort_order - b.sort_order) || []

    // Find first shot with an asset (image or video)
    let thumbnail_url: string | null = null
    for (const shot of shots) {
      const asset = shot.image_asset || shot.video_asset
      if (asset) {
        thumbnail_url = asset.storage_type === 'local' ? asset.local_path : asset.url
        break
      }
    }

    // Remove nested data, just return project with thumbnail
    const { scenes: _, ...projectData } = project
    return { ...projectData, thumbnail_url } as ProjectWithThumbnail
  })
}

export async function createDraftProject(userId: string, platformId?: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      platform_id: platformId || null,
      name: 'Untitled Project',
      status: 'draft',
    })
    .select()
    .single()

  if (error) throw error
  return data as Project
}

export async function markProjectComplete(projectId: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update({ status: 'completed' })
    .eq('id', projectId)
    .select()
    .single()

  if (error) throw error
  return data as Project
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
  // Use maybeSingle() for optional records to avoid 406 errors when they don't exist
  const [
    briefResult,
    moodBoardResult,
    storyboardResult,
    cardsResult,
    scriptSectionsResult,
    scenesResult,
    assetsResult,
    exportResult,
    compositionResult,
  ] = await Promise.all([
    supabase.from('project_briefs').select('*').eq('project_id', projectId).maybeSingle(),
    supabase.from('mood_boards').select('*').eq('project_id', projectId).maybeSingle(),
    supabase.from('storyboards').select('*').eq('project_id', projectId).maybeSingle(),
    supabase.from('storyboard_cards').select('*').eq('project_id', projectId).order('sort_order'),
    supabase.from('script_sections').select('*').eq('project_id', projectId).order('sort_order'),
    supabase.from('scenes').select('*').eq('project_id', projectId).order('sort_order'),
    supabase.from('assets').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('export_settings').select('*').eq('project_id', projectId).maybeSingle(),
    supabase.from('project_compositions').select('*').eq('project_id', projectId).maybeSingle(),
  ])

  // Fetch shots for each scene
  const scenes: SceneWithShots[] = []
  const allShots: Shot[] = []
  if (scenesResult.data) {
    for (const scene of scenesResult.data) {
      const { data: shots, error: shotsError } = await supabase
        .from('shots')
        .select('*')
        .eq('scene_id', scene.id)
        .order('sort_order')

      if (shotsError) {
        console.error('Error fetching shots:', shotsError)
      }

      const sceneShots = (shots || []) as Shot[]
      allShots.push(...sceneShots)
      scenes.push({
        ...(scene as Scene),
        shots: sceneShots,
      })
    }
  }

  // Collect all linked asset IDs from shots
  const linkedAssetIds = new Set<string>()
  for (const shot of allShots) {
    if (shot.image_asset_id) linkedAssetIds.add(shot.image_asset_id)
    if (shot.video_asset_id) linkedAssetIds.add(shot.video_asset_id)
    if (shot.audio_asset_id) linkedAssetIds.add(shot.audio_asset_id)
  }

  // Fetch linked assets that might not be in the project's assets
  let allAssets = assetsResult.data || []
  if (linkedAssetIds.size > 0) {
    const existingAssetIds = new Set(allAssets.map(a => a.id))
    const missingAssetIds = [...linkedAssetIds].filter(id => !existingAssetIds.has(id))

    if (missingAssetIds.length > 0) {
      const { data: linkedAssets, error: linkedError } = await supabase
        .from('assets')
        .select('*')
        .in('id', missingAssetIds)

      if (!linkedError && linkedAssets) {
        allAssets = [...allAssets, ...linkedAssets]
      }
    }
  }

  return {
    ...project,
    platform,
    brief: briefResult.data as ProjectBrief | undefined,
    mood_board: moodBoardResult.data as MoodBoard | undefined,
    storyboard: storyboardResult.data as Storyboard | undefined,
    storyboard_cards: (cardsResult.data || []) as StoryboardCard[],
    script_sections: (scriptSectionsResult.data || []) as any[],
    scenes,
    assets: allAssets as any[],
    export_settings: exportResult.data as ExportSettings | undefined,
    composition: compositionResult.data as ProjectComposition | undefined,
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

// ============================================
// PROJECT COMPOSITIONS
// ============================================

export async function getProjectComposition(projectId: string): Promise<ProjectComposition | null> {
  const { data, error } = await supabase
    .from('project_compositions')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as ProjectComposition
}

export async function createProjectComposition(composition: ProjectCompositionInsert): Promise<ProjectComposition> {
  const { data, error } = await supabase
    .from('project_compositions')
    .insert(composition)
    .select()
    .single()

  if (error) throw error
  return data as ProjectComposition
}

export async function updateProjectComposition(projectId: string, updates: ProjectCompositionUpdate): Promise<ProjectComposition> {
  const { data, error } = await supabase
    .from('project_compositions')
    .update(updates)
    .eq('project_id', projectId)
    .select()
    .single()

  if (error) throw error
  return data as ProjectComposition
}

export async function upsertProjectComposition(projectId: string, updates: ProjectCompositionUpdate): Promise<ProjectComposition> {
  // Try to get existing composition
  const existing = await getProjectComposition(projectId)

  if (existing) {
    return updateProjectComposition(projectId, updates)
  } else {
    return createProjectComposition({
      project_id: projectId,
      ...updates,
    })
  }
}

// ============================================
// PLATFORM-RELATED QUERIES
// ============================================

export async function getProjectsByPlatform(platformId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('platform_id', platformId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data as Project[]
}

export async function getAllProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data as Project[]
}
