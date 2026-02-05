/**
 * Migration - Convert legacy timeline format to OTIO
 *
 * Converts the existing TimelineClip format from src/types/timeline.ts
 * to the new OTIO-based format.
 */

import type { TimelineClip, EmbeddedAsset } from '@/types/timeline'
import type {
  OTIOTimeline,
  OTIOTrack,
  OTIOClip,
  OTIOGap,
  TrackItem,
  ExternalReference,
  TimeRange,
  TimelineSettings,
  TrackKind,
} from './types'
import * as RT from './rational-time'
import { createTimeline, createTrack, createClip, createGap, createExternalRef } from './timeline'
import { v4 as uuidv4 } from 'uuid'

// ============================================
// LEGACY FORMAT TYPES (for reference)
// ============================================

interface LegacyClip {
  id: string
  projectId: string
  assetId: string
  trackId: string
  startTime: number      // seconds
  duration: number       // seconds
  inPoint: number        // seconds
  volume?: number
  embeddedAsset?: EmbeddedAsset
}

// ============================================
// MIGRATION
// ============================================

/**
 * Convert legacy timeline clips to OTIO format
 *
 * @param clips - Array of legacy TimelineClip objects
 * @param projectName - Name for the new timeline
 * @param settings - Timeline settings (frame rate, resolution)
 */
export function migrateFromLegacy(
  clips: TimelineClip[],
  projectName: string = 'Migrated Timeline',
  settings: Partial<TimelineSettings> = {}
): OTIOTimeline {
  const frameRate = settings.frameRate ?? 30

  // Create base timeline
  const timeline = createTimeline(projectName, settings)

  // Group clips by track
  const clipsByTrack = groupClipsByTrack(clips)

  // Build tracks
  const tracks: OTIOTrack[] = []

  // Process video tracks
  const videoTrackIds = Array.from(clipsByTrack.keys())
    .filter(id => id.startsWith('video-'))
    .sort()

  for (let i = 0; i < videoTrackIds.length; i++) {
    const trackId = videoTrackIds[i]
    const trackClips = clipsByTrack.get(trackId) || []
    const track = buildTrackFromClips(trackClips, 'video', i + 1, frameRate)
    tracks.push(track)
  }

  // Ensure at least one video track
  if (tracks.filter(t => t.kind === 'video').length === 0) {
    tracks.push(createTrack('video', 1))
  }

  // Process audio tracks
  const audioTrackIds = Array.from(clipsByTrack.keys())
    .filter(id => id.startsWith('audio-'))
    .sort()

  for (let i = 0; i < audioTrackIds.length; i++) {
    const trackId = audioTrackIds[i]
    const trackClips = clipsByTrack.get(trackId) || []
    const track = buildTrackFromClips(trackClips, 'audio', i + 1, frameRate)
    tracks.push(track)
  }

  // Ensure at least one audio track
  if (tracks.filter(t => t.kind === 'audio').length === 0) {
    tracks.push(createTrack('audio', 1))
  }

  // Return timeline with migrated tracks
  return {
    ...timeline,
    tracks: {
      ...timeline.tracks,
      children: tracks,
    },
  }
}

/**
 * Group clips by their track ID
 */
function groupClipsByTrack(clips: TimelineClip[]): Map<string, TimelineClip[]> {
  const byTrack = new Map<string, TimelineClip[]>()

  for (const clip of clips) {
    // Normalize track ID
    let trackId = clip.trackId || 'video-1'
    if (trackId === 'video-main') {
      trackId = 'video-1'
    }

    if (!byTrack.has(trackId)) {
      byTrack.set(trackId, [])
    }
    byTrack.get(trackId)!.push(clip)
  }

  return byTrack
}

/**
 * Build an OTIO track from legacy clips
 * Handles gaps between clips and sorts by start time
 */
function buildTrackFromClips(
  clips: TimelineClip[],
  kind: TrackKind,
  index: number,
  frameRate: number
): OTIOTrack {
  // Sort by start time
  const sorted = [...clips].sort((a, b) => a.startTime - b.startTime)

  const children: TrackItem[] = []
  let currentTime = 0

  for (const legacyClip of sorted) {
    // Add gap if there's space before this clip
    if (legacyClip.startTime > currentTime) {
      const gapDuration = legacyClip.startTime - currentTime
      const gap = createGap(RT.fromSeconds(gapDuration, frameRate))
      children.push(gap)
    }

    // Convert the clip
    const otioClip = convertClip(legacyClip, frameRate)
    children.push(otioClip)

    currentTime = legacyClip.startTime + legacyClip.duration
  }

  const prefix = kind === 'video' ? 'V' : 'A'
  return {
    id: uuidv4(),
    name: `${prefix}${index}`,
    type: 'track',
    kind,
    children,
    index,
    metadata: {},
  }
}

