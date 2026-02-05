/**
 * OTIO Bridge - Syncs OTIO timeline state with the app
 *
 * This service bridges the OTIO timeline model with:
 * - The Zustand workspace store
 * - The Supabase database (for persistence)
 * - The UI layer
 *
 * It manages the transition period where both legacy and OTIO
 * formats may coexist.
 */

import type { OTIOTimeline, TimelineEditOp, EditResult } from '@/otio/types'
import type { TimelineClip } from '@/types/timeline'
import * as OTIO from '@/otio'
import { generateMLTXML } from '@/mlt/xml-generator'
import { supabase } from '@/lib/supabase'

// ============================================
// BRIDGE STATE
// ============================================

/**
 * In-memory OTIO timeline state
 * This is the single source of truth for the active timeline
 */
let activeTimeline: OTIOTimeline | null = null
let undoStack: OTIOTimeline[] = []
let redoStack: OTIOTimeline[] = []

const MAX_UNDO_DEPTH = 50

/** Listeners for timeline state changes */
const listeners: Set<(timeline: OTIOTimeline) => void> = new Set()

// ============================================
// LIFECYCLE
// ============================================

/**
 * Initialize OTIO bridge with a project
 * Loads existing OTIO data or migrates from legacy format
 */
export async function initializeTimeline(
  projectId: string,
  projectName: string,
  legacyClips: TimelineClip[]
): Promise<OTIOTimeline> {
  // Try to load existing OTIO data from database
  const existingOtio = await loadOTIOFromDB(projectId)

  if (existingOtio) {
    activeTimeline = existingOtio
  } else {
    // Migrate from legacy format
    activeTimeline = OTIO.migrateFromLegacy(legacyClips, projectName)
  }

  // Reset undo/redo
  undoStack = []
  redoStack = []

  // Notify listeners
  notifyListeners()

  return activeTimeline
}

/**
 * Create a new empty timeline
 */
export function createNewTimeline(name: string = 'Untitled'): OTIOTimeline {
  activeTimeline = OTIO.createTimeline(name)
  undoStack = []
  redoStack = []
  notifyListeners()
  return activeTimeline
}

/**
 * Get the current active timeline
 */
export function getActiveTimeline(): OTIOTimeline | null {
  return activeTimeline
}

// ============================================
// EDIT OPERATIONS (with undo support)
// ============================================

/**
 * Apply an edit operation to the active timeline
 */
