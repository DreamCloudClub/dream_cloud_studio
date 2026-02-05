/**
 * OTIOTimeline - Main timeline class with edit operations
 *
 * This is the authoritative timeline model. All edits go through this class.
 * The class uses immutable patterns - operations return new timeline instances.
 */

import { v4 as uuidv4 } from 'uuid'
import type {
  OTIOTimeline,
  OTIOTrack,
  OTIOClip,
  OTIOGap,
  OTIOStack,
  OTIOMarker,
  MediaReference,
  ExternalReference,
  TimeRange,
  RationalTime,
  TrackItem,
  TrackKind,
  TimelineSettings,
} from './types'
import { DEFAULT_TIMELINE_SETTINGS } from './types'
import * as RT from './rational-time'

// ============================================
// TIMELINE CREATION
// ============================================

/**
 * Create a new empty timeline
 */
export function createTimeline(
  name: string = 'Untitled',
  settings: Partial<TimelineSettings> = {}
): OTIOTimeline {
  const finalSettings = { ...DEFAULT_TIMELINE_SETTINGS, ...settings }

  return {
    id: uuidv4(),
    name,
    schemaVersion: '1.0',
    globalStartTime: RT.zero(finalSettings.frameRate),
    tracks: {
      id: uuidv4(),
      name: 'main_stack',
      type: 'stack',
      children: [
        createTrack('video', 1),
        createTrack('audio', 1),
      ],
      metadata: {},
    },
    markers: [],
    metadata: {
      settings: finalSettings,
    },
  }
}

/**
 * Create a new track
 */
export function createTrack(kind: TrackKind, index: number): OTIOTrack {
  const prefix = kind === 'video' ? 'V' : 'A'
  return {
    id: uuidv4(),
    name: `${prefix}${index}`,
    type: 'track',
    kind,
    children: [],
    index,
    metadata: {},
  }
}

/**
 * Create a clip from a media reference
 */
export function createClip(
  name: string,
  mediaRef: MediaReference,
  sourceRange: TimeRange,
  volume: number = 1.0
): OTIOClip {
  return {
    id: uuidv4(),
    name,
    type: 'clip',
    mediaReference: mediaRef,
    sourceRange,
    volume,
    metadata: {},
  }
}

/**
 * Create a gap of specified duration
 */
export function createGap(duration: RationalTime): OTIOGap {
  return {
    id: uuidv4(),
    name: 'Gap',
    type: 'gap',
    sourceRange: {
      startTime: RT.zero(duration.rate),
      duration,
    },
    metadata: {},
  }
}

/**
 * Create an external media reference
 */
export function createExternalRef(
  url: string,
  name: string,
  availableRange?: TimeRange,
  mimeType?: string
): ExternalReference {
  return {
    id: uuidv4(),
    type: 'external',
    targetUrl: url,
    name,
    availableRange,
    mimeType,
    metadata: {},
  }
}

// ============================================
// TIMELINE QUERIES
// ============================================

/**
 * Get timeline settings
 */
export function getSettings(timeline: OTIOTimeline): TimelineSettings {
  return (timeline.metadata.settings as TimelineSettings) || DEFAULT_TIMELINE_SETTINGS
}

/**
 * Get frame rate from timeline
 */
export function getFrameRate(timeline: OTIOTimeline): number {
  return getSettings(timeline).frameRate
}

/**
 * Get all tracks of a specific kind
 */
export function getTracks(timeline: OTIOTimeline, kind?: TrackKind): OTIOTrack[] {
  const tracks = timeline.tracks.children
  if (kind) {
    return tracks.filter(t => t.kind === kind)
  }
  return tracks
}

/**
 * Get a track by ID
 */
export function getTrack(timeline: OTIOTimeline, trackId: string): OTIOTrack | undefined {
  return timeline.tracks.children.find(t => t.id === trackId)
}

/**
 * Get a track by kind and index
 */
