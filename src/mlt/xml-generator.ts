/**
 * MLT XML Generator - Convert OTIO timeline to MLT XML format
 *
 * MLT XML is the native format for the MLT multimedia framework,
 * used by Kdenlive and other video editors.
 *
 * Reference: https://www.mltframework.org/docs/
 */

import type {
  OTIOTimeline,
  OTIOTrack,
  OTIOClip,
  OTIOGap,
  TrackItem,
  TimelineSettings,
} from '@/otio/types'
import * as RT from '@/otio/rational-time'
import { getSettings, getTracks, getTimelineDuration } from '@/otio/timeline'
import type { MLTProfile } from './types'

// ============================================
// XML GENERATION
// ============================================

/**
 * Generate MLT XML from OTIO timeline
 */
export function generateMLTXML(
  timeline: OTIOTimeline,
  profile: MLTProfile = {
    description: 'HD 1080p 30fps',
    width: 1920,
    height: 1080,
    frameRateNum: 30,
    frameRateDen: 1,
    sampleRate: 48000,
    channels: 2,
    progressive: true,
  }
): string {
  const settings = getSettings(timeline)
  const producers = collectProducers(timeline)
  const videoTracks = getTracks(timeline, 'video')
  const audioTracks = getTracks(timeline, 'audio')

  const totalDuration = getTimelineDuration(timeline)
  const totalFrames = RT.toFrames(totalDuration)

  const xml: string[] = []

  // XML header
  xml.push('<?xml version="1.0" encoding="utf-8"?>')
  xml.push(`<mlt LC_NUMERIC="C" version="7.0.0" producer="main_bin">`)

  // Profile
  xml.push('')
  xml.push('  <!-- Profile -->')
  xml.push(`  <profile`)
  xml.push(`    description="${escapeXml(profile.description)}"`)
  xml.push(`    width="${profile.width}"`)
  xml.push(`    height="${profile.height}"`)
  xml.push(`    frame_rate_num="${profile.frameRateNum}"`)
  xml.push(`    frame_rate_den="${profile.frameRateDen}"`)
  xml.push(`    sample_aspect_num="1"`)
  xml.push(`    sample_aspect_den="1"`)
  xml.push(`    progressive="${profile.progressive ? 1 : 0}"`)
  xml.push(`  />`)

  // Producers (source media)
  xml.push('')
  xml.push('  <!-- Producers (Source Media) -->')
  for (const [producerId, producer] of Object.entries(producers)) {
    xml.push(generateProducerXML(producerId, producer, settings))
  }

  // Black producer for gaps
  xml.push('')
  xml.push('  <!-- Black/Silence for gaps -->')
  xml.push(`  <producer id="black">`)
  xml.push(`    <property name="mlt_service">color</property>`)
  xml.push(`    <property name="resource">black</property>`)
  xml.push(`    <property name="length">${totalFrames}</property>`)
  xml.push(`  </producer>`)

  // Video track playlists
  xml.push('')
  xml.push('  <!-- Video Tracks -->')
  for (let i = 0; i < videoTracks.length; i++) {
    xml.push(generatePlaylistXML(videoTracks[i], `video_track_${i + 1}`, producers, settings))
  }

  // Audio track playlists
  xml.push('')
  xml.push('  <!-- Audio Tracks -->')
  for (let i = 0; i < audioTracks.length; i++) {
    xml.push(generatePlaylistXML(audioTracks[i], `audio_track_${i + 1}`, producers, settings))
  }

  // Main tractor (combines all tracks)
  xml.push('')
  xml.push('  <!-- Main Tractor (Timeline) -->')
  xml.push('  <tractor id="main">')
  xml.push('    <multitrack>')

  // Add video tracks (bottom to top)
  for (let i = 0; i < videoTracks.length; i++) {
    xml.push(`      <track producer="video_track_${i + 1}"/>`)
  }

  // Add audio tracks
  for (let i = 0; i < audioTracks.length; i++) {
    xml.push(`      <track producer="audio_track_${i + 1}" hide="video"/>`)
  }

  xml.push('    </multitrack>')
  xml.push('  </tractor>')

  xml.push('')
  xml.push('</mlt>')

  return xml.join('\n')
}

// ============================================
// PRODUCER GENERATION
// ============================================

interface ProducerInfo {
  url: string
  type: 'video' | 'audio' | 'image'
  availableDuration?: number // in frames
}

/**
 * Collect all unique media sources as producers
 */
function collectProducers(timeline: OTIOTimeline): Record<string, ProducerInfo> {
  const producers: Record<string, ProducerInfo> = {}
  const settings = getSettings(timeline)

  for (const track of timeline.tracks.children) {
    for (const item of track.children) {
      if (item.type !== 'clip') continue

      const clip = item as OTIOClip
      if (clip.mediaReference.type !== 'external') continue

      const producerId = `producer_${sanitizeId(clip.mediaReference.id)}`

      if (!producers[producerId]) {
        const url = clip.mediaReference.targetUrl

        // Determine media type from URL or track kind
        let type: 'video' | 'audio' | 'image' = 'video'
        if (track.kind === 'audio') {
          type = 'audio'
        } else if (isImageUrl(url)) {
          type = 'image'
        }

        const availableDuration = clip.mediaReference.availableRange
          ? RT.toFrames(clip.mediaReference.availableRange.duration)
          : undefined

        producers[producerId] = {
          url,
          type,
          availableDuration,
        }
      }
    }
  }

  return producers
}