export function applyEdit(op: TimelineEditOp): EditResult {
  if (!activeTimeline) {
    return { success: false, error: 'No active timeline' }
  }

  try {
    // Save current state for undo
    pushUndo(activeTimeline)

    // Apply the operation
    let newTimeline: OTIOTimeline
    let newItemId: string | undefined

    switch (op.type) {
      case 'insert_clip': {
        const clip = OTIO.createClip(
          op.clip.name,
          op.clip.mediaReference,
          op.clip.sourceRange,
          op.clip.volume
        )
        newTimeline = OTIO.insertClip(activeTimeline, op.trackId, clip, op.insertTime)
        newItemId = clip.id
        break
      }

      case 'trim_clip':
        newTimeline = OTIO.trimClip(activeTimeline, op.clipId, op.edge, op.delta)
        break

      case 'move_clip':
        newTimeline = OTIO.moveClip(
          activeTimeline,
          op.clipId,
          op.targetTrackId || OTIO.findClip(activeTimeline, op.clipId)?.track.id || '',
          op.targetTime
        )
        break

      case 'split_clip': {
        const result = OTIO.splitClip(activeTimeline, op.clipId, op.splitTime)
        newTimeline = result.timeline
        newItemId = result.newClipId
        break
      }

      case 'delete_clip':
        newTimeline = OTIO.deleteClip(activeTimeline, op.clipId, op.ripple)
        break

      case 'set_clip_property':
        newTimeline = OTIO.setClipProperty(activeTimeline, op.clipId, op.property, op.value)
        break

      case 'add_track':
        newTimeline = OTIO.addTrack(activeTimeline, op.kind, op.index)
        break

      case 'remove_track':
        newTimeline = OTIO.removeTrack(activeTimeline, op.trackId)
        break

      case 'add_marker': {
        const marker = { ...op.marker, id: crypto.randomUUID() }
        newTimeline = OTIO.addMarker(activeTimeline, marker)
        newItemId = marker.id
        break
      }

      case 'remove_marker':
        newTimeline = OTIO.removeMarker(activeTimeline, op.markerId)
        break

      default:
        return { success: false, error: `Unknown operation type: ${(op as TimelineEditOp).type}` }
    }

    // Validate result
    const validation = OTIO.validateTimeline(newTimeline)
    if (!validation.valid) {
      // Revert
      activeTimeline = undoStack.pop() || activeTimeline
      return { success: false, error: `Validation failed: ${validation.errors.join(', ')}` }
    }

    activeTimeline = newTimeline
    redoStack = [] // Clear redo on new edit

    notifyListeners()

    return { success: true, timeline: newTimeline, newItemId }
  } catch (e) {
    // Revert on error
    const prevState = undoStack.pop()
    if (prevState) {
      activeTimeline = prevState
    }
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Apply multiple edit operations in sequence
 */
export function applyEdits(ops: TimelineEditOp[]): EditResult[] {
  const results: EditResult[] = []

  for (const op of ops) {
    const result = applyEdit(op)
    results.push(result)

    // Stop on first failure
    if (!result.success) break
  }

  return results
}

// ============================================
// UNDO / REDO
// ============================================

function pushUndo(timeline: OTIOTimeline): void {
  undoStack.push(timeline)
  if (undoStack.length > MAX_UNDO_DEPTH) {
    undoStack.shift() // Remove oldest
  }
}

/**
 * Undo the last edit
 */
export function undo(): OTIOTimeline | null {
  if (undoStack.length === 0 || !activeTimeline) return null

  redoStack.push(activeTimeline)
  activeTimeline = undoStack.pop()!
  notifyListeners()

  return activeTimeline
}

/**
 * Redo the last undone edit
 */
export function redo(): OTIOTimeline | null {
  if (redoStack.length === 0 || !activeTimeline) return null

  undoStack.push(activeTimeline)
  activeTimeline = redoStack.pop()!
  notifyListeners()

  return activeTimeline
}

/**
 * Check if undo is available
 */
export function canUndo(): boolean {
  return undoStack.length > 0
}

/**
 * Check if redo is available
 */
export function canRedo(): boolean {
  return redoStack.length > 0
}

// ============================================
// PERSISTENCE
// ============================================

/**
 * Save current OTIO timeline to database
 */
export async function saveTimeline(projectId: string): Promise<boolean> {
  if (!activeTimeline) return false

  try {
    const json = OTIO.toJSON(activeTimeline)

    const { error } = await supabase
      .from('projects')
      .update({
        otio_timeline: json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)

    if (error) {
      console.error('Failed to save OTIO timeline:', error)
      return false
    }

    return true
  } catch (e) {
    console.error('Failed to save timeline:', e)
    return false
  }
}

/**
 * Load OTIO timeline from database
 */
async function loadOTIOFromDB(projectId: string): Promise<OTIOTimeline | null> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('otio_timeline')
      .eq('id', projectId)
      .single()

    if (error || !data?.otio_timeline) return null

    return OTIO.fromJSON(data.otio_timeline)
  } catch {
    return null
  }
}

/**
 * Export timeline as standalone OTIO JSON file
 */
export function exportAsOTIO(): string | null {
  if (!activeTimeline) return null
  return OTIO.exportOTIO(activeTimeline)
}

/**
 * Generate MLT XML for current timeline
 */
export function generateMLT(): string | null {
  if (!activeTimeline) return null
  return generateMLTXML(activeTimeline)
}

// ============================================
// LEGACY SYNC
// ============================================

/**
 * Convert current OTIO timeline to legacy clip format
 * For backward compatibility during transition
 */
export function toLegacyClips(projectId: string): TimelineClip[] {
  if (!activeTimeline) return []
  return OTIO.toLegacyFormat(activeTimeline, projectId)
}

/**
 * Sync OTIO state from legacy clip changes
 * Used when legacy UI makes direct clip modifications
 */
export function syncFromLegacy(clips: TimelineClip[], projectName: string): void {
  activeTimeline = OTIO.migrateFromLegacy(clips, projectName)
  notifyListeners()
}

// ============================================
// LISTENERS
// ============================================

/**
 * Subscribe to timeline state changes
 */
export function subscribe(listener: (timeline: OTIOTimeline) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Notify all listeners of state change
 */
function notifyListeners(): void {
  if (!activeTimeline) return
  for (const listener of listeners) {
    try {
      listener(activeTimeline)
    } catch (e) {
      console.error('Timeline listener error:', e)
    }
  }
}

// ============================================
// QUERIES (delegate to OTIO module)
// ============================================

export function getTimelineDuration() {
  if (!activeTimeline) return 0
  return OTIO.toSeconds(OTIO.getTimelineDuration(activeTimeline))
}

export function getAllClips() {
  if (!activeTimeline) return []
  return OTIO.getAllClips(activeTimeline)
}

export function getTracks(kind?: 'video' | 'audio') {
  if (!activeTimeline) return []
  return OTIO.getTracks(activeTimeline, kind)
}
