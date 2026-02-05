/**
 * OpenTimelineIO-compatible TypeScript type definitions
 *
 * These types follow the OTIO specification adapted for TypeScript.
 * Reference: https://opentimeline.io/
 */

// ============================================
// TIME TYPES
// ============================================

/**
 * RationalTime - Frame-accurate time representation
 * Stores time as a rational number (value/rate) to avoid floating-point errors
 */
export interface RationalTime {
  /** Frame count or time value numerator */
  value: number
  /** Frames per second (denominator) - default 30 */
  rate: number
}

/**
 * TimeRange - A span of time with start and duration
 */
export interface TimeRange {
  startTime: RationalTime
  duration: RationalTime
}

// ============================================
// MEDIA REFERENCES
// ============================================

export type MediaReferenceType = 'external' | 'embedded' | 'missing' | 'generator'

/**
 * Base interface for all media references
 */
export interface MediaReferenceBase {
  id: string
  type: MediaReferenceType
  /** Total available range of the source media */
  availableRange?: TimeRange
  metadata: Record<string, unknown>
}

/**
 * ExternalReference - Points to a file on disk or URL
 */
export interface ExternalReference extends MediaReferenceBase {
  type: 'external'
  /** File path or URL to the media */
  targetUrl: string
  /** Original filename */
  name?: string
  /** MIME type */
  mimeType?: string
}

/**
 * MissingReference - Placeholder for missing media
 */
export interface MissingReference extends MediaReferenceBase {
  type: 'missing'
  /** Original URL that is now missing */
  originalUrl?: string
  /** Reason for missing status */
  reason?: string
}

/**
 * GeneratorReference - Procedurally generated media (color bars, black, etc.)
 */
export interface GeneratorReference extends MediaReferenceBase {
  type: 'generator'
  /** Generator type: 'black', 'color', 'bars', 'tone' */
  generatorKind: 'black' | 'color' | 'bars' | 'tone' | 'silence'
  /** Generator parameters */
  parameters?: {
    color?: string
    frequency?: number
  }
}

export type MediaReference = ExternalReference | MissingReference | GeneratorReference

// ============================================
// TIMELINE ITEMS
// ============================================

export type ItemType = 'clip' | 'gap' | 'transition' | 'stack' | 'track'

/**
 * Base interface for all timeline items
 */
export interface ItemBase {
  id: string
  name: string
  type: ItemType
  metadata: Record<string, unknown>
}

/**
 * OTIOClip - A piece of media placed on the timeline
 */
export interface OTIOClip extends ItemBase {
  type: 'clip'
  /** Reference to source media */
  mediaReference: MediaReference
  /** Which portion of the source to use */
  sourceRange: TimeRange
  /** Audio volume 0-1 (V2: effects will replace this) */
  volume?: number
}

/**
 * OTIOGap - Empty space on a track (renders as black/silence)
 */
export interface OTIOGap extends ItemBase {
  type: 'gap'
  /** Duration of the gap */
  sourceRange: TimeRange
}

/**
 * OTIOTransition - Crossfade between clips (V2 - not implemented in V1)
 */
export interface OTIOTransition extends ItemBase {
  type: 'transition'
  transitionType: 'dissolve' | 'wipe' | 'fade'
  /** Duration of the transition */
  inOffset: RationalTime
  outOffset: RationalTime
}

/** Items that can be placed on a track */
export type TrackItem = OTIOClip | OTIOGap | OTIOTransition

// ============================================
// TRACKS AND CONTAINERS
// ============================================

export type TrackKind = 'video' | 'audio'

/**
 * OTIOTrack - Ordered sequence of clips, gaps, and transitions
 */
export interface OTIOTrack extends ItemBase {
  type: 'track'
  kind: TrackKind
  /** Ordered list of items on this track */
  children: TrackItem[]
  /** Track index (1-based, for display) */
  index: number
}

/**
 * OTIOStack - Layered composition of tracks
 * In a stack, higher tracks composite over lower tracks
 */
export interface OTIOStack extends ItemBase {
  type: 'stack'
  /** Tracks in this stack (index 0 = bottom/background) */
  children: OTIOTrack[]
}

// ============================================
// MARKERS
// ============================================

export type MarkerColor = 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'blue' | 'purple' | 'pink' | 'white'

