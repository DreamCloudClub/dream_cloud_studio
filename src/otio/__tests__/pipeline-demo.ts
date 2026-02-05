/**
 * End-to-end pipeline demo: Create Timeline -> Add Clips -> Generate MLT XML
 *
 * This file validates the complete OTIO -> MLT pipeline works correctly.
 * Run with: npx tsx src/otio/__tests__/pipeline-demo.ts
 */

import {
  createTimeline,
  createClip,
  createExternalRef,
  insertClip,
  appendClip,
  splitClip,
  trimClip,
  deleteClip,
  moveClip,
  addTrack,
  getAllClips,
  getTracks,
  getTimelineDuration,
  getClipPosition,
  findClip,
  toJSON,
  fromJSON,
  exportOTIO,
  validateTimeline,
} from '../index'
import * as RT from '../rational-time'
import { generateMLTXML, validateMLTXML } from '../../mlt/xml-generator'

// ============================================
// 1. CREATE EMPTY TIMELINE
// ============================================

console.log('=== Step 1: Create Empty Timeline ===')

let timeline = createTimeline('Demo Project', {
  frameRate: 30,
  width: 1920,
  height: 1080,
})

console.log(`Timeline: ${timeline.name}`)
console.log(`Tracks: ${getTracks(timeline).length}`)
console.log(`  Video: ${getTracks(timeline, 'video').length}`)
console.log(`  Audio: ${getTracks(timeline, 'audio').length}`)
console.log(`Duration: ${RT.toSeconds(getTimelineDuration(timeline))}s`)
console.log()

// ============================================
// 2. CREATE MEDIA REFERENCES
// ============================================

console.log('=== Step 2: Create Media References ===')

const videoRef = createExternalRef(
  'file:///home/user/videos/intro.mp4',
  'Intro Video',
  RT.rangeFromSeconds(0, 30, 30),  // 30 second source
  'video/mp4'
)

const imageRef = createExternalRef(
  'file:///home/user/images/title-card.png',
  'Title Card',
  RT.rangeFromSeconds(0, 5, 30),   // 5 second default for images
  'image/png'
)

const audioRef = createExternalRef(
  'file:///home/user/audio/bgm.mp3',
  'Background Music',
  RT.rangeFromSeconds(0, 120, 30), // 2 minute audio
  'audio/mpeg'
)

const brollRef = createExternalRef(
  'file:///home/user/videos/broll-cityscape.mp4',
  'B-Roll Cityscape',
  RT.rangeFromSeconds(0, 15, 30),  // 15 second clip
  'video/mp4'
)

console.log('Created 4 media references')
console.log()

// ============================================
// 3. ADD CLIPS TO TIMELINE
// ============================================

console.log('=== Step 3: Add Clips ===')

// Get video track 1
const videoTrackId = getTracks(timeline, 'video')[0].id
const audioTrackId = getTracks(timeline, 'audio')[0].id

// Add title card (5 seconds)
const titleClip = createClip(
  'Title Card',
  imageRef,
  RT.rangeFromSeconds(0, 5, 30),
  1.0
)
timeline = insertClip(timeline, videoTrackId, titleClip, RT.fromSeconds(0))
console.log(`Added: Title Card at 0s (5s duration)`)

// Append intro video (use first 10 seconds)
const introClip = createClip(
  'Intro Video',
  videoRef,
  RT.rangeFromSeconds(0, 10, 30),
  1.0
)
timeline = appendClip(timeline, videoTrackId, introClip)
console.log(`Appended: Intro Video (10s duration)`)

// Append B-roll (use 8 seconds starting at 3s)
const brollClip = createClip(
  'B-Roll Cityscape',
  brollRef,
  RT.rangeFromSeconds(3, 8, 30),
  1.0
)
timeline = appendClip(timeline, videoTrackId, brollClip)
console.log(`Appended: B-Roll Cityscape (8s from source 3s)`)

// Add background music on audio track
const bgmClip = createClip(
  'Background Music',
  audioRef,
  RT.rangeFromSeconds(0, 23, 30),  // Match total video length
  0.7  // 70% volume
)
timeline = insertClip(timeline, audioTrackId, bgmClip, RT.fromSeconds(0))
console.log(`Added: Background Music at 0s (23s, 70% volume)`)

