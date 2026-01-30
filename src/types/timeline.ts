// Timeline types for simplified video editor
// Single-track video timeline with clips referencing assets

// ============================================
// CORE TYPES
// ============================================

export interface ClipTransform {
  scale?: number        // 1 = 100%, 1.5 = 150%
  positionX?: number    // -1 to 1 (percentage offset)
  positionY?: number
}

export interface ClipAnimation {
  type: 'none' | 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down'
  startScale?: number
  endScale?: number
  startPosition?: { x: number; y: number }
  endPosition?: { x: number; y: number }
}

// A clip placed on the timeline
export interface TimelineClip {
  id: string
  projectId: string
  assetId: string
  trackId: string

  // Placement
  startTime: number     // when clip starts on timeline (seconds)
  duration: number      // how long it plays (seconds)
  inPoint: number       // where to start within asset (seconds)

  // Optional properties
  transform?: ClipTransform
  animation?: ClipAnimation
  volume?: number       // 0-1

  createdAt?: string
  updatedAt?: string
}

// Timeline is just an array of clips (single track for now)
export interface Timeline {
  clips: TimelineClip[]
}

// ============================================
// DATABASE TYPES
// ============================================

export interface TimelineClipRow {
  id: string
  project_id: string
  asset_id: string
  track_id: string
  start_time: number
  duration: number
  in_point: number
  transform: ClipTransform | null
  animation: ClipAnimation | null
  volume: number
  created_at: string
  updated_at: string
}

export interface TimelineClipInsert {
  id?: string
  project_id: string
  asset_id: string
  track_id?: string
  start_time: number
  duration: number
  in_point?: number
  transform?: ClipTransform
  animation?: ClipAnimation
  volume?: number
}

export interface TimelineClipUpdate {
  start_time?: number
  duration?: number
  in_point?: number
  track_id?: string
  transform?: ClipTransform
  animation?: ClipAnimation
  volume?: number
}

// ============================================
// EDIT OPERATIONS (for AI + UI)
// ============================================

export type TimelineEditOp =
  | AddClipOp
  | RemoveClipOp
  | MoveClipOp
  | TrimClipOp
  | SplitClipOp

export interface AddClipOp {
  type: 'add_clip'
  assetId: string
  startTime: number
  duration?: number     // defaults to asset duration or 5s for images
  inPoint?: number      // defaults to 0
  trackId?: string      // defaults to 'video-main'
}

export interface RemoveClipOp {
  type: 'remove_clip'
  clipId: string
}

export interface MoveClipOp {
  type: 'move_clip'
  clipId: string
  startTime: number
  trackId?: string      // optional track change
}

export interface TrimClipOp {
  type: 'trim_clip'
  clipId: string
  inPoint?: number
  duration?: number
}

export interface SplitClipOp {
  type: 'split_clip'
  clipId: string
  splitAt: number       // time on timeline where to split
}

export interface EditResult {
  success: boolean
  clip?: TimelineClip
  newClipId?: string    // for split operations
  error?: string
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Convert DB row to client type
export function clipFromRow(row: TimelineClipRow): TimelineClip {
  return {
    id: row.id,
    projectId: row.project_id,
    assetId: row.asset_id,
    trackId: row.track_id,
    startTime: row.start_time,
    duration: row.duration,
    inPoint: row.in_point,
    transform: row.transform || undefined,
    animation: row.animation || undefined,
    volume: row.volume,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Convert client type to DB insert
export function clipToInsert(clip: Omit<TimelineClip, 'id' | 'createdAt' | 'updatedAt'>): TimelineClipInsert {
  return {
    project_id: clip.projectId,
    asset_id: clip.assetId,
    track_id: clip.trackId,
    start_time: clip.startTime,
    duration: clip.duration,
    in_point: clip.inPoint,
    transform: clip.transform,
    animation: clip.animation,
    volume: clip.volume,
  }
}

// Get timeline end time
export function getTimelineEnd(clips: TimelineClip[]): number {
  if (clips.length === 0) return 0
  return Math.max(...clips.map(c => c.startTime + c.duration))
}

// Find clip at a given time
export function getClipAtTime(clips: TimelineClip[], time: number, trackId = 'video-main'): TimelineClip | null {
  return clips.find(c =>
    c.trackId === trackId &&
    time >= c.startTime &&
    time < c.startTime + c.duration
  ) || null
}

// Sort clips by start time
export function sortClips(clips: TimelineClip[]): TimelineClip[] {
  return [...clips].sort((a, b) => a.startTime - b.startTime)
}
