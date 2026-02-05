/**
 * MLT Types - Types specific to MLT XML generation and rendering
 */

// ============================================
// MLT XML STRUCTURE
// ============================================

export interface MLTProfile {
  description: string
  width: number
  height: number
  frameRateNum: number
  frameRateDen: number
  sampleRate: number
  channels: number
  progressive: boolean
}

export const DEFAULT_MLT_PROFILE: MLTProfile = {
  description: 'HD 1080p 30fps',
  width: 1920,
  height: 1080,
  frameRateNum: 30,
  frameRateDen: 1,
  sampleRate: 48000,
  channels: 2,
  progressive: true,
}

export const PREVIEW_MLT_PROFILE: MLTProfile = {
  description: 'Preview 540p 30fps',
  width: 960,
  height: 540,
  frameRateNum: 30,
  frameRateDen: 1,
  sampleRate: 48000,
  channels: 2,
  progressive: true,
}

// ============================================
// RENDER OPTIONS
// ============================================

export type RenderPreset = 'preview' | 'draft' | 'high' | 'master'

export interface RenderOptions {
  /** Output file path */
  outputPath: string
  /** Quality preset */
  preset: RenderPreset
  /** Custom profile override */
  profile?: Partial<MLTProfile>
  /** Video codec */
  videoCodec?: string
  /** Audio codec */
  audioCodec?: string
  /** Video bitrate (for bitrate-based encoding) */
  videoBitrate?: string
  /** Audio bitrate */
  audioBitrate?: string
  /** CRF value (for quality-based encoding) */
  crf?: number
  /** Start frame (for partial render) */
  startFrame?: number
  /** End frame (for partial render) */
  endFrame?: number
}

export const RENDER_PRESETS: Record<RenderPreset, Partial<RenderOptions>> = {
  preview: {
    profile: PREVIEW_MLT_PROFILE,
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '128k',
    crf: 28,
  },
  draft: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '192k',
    crf: 23,
  },
  high: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '320k',
    crf: 18,
  },
  master: {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '320k',
    crf: 15,
  },
}

// ============================================
// RENDER PROGRESS
// ============================================

export type RenderStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface RenderProgress {
  status: RenderStatus
  /** Current frame being rendered */
  currentFrame: number
  /** Total frames to render */
  totalFrames: number
  /** Progress percentage 0-100 */
  percentage: number
  /** Estimated time remaining in seconds */
  estimatedRemaining?: number
  /** Render speed (frames per second) */
  fps?: number
  /** Error message if failed */
  error?: string
  /** Output file path when completed */
  outputPath?: string
}

export interface RenderJob {
  id: string
  status: RenderStatus
  options: RenderOptions
  progress: RenderProgress
  startedAt?: Date
  completedAt?: Date
  mltXmlPath?: string
}

// ============================================
// MLT SERVICE TYPES
// ============================================

export interface MLTServiceConfig {
  /** Path to melt binary */
  meltPath: string
  /** Temporary directory for intermediate files */
  tempDir: string
  /** Whether melt is available on the system */
  available: boolean
}

export interface MeltCheckResult {
  available: boolean
  version?: string
  path?: string
  error?: string
}