console.log(`\nTotal clips: ${getAllClips(timeline).length}`)
console.log(`Duration: ${RT.toSeconds(getTimelineDuration(timeline))}s`)
console.log()

// ============================================
// 4. EDIT OPERATIONS
// ============================================

console.log('=== Step 4: Edit Operations ===')

// Split the intro clip at 7 seconds (timeline time)
const introClipFound = findClip(timeline, introClip.id)
if (introClipFound) {
  const introStart = RT.toSeconds(
    RT.fromSeconds(5, 30) // title card is 5s, intro starts at 5s
  )
  console.log(`Intro clip position: ${introStart}s`)

  // Split at 12s (7s into the 10s intro clip which starts at 5s)
  const splitResult = splitClip(timeline, introClip.id, RT.fromSeconds(12, 30))
  timeline = splitResult.timeline
  console.log(`Split intro clip at 12s -> new clip ID: ${splitResult.newClipId.slice(0, 8)}...`)
}

// Trim the B-roll clip (shorten by 2 seconds from end)
const brollFound = findClip(timeline, brollClip.id)
if (brollFound) {
  timeline = trimClip(timeline, brollClip.id, 'end', RT.fromSeconds(-2, 30))
  console.log(`Trimmed B-roll: -2s from end`)
}

// Show updated state
console.log(`\nAfter edits:`)
console.log(`Total clips: ${getAllClips(timeline).length}`)
console.log(`Duration: ${RT.toSeconds(getTimelineDuration(timeline))}s`)
console.log()

// ============================================
// 5. VALIDATE TIMELINE
// ============================================

console.log('=== Step 5: Validate Timeline ===')

const validation = validateTimeline(timeline)
console.log(`Valid: ${validation.valid}`)
if (validation.errors.length > 0) {
  console.log(`Errors: ${validation.errors.join(', ')}`)
}
console.log()

// ============================================
// 6. SERIALIZE TO JSON
// ============================================

console.log('=== Step 6: Serialize ===')

const json = toJSON(timeline)
console.log(`JSON size: ${json.length} bytes`)

// Round-trip test
const restored = fromJSON(json)
console.log(`Round-trip: ${getAllClips(restored).length} clips restored`)
console.log(`Duration match: ${RT.toSeconds(getTimelineDuration(restored))}s`)

// Export as OTIO format
const otio = exportOTIO(timeline)
console.log(`OTIO format size: ${otio.length} bytes`)
console.log()

// ============================================
// 7. GENERATE MLT XML
// ============================================

console.log('=== Step 7: Generate MLT XML ===')

const mltXml = generateMLTXML(timeline)
console.log(`MLT XML size: ${mltXml.length} bytes`)

// Print the XML
console.log('\n--- MLT XML Output ---')
console.log(mltXml)
console.log('--- End MLT XML ---')

// Validate XML
const xmlValidation = validateMLTXML(mltXml)
console.log(`\nXML valid: ${xmlValidation.valid}`)
if (xmlValidation.errors.length > 0) {
  console.log(`XML errors: ${xmlValidation.errors.join(', ')}`)
}
console.log()

// ============================================
// 8. PRINT TIMELINE SUMMARY
// ============================================

console.log('=== Timeline Summary ===')
console.log(`Name: ${timeline.name}`)
console.log(`Duration: ${RT.toHumanDuration(getTimelineDuration(timeline))}`)

for (const track of getTracks(timeline)) {
  console.log(`\n  Track: ${track.name} (${track.kind})`)
  let time = 0
  for (const item of track.children) {
    const dur = RT.toSeconds(item.sourceRange.duration)
    if (item.type === 'clip') {
      const srcStart = RT.toSeconds(item.sourceRange.startTime)
      console.log(`    [${time.toFixed(1)}s] ${item.name} (${dur.toFixed(1)}s, src@${srcStart.toFixed(1)}s)`)
    } else if (item.type === 'gap') {
      console.log(`    [${time.toFixed(1)}s] (gap ${dur.toFixed(1)}s)`)
    }
    time += dur
  }
}

console.log('\n=== Pipeline Demo Complete ===')
