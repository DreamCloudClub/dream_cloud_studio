// Timeline service - CRUD operations for timeline clips
import { supabase } from '@/lib/supabase'
import type {
  TimelineClip,
  TimelineClipRow,
  TimelineClipInsert,
  TimelineClipUpdate,
  ClipAnimation,
  ClipTransform,
  EditResult,
  TimelineEditOp,
} from '@/types/timeline'
import { clipFromRow } from '@/types/timeline'
import type { Asset } from '@/types/database'

// ============================================
// CLIP CRUD
// ============================================

export async function getClips(projectId: string): Promise<TimelineClip[]> {
  const { data, error } = await supabase
    .from('timeline_clips')
    .select('*')
    .eq('project_id', projectId)
    .order('start_time', { ascending: true })

  if (error) throw error
  return (data as TimelineClipRow[]).map(clipFromRow)
}

export async function getClip(clipId: string): Promise<TimelineClip | null> {
  const { data, error } = await supabase
    .from('timeline_clips')
    .select('*')
    .eq('id', clipId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return clipFromRow(data as TimelineClipRow)
}

export async function createClip(clip: TimelineClipInsert): Promise<TimelineClip> {
  const { data, error } = await supabase
    .from('timeline_clips')
    .insert(clip)
    .select()
    .single()

  if (error) throw error
  return clipFromRow(data as TimelineClipRow)
}

export async function updateClip(clipId: string, updates: TimelineClipUpdate): Promise<TimelineClip> {
  const { data, error } = await supabase
    .from('timeline_clips')
    .update(updates)
    .eq('id', clipId)
    .select()
    .single()

  if (error) throw error
  return clipFromRow(data as TimelineClipRow)
}

export async function deleteClip(clipId: string): Promise<void> {
  const { error } = await supabase
    .from('timeline_clips')
    .delete()
    .eq('id', clipId)

  if (error) throw error
}

// ============================================
// EDIT OPERATIONS
// ============================================

/**
 * Add a clip to the timeline
 * Returns the clip along with asset data for the caller to handle
 */
export async function addClip(
  projectId: string,
  assetId: string,
  startTime: number,
  options?: {
    duration?: number
    inPoint?: number
    trackId?: string
  }
): Promise<{ clip: TimelineClip; asset: Asset }> {
  // Get full asset data
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .single()

  if (assetError) throw assetError

  const assetData = asset as Asset

  // Default duration: asset duration for video/audio, 5s for images
  const duration = options?.duration ?? assetData.duration ?? 5

  const clip = await createClip({
    project_id: projectId,
    asset_id: assetId,
    track_id: options?.trackId ?? 'video-main',
    start_time: startTime,
    duration,
    in_point: options?.inPoint ?? 0,
  })

  return { clip, asset: assetData }
}

/**
 * Move a clip to a new position (and optionally new track)
 */
export async function moveClip(
  clipId: string,
  startTime: number,
  trackId?: string
): Promise<TimelineClip> {
  const updates: TimelineClipUpdate = { start_time: startTime }
  if (trackId !== undefined) {
    updates.track_id = trackId
  }
  return updateClip(clipId, updates)
}

/**
 * Trim a clip (adjust in-point, duration, and optionally startTime)
 */
export async function trimClip(
  clipId: string,
  inPoint?: number,
  duration?: number,
  startTime?: number
): Promise<TimelineClip> {
  const updates: TimelineClipUpdate = {}
  if (inPoint !== undefined) updates.in_point = inPoint
  if (duration !== undefined) updates.duration = duration
  if (startTime !== undefined) updates.start_time = startTime
  return updateClip(clipId, updates)
}

/**
 * Split a clip at a given timeline position
 * Returns the new clip (the second half)
 * Copies embedded asset data to the new clip
 */
export async function splitClip(
  clipId: string,
  splitAt: number
): Promise<{ original: TimelineClip; newClip: TimelineClip }> {
  // Get the original clip
  const original = await getClip(clipId)
  if (!original) throw new Error('Clip not found')

  // Validate split position is within the clip
  const clipEnd = original.startTime + original.duration
  if (splitAt <= original.startTime || splitAt >= clipEnd) {
    throw new Error('Split position must be within the clip')
  }

  // Calculate durations
  const firstDuration = splitAt - original.startTime
  const secondDuration = clipEnd - splitAt
  const secondInPoint = original.inPoint + firstDuration

  // Update original clip duration
  const updatedOriginal = await updateClip(clipId, { duration: firstDuration })

  // Create new clip for second half - copy embedded asset
  const newClip = await createClip({
    project_id: original.projectId,
    asset_id: original.assetId,
    track_id: original.trackId,
    start_time: splitAt,
    duration: secondDuration,
    in_point: secondInPoint,
    transform: original.transform,
    animation: original.animation,
    volume: original.volume,
    embedded_asset: original.embeddedAsset,
  })

  return { original: updatedOriginal, newClip }
}

/**
 * Set clip volume
 */
export async function setClipVolume(clipId: string, volume: number): Promise<TimelineClip> {
  return updateClip(clipId, { volume: Math.max(0, Math.min(1, volume)) })
}

/**
 * Set clip animation (Ken Burns for images)
 */
export async function setClipAnimation(clipId: string, animation: ClipAnimation): Promise<TimelineClip> {
  return updateClip(clipId, { animation })
}

/**
 * Set clip transform (scale/position)
 */
export async function setClipTransform(clipId: string, transform: ClipTransform): Promise<TimelineClip> {
  return updateClip(clipId, { transform })
}

// ============================================
// BATCH OPERATIONS (for AI)
// ============================================

/**
 * Apply a single edit operation
 */
export async function applyEdit(projectId: string, op: TimelineEditOp): Promise<EditResult> {
  try {
    switch (op.type) {
      case 'add_clip': {
        const { clip } = await addClip(projectId, op.assetId, op.startTime, {
          duration: op.duration,
          inPoint: op.inPoint,
          trackId: op.trackId,
        })
        return { success: true, clip, newClipId: clip.id }
      }

      case 'remove_clip': {
        await deleteClip(op.clipId)
        return { success: true }
      }

      case 'move_clip': {
        const clip = await moveClip(op.clipId, op.startTime, op.trackId)
        return { success: true, clip }
      }

      case 'trim_clip': {
        const clip = await trimClip(op.clipId, op.inPoint, op.duration)
        return { success: true, clip }
      }

      case 'split_clip': {
        const { original, newClip } = await splitClip(op.clipId, op.splitAt)
        return { success: true, clip: original, newClipId: newClip.id }
      }

      default:
        return { success: false, error: 'Unknown operation type' }
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Apply multiple edit operations in sequence
 */
export async function applyEdits(projectId: string, ops: TimelineEditOp[]): Promise<EditResult[]> {
  const results: EditResult[] = []
  for (const op of ops) {
    const result = await applyEdit(projectId, op)
    results.push(result)
    // Stop on first failure
    if (!result.success) break
  }
  return results
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Append a clip to the end of the timeline
 */
export async function appendClip(
  projectId: string,
  assetId: string,
  trackId = 'video-main'
): Promise<{ clip: TimelineClip; asset: Asset }> {
  // Get current clips to find end time
  const clips = await getClips(projectId)
  const trackClips = clips.filter(c => c.trackId === trackId)
  const endTime = trackClips.length > 0
    ? Math.max(...trackClips.map(c => c.startTime + c.duration))
    : 0

  return addClip(projectId, assetId, endTime, { trackId })
}

/**
 * Get timeline end time
 */
export async function getTimelineEnd(projectId: string): Promise<number> {
  const clips = await getClips(projectId)
  if (clips.length === 0) return 0
  return Math.max(...clips.map(c => c.startTime + c.duration))
}

/**
 * Ripple delete - delete a clip and shift subsequent clips back
 */
export async function rippleDelete(clipId: string): Promise<void> {
  const clip = await getClip(clipId)
  if (!clip) throw new Error('Clip not found')

  // Get all clips after this one on the same track
  const { data: clips, error } = await supabase
    .from('timeline_clips')
    .select('*')
    .eq('project_id', clip.projectId)
    .eq('track_id', clip.trackId)
    .gt('start_time', clip.startTime)
    .order('start_time', { ascending: true })

  if (error) throw error

  // Delete the clip
  await deleteClip(clipId)

  // Shift subsequent clips back
  const gap = clip.duration
  for (const c of clips as TimelineClipRow[]) {
    await updateClip(c.id, { start_time: c.start_time - gap })
  }
}