/**
 * OTIOMarker - Named annotation on the timeline
 */
export interface OTIOMarker {
  id: string
  name: string
  /** Position and optional duration of the marker */
  markedRange: TimeRange
  color: MarkerColor
  metadata: Record<string, unknown>
}

// ============================================
// TIMELINE
// ============================================

/**
 * OTIOTimeline - Top-level container for a project's timeline
 */
export interface OTIOTimeline {
  /** Unique identifier */
  id: string
  /** Project/timeline name */
  name: string
  /** OTIO schema version for compatibility */
  schemaVersion: string
  /** Global start time offset (usually 0) */
  globalStartTime?: RationalTime
  /** The main stack containing all tracks */
  tracks: OTIOStack
  /** Timeline-level markers */
  markers: OTIOMarker[]
  /** Arbitrary metadata */
  metadata: Record<string, unknown>
}

// ============================================
// PROJECT SETTINGS
// ============================================

/**
 * TimelineSettings - Configuration for the timeline
 */
export interface TimelineSettings {
  /** Frames per second */
  frameRate: number
  /** Output width in pixels */
  width: number
  /** Output height in pixels */
  height: number
  /** Sample rate for audio (Hz) */
  sampleRate: number
  /** Audio channels */
  audioChannels: number
}

export const DEFAULT_TIMELINE_SETTINGS: TimelineSettings = {
  frameRate: 30,
  width: 1920,
  height: 1080,
  sampleRate: 48000,
  audioChannels: 2,
}

// ============================================
// EDIT OPERATIONS
// ============================================

export interface InsertClipOp {
  type: 'insert_clip'
  trackId: string
  clip: Omit<OTIOClip, 'id' | 'type'>
  /** Where to insert on the timeline */
  insertTime: RationalTime
}

export interface TrimClipOp {
  type: 'trim_clip'
  clipId: string
  /** Which edge to trim */
  edge: 'start' | 'end'
  /** Change in time (positive = extend, negative = shorten) */
  delta: RationalTime
}

export interface MoveClipOp {
  type: 'move_clip'
  clipId: string
  /** Target track (if changing tracks) */
  targetTrackId?: string
  /** New start time on timeline */
  targetTime: RationalTime
}

export interface SplitClipOp {
  type: 'split_clip'
  clipId: string
  /** Timeline time where to make the cut */
  splitTime: RationalTime
}

export interface DeleteClipOp {
  type: 'delete_clip'
  clipId: string
  /** If true, shift subsequent clips back */
  ripple: boolean
}

export interface SetClipPropertyOp {
  type: 'set_clip_property'
  clipId: string
  property: 'volume' | 'name'
  value: unknown
}

export interface AddTrackOp {
  type: 'add_track'
  kind: TrackKind
  /** Insert at this index (undefined = end) */
  index?: number
}

export interface RemoveTrackOp {
  type: 'remove_track'
  trackId: string
}

export interface AddMarkerOp {
  type: 'add_marker'
  marker: Omit<OTIOMarker, 'id'>
}

export interface RemoveMarkerOp {
  type: 'remove_marker'
  markerId: string
}

/** Union of all edit operation types */
export type TimelineEditOp =
  | InsertClipOp
  | TrimClipOp
  | MoveClipOp
  | SplitClipOp
  | DeleteClipOp
  | SetClipPropertyOp
  | AddTrackOp
  | RemoveTrackOp
  | AddMarkerOp
  | RemoveMarkerOp

// ============================================
// OPERATION RESULTS
// ============================================

export interface EditResult {
  success: boolean
  /** The modified timeline (if successful) */
  timeline?: OTIOTimeline
  /** ID of newly created item (for insert/split) */
  newItemId?: string
  /** Error message (if failed) */
  error?: string
}

// ============================================
// SERIALIZATION
// ============================================

/** The full serializable project format */
export interface OTIOProject {
  version: '1.0'
  settings: TimelineSettings
  timeline: OTIOTimeline
  /** Assets indexed by ID for quick lookup */
  assets: Record<string, AssetMetadata>
}

/** Metadata about an asset (for project file) */
export interface AssetMetadata {
  id: string
  name: string
  type: 'video' | 'audio' | 'image'
  url: string
  localPath?: string
  duration?: number
  width?: number
  height?: number
  mimeType?: string
}
