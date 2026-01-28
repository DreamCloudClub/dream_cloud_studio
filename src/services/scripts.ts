// Scripts Service
// CRUD operations for script characters and sections

import { supabase } from '@/lib/supabase'
import type {
  ScriptCharacter,
  ScriptCharacterInsert,
  ScriptCharacterWithAsset,
  ScriptSection,
  ScriptSectionInsert,
  ScriptSectionWithCharacter,
} from '@/types/database'

// ============================================
// SCRIPT CHARACTERS
// ============================================

/**
 * Get all characters for a project
 */
export async function getScriptCharacters(projectId: string): Promise<ScriptCharacter[]> {
  const { data, error } = await supabase
    .from('script_characters')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Get all characters for a project with their avatar assets expanded
 */
export async function getScriptCharactersWithAssets(projectId: string): Promise<ScriptCharacterWithAsset[]> {
  const { data, error } = await supabase
    .from('script_characters')
    .select(`
      *,
      avatar_asset:assets(*)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Get a single character by ID
 */
export async function getScriptCharacter(characterId: string): Promise<ScriptCharacter | null> {
  const { data, error } = await supabase
    .from('script_characters')
    .select('*')
    .eq('id', characterId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

/**
 * Create a new character
 */
export async function createScriptCharacter(character: ScriptCharacterInsert): Promise<ScriptCharacter> {
  const { data, error } = await supabase
    .from('script_characters')
    .insert(character)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a character
 */
export async function updateScriptCharacter(
  characterId: string,
  updates: Partial<ScriptCharacterInsert>
): Promise<ScriptCharacter> {
  const { data, error } = await supabase
    .from('script_characters')
    .update(updates)
    .eq('id', characterId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a character
 */
export async function deleteScriptCharacter(characterId: string): Promise<void> {
  const { error } = await supabase
    .from('script_characters')
    .delete()
    .eq('id', characterId)

  if (error) throw error
}

/**
 * Link a character to an image asset (avatar)
 */
export async function linkCharacterToAsset(characterId: string, assetId: string | null): Promise<ScriptCharacter> {
  const { data, error } = await supabase
    .from('script_characters')
    .update({ avatar_asset_id: assetId })
    .eq('id', characterId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================
// SCRIPT SECTIONS
// ============================================

/**
 * Get all sections for a project (ordered)
 */
export async function getScriptSections(projectId: string): Promise<ScriptSection[]> {
  const { data, error } = await supabase
    .from('script_sections')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Get all sections with character data expanded
 */
export async function getScriptSectionsWithCharacters(projectId: string): Promise<ScriptSectionWithCharacter[]> {
  const { data, error } = await supabase
    .from('script_sections')
    .select(`
      *,
      character:script_characters(*)
    `)
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Get a single section by ID
 */
export async function getScriptSection(sectionId: string): Promise<ScriptSection | null> {
  const { data, error } = await supabase
    .from('script_sections')
    .select('*')
    .eq('id', sectionId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

/**
 * Create a new section
 */
export async function createScriptSection(section: ScriptSectionInsert): Promise<ScriptSection> {
  // Get current max sort_order if not provided
  if (section.sort_order === undefined) {
    const { data: existing } = await supabase
      .from('script_sections')
      .select('sort_order')
      .eq('project_id', section.project_id)
      .order('sort_order', { ascending: false })
      .limit(1)

    section.sort_order = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0
  }

  const { data, error } = await supabase
    .from('script_sections')
    .insert(section)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Create multiple sections at once
 */
export async function createScriptSections(sections: ScriptSectionInsert[]): Promise<ScriptSection[]> {
  if (sections.length === 0) return []

  // Get current max sort_order
  const projectId = sections[0].project_id
  const { data: existing } = await supabase
    .from('script_sections')
    .select('sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: false })
    .limit(1)

  let nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  // Assign sort_order to sections that don't have one
  const sectionsWithOrder = sections.map((section, idx) => ({
    ...section,
    sort_order: section.sort_order ?? nextOrder + idx,
  }))

  const { data, error } = await supabase
    .from('script_sections')
    .insert(sectionsWithOrder)
    .select()

  if (error) throw error
  return data || []
}

/**
 * Update a section
 */
export async function updateScriptSection(
  sectionId: string,
  updates: Partial<ScriptSectionInsert>
): Promise<ScriptSection> {
  const { data, error } = await supabase
    .from('script_sections')
    .update(updates)
    .eq('id', sectionId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a section
 */
export async function deleteScriptSection(sectionId: string): Promise<void> {
  const { error } = await supabase
    .from('script_sections')
    .delete()
    .eq('id', sectionId)

  if (error) throw error
}

/**
 * Reorder sections
 */
export async function reorderScriptSections(projectId: string, sectionIds: string[]): Promise<void> {
  // Update each section with its new sort_order
  const updates = sectionIds.map((id, index) => ({
    id,
    sort_order: index,
  }))

  for (const update of updates) {
    const { error } = await supabase
      .from('script_sections')
      .update({ sort_order: update.sort_order })
      .eq('id', update.id)
      .eq('project_id', projectId)

    if (error) throw error
  }
}

/**
 * Delete all sections for a project
 */
export async function clearScriptSections(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('script_sections')
    .delete()
    .eq('project_id', projectId)

  if (error) throw error
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to script section changes for a project
 */
export function subscribeToScriptSections(
  projectId: string,
  callback: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE'
    new: ScriptSection | null
    old: ScriptSection | null
  }) => void
) {
  const channel = supabase
    .channel(`script_sections:${projectId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'script_sections',
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new as ScriptSection | null,
          old: payload.old as ScriptSection | null,
        })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to character changes for a project
 */
export function subscribeToScriptCharacters(
  projectId: string,
  callback: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE'
    new: ScriptCharacter | null
    old: ScriptCharacter | null
  }) => void
) {
  const channel = supabase
    .channel(`script_characters:${projectId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'script_characters',
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new as ScriptCharacter | null,
          old: payload.old as ScriptCharacter | null,
        })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