export function getTrackByIndex(
  timeline: OTIOTimeline,
  kind: TrackKind,
  index: number
): OTIOTrack | undefined {
  return timeline.tracks.children.find(t => t.kind === kind && t.index === index)
}

/**
 * Find a clip by ID across all tracks
 */
export function findClip(
  timeline: OTIOTimeline,
  clipId: string
): { clip: OTIOClip; track: OTIOTrack; index: number } | undefined {
  for (const track of timeline.tracks.children) {
    const index = track.children.findIndex(item => item.id === clipId && item.type === 'clip')
    if (index !== -1) {
      return { clip: track.children[index] as OTIOClip, track, index }
    }
  }
  return undefined
}

/**
 * Get all clips from timeline
 */
export function getAllClips(timeline: OTIOTimeline): OTIOClip[] {
  const clips: OTIOClip[] = []
  for (const track of timeline.tracks.children) {
    for (const item of track.children) {
      if (item.type === 'clip') {
        clips.push(item as OTIOClip)
      }
    }
  }
  return clips
}

/**
 * Calculate the start time of an item on a track
 */
export function getItemStartTime(track: OTIOTrack, itemIndex: number): RationalTime {
  let time = RT.zero()
  for (let i = 0; i < itemIndex; i++) {
    const item = track.children[i]
    time = RT.add(time, item.sourceRange.duration)
  }
  return time
}

/**
 * Get the timeline position and track for a clip
 */
export function getClipPosition(
  timeline: OTIOTimeline,
  clipId: string
): { startTime: RationalTime; track: OTIOTrack } | undefined {
  const found = findClip(timeline, clipId)
  if (!found) return undefined

  const startTime = getItemStartTime(found.track, found.index)
  return { startTime, track: found.track }
}

/**
 * Get total duration of a track
 */
export function getTrackDuration(track: OTIOTrack): RationalTime {
  let duration = RT.zero()
  for (const item of track.children) {
    duration = RT.add(duration, item.sourceRange.duration)
  }
  return duration
}

/**
 * Get total duration of the timeline (max of all tracks)
 */
export function getTimelineDuration(timeline: OTIOTimeline): RationalTime {
  let maxDuration = RT.zero(getFrameRate(timeline))
  for (const track of timeline.tracks.children) {
    const trackDur = getTrackDuration(track)
    if (RT.isGreaterThan(trackDur, maxDuration)) {
      maxDuration = trackDur
    }
  }
  return maxDuration
}

/**
 * Find clip at a given time on a track
 */
export function findClipAtTime(
  track: OTIOTrack,
  time: RationalTime
): { item: TrackItem; index: number; startTime: RationalTime } | undefined {
  let currentTime = RT.zero(time.rate)

  for (let i = 0; i < track.children.length; i++) {
    const item = track.children[i]
    const itemEnd = RT.add(currentTime, item.sourceRange.duration)

    if (RT.isGreaterThanOrEqual(time, currentTime) && RT.isLessThan(time, itemEnd)) {
      return { item, index: i, startTime: currentTime }
    }

    currentTime = itemEnd
  }

  return undefined
}

// ============================================
// IMMUTABLE UPDATE HELPERS
// ============================================

/**
 * Update timeline with a new stack
 */
function updateStack(timeline: OTIOTimeline, stack: OTIOStack): OTIOTimeline {
  return { ...timeline, tracks: stack }
}

/**
 * Update a track within the timeline
 */
function updateTrack(timeline: OTIOTimeline, trackId: string, updater: (track: OTIOTrack) => OTIOTrack): OTIOTimeline {
  const newChildren = timeline.tracks.children.map(track =>
    track.id === trackId ? updater(track) : track
  )
  return updateStack(timeline, { ...timeline.tracks, children: newChildren })
}

/**
 * Update track children
 */
function updateTrackChildren(track: OTIOTrack, children: TrackItem[]): OTIOTrack {
  return { ...track, children }
}

