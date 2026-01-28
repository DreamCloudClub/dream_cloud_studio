import { supabase } from '@/lib/supabase'

export interface Foundation {
  id: string
  user_id: string
  name: string
  description: string | null
  color_palette: string[]
  style: string | null
  mood: string | null
  typography: string | null
  tone: string | null
  mood_images: { id: string; url: string; name: string }[]
  project_count: number
  created_at: string
  updated_at: string
}

export interface FoundationInsert {
  user_id: string
  name: string
  description?: string | null
  color_palette?: string[]
  style?: string | null
  mood?: string | null
  typography?: string | null
  tone?: string | null
  mood_images?: { id: string; url: string; name: string }[]
}

export interface FoundationUpdate {
  name?: string
  description?: string | null
  color_palette?: string[]
  style?: string | null
  mood?: string | null
  typography?: string | null
  tone?: string | null
  mood_images?: { id: string; url: string; name: string }[]
  project_count?: number
}

// Get all foundations for a user
export async function getFoundations(userId: string): Promise<Foundation[]> {
  const { data, error } = await supabase
    .from('foundations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(mapDbToFoundation)
}

// Get a single foundation
export async function getFoundation(foundationId: string): Promise<Foundation | null> {
  const { data, error } = await supabase
    .from('foundations')
    .select('*')
    .eq('id', foundationId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return mapDbToFoundation(data)
}

// Create a new foundation
export async function createFoundation(foundation: FoundationInsert): Promise<Foundation> {
  const { data, error } = await supabase
    .from('foundations')
    .insert({
      user_id: foundation.user_id,
      name: foundation.name,
      description: foundation.description || null,
      color_palette: foundation.color_palette || [],
      style: foundation.style || null,
      mood: foundation.mood || null,
      typography: foundation.typography || null,
      tone: foundation.tone || null,
      mood_images: foundation.mood_images || [],
    })
    .select()
    .single()

  if (error) throw error
  return mapDbToFoundation(data)
}

// Update a foundation
export async function updateFoundation(foundationId: string, updates: FoundationUpdate): Promise<Foundation> {
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.color_palette !== undefined) updateData.color_palette = updates.color_palette
  if (updates.style !== undefined) updateData.style = updates.style
  if (updates.mood !== undefined) updateData.mood = updates.mood
  if (updates.typography !== undefined) updateData.typography = updates.typography
  if (updates.tone !== undefined) updateData.tone = updates.tone
  if (updates.mood_images !== undefined) updateData.mood_images = updates.mood_images
  if (updates.project_count !== undefined) updateData.project_count = updates.project_count

  const { data, error } = await supabase
    .from('foundations')
    .update(updateData)
    .eq('id', foundationId)
    .select()
    .single()

  if (error) throw error
  return mapDbToFoundation(data)
}

// Delete a foundation
export async function deleteFoundation(foundationId: string): Promise<void> {
  const { error } = await supabase
    .from('foundations')
    .delete()
    .eq('id', foundationId)

  if (error) throw error
}

// Duplicate a foundation
export async function duplicateFoundation(foundationId: string, userId: string): Promise<Foundation> {
  const original = await getFoundation(foundationId)
  if (!original) throw new Error('Foundation not found')

  return createFoundation({
    user_id: userId,
    name: `${original.name} (Copy)`,
    description: original.description,
    color_palette: original.color_palette,
    style: original.style,
    mood: original.mood,
    typography: original.typography,
    tone: original.tone,
    mood_images: original.mood_images,
  })
}

// Increment project count
export async function incrementFoundationProjectCount(foundationId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_foundation_project_count', {
    foundation_id: foundationId,
  })

  // If RPC doesn't exist, do it manually
  if (error) {
    const foundation = await getFoundation(foundationId)
    if (foundation) {
      await updateFoundation(foundationId, {
        project_count: foundation.project_count + 1,
      })
    }
  }
}

// Map database row to Foundation interface
function mapDbToFoundation(row: Record<string, unknown>): Foundation {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: row.name as string,
    description: row.description as string | null,
    color_palette: (row.color_palette as string[]) || [],
    style: row.style as string | null,
    mood: row.mood as string | null,
    typography: row.typography as string | null,
    tone: row.tone as string | null,
    mood_images: (row.mood_images as { id: string; url: string; name: string }[]) || [],
    project_count: (row.project_count as number) || 0,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

// Get foundations by platform (placeholder - foundations don't have platform_id yet)
// In the future, we could add a platform_id field to foundations
export async function getFoundationsByPlatform(_platformId: string): Promise<Foundation[]> {
  // For now, return empty array since foundations aren't linked to platforms yet
  // This can be updated when we add platform_id to foundations table
  return []
}