/**
 * Generate XML for a single producer
 */
function generateProducerXML(
  producerId: string,
  producer: ProducerInfo,
  settings: TimelineSettings
): string {
  const lines: string[] = []

  // Convert URL to file path if it's a file:// URL
  const resource = producer.url.startsWith('file://')
    ? producer.url.slice(7)
    : producer.url

  if (producer.type === 'image') {
    // Images need special handling - specify length for duration
    const length = producer.availableDuration || (5 * settings.frameRate) // Default 5 seconds
    lines.push(`  <producer id="${producerId}">`)
    lines.push(`    <property name="mlt_service">qimage</property>`)
    lines.push(`    <property name="resource">${escapeXml(resource)}</property>`)
    lines.push(`    <property name="length">${length}</property>`)
    lines.push(`  </producer>`)
  } else {
    // Video/Audio
    const outFrame = producer.availableDuration
      ? producer.availableDuration - 1
      : undefined

    lines.push(`  <producer id="${producerId}" in="00:00:00.000"${outFrame ? ` out="${framesToTimecode(outFrame, settings.frameRate)}"` : ''}>`)
    lines.push(`    <property name="mlt_service">avformat</property>`)
    lines.push(`    <property name="resource">${escapeXml(resource)}</property>`)
    lines.push(`  </producer>`)
  }

  return lines.join('\n')
}

// ============================================
// PLAYLIST GENERATION
// ============================================

/**
 * Generate XML for a track playlist
 */
function generatePlaylistXML(
  track: OTIOTrack,
  playlistId: string,
  producers: Record<string, ProducerInfo>,
  settings: TimelineSettings
): string {
  const lines: string[] = []

  lines.push(`  <playlist id="${playlistId}">`)

  for (const item of track.children) {
    if (item.type === 'gap') {
      // Gap - use blank or black producer
      const gap = item as OTIOGap
      const frames = RT.toFrames(gap.sourceRange.duration)
      lines.push(`    <blank length="${frames}"/>`)
    } else if (item.type === 'clip') {
      const clip = item as OTIOClip

      if (clip.mediaReference.type !== 'external') {
        // Missing or generator reference - use black
        const frames = RT.toFrames(clip.sourceRange.duration)
        lines.push(`    <entry producer="black" in="00:00:00.000" out="${framesToTimecode(frames - 1, settings.frameRate)}"/>`)
        continue
      }

      const producerId = `producer_${sanitizeId(clip.mediaReference.id)}`

      // Calculate in/out points
      const inFrame = RT.toFrames(clip.sourceRange.startTime)
      const durationFrames = RT.toFrames(clip.sourceRange.duration)
      const outFrame = inFrame + durationFrames - 1

      const inTC = framesToTimecode(inFrame, settings.frameRate)
      const outTC = framesToTimecode(outFrame, settings.frameRate)

      lines.push(`    <entry producer="${producerId}" in="${inTC}" out="${outTC}"/>`)
    }
  }

  lines.push(`  </playlist>`)

  return lines.join('\n')
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Escape special characters for XML
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Sanitize ID for use in XML
 */
function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_')
}

/**
 * Check if URL points to an image file
 */
function isImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff']
  const lowerUrl = url.toLowerCase()
  return imageExtensions.some(ext => lowerUrl.endsWith(ext))
}

/**
 * Convert frame count to MLT timecode string (HH:MM:SS.mmm)
 */
function framesToTimecode(frames: number, frameRate: number): string {
  const totalSeconds = frames / frameRate
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const millis = Math.round((totalSeconds % 1) * 1000)

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(millis, 3)}`
}

function pad(n: number, width: number = 2): string {
  return n.toString().padStart(width, '0')
}

// ============================================
// EXPORT HELPERS
// ============================================

/**
 * Generate MLT XML for a specific portion of the timeline
 */
export function generateMLTXMLForRange(
  timeline: OTIOTimeline,
  startFrame: number,
  endFrame: number,
  profile?: MLTProfile
): string {
  // For now, generate full XML and let melt handle the range
  // Future: optimize by only including relevant clips
  return generateMLTXML(timeline, profile)
}

/**
 * Validate generated MLT XML (basic checks)
 */
export function validateMLTXML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check for required elements
  if (!xml.includes('<mlt')) {
    errors.push('Missing <mlt> root element')
  }
  if (!xml.includes('<tractor')) {
    errors.push('Missing <tractor> element')
  }

  // Check for valid XML structure (basic)
  try {
    // In browser, use DOMParser; in Node, this would need xml2js or similar
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser()
      const doc = parser.parseFromString(xml, 'application/xml')
      const parseError = doc.querySelector('parsererror')
      if (parseError) {
        errors.push(`XML parse error: ${parseError.textContent}`)
      }
    }
  } catch (e) {
    errors.push(`XML validation error: ${e}`)
  }

  return { valid: errors.length === 0, errors }
}
