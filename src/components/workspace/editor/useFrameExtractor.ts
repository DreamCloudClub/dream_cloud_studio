import { useState, useCallback, useMemo, useRef } from "react"
import { useFrameCache } from "./useFrameCache"
import { useWebCodecsFrames, VideoInfo } from "./useWebCodecsFrames"

/**
 * Unified frame extractor that uses the best available method:
 * 1. Tauri + FFmpeg (fastest, requires desktop app)
 * 2. WebCodecs/Canvas (browser fallback, works everywhere)
 *
 * Includes frame caching and preloading for smooth scrubbing.
 */
export interface FrameExtractor {
  /** Get a frame at a specific timestamp (cached) */
  getFrame: (videoUrl: string, timestamp: number) => Promise<string | null>
  /** Get video metadata */
  getVideoInfo: (videoUrl: string) => Promise<VideoInfo>
  /** Preload frames around a timestamp for smooth scrubbing */
  preloadAround: (videoUrl: string, timestamp: number, range: number) => void
  /** Current frame being displayed (for immediate UI update) */
  currentFrame: string | null
  /** Whether a frame request is in progress */
  isLoading: boolean
  /** Current error, if any */
  error: string | null
  /** Which backend is being used */
  backend: "tauri" | "webcodecs" | "none"
}

/**
 * useFrameExtractor - Unified hook for frame extraction with caching
 *
 * Automatically selects the best available backend and provides
 * frame caching + preloading for smooth timeline scrubbing.
 */
export function useFrameExtractor(): FrameExtractor {
  const [currentFrame, setCurrentFrame] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Frame cache (LRU, 100 frames)
  const frameCache = useFrameCache(100)

  // WebCodecs backend
  const webCodecs = useWebCodecsFrames()

  // Track which backend we're using
  const backend = useMemo((): "tauri" | "webcodecs" | "none" => {
    // For now, always use webcodecs since Tauri packages aren't installed
    // When Tauri is available, this will check window.__TAURI__
    if (typeof window !== "undefined" && "VideoDecoder" in window) {
      return "webcodecs"
    }
    return "none"
  }, [])

  // Preload queue
  const preloadQueueRef = useRef<Set<string>>(new Set())
  const isPreloadingRef = useRef(false)

  /**
   * Get a frame, using cache if available
   */
  const getFrame = useCallback(
    async (videoUrl: string, timestamp: number): Promise<string | null> => {
      // Round timestamp to avoid floating point issues (snap to 0.1s)
      const roundedTime = Math.round(timestamp * 10) / 10

      // Check cache first
      const cached = frameCache.getFrame(videoUrl, roundedTime)
      if (cached) {
        setCurrentFrame(cached)
        return cached
      }

      // Not in cache, fetch it
      setIsLoading(true)
      setError(null)

      try {
        let frameData: string

        if (backend === "webcodecs") {
          frameData = await webCodecs.requestFrame(videoUrl, roundedTime)
        } else {
          throw new Error("No frame extraction backend available")
        }

        // Cache the frame
        frameCache.setFrame(videoUrl, roundedTime, frameData)
        setCurrentFrame(frameData)
        return frameData
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to extract frame"
        setError(errorMessage)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [backend, frameCache, webCodecs]
  )

  /**
   * Get video metadata
   */
  const getVideoInfo = useCallback(
    async (videoUrl: string): Promise<VideoInfo> => {
      return webCodecs.getVideoInfo(videoUrl)
    },
    [webCodecs]
  )

  /**
   * Preload frames around a timestamp for smooth scrubbing
   */
  const preloadAround = useCallback(
    (videoUrl: string, timestamp: number, range: number = 2) => {
      // Generate timestamps to preload (every 0.5 seconds within range)
      const step = 0.5
      const timestamps: number[] = []

      for (let t = timestamp - range; t <= timestamp + range; t += step) {
        if (t >= 0) {
          const roundedTime = Math.round(t * 10) / 10
          const key = `${videoUrl}:${roundedTime}`

          // Skip if already cached or in queue
          if (!frameCache.hasFrame(videoUrl, roundedTime) && !preloadQueueRef.current.has(key)) {
            timestamps.push(roundedTime)
            preloadQueueRef.current.add(key)
          }
        }
      }

      if (timestamps.length === 0 || isPreloadingRef.current) return

      // Preload in background
      isPreloadingRef.current = true

      const preloadNext = async () => {
        const nextTime = timestamps.shift()
        if (nextTime === undefined) {
          isPreloadingRef.current = false
          return
        }

        try {
          const frameData = await webCodecs.requestFrame(videoUrl, nextTime)
          frameCache.setFrame(videoUrl, nextTime, frameData)
        } catch {
          // Ignore preload errors
        }

        preloadQueueRef.current.delete(`${videoUrl}:${nextTime}`)

        // Small delay to avoid overwhelming the browser
        setTimeout(preloadNext, 50)
      }

      preloadNext()
    },
    [frameCache, webCodecs]
  )

  return useMemo(
    () => ({
      getFrame,
      getVideoInfo,
      preloadAround,
      currentFrame,
      isLoading,
      error,
      backend,
    }),
    [getFrame, getVideoInfo, preloadAround, currentFrame, isLoading, error, backend]
  )
}