// ============================================
// EDIT OPERATIONS
// ============================================

/**
 * Insert a clip at a specific time on a track
 * Splits any existing item at that position
 */
export function insertClip(
  timeline: OTIOTimeline,
  trackId: string,
  clip: OTIOClip,
  insertTime: RationalTime
): OTIOTimeline {
  const track = getTrack(timeline, trackId)
  if (!track) {
    throw new Error(`Track not found: ${trackId}`)
  }

  const newChildren: TrackItem[] = []
  let currentTime = RT.zero(insertTime.rate)
  let inserted = false

  for (const item of track.children) {
    const itemEnd = RT.add(currentTime, item.sourceRange.duration)

    if (!inserted && RT.isLessThanOrEqual(insertTime, currentTime)) {
      // Insert before this item
      // Add gap if there's space before insert point
      if (RT.isGreaterThan(insertTime, currentTime)) {
        const gapDuration = RT.subtract(insertTime, currentTime)
        newChildren.push(createGap(gapDuration))
      }
      newChildren.push(clip)
      inserted = true
    }

    if (!inserted && RT.isGreaterThan(insertTime, currentTime) && RT.isLessThan(insertTime, itemEnd)) {
      // Insert point is within this item - need to split
      const splitOffset = RT.subtract(insertTime, currentTime)

      if (item.type === 'gap') {
        // Split gap: first part, clip, second part
        const firstGap = createGap(splitOffset)
        const secondGapDuration = RT.subtract(item.sourceRange.duration, splitOffset)
        const secondGap = createGap(secondGapDuration)

        newChildren.push(firstGap)
        newChildren.push(clip)
        newChildren.push(secondGap)
      } else if (item.type === 'clip') {
        // Can't insert in middle of clip without replacing - append after
        newChildren.push(item)
        newChildren.push(clip)
      }
      inserted = true
      currentTime = itemEnd
      continue
    }

    newChildren.push(item)
    currentTime = itemEnd
  }

  if (!inserted) {
    // Insert at end - add gap if needed
    if (RT.isGreaterThan(insertTime, currentTime)) {
      const gapDuration = RT.subtract(insertTime, currentTime)
      newChildren.push(createGap(gapDuration))
    }
    newChildren.push(clip)
  }

  return updateTrack(timeline, trackId, t => updateTrackChildren(t, newChildren))
}

/**
 * Append a clip to the end of a track
 */
export function appendClip(
  timeline: OTIOTimeline,
  trackId: string,
  clip: OTIOClip
): OTIOTimeline {
  const track = getTrack(timeline, trackId)
  if (!track) {
    throw new Error(`Track not found: ${trackId}`)
  }

  const endTime = getTrackDuration(track)
  return insertClip(timeline, trackId, clip, endTime)
}

/**
 * Trim a clip from start or end
 */
export function trimClip(
  timeline: OTIOTimeline,
  clipId: string,
  edge: 'start' | 'end',
  delta: RationalTime
): OTIOTimeline {
  const found = findClip(timeline, clipId)
  if (!found) {
    throw new Error(`Clip not found: ${clipId}`)
  }

  const { clip, track } = found
  let newSourceRange: TimeRange

  if (edge === 'start') {
    // Trimming start: adjust startTime and duration
    const newStartTime = RT.add(clip.sourceRange.startTime, delta)
    const newDuration = RT.subtract(clip.sourceRange.duration, delta)

    // Ensure we don't trim past the end or before source start
    if (RT.isLessThanOrEqual(newDuration, RT.zero())) {
      throw new Error('Cannot trim clip to zero or negative duration')
    }
    if (RT.isLessThan(newStartTime, RT.zero())) {
      throw new Error('Cannot trim past source start')
    }

    newSourceRange = { startTime: newStartTime, duration: newDuration }
  } else {
    // Trimming end: only adjust duration
    const newDuration = RT.add(clip.sourceRange.duration, delta)

    if (RT.isLessThanOrEqual(newDuration, RT.zero())) {
      throw new Error('Cannot trim clip to zero or negative duration')
    }

    newSourceRange = { ...clip.sourceRange, duration: newDuration }
  }

  const updatedClip: OTIOClip = { ...clip, sourceRange: newSourceRange }

  return updateTrack(timeline, track.id, t => {
    const newChildren = t.children.map(item =>
      item.id === clipId ? updatedClip : item
    )
    return updateTrackChildren(t, newChildren)
  })
}

