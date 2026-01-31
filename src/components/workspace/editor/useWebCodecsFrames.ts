import { useState, useCallback, useRef, useMemo } from "react"

/**
 * Video metadata from WebCodecs
 */
export interface VideoInfo {
  duration: number
  width: number
  height: number
  frameRate: number
}

/**
 * Frame extraction using WebCodecs API (browser-native, no dependencies)
 *
 * This is a fallback when Tauri/FFmpeg is not available.
 * Works in modern browsers (Chrome 94+, Edge 94+, Firefox 130+)
 */
export interface WebCodecsFrames {
  requestFrame: (videoUrl: string, timestamp: number) => Promise<string>
  getVideoInfo: (videoUrl: string) => Promise<VideoInfo>
  isLoading: boolean
  error: string | null
  clearError: () => void
  isSupported: boolean
}

/**
 * Check if WebCodecs is supported
 */
function checkWebCodecsSupport(): boolean {
  return typeof VideoDecoder !== "undefined" && typeof VideoEncoder !== "undefined"
}

/**
 * Extract a frame from video at specific timestamp using canvas
 * This is a simpler approach that works in all browsers
 */
async function extractFrameWithCanvas(
  videoUrl: string,
  timestamp: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video")
    video.crossOrigin = "anonymous"
    video.muted = true
    video.preload = "metadata"

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      reject(new Error("Could not get canvas context"))
      return
    }

    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked)
      video.removeEventListener("error", onError)
      video.removeEventListener("loadedmetadata", onMetadata)
      video.src = ""
      video.load()
    }

    const onError = () => {
      cleanup()
      reject(new Error("Failed to load video"))
    }

    const onSeeked = () => {
      try {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85)
        // Remove the data:image/jpeg;base64, prefix
        const base64 = dataUrl.split(",")[1]
        cleanup()
        resolve(base64)
      } catch (err) {
        cleanup()
        reject(err)
      }
    }

    const onMetadata = () => {
      // Clamp timestamp to valid range
      const clampedTime = Math.max(0, Math.min(timestamp, video.duration))
      video.currentTime = clampedTime
    }

    video.addEventListener("loadedmetadata", onMetadata)
    video.addEventListener("seeked", onSeeked)
    video.addEventListener("error", onError)

    video.src = videoUrl
    video.load()
  })
}

/**
 * Get video metadata
 */
async function getVideoMetadata(videoUrl: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video")
    video.crossOrigin = "anonymous"
    video.muted = true
    video.preload = "metadata"

    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onMetadata)
      video.removeEventListener("error", onError)
      video.src = ""
      video.load()
    }

    const onError = () => {
      cleanup()
      reject(new Error("Failed to load video metadata"))
    }

    const onMetadata = () => {
      const info: VideoInfo = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        // Estimate frame rate (most videos are 24, 30, or 60 fps)
        frameRate: 30,
      }
      cleanup()
      resolve(info)
    }

    video.addEventListener("loadedmetadata", onMetadata)
    video.addEventListener("error", onError)

    video.src = videoUrl
    video.load()
  })
}

/**
 * useWebCodecsFrames - Hook for browser-native frame extraction
 *
 * Uses canvas-based frame extraction which works in all modern browsers.
 * Falls back gracefully when WebCodecs is not available.
 */
export function useWebCodecsFrames(): WebCodecsFrames {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cache for video info
  const videoInfoCacheRef = useRef<Map<string, VideoInfo>>(new Map())

  // Pending requests to avoid duplicates
  const pendingRequestsRef = useRef<Map<string, Promise<string>>>(new Map())

  const isSupported = useMemo(() => checkWebCodecsSupport(), [])

  /**
   * Request a frame at a specific timestamp
   */
  const requestFrame = useCallback(
    async (videoUrl: string, timestamp: number): Promise<string> => {
      const requestKey = `${videoUrl}:${timestamp.toFixed(2)}`

      // Check for pending request
      const pending = pendingRequestsRef.current.get(requestKey)
      if (pending) {
        return pending
      }

      const framePromise = (async () => {
        setIsLoading(true)
        setError(null)

        try {
          const base64 = await extractFrameWithCanvas(videoUrl, timestamp)
          return base64
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to extract frame"
          setError(errorMessage)
          throw new Error(errorMessage)
        } finally {
          setIsLoading(false)
          pendingRequestsRef.current.delete(requestKey)
        }
      })()

      pendingRequestsRef.current.set(requestKey, framePromise)
      return framePromise
    },
    []
  )

  /**
   * Get video information
   */
  const getVideoInfo = useCallback(
    async (videoUrl: string): Promise<VideoInfo> => {
      // Check cache
      const cached = videoInfoCacheRef.current.get(videoUrl)
      if (cached) {
        return cached
      }

      setIsLoading(true)
      setError(null)

      try {
        const info = await getVideoMetadata(videoUrl)
        videoInfoCacheRef.current.set(videoUrl, info)
        return info
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get video info"
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

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
      isSupported,
    }),
    [requestFrame, getVideoInfo, isLoading, error, clearError, isSupported]
  )
}
