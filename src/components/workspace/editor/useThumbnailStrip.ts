import { useState, useCallback, useRef, useEffect } from "react"

/**
 * Thumbnail data for a video
 */
export interface ThumbnailStrip {
  videoUrl: string
  interval: number // seconds between thumbnails
  thumbnails: Map<number, string> // timestamp -> base64 jpeg
  duration: number
  isGenerating: boolean
  progress: number // 0-1
}

/**
 * useThumbnailStrip - Pre-generates thumbnails for smooth scrubbing
 *
 * Generates a strip of thumbnails at regular intervals when a video loads.
 * During scrubbing, the nearest thumbnail is shown instantly.
 */
export function useThumbnailStrip(interval: number = 0.5) {
  const [strips, setStrips] = useState<Map<string, ThumbnailStrip>>(new Map())
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map())
  const generatingRef = useRef<Set<string>>(new Set())
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())

  /**
   * Get or create a video element for a URL (reused for efficiency)
   */
  const getVideoElement = useCallback((url: string): HTMLVideoElement => {
    let video = videoElementsRef.current.get(url)
    if (!video) {
      video = document.createElement("video")
      video.crossOrigin = "anonymous"
      video.muted = true
      video.preload = "auto"
      video.playsInline = true
      videoElementsRef.current.set(url, video)
    }
    return video
  }, [])

  /**
   * Extract a single frame from video at timestamp
   */
  const extractFrame = useCallback(
    (video: HTMLVideoElement, timestamp: number): Promise<string> => {
      return new Promise((resolve, reject) => {
        const canvas = document.createElement("canvas")
        // Use full resolution for high quality scrubbing
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const ctx = canvas.getContext("2d", { alpha: false })
        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }

        const onSeeked = () => {
          video.removeEventListener("seeked", onSeeked)
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const dataUrl = canvas.toDataURL("image/jpeg", 0.92)
            resolve(dataUrl)
          } catch (err) {
            reject(err)
          }
        }

        video.addEventListener("seeked", onSeeked)
        video.currentTime = Math.max(0, Math.min(timestamp, video.duration || 0))
      })
    },
    []
  )

  /**
   * Generate thumbnail strip for a video
   */
  const generateStrip = useCallback(
    async (videoUrl: string): Promise<void> => {
      // Skip if already generating
      if (generatingRef.current.has(videoUrl)) {
        return
      }

      // Skip if already have strip
      const existing = strips.get(videoUrl)
      if (existing && existing.thumbnails.size > 0) {
        return
      }

      generatingRef.current.add(videoUrl)

      // Create abort controller for this generation
      const abortController = new AbortController()
      abortControllersRef.current.set(videoUrl, abortController)

      const video = getVideoElement(videoUrl)

      // Initialize strip
      setStrips((prev) => {
        const next = new Map(prev)
        next.set(videoUrl, {
          videoUrl,
          interval,
          thumbnails: new Map(),
          duration: 0,
          isGenerating: true,
          progress: 0,
        })
        return next
      })

      try {
        // Load video metadata
        await new Promise<void>((resolve, reject) => {
          const onLoaded = () => {
            video.removeEventListener("loadedmetadata", onLoaded)
            video.removeEventListener("error", onError)
            resolve()
          }
          const onError = () => {
            video.removeEventListener("loadedmetadata", onLoaded)
            video.removeEventListener("error", onError)
            reject(new Error("Failed to load video"))
          }

          if (video.readyState >= 1) {
            resolve()
          } else {
            video.addEventListener("loadedmetadata", onLoaded)
            video.addEventListener("error", onError)
            if (video.src !== videoUrl) {
              video.src = videoUrl
              video.load()
            }
          }
        })

        const duration = video.duration
        if (!isFinite(duration) || duration <= 0) {
          throw new Error("Invalid video duration")
        }

        // Calculate timestamps
        const timestamps: number[] = []
        for (let t = 0; t <= duration; t += interval) {
          timestamps.push(Math.round(t * 10) / 10)
        }
        // Always include last frame
        if (timestamps[timestamps.length - 1] < duration) {
          timestamps.push(Math.round(duration * 10) / 10)
        }

        const thumbnails = new Map<number, string>()

        // Generate thumbnails sequentially (seeking is serial anyway)
        for (let i = 0; i < timestamps.length; i++) {
          // Check for abort
          if (abortController.signal.aborted) {
            break
          }

          const timestamp = timestamps[i]
          try {
            const frame = await extractFrame(video, timestamp)
            thumbnails.set(timestamp, frame)

            // Update progress
            setStrips((prev) => {
              const next = new Map(prev)
              const strip = next.get(videoUrl)
              if (strip) {
                next.set(videoUrl, {
                  ...strip,
                  thumbnails: new Map(thumbnails),
                  duration,
                  progress: (i + 1) / timestamps.length,
                })
              }
              return next
            })
          } catch (err) {
            console.warn(`Failed to extract frame at ${timestamp}:`, err)
          }

          // Small delay to avoid blocking UI
          await new Promise((r) => setTimeout(r, 10))
        }

        // Mark as complete
        setStrips((prev) => {
          const next = new Map(prev)
          const strip = next.get(videoUrl)
          if (strip) {
            next.set(videoUrl, {
              ...strip,
              isGenerating: false,
              progress: 1,
            })
          }
          return next
        })
      } catch (err) {
        console.error("Failed to generate thumbnail strip:", err)
        setStrips((prev) => {
          const next = new Map(prev)
          next.delete(videoUrl)
          return next
        })
      } finally {
        generatingRef.current.delete(videoUrl)
        abortControllersRef.current.delete(videoUrl)
      }
    },
    [interval, strips, getVideoElement, extractFrame]
  )

  /**
   * Get the nearest thumbnail for a timestamp
   */
  const getThumbnail = useCallback(
    (videoUrl: string, timestamp: number): string | null => {
      const strip = strips.get(videoUrl)
      if (!strip || strip.thumbnails.size === 0) {
        return null
      }

      // Find nearest thumbnail
      const roundedTime = Math.round(timestamp / interval) * interval
      const snappedTime = Math.round(roundedTime * 10) / 10

      // Try exact match first
      if (strip.thumbnails.has(snappedTime)) {
        return strip.thumbnails.get(snappedTime) || null
      }

      // Find closest
      let closest: number | null = null
      let closestDist = Infinity

      for (const t of strip.thumbnails.keys()) {
        const dist = Math.abs(t - timestamp)
        if (dist < closestDist) {
          closestDist = dist
          closest = t
        }
      }

      return closest !== null ? strip.thumbnails.get(closest) || null : null
    },
    [strips, interval]
  )

  /**
   * Check if a strip exists for a video
   */
  const hasStrip = useCallback(
    (videoUrl: string): boolean => {
      const strip = strips.get(videoUrl)
      return !!strip && strip.thumbnails.size > 0
    },
    [strips]
  )

  /**
   * Get strip generation progress
   */
  const getProgress = useCallback(
    (videoUrl: string): number => {
      const strip = strips.get(videoUrl)
      return strip?.progress || 0
    },
    [strips]
  )

  /**
   * Check if strip is being generated
   */
  const isGenerating = useCallback(
    (videoUrl: string): boolean => {
      const strip = strips.get(videoUrl)
      return strip?.isGenerating || false
    },
    [strips]
  )

  /**
   * Cancel generation for a video
   */
  const cancelGeneration = useCallback((videoUrl: string) => {
    const controller = abortControllersRef.current.get(videoUrl)
    if (controller) {
      controller.abort()
    }
  }, [])

  /**
   * Clear strip for a video
   */
  const clearStrip = useCallback((videoUrl: string) => {
    cancelGeneration(videoUrl)
    setStrips((prev) => {
      const next = new Map(prev)
      next.delete(videoUrl)
      return next
    })
    // Clean up video element
    const video = videoElementsRef.current.get(videoUrl)
    if (video) {
      video.src = ""
      video.load()
      videoElementsRef.current.delete(videoUrl)
    }
  }, [cancelGeneration])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Abort all generations
      for (const controller of abortControllersRef.current.values()) {
        controller.abort()
      }
      // Clean up video elements
      for (const video of videoElementsRef.current.values()) {
        video.src = ""
        video.load()
      }
      videoElementsRef.current.clear()
    }
  }, [])

  return {
    generateStrip,
    getThumbnail,
    hasStrip,
    getProgress,
    isGenerating,
    cancelGeneration,
    clearStrip,
  }
}