/**
 * Move a clip to a new position (and optionally new track)
 */
export function moveClip(
  timeline: OTIOTimeline,
  clipId: string,
  targetTrackId: string,
  targetTime: RationalTime
): OTIOTimeline {
  const found = findClip(timeline, clipId)
  if (!found) {
    throw new Error(`Clip not found: ${clipId}`)
  }

  const { clip, track } = found

  // Remove from current track
  let newTimeline = deleteClip(timeline, clipId, false)

  // Insert at new position
  newTimeline = insertClip(newTimeline, targetTrackId, clip, targetTime)

  return newTimeline
}

/**
 * Split a clip at a given timeline time
 * Returns the timeline with two clips where there was one
 */
export function splitClip(
  timeline: OTIOTimeline,
  clipId: string,
  splitTime: RationalTime
): { timeline: OTIOTimeline; newClipId: string } {
  const found = findClip(timeline, clipId)
  if (!found) {
    throw new Error(`Clip not found: ${clipId}`)
  }

  const { clip, track, index } = found
  const clipStartTime = getItemStartTime(track, index)
  const clipEndTime = RT.add(clipStartTime, clip.sourceRange.duration)

  // Validate split time is within clip
  if (RT.isLessThanOrEqual(splitTime, clipStartTime) || RT.isGreaterThanOrEqual(splitTime, clipEndTime)) {
    throw new Error('Split time must be within the clip')
  }

  // Calculate durations for both halves
  const firstDuration = RT.subtract(splitTime, clipStartTime)
  const secondDuration = RT.subtract(clipEndTime, splitTime)

  // Calculate source range offsets
  const secondSourceStart = RT.add(clip.sourceRange.startTime, firstDuration)

  // Create the two clips
  const firstClip: OTIOClip = {
    ...clip,
    sourceRange: {
      startTime: clip.sourceRange.startTime,
      duration: firstDuration,
    },
  }

  const secondClip: OTIOClip = {
    ...clip,
    id: uuidv4(),
    sourceRange: {
      startTime: secondSourceStart,
      duration: secondDuration,
    },
  }

  // Replace original clip with both halves
  const newTimeline = updateTrack(timeline, track.id, t => {
    const newChildren = [...t.children]
    newChildren.splice(index, 1, firstClip, secondClip)
    return updateTrackChildren(t, newChildren)
  })

  return { timeline: newTimeline, newClipId: secondClip.id }
}

/**
 * Delete a clip from the timeline
 * If ripple is true, subsequent items shift back
 * If ripple is false, a gap is left in place
 */
export function deleteClip(
  timeline: OTIOTimeline,
  clipId: string,
  ripple: boolean = true
): OTIOTimeline {
  const found = findClip(timeline, clipId)
  if (!found) {
    throw new Error(`Clip not found: ${clipId}`)
  }

  const { clip, track, index } = found

  return updateTrack(timeline, track.id, t => {
    const newChildren = [...t.children]

    if (ripple) {
      // Simply remove the clip
      newChildren.splice(index, 1)
    } else {
      // Replace with a gap of same duration
      const gap = createGap(clip.sourceRange.duration)
      newChildren.splice(index, 1, gap)
    }

    // Merge adjacent gaps
    return updateTrackChildren(t, mergeAdjacentGaps(newChildren))
  })
}

