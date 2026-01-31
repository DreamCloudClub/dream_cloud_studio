import { useState, useCallback, useRef, useMemo } from "react"

/**
 * Video metadata information returned from the Rust backend
 */
export interface VideoInfo {
  /** Video duration in seconds */
  duration: number
  /** Video width in pixels */
  width: number
  /** Video height in pixels */
  height: number
  /** Frame rate (frames per second) */
  frameRate: number
  /** Video codec name */
  codec: string
  /** Total number of frames */
  frameCount: number
}

/**
 * Raw video info from Tauri (snake_case from Rust)
 */
interface TauriVideoInfo {
  duration: number
  width: number
  height: number
  frame_rate: number
  codec: string
  frame_count: number
}

/**
 * Frame request result from Tauri
 */
interface TauriFrameResult {
  success: boolean
  data: string | null
  error: string | null
}

/**
 * Check if we're running in Tauri
 */
function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window
}

/**
 * Get the Tauri invoke function (dynamically imported)
 */
async function getTauriInvoke(): Promise<
  typeof import("@tauri-apps/api/core").invoke | null
> {
  if (!isTauri()) return null
  try {
    const { invoke } = await import("@tauri-apps/api/core")
    return invoke
  } catch {
    console.warn("Failed to load Tauri API")
    return null
  }
}

/**
 * Convert snake_case VideoInfo from Rust to camelCase
 */
function convertVideoInfo(raw: TauriVideoInfo): VideoInfo {
  return {
    duration: raw.duration,
    width: raw.width,
    height: raw.height,
    frameRate: raw.frame_rate,
    codec: raw.codec,
    frameCount: raw.frame_count,
  }
}

/**
 * Interface for Tauri frame operations
 */
export interface TauriFrames {
  /** Request a single frame at a specific timestamp */
  requestFrame: (videoPath: string, timestamp: number) => Promise<string>
  /** Get video metadata information */
  getVideoInfo: (videoPath: string) => Promise<VideoInfo>
  /** Whether a request is currently in progress */
  isLoading: boolean
  /** Current error message, if any */
  error: string | null
  /** Clear the current error */
  clearError: () => void
  /** Check if Tauri is available */
  isTauriAvailable: boolean
}

/**
 * useTauriFrames - Hook to request video frames from Tauri backend
 *
 * Uses @tauri-apps/api to invoke Rust commands for frame extraction.
 * Provides methods for requesting individual frames and getting video info.
 *
 * Tauri Commands Expected:
 * - `get_frame_at_time`: Extracts a frame at a specific timestamp
 *   - Args: { videoPath: string, timestamp: number }
 *   - Returns: { success: boolean, data: string | null, error: string | null }
 *
 * - `get_video_info`: Gets video metadata
 *   - Args: { videoPath: string }
 *   - Returns: VideoInfo object
 *
 * @returns TauriFrames interface for frame operations
 */
export function useTauriFrames(): TauriFrames {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cache for video info to avoid repeated calls
  const videoInfoCacheRef = useRef<Map<string, VideoInfo>>(new Map())

  // Track pending requests to avoid duplicates
  const pendingRequestsRef = useRef<Map<string, Promise<string>>>(new Map())

  // Check Tauri availability once
  const isTauriAvailable = useMemo(() => isTauri(), [])

  /**
   * Request a frame at a specific timestamp
   */
  const requestFrame = useCallback(
    async (videoPath: string, timestamp: number): Promise<string> => {
      // Create a unique key for this request
      const requestKey = `${videoPath}:${timestamp}`

      // Check if there's already a pending request for this exact frame
      const pendingRequest = pendingRequestsRef.current.get(requestKey)
      if (pendingRequest) {
        return pendingRequest
      }

      const framePromise = (async () => {
        const invoke = await getTauriInvoke()

        if (!invoke) {
          throw new Error(
            "Tauri API not available. Frame extraction requires the desktop app."
          )
        }

        setIsLoading(true)
        setError(null)

        try {
          const result = await invoke<TauriFrameResult>("get_frame_at_time", {
            videoPath,
            timestamp,
          })

          if (!result.success || !result.data) {
            throw new Error(result.error || "Failed to extract frame")
          }

          return result.data
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Unknown error extracting frame"
          setError(errorMessage)
          throw new Error(errorMessage)
        } finally {
          setIsLoading(false)
          // Remove from pending requests
          pendingRequestsRef.current.delete(requestKey)
        }
      })()

      // Store the pending request
      pendingRequestsRef.current.set(requestKey, framePromise)

      return framePromise
    },
    []
  )

  /**
   * Get video information/metadata
   */
  const getVideoInfo = useCallback(
    async (videoPath: string): Promise<VideoInfo> => {
      // Check cache first
      const cached = videoInfoCacheRef.current.get(videoPath)
      if (cached) {
        return cached
      }

      const invoke = await getTauriInvoke()

      if (!invoke) {
        throw new Error(
          "Tauri API not available. Video info requires the desktop app."
        )
      }

      setIsLoading(true)
      setError(null)

      try {
        const rawInfo = await invoke<TauriVideoInfo>("get_video_info", {
          videoPath,
        })

        const videoInfo = convertVideoInfo(rawInfo)

        // Cache the result
        videoInfoCacheRef.current.set(videoPath, videoInfo)

        return videoInfo
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error getting video info"
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return useMemo(
    () => ({
      requestFrame,
      getVideoInfo,
      isLoading,
      error,
      clearError,
      isTauriAvailable,
    }),
    [requestFrame, getVideoInfo, isLoading, error, clearError, isTauriAvailable]
  )
}

/**
 * Utility function to generate timestamps for frame preloading
 * Creates an array of timestamps around a center point
 *
 * @param centerTime - The center timestamp to preload around
 * @param duration - Total video duration
 * @param frameRate - Video frame rate
 * @param windowSize - Number of frames before and after center to preload
 * @returns Array of timestamps to preload
 */
export function generatePreloadTimestamps(
  centerTime: number,
  duration: number,
  frameRate: number,
  windowSize: number = 10
): number[] {
  const frameDuration = 1 / frameRate
  const timestamps: number[] = []

  for (let i = -windowSize; i <= windowSize; i++) {
    const timestamp = centerTime + i * frameDuration

    // Only include valid timestamps within video duration
    if (timestamp >= 0 && timestamp <= duration) {
      // Round to avoid floating point precision issues
      timestamps.push(Math.round(timestamp * 1000) / 1000)
    }
  }

  return timestamps
}

/**
 * Utility function to snap a timestamp to the nearest frame boundary
 *
 * @param timestamp - The timestamp to snap
 * @param frameRate - Video frame rate
 * @returns Timestamp snapped to nearest frame
 */
export function snapToFrame(timestamp: number, frameRate: number): number {
  const frameDuration = 1 / frameRate
  const frameIndex = Math.round(timestamp / frameDuration)
  return Math.round(frameIndex * frameDuration * 1000) / 1000
}
