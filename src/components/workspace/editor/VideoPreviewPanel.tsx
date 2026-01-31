import { useRef, useEffect, useCallback, useState, useMemo } from "react"
import { Play, Pause, SkipBack, SkipForward, Minimize2, Volume2, VolumeX } from "lucide-react"
import { AspectRatio, TimelineClipWithAsset } from "@/state/workspaceStore"
import { getAssetDisplayUrl } from "@/services/localStorage"
import { useThumbnailStrip } from "./useThumbnailStrip"

// Only seek video when scrubbing STOPS (debounce), not during active scrub
const SEEK_DEBOUNCE_MS = 150
// Thumbnail interval in seconds
const THUMBNAIL_INTERVAL = 0.5

// Convert aspect ratio string to numeric ratio for CSS
function getAspectRatioValue(ratio: AspectRatio): number {
  const [w, h] = ratio.split(":").map(Number)
  return w / h
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${String(secs).padStart(2, "0")}`
}

interface VideoPreviewPanelProps {
  aspectRatio: AspectRatio
  currentClip: TimelineClipWithAsset | null
  currentTime: number
  totalDuration: number
  isPlaying: boolean
  isMuted: boolean
  isFullscreen: boolean
  onTimeUpdate: (time: number) => void
  onPlayPause: () => void
  onSkipBack: () => void
  onSkipForward: () => void
  onToggleMute: () => void
  onToggleFullscreen: () => void
}

export function VideoPreviewPanel({
  aspectRatio,
  currentClip,
  currentTime,
  totalDuration,
  isPlaying,
  isMuted,
  isFullscreen,
  onTimeUpdate,
  onPlayPause,
  onSkipBack,
  onSkipForward,
  onToggleMute,
  onToggleFullscreen,
}: VideoPreviewPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const aspectValue = getAspectRatioValue(aspectRatio)

  const [showControls, setShowControls] = useState(false)

  // Thumbnail strip for smooth scrubbing
  const thumbnailStrip = useThumbnailStrip(THUMBNAIL_INTERVAL)

  // Memoize media URL to avoid recalculating on every render
  const currentMediaUrl = useMemo(
    () => (currentClip?.asset ? getAssetDisplayUrl(currentClip.asset) : null),
    [currentClip?.asset]
  )
  const isVideo = currentClip?.asset?.type === "video"

  // Track the previous clip to detect transitions and current time for handlers
  const prevClipIdRef = useRef<string | null>(null)
  const currentTimeRef = useRef(currentTime)
  const currentClipRef = useRef(currentClip)

  // Debounce ref - only seek when scrubbing stops
  const seekDebounceRef = useRef<NodeJS.Timeout | null>(null)
  // RAF for smooth playhead updates
  const rafRef = useRef<number | null>(null)

  // Smooth playhead update using requestAnimationFrame (60fps instead of ~4fps timeupdate)
  // Track if we've already signaled end of clip to avoid duplicate calls
  const clipEndSignaledRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isPlaying || !isVideo) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    // Reset the end signal when clip changes
    clipEndSignaledRef.current = null

    const updatePlayhead = () => {
      const video = videoRef.current
      const clip = currentClipRef.current

      if (video && clip && !video.paused) {
        const inPoint = clip.inPoint || 0
        const outPoint = inPoint + clip.duration
        const videoTime = video.currentTime

        // Check if video has reached the clip's outPoint
        if (videoTime >= outPoint) {
          // Only signal end once per clip to avoid duplicate calls
          if (clipEndSignaledRef.current !== clip.id) {
            clipEndSignaledRef.current = clip.id
            onTimeUpdate(clip.startTime + clip.duration)
          }
        } else {
          const timeInClip = videoTime - inPoint
          const timelineTime = clip.startTime + timeInClip

          if (timelineTime >= clip.startTime && timelineTime < clip.startTime + clip.duration) {
            onTimeUpdate(timelineTime)
          }
        }
      }

      rafRef.current = requestAnimationFrame(updatePlayhead)
    }

    rafRef.current = requestAnimationFrame(updatePlayhead)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isPlaying, isVideo, onTimeUpdate])

  // Generate thumbnails when video clip becomes active
  useEffect(() => {
    if (currentMediaUrl && isVideo) {
      thumbnailStrip.generateStrip(currentMediaUrl)
    }
  }, [currentMediaUrl, isVideo, thumbnailStrip])

  // Get current thumbnail for scrubbing
  const currentThumbnail = useMemo(() => {
    if (!currentMediaUrl || !isVideo || isPlaying) return null

    // Calculate timestamp within the video file
    const timeInClip = currentClip
      ? Math.max(0, currentTime - currentClip.startTime)
      : currentTime
    const videoTimestamp = currentClip
      ? (currentClip.inPoint || 0) + timeInClip
      : timeInClip

    return thumbnailStrip.getThumbnail(currentMediaUrl, videoTimestamp)
  }, [currentMediaUrl, isVideo, isPlaying, currentClip, currentTime, thumbnailStrip])

  // Keep refs in sync
  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  useEffect(() => {
    currentClipRef.current = currentClip
    // Reset end signal when clip changes so next clip can properly signal its end
    clipEndSignaledRef.current = null
  }, [currentClip])

  // Sync video playback and handle clip transitions
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const clipChanged = prevClipIdRef.current !== currentClip?.id
    prevClipIdRef.current = currentClip?.id || null

    if (!isVideo) {
      video.pause()
      return
    }

    if (isPlaying) {
      // If clip changed during playback, we need to wait for video to load
      if (clipChanged && currentClip) {
        const handleCanPlay = () => {
          const clip = currentClipRef.current
          const time = currentTimeRef.current
          if (!clip) return

          const timeInClip = Math.max(0, time - clip.startTime)
          video.currentTime = (clip.inPoint || 0) + timeInClip
          video.play().catch(() => {})
        }

        // Remove any existing listener first
        video.removeEventListener('canplay', handleCanPlay)
        video.addEventListener('canplay', handleCanPlay, { once: true })

        // If already ready, play immediately
        if (video.readyState >= 3) {
          video.removeEventListener('canplay', handleCanPlay)
          handleCanPlay()
        }
      } else {
        video.play().catch(() => {})
      }
    } else {
      video.pause()
    }
  }, [isPlaying, isVideo, currentClip?.id])

  // Seek video when scrubbing STOPS (debounced)
  // The playhead moves instantly, video catches up when you pause
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isVideo || !currentClip || isPlaying) return

    // Clear any pending seek
    if (seekDebounceRef.current) {
      clearTimeout(seekDebounceRef.current)
    }

    // Calculate target seek time
    const timeInClip = Math.max(0, Math.min(
      currentTime - currentClip.startTime,
      currentClip.duration
    ))
    const seekTime = (currentClip.inPoint || 0) + timeInClip
    const maxSeek = video.duration && isFinite(video.duration) ? video.duration : seekTime
    const targetSeekTime = Math.max(0, Math.min(seekTime, maxSeek))

    // Debounce: only seek when user stops scrubbing
    seekDebounceRef.current = setTimeout(() => {
      if (video.fastSeek) {
        video.fastSeek(targetSeekTime)
      } else {
        video.currentTime = targetSeekTime
      }
    }, SEEK_DEBOUNCE_MS)

    return () => {
      if (seekDebounceRef.current) {
        clearTimeout(seekDebounceRef.current)
      }
    }
  }, [currentTime, currentClip, isVideo, isPlaying])


  // Handle fullscreen for video container only
  const handleFullscreen = useCallback(async () => {
    if (!containerRef.current) return
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.error("Fullscreen error:", err)
    }
  }, [])

  // Sync fullscreen state and trigger when button pressed
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement
      if (isNowFullscreen !== isFullscreen) {
        onToggleFullscreen()
      }
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [isFullscreen, onToggleFullscreen])

  // Expose handleFullscreen to parent via the toggle callback
  useEffect(() => {
    // When isFullscreen changes from parent button click, trigger actual fullscreen
    const currentlyFullscreen = !!document.fullscreenElement
    if (isFullscreen !== currentlyFullscreen) {
      handleFullscreen()
    }
  }, [isFullscreen, handleFullscreen])

  // Handle video time updates - drive timeline from video
  const handleTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const clip = currentClipRef.current
    if (clip && isPlaying) {
      const video = e.currentTarget
      const inPoint = clip.inPoint || 0
      const outPoint = inPoint + clip.duration
      const videoTime = video.currentTime

      // Check if video has reached the clip's outPoint
      if (videoTime >= outPoint) {
        // Advance timeline to the end of this clip to trigger next clip
        onTimeUpdate(clip.startTime + clip.duration)
        return
      }

      const timeInClip = videoTime - inPoint
      const timelineTime = clip.startTime + timeInClip

      // Only update if within clip bounds
      if (timelineTime >= clip.startTime && timelineTime < clip.startTime + clip.duration) {
        onTimeUpdate(timelineTime)
      }
    }
  }, [isPlaying, onTimeUpdate])

  // Handle when video reaches the end of the actual video file
  const handleVideoEnded = useCallback(() => {
    const clip = currentClipRef.current
    if (clip && isPlaying) {
      // Advance timeline to end of clip to trigger next clip
      onTimeUpdate(clip.startTime + clip.duration)
    }
  }, [isPlaying, onTimeUpdate])

  // Show controls on mouse movement, hide after timeout
  const handleMouseMove = useCallback(() => {
    setShowControls(true)
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    hideTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 2500)
  }, [isPlaying])

  // Keep controls visible when paused
  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true)
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [isPlaying])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [])

  // Click video to play/pause
  const handleVideoClick = useCallback(() => {
    onPlayPause()
  }, [onPlayPause])

  // Click on progress bar to seek
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || totalDuration === 0) return
    const rect = progressRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * totalDuration
    onTimeUpdate(Math.max(0, Math.min(newTime, totalDuration)))
  }, [totalDuration, onTimeUpdate])

  const progressPercentage = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

  return (
    <div
      ref={containerRef}
      className="h-full w-full flex items-center justify-center bg-zinc-950 p-4"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <div
        className="relative w-full h-full max-w-full max-h-full bg-black rounded-lg overflow-hidden flex items-center justify-center cursor-pointer"
        style={{ aspectRatio: aspectValue }}
        onClick={handleVideoClick}
      >
        {currentMediaUrl ? (
          isVideo ? (
            <>
              {/* Video element - always present, controls sizing */}
              <video
                ref={videoRef}
                src={currentMediaUrl}
                className={`max-w-full max-h-full object-contain bg-black pointer-events-none ${
                  !isPlaying && currentThumbnail ? "invisible" : ""
                }`}
                loop={false}
                muted={isMuted}
                playsInline
                preload="auto"
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnded}
              />
              {/* Thumbnail image - absolutely positioned on top during scrubbing */}
              {!isPlaying && currentThumbnail && (
                <img
                  src={currentThumbnail}
                  alt="Preview"
                  className="absolute inset-0 w-full h-full object-contain bg-black pointer-events-none"
                />
              )}
              {/* Thumbnail generation progress indicator */}
              {!isPlaying && currentMediaUrl && thumbnailStrip.isGenerating(currentMediaUrl) && (
                <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white/70">
                  Generating preview... {Math.round(thumbnailStrip.getProgress(currentMediaUrl) * 100)}%
                </div>
              )}
            </>
          ) : (
            <img
              src={currentMediaUrl}
              alt={currentClip?.asset?.name || "Clip"}
              className="max-w-full max-h-full object-contain bg-black pointer-events-none"
            />
          )
        ) : null}

        {/* Video Controls Overlay - only in fullscreen */}
        {isFullscreen && (
        <div
          className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Controls container */}
          <div className="relative px-4 pb-3 pt-8">
            {/* Progress bar */}
            <div
              ref={progressRef}
              className="w-full h-1 bg-white/30 rounded-full cursor-pointer mb-3 group"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-red-500 rounded-full relative"
                style={{ width: `${progressPercentage}%` }}
              >
                {/* Scrubber dot */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Bottom row: buttons and time */}
            <div className="flex items-center justify-between">
              {/* Left: playback controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onSkipBack}
                  className="w-8 h-8 flex items-center justify-center text-white/90 hover:text-white transition-colors"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={onPlayPause}
                  className="w-10 h-10 flex items-center justify-center text-white hover:scale-110 transition-transform"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-0.5" />
                  )}
                </button>
                <button
                  onClick={onSkipForward}
                  className="w-8 h-8 flex items-center justify-center text-white/90 hover:text-white transition-colors"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
                <span className="text-white/90 text-sm ml-2 tabular-nums">
                  {formatTime(currentTime)} / {formatTime(totalDuration)}
                </span>
              </div>

              {/* Right: mute and fullscreen toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onToggleMute}
                  className="w-8 h-8 flex items-center justify-center text-white/90 hover:text-white transition-colors"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={onToggleFullscreen}
                  className="w-8 h-8 flex items-center justify-center text-white/90 hover:text-white transition-colors"
                  title="Exit fullscreen"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