/**
 * Merge adjacent gaps in a track's children
 */
function mergeAdjacentGaps(items: TrackItem[]): TrackItem[] {
  const result: TrackItem[] = []

  for (const item of items) {
    if (item.type === 'gap' && result.length > 0) {
      const prev = result[result.length - 1]
      if (prev.type === 'gap') {
        // Merge with previous gap
        const mergedDuration = RT.add(prev.sourceRange.duration, item.sourceRange.duration)
        result[result.length - 1] = createGap(mergedDuration)
        continue
      }
    }
    result.push(item)
  }

  return result
}

/**
 * Add a new track to the timeline
 */
export function addTrack(
  timeline: OTIOTimeline,
  kind: TrackKind,
  atIndex?: number
): OTIOTimeline {
  const existingTracks = getTracks(timeline, kind)
  const newIndex = existingTracks.length + 1
  const track = createTrack(kind, newIndex)

  const newChildren = [...timeline.tracks.children]

  if (atIndex !== undefined) {
    newChildren.splice(atIndex, 0, track)
  } else {
    // Add video tracks at beginning, audio at end
    if (kind === 'video') {
      const lastVideoIndex = newChildren.findLastIndex(t => t.kind === 'video')
      newChildren.splice(lastVideoIndex + 1, 0, track)
    } else {
      newChildren.push(track)
    }
  }

  return updateStack(timeline, { ...timeline.tracks, children: newChildren })
}

/**
 * Remove a track from the timeline
 */
export function removeTrack(timeline: OTIOTimeline, trackId: string): OTIOTimeline {
  const newChildren = timeline.tracks.children.filter(t => t.id !== trackId)
  return updateStack(timeline, { ...timeline.tracks, children: newChildren })
}

/**
 * Add a marker to the timeline
 */
export function addMarker(timeline: OTIOTimeline, marker: OTIOMarker): OTIOTimeline {
  return {
    ...timeline,
    markers: [...timeline.markers, marker],
  }
}

/**
 * Remove a marker from the timeline
 */
export function removeMarker(timeline: OTIOTimeline, markerId: string): OTIOTimeline {
  return {
    ...timeline,
    markers: timeline.markers.filter(m => m.id !== markerId),
  }
}

/**
 * Set a clip property
 */
export function setClipProperty(
  timeline: OTIOTimeline,
  clipId: string,
  property: 'volume' | 'name',
  value: unknown
): OTIOTimeline {
  const found = findClip(timeline, clipId)
  if (!found) {
    throw new Error(`Clip not found: ${clipId}`)
  }

  const { clip, track } = found
  const updatedClip = { ...clip, [property]: value }

  return updateTrack(timeline, track.id, t => {
    const newChildren = t.children.map(item =>
      item.id === clipId ? updatedClip : item
    )
    return updateTrackChildren(t, newChildren)
  })
}

// ============================================
// VALIDATION
// ============================================

/**
 * Check if timeline has any overlapping clips on the same track
 * (Should never happen with proper edit operations)
 */
export function hasOverlaps(_timeline: OTIOTimeline): boolean {
  // In our model, items are sequential on tracks, so overlaps are impossible
  // This is a sanity check
  return false
}

/**
 * Validate timeline integrity
 */
export function validateTimeline(timeline: OTIOTimeline): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check each track
  for (const track of timeline.tracks.children) {
    // Check for negative durations
    for (const item of track.children) {
      if (RT.isLessThanOrEqual(item.sourceRange.duration, RT.zero())) {
        errors.push(`Track ${track.name}: Item ${item.id} has non-positive duration`)
      }
    }

    // Check for clips with missing media references
    for (const item of track.children) {
      if (item.type === 'clip') {
        const clip = item as OTIOClip
        if (clip.mediaReference.type === 'missing') {
          errors.push(`Track ${track.name}: Clip ${clip.name} has missing media`)
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