/**
 * Convert a single legacy clip to OTIO format
 */
function convertClip(legacyClip: TimelineClip, frameRate: number): OTIOClip {
  // Get media URL from embedded asset or construct placeholder
  const mediaUrl = legacyClip.embeddedAsset?.url ||
    legacyClip.embeddedAsset?.localPath ||
    `asset://${legacyClip.assetId}`

  const mediaName = legacyClip.embeddedAsset?.name || `Asset ${legacyClip.assetId}`

  // Determine media duration if available
  const mediaDuration = legacyClip.embeddedAsset?.duration

  // Create media reference
  const mediaRef: ExternalReference = {
    id: legacyClip.assetId,
    type: 'external',
    targetUrl: mediaUrl,
    name: mediaName,
    availableRange: mediaDuration ? {
      startTime: RT.zero(frameRate),
      duration: RT.fromSeconds(mediaDuration, frameRate),
    } : undefined,
    metadata: {
      legacyAssetId: legacyClip.assetId,
      assetType: legacyClip.embeddedAsset?.type,
      category: legacyClip.embeddedAsset?.category,
    },
  }

  // Source range (which part of the source we're using)
  const sourceRange: TimeRange = {
    startTime: RT.fromSeconds(legacyClip.inPoint, frameRate),
    duration: RT.fromSeconds(legacyClip.duration, frameRate),
  }

  return {
    id: legacyClip.id,
    name: mediaName,
    type: 'clip',
    mediaReference: mediaRef,
    sourceRange,
    volume: legacyClip.volume ?? 1.0,
    metadata: {
      legacyClipId: legacyClip.id,
      legacyProjectId: legacyClip.projectId,
    },
  }
}

// ============================================
// REVERSE MIGRATION (OTIO -> Legacy)
// ============================================

/**
 * Convert OTIO timeline back to legacy format
 * Useful for maintaining backward compatibility during transition
 */
export function toLegacyFormat(
  timeline: OTIOTimeline,
  projectId: string
): TimelineClip[] {
  const clips: TimelineClip[] = []

  for (const track of timeline.tracks.children) {
    let currentTime = 0

    for (const item of track.children) {
      if (item.type === 'clip') {
        const clip = item as OTIOClip

        // Extract asset info from media reference
        const assetId = clip.mediaReference.id ||
          (clip.metadata.legacyAssetId as string) ||
          uuidv4()

        // Build embedded asset from metadata
        const embeddedAsset: EmbeddedAsset | undefined = clip.mediaReference.type === 'external'
          ? {
              id: assetId,
              name: clip.mediaReference.name || clip.name,
              type: (clip.metadata.assetType as EmbeddedAsset['type']) || 'video',
              category: clip.metadata.category as string,
              url: clip.mediaReference.targetUrl,
              storageType: clip.mediaReference.targetUrl.startsWith('file://') ? 'local' : 'cloud',
              duration: clip.mediaReference.availableRange
                ? RT.toSeconds(clip.mediaReference.availableRange.duration)
                : undefined,
            }
          : undefined

        const legacyClip: TimelineClip = {
          id: clip.id,
          projectId,
          assetId,
          trackId: mapTrackIdToLegacy(track),
          startTime: currentTime,
          duration: RT.toSeconds(clip.sourceRange.duration),
          inPoint: RT.toSeconds(clip.sourceRange.startTime),
          volume: clip.volume,
          embeddedAsset,
        }

        clips.push(legacyClip)
      }

      // Advance time
      currentTime += RT.toSeconds(item.sourceRange.duration)
    }
  }

  return clips
}

/**
 * Map OTIO track to legacy track ID
 */
function mapTrackIdToLegacy(track: OTIOTrack): string {
  if (track.kind === 'video') {
    return track.index === 1 ? 'video-main' : `video-${track.index}`
  }
  return `audio-${track.index}`
}

// ============================================
// INCREMENTAL SYNC
// ============================================

/**
 * Apply a legacy clip change to an OTIO timeline
 * Used during transition period when both formats coexist
 */
export function applyLegacyChange(
  timeline: OTIOTimeline,
  change: {
    type: 'add' | 'update' | 'delete'
    clip?: TimelineClip
    clipId?: string
  },
  frameRate: number = 30
): OTIOTimeline {
  // This is a simplified implementation
  // Full implementation would handle all edit types

  if (change.type === 'delete' && change.clipId) {
    // Remove clip from timeline
    const newTracks = timeline.tracks.children.map(track => ({
      ...track,
      children: track.children.filter(item => item.id !== change.clipId),
    }))

    return {
      ...timeline,
      tracks: {
        ...timeline.tracks,
        children: newTracks,
      },
    }
  }

  // For add/update, just re-migrate entire timeline
  // (In production, we'd do incremental updates)
  return timeline
}
