/**
 * MLT Render Service - Interface to melt CLI for rendering
 *
 * This service handles:
 * - Checking melt availability
 * - Generating MLT XML
 * - Invoking melt for rendering
 * - Progress tracking
 * - Error handling
 */

import { invoke } from '@tauri-apps/api/core'
import type { OTIOTimeline } from '@/otio/types'
import { getTimelineDuration } from '@/otio/timeline'
import * as RT from '@/otio/rational-time'
import { generateMLTXML } from './xml-generator'
import type {
  RenderOptions,
  RenderProgress,
  RenderJob,
  RenderStatus,
  MeltCheckResult,
  MLTProfile,
  RENDER_PRESETS,
  DEFAULT_MLT_PROFILE,
} from './types'
import { v4 as uuidv4 } from 'uuid'

// ============================================
// SERVICE STATE
// ============================================

const activeJobs = new Map<string, RenderJob>()
const progressCallbacks = new Map<string, (progress: RenderProgress) => void>()

// ============================================
// MELT AVAILABILITY
// ============================================

/**
 * Check if melt is available on the system
 */
export async function checkMeltAvailability(): Promise<MeltCheckResult> {
  try {
    const result = await invoke<{ available: boolean; version?: string; path?: string; error?: string }>('check_melt')
    return result
  } catch (e) {
    return {
      available: false,
      error: `Failed to check melt: ${e}`,
    }
  }
}

/**
 * Get melt version string
 */
export async function getMeltVersion(): Promise<string | null> {
  const result = await checkMeltAvailability()
  return result.version || null
}

// ============================================
// RENDERING
// ============================================

/**
 * Render a timeline to video file
 */
export async function renderTimeline(
  timeline: OTIOTimeline,
  options: RenderOptions,
  onProgress?: (progress: RenderProgress) => void
): Promise<RenderJob> {
  // Create job
  const job: RenderJob = {
    id: uuidv4(),
    status: 'pending',
    options,
    progress: {
      status: 'pending',
      currentFrame: 0,
      totalFrames: RT.toFrames(getTimelineDuration(timeline)),
      percentage: 0,
    },
    startedAt: new Date(),
  }

  activeJobs.set(job.id, job)

  if (onProgress) {
    progressCallbacks.set(job.id, onProgress)
  }

  try {
    // Apply preset defaults
    const preset = options.preset
    const presetDefaults = {
      preview: {
        profile: {
          description: 'Preview 540p 30fps',
          width: 960,
          height: 540,
          frameRateNum: 30,
          frameRateDen: 1,
          sampleRate: 48000,
          channels: 2,
          progressive: true,
        },
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
    }[preset]

    const finalOptions = { ...presetDefaults, ...options }

    // Generate MLT XML
    const profile: MLTProfile = (finalOptions.profile as MLTProfile) || {
      description: 'HD 1080p 30fps',
      width: 1920,
      height: 1080,
      frameRateNum: 30,
      frameRateDen: 1,
      sampleRate: 48000,
      channels: 2,
      progressive: true,
    }
    const mltXml = generateMLTXML(timeline, profile)

    // Update job status
    job.status = 'running'
    job.progress.status = 'running'
    updateProgress(job.id)

    // Invoke melt via Tauri
    const result = await invoke<{ success: boolean; error?: string; outputPath?: string }>('run_melt_render', {
      mltXml,
      outputPath: options.outputPath,
      options: {
        videoCodec: finalOptions.videoCodec,
        audioCodec: finalOptions.audioCodec,
        audioBitrate: finalOptions.audioBitrate,
        crf: finalOptions.crf,
        width: profile.width,
        height: profile.height,
        frameRate: profile.frameRateNum,
      },
      jobId: job.id,
    })

    if (result.success) {
      job.status = 'completed'
      job.progress.status = 'completed'
      job.progress.percentage = 100
      job.progress.outputPath = result.outputPath
      job.completedAt = new Date()
    } else {
      job.status = 'failed'
      job.progress.status = 'failed'
      job.progress.error = result.error
    }
  } catch (e) {
    job.status = 'failed'
    job.progress.status = 'failed'
    job.progress.error = `Render failed: ${e}`
  }

  updateProgress(job.id)
  return job
}

/**
 * Render a preview (low quality, fast)
 */
export async function renderPreview(
  timeline: OTIOTimeline,
  outputPath: string,
  onProgress?: (progress: RenderProgress) => void
): Promise<RenderJob> {
  return renderTimeline(
    timeline,
    {
      outputPath,
      preset: 'preview',
    },
    onProgress
  )
}

/**
 * Render final export (high quality)
 */
export async function renderExport(
  timeline: OTIOTimeline,
  outputPath: string,
  preset: 'draft' | 'high' | 'master' = 'high',
  onProgress?: (progress: RenderProgress) => void
): Promise<RenderJob> {
  return renderTimeline(
    timeline,
    {
      outputPath,
      preset,
    },
    onProgress
  )
}

// ============================================
// JOB MANAGEMENT
// ============================================

/**
 * Get a render job by ID
 */
export function getJob(jobId: string): RenderJob | undefined {
  return activeJobs.get(jobId)
}

/**
 * Get all active jobs
 */
export function getActiveJobs(): RenderJob[] {
  return Array.from(activeJobs.values()).filter(
    job => job.status === 'pending' || job.status === 'running'
  )
}

/**
 * Cancel a running render job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  const job = activeJobs.get(jobId)
  if (!job || job.status !== 'running') {
    return false
  }

  try {
    await invoke('cancel_melt_render', { jobId })
    job.status = 'cancelled'
    job.progress.status = 'cancelled'
    updateProgress(jobId)
    return true
  } catch (e) {
    console.error('Failed to cancel job:', e)
    return false
  }
}

/**
 * Update progress for a job and notify callbacks
 */
function updateProgress(jobId: string): void {
  const job = activeJobs.get(jobId)
  if (!job) return

  const callback = progressCallbacks.get(jobId)
  if (callback) {
    callback(job.progress)
  }

  // Clean up completed jobs after a delay
  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    setTimeout(() => {
      progressCallbacks.delete(jobId)
    }, 5000)
  }
}

