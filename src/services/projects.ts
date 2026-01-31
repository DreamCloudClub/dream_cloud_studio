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
  ExportSettings,
  ExportSettingsInsert,
  ExportSettingsUpdate,
  ProjectComposition,
  ProjectCompositionInsert,
  ProjectCompositionUpdate,
  ProjectWithRelations,
  Platform,
  Note,
  NoteInsert,
  Script,
  ScriptInsert,
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
  // Simple query without scene/shot joins (those tables may not exist)
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['completed', 'in_progress'])
    .order('updated_at', { ascending: false })

  if (error) throw error

  // Return projects without thumbnail for now
  return (data || []).map(project => ({
    ...project,
    thumbnail_url: null,
  })) as ProjectWithThumbnail[]
}

export async function getDraftProjects(userId: string): Promise<ProjectWithThumbnail[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })

  if (error) throw error

  return (data || []).map(project => ({
    ...project,
    thumbnail_url: null,
  })) as ProjectWithThumbnail[]
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

export async function createBlankProject(userId: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name: 'Untitled Project',
      status: 'in_progress',
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
  // Fetch project first to check if it exists and get platform_id
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

  // Fetch ALL related data in parallel (including platform)
  // Use maybeSingle() for optional records to avoid 406 errors when they don't exist
  const [
    platformResult,
    briefResult,
    moodBoardResult,
    storyboardResult,
    cardsResult,
    assetsResult,
    exportResult,
    compositionResult,
    timelineClipsResult,
  ] = await Promise.all([
    project.platform_id
      ? supabase.from('platforms').select('*').eq('id', project.platform_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from('project_briefs').select('*').eq('project_id', projectId).maybeSingle(),
    supabase.from('mood_boards').select('*').eq('project_id', projectId).maybeSingle(),
    supabase.from('storyboards').select('*').eq('project_id', projectId).maybeSingle(),
    supabase.from('storyboard_cards').select('*').eq('project_id', projectId).order('sort_order'),
    supabase.from('assets').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('export_settings').select('*').eq('project_id', projectId).maybeSingle(),
    supabase.from('project_compositions').select('*').eq('project_id', projectId).maybeSingle(),
    supabase.from('timeline_clips').select('*').eq('project_id', projectId).order('start_time'),
  ])

  const platform = platformResult.data as Platform | undefined

  // Collect asset IDs from timeline clips
  const linkedAssetIds = new Set<string>()
  for (const clip of timelineClipsResult.data || []) {
    if (clip.asset_id) linkedAssetIds.add(clip.asset_id)
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
    assets: allAssets as any[],
    export_settings: exportResult.data as ExportSettings | undefined,
    composition: compositionResult.data as ProjectComposition | undefined,
    timeline_clips: (timelineClipsResult.data || []) as any[],
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

  // Create default export settings
  const exportSettings = await createExportSettings({
    project_id: project.id,
  })

  return {
    ...project,
    brief,
    mood_board: moodBoard,
    storyboard,
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

// ============================================
// NOTES
// ============================================

export async function getNotes(userId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Note[]
}

export async function createNote(note: NoteInsert): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert(note)
    .select()
    .single()

  if (error) throw error
  return data as Note
}

export async function updateNote(noteId: string, content: string): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .select()
    .single()

  if (error) throw error
  return data as Note
}

export async function deleteNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)

  if (error) throw error
}

export async function updateNoteSortOrder(noteId: string, sortOrder: number): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({ sort_order: sortOrder })
    .eq('id', noteId)

  if (error) throw error
}

// ============================================
// SCRIPTS
// ============================================

export async function getScripts(userId: string): Promise<Script[]> {
  const { data, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data as Script[]
}

export async function getScriptByProject(projectId: string): Promise<Script | null> {
  const { data, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) throw error
  return data as Script | null
}

export async function createScript(script: ScriptInsert): Promise<Script> {
  const { data, error } = await supabase
    .from('scripts')
    .insert(script)
    .select()
    .single()

  if (error) throw error
  return data as Script
}

export async function updateScript(scriptId: string, content: string): Promise<Script> {
  const { data, error } = await supabase
    .from('scripts')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', scriptId)
    .select()
    .single()

  if (error) throw error
  return data as Script
}

export async function upsertScript(projectId: string, userId: string, content: string): Promise<Script> {
  const existing = await getScriptByProject(projectId)

  if (existing) {
    return updateScript(existing.id, content)
  } else {
    return createScript({ project_id: projectId, user_id: userId, content })
  }
}

export async function updateScriptSortOrder(scriptId: string, sortOrder: number): Promise<void> {
  const { error } = await supabase
    .from('scripts')
    .update({ sort_order: sortOrder })
    .eq('id', scriptId)

  if (error) throw error
}
