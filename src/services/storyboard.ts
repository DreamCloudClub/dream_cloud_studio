// Storyboard Service
// CRUD operations for storyboard cards

import { supabase } from '@/lib/supabase'
import type {
  StoryboardCard,
  StoryboardCardInsert,
  StoryboardCardUpdate,
} from '@/types/database'

/**
 * Get all storyboard cards for a project (ordered by sort_order)
 */
export async function getStoryboardCards(projectId: string): Promise<StoryboardCard[]> {
  const { data, error } = await supabase
    .from('storyboard_cards')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Get a single storyboard card by ID
 */
export async function getStoryboardCard(cardId: string): Promise<StoryboardCard | null> {
  const { data, error } = await supabase
    .from('storyboard_cards')
    .select('*')
    .eq('id', cardId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

/**
 * Create a new storyboard card
 */
export async function createStoryboardCard(card: StoryboardCardInsert): Promise<StoryboardCard> {
  // Get current max sort_order if not provided
  if (card.sort_order === undefined) {
    const { data: existing } = await supabase
      .from('storyboard_cards')
      .select('sort_order')
      .eq('project_id', card.project_id)
      .order('sort_order', { ascending: false })
      .limit(1)

    card.sort_order = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0
  }

  const { data, error } = await supabase
    .from('storyboard_cards')
    .insert(card)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a storyboard card
 */
export async function updateStoryboardCard(
  cardId: string,
  updates: StoryboardCardUpdate
): Promise<StoryboardCard> {
  const { data, error } = await supabase
    .from('storyboard_cards')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', cardId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a storyboard card
 */
export async function deleteStoryboardCard(cardId: string): Promise<void> {
  const { error } = await supabase
    .from('storyboard_cards')
    .delete()
    .eq('id', cardId)

  if (error) throw error
}

/**
 * Reorder storyboard cards
 */
export async function reorderStoryboardCards(
  projectId: string,
  cardIds: string[]
): Promise<void> {
  for (let i = 0; i < cardIds.length; i++) {
    const { error } = await supabase
      .from('storyboard_cards')
      .update({ sort_order: i, updated_at: new Date().toISOString() })
      .eq('id', cardIds[i])
      .eq('project_id', projectId)

    if (error) throw error
  }
}

/**
 * Delete all storyboard cards for a project
 */
export async function clearStoryboardCards(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('storyboard_cards')
    .delete()
    .eq('project_id', projectId)

  if (error) throw error
}