/**
 * Handle progress update from Tauri backend
 * Called via Tauri event
 */
export function handleProgressUpdate(jobId: string, frame: number, totalFrames: number): void {
  const job = activeJobs.get(jobId)
  if (!job) return

  job.progress.currentFrame = frame
  job.progress.totalFrames = totalFrames
  job.progress.percentage = Math.round((frame / totalFrames) * 100)

  // Calculate ETA if we have timing data
  if (job.startedAt) {
    const elapsed = Date.now() - job.startedAt.getTime()
    const msPerFrame = elapsed / frame
    const remainingFrames = totalFrames - frame
    job.progress.estimatedRemaining = (remainingFrames * msPerFrame) / 1000
    job.progress.fps = frame / (elapsed / 1000)
  }

  updateProgress(jobId)
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a unique output path for a render
 */
export function generateOutputPath(baseName: string, preset: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${baseName}_${preset}_${timestamp}.mp4`
}

/**
 * Get the temp directory for MLT files
 */
export async function getTempDir(): Promise<string> {
  try {
    return await invoke<string>('get_mlt_temp_dir')
  } catch {
    return '/tmp/dreamcloud-mlt'
  }
}

/**
 * Clean up old temp files
 */
export async function cleanupTempFiles(): Promise<void> {
  try {
    await invoke('cleanup_mlt_temp_files')
  } catch (e) {
    console.warn('Failed to cleanup temp files:', e)
  }
}

// ============================================
// DIRECT MELT COMMANDS (for testing/debugging)
// ============================================

/**
 * Run melt with raw arguments (for debugging)
 */
export async function runMeltRaw(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return invoke('run_melt_raw', { args })
}

/**
 * Validate MLT XML by running melt in check mode
 */
export async function validateMLTWithMelt(mltXml: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const result = await invoke<{ valid: boolean; error?: string }>('validate_mlt_xml', { mltXml })
    return result
  } catch (e) {
    return { valid: false, error: `Validation failed: ${e}` }
  }
}
