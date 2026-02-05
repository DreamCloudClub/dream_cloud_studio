/**
 * OTIO Serialization - JSON import/export
 *
 * Handles saving and loading timeline projects as JSON.
 */

import type {
  OTIOTimeline,
  OTIOProject,
  TimelineSettings,
  AssetMetadata,
} from './types'
import { DEFAULT_TIMELINE_SETTINGS } from './types'
import { getAllClips } from './timeline'

// ============================================
// PROJECT SERIALIZATION
// ============================================

/**
 * Serialize a timeline to a full project JSON
 */
export function serializeProject(
  timeline: OTIOTimeline,
  assets: AssetMetadata[] = []
): OTIOProject {
  const settings = (timeline.metadata.settings as TimelineSettings) || DEFAULT_TIMELINE_SETTINGS

  // Build asset lookup
  const assetMap: Record<string, AssetMetadata> = {}
  for (const asset of assets) {
    assetMap[asset.id] = asset
  }

  return {
    version: '1.0',
    settings,
    timeline,
    assets: assetMap,
  }
}

/**
 * Deserialize a project JSON to timeline and assets
 */
export function deserializeProject(json: string): OTIOProject {
  const data = JSON.parse(json)

  // Validate version
  if (data.version !== '1.0') {
    throw new Error(`Unsupported project version: ${data.version}`)
  }

  // Validate required fields
  if (!data.timeline) {
    throw new Error('Project missing timeline data')
  }

  return data as OTIOProject
}

/**
 * Serialize timeline to JSON string
 */
export function toJSON(timeline: OTIOTimeline, pretty: boolean = true): string {
  return JSON.stringify(timeline, null, pretty ? 2 : undefined)
}

/**
 * Parse timeline from JSON string
 */
export function fromJSON(json: string): OTIOTimeline {
  const data = JSON.parse(json)

  // Basic validation
  if (!data.id || !data.tracks) {
    throw new Error('Invalid timeline JSON: missing required fields')
  }

  return data as OTIOTimeline
}

// ============================================
// OTIO FORMAT (OpenTimelineIO native format)
// ============================================

/**
 * Convert to OTIO-compatible JSON format
 * This follows the official OTIO JSON schema more closely
 */
export function toOTIOFormat(timeline: OTIOTimeline): object {
  return {
    'OTIO_SCHEMA': 'Timeline.1',
    'name': timeline.name,
    'global_start_time': timeline.globalStartTime ? {
      'OTIO_SCHEMA': 'RationalTime.1',
      'value': timeline.globalStartTime.value,
      'rate': timeline.globalStartTime.rate,
    } : null,
    'tracks': {
      'OTIO_SCHEMA': 'Stack.1',
      'name': timeline.tracks.name,
      'children': timeline.tracks.children.map(track => ({
        'OTIO_SCHEMA': 'Track.1',
        'name': track.name,
        'kind': track.kind === 'video' ? 'Video' : 'Audio',
        'children': track.children.map(item => {
          if (item.type === 'clip') {
            return {
              'OTIO_SCHEMA': 'Clip.1',
              'name': item.name,
              'source_range': {
                'OTIO_SCHEMA': 'TimeRange.1',
                'start_time': {
                  'OTIO_SCHEMA': 'RationalTime.1',
                  'value': item.sourceRange.startTime.value,
                  'rate': item.sourceRange.startTime.rate,
                },
                'duration': {
                  'OTIO_SCHEMA': 'RationalTime.1',
                  'value': item.sourceRange.duration.value,
                  'rate': item.sourceRange.duration.rate,
                },
              },
              'media_reference': {
                'OTIO_SCHEMA': item.mediaReference.type === 'external'
                  ? 'ExternalReference.1'
                  : 'MissingReference.1',
                'target_url': item.mediaReference.type === 'external'
                  ? item.mediaReference.targetUrl
                  : undefined,
                'available_range': item.mediaReference.availableRange ? {
                  'OTIO_SCHEMA': 'TimeRange.1',
                  'start_time': {
                    'OTIO_SCHEMA': 'RationalTime.1',
                    'value': item.mediaReference.availableRange.startTime.value,
                    'rate': item.mediaReference.availableRange.startTime.rate,
                  },
                  'duration': {
                    'OTIO_SCHEMA': 'RationalTime.1',
                    'value': item.mediaReference.availableRange.duration.value,
                    'rate': item.mediaReference.availableRange.duration.rate,
                  },
                } : null,
              },
            }
          } else {
            // Gap
            return {
              'OTIO_SCHEMA': 'Gap.1',
              'name': item.name,
              'source_range': {
                'OTIO_SCHEMA': 'TimeRange.1',
                'start_time': {
                  'OTIO_SCHEMA': 'RationalTime.1',
                  'value': item.sourceRange.startTime.value,
                  'rate': item.sourceRange.startTime.rate,
                },
                'duration': {
                  'OTIO_SCHEMA': 'RationalTime.1',
                  'value': item.sourceRange.duration.value,
                  'rate': item.sourceRange.duration.rate,
                },
              },
            }
          }
        }),
      })),
    },
    'metadata': timeline.metadata,
  }
}

/**
 * Export timeline as OTIO JSON string
 */
export function exportOTIO(timeline: OTIOTimeline): string {
  return JSON.stringify(toOTIOFormat(timeline), null, 2)
}

// ============================================
// ASSET EXTRACTION
// ============================================

/**
 * Extract all asset references from a timeline
 */
export function extractAssetRefs(timeline: OTIOTimeline): string[] {
  const urls: string[] = []
  const clips = getAllClips(timeline)

  for (const clip of clips) {
    if (clip.mediaReference.type === 'external') {
      urls.push(clip.mediaReference.targetUrl)
    }
  }

  return [...new Set(urls)] // Deduplicate
}

/**
 * Collect asset metadata from timeline clips
 */
export function collectAssetMetadata(
  timeline: OTIOTimeline,
  assetLookup: (url: string) => AssetMetadata | undefined
): AssetMetadata[] {
  const urls = extractAssetRefs(timeline)
  const assets: AssetMetadata[] = []

  for (const url of urls) {
    const asset = assetLookup(url)
    if (asset) {
      assets.push(asset)
    }
  }

  return assets
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate JSON string is valid timeline format
 */
export function validateJSON(json: string): { valid: boolean; error?: string } {
  try {
    const data = JSON.parse(json)

    if (!data.id) {
      return { valid: false, error: 'Missing timeline ID' }
    }
    if (!data.tracks) {
      return { valid: false, error: 'Missing tracks' }
    }
    if (!data.tracks.children || !Array.isArray(data.tracks.children)) {
      return { valid: false, error: 'Invalid tracks structure' }
    }

    return { valid: true }
  } catch (e) {
    return { valid: false, error: `JSON parse error: ${e}` }
  }
}
