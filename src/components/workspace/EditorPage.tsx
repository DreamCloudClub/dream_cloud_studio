import { useState, useEffect, useRef, useCallback } from "react"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Maximize2,
  Minimize2,
  Plus,
  ZoomIn,
  ZoomOut,
  GripVertical,
  Image,
  Trash2,
  Scissors,
  Film,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useWorkspaceStore,
  AspectRatio,
  getClipsWithAssets,
  TimelineClipWithAsset,
} from "@/state/workspaceStore"
import { getAssetDisplayUrl } from "@/services/localStorage"

// Base timeline scale: pixels per second
const BASE_SCALE = 40

// Convert aspect ratio string to numeric ratio for CSS
function getAspectRatioValue(ratio: AspectRatio): number {
  const [w, h] = ratio.split(":").map(Number)
  return w / h
}

// ============================================
// CLIP BLOCK COMPONENT
// ============================================

interface ClipBlockProps {
  clip: TimelineClipWithAsset
  isSelected: boolean
  scale: number
  onClick: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onDelete: () => void
  onSplit: (splitTime: number) => void
}

function ClipBlock({
  clip,
  isSelected,
  scale,
  onClick,
  onDragStart,
  onDragEnd,
  onDelete,
  onSplit,
}: ClipBlockProps) {
  const width = clip.duration * BASE_SCALE * scale
  const left = clip.startTime * BASE_SCALE * scale

  const asset = clip.asset
  const thumbnailUrl = asset ? getAssetDisplayUrl(asset) : null
  const isVideo = asset?.type === "video"

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick()
  }

  const handleSplitClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Split at the middle of the clip
    const splitTime = clip.startTime + clip.duration / 2
    onSplit(splitTime)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={handleClick}
      className={cn(
        "absolute top-1 h-12 rounded-lg flex items-center text-xs font-medium transition-all overflow-hidden cursor-grab active:cursor-grabbing group",
        thumbnailUrl
          ? "bg-zinc-800"
          : "bg-gradient-to-br from-orange-500 to-orange-600",
        isSelected
          ? "ring-2 ring-white shadow-lg shadow-orange-500/30 z-10"
          : "hover:brightness-110"
      )}
      style={{
        width: `${Math.max(width, 50)}px`,
        left: `${left}px`,
      }}
    >
      {/* Thumbnail/Preview */}
      {thumbnailUrl && (
        <>
          {isVideo ? (
            <video
              src={thumbnailUrl}
              className="absolute inset-0 w-full h-full object-cover"
              preload="metadata"
              muted
              playsInline
            />
          ) : (
            <img
              src={thumbnailUrl}
              alt={asset?.name || "Clip"}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />
        </>
      )}

      {/* Content */}
      <div className="relative flex items-center w-full px-1 z-10">
        <GripVertical className="w-3 h-3 text-white/70 flex-shrink-0" />
        <span className="truncate px-1 text-white text-shadow">
          {asset?.name || "Untitled"}
        </span>
        <span className="ml-auto text-[10px] text-white/70 mr-1">
          {clip.duration.toFixed(1)}s
        </span>
      </div>

      {/* Action buttons - visible on selection */}
      {isSelected && (
        <div className="absolute -top-8 left-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleSplitClick}
            className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white"
            title="Split clip"
          >
            <Scissors className="w-3 h-3" />
          </button>
          <button
            onClick={handleDeleteClick}
            className="w-6 h-6 rounded bg-red-900/80 hover:bg-red-800 flex items-center justify-center text-red-400 hover:text-white"
            title="Delete clip"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================
// VIDEO PLAYER COMPONENT
// ============================================

interface VideoPlayerProps {
  aspectRatio: AspectRatio
}

function VideoPlayer({ aspectRatio }: VideoPlayerProps) {
  const {
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    project,
    selectedClipId,
    setSelectedClip,
  } = useWorkspaceStore()

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const [volume, setVolume] = useState(0.75)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const aspectValue = getAspectRatioValue(aspectRatio)

  if (!project) return null

  const clips = getClipsWithAssets(project.timeline.clips, project.assets)
  const totalDuration = clips.length > 0
    ? Math.max(...clips.map((c) => c.startTime + c.duration))
    : 0

  // Get current clip at playhead position
  const getCurrentClip = useCallback(() => {
    return clips.find(
      (c) => currentTime >= c.startTime && currentTime < c.startTime + c.duration
    ) || null
  }, [clips, currentTime])

  const currentClip = getCurrentClip()

  // Handle fullscreen
  const toggleFullscreen = async () => {
    if (!playerContainerRef.current) return
    try {
      if (!document.fullscreenElement) {
        await playerContainerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (err) {
      console.error("Fullscreen error:", err)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  // Playback timer
  useEffect(() => {
    if (isPlaying && totalDuration > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(Math.min(currentTime + 0.1, totalDuration))
      }, 100)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, currentTime, totalDuration, setCurrentTime])

  // Stop at end
  useEffect(() => {
    if (currentTime >= totalDuration && isPlaying && totalDuration > 0) {
      setIsPlaying(false)
    }
  }, [currentTime, totalDuration, isPlaying, setIsPlaying])

  // Get media URL for current clip
  const getCurrentMediaUrl = () => {
    if (!currentClip?.asset) return null
    return getAssetDisplayUrl(currentClip.asset)
  }

  const currentMediaUrl = getCurrentMediaUrl()
  const isVideo = currentClip?.asset?.type === "video"

  // Sync video playback
  useEffect(() => {
    if (videoRef.current && isVideo) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {})
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying, isVideo])

  // Seek video when clip changes
  useEffect(() => {
    if (videoRef.current && isVideo && currentClip) {
      const timeInClip = currentTime - currentClip.startTime
      videoRef.current.currentTime = currentClip.inPoint + timeInClip
    }
  }, [currentClip?.id])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume
    }
  }, [volume])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${String(secs).padStart(2, "0")}`
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = x / rect.width
    const newTime = percent * totalDuration
    setCurrentTime(newTime)
  }

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = Math.max(0, Math.min(1, x / rect.width))
    setVolume(percent)
  }

  return (
    <div ref={playerContainerRef} className="flex flex-col bg-black rounded-2xl overflow-hidden">
      {/* Video Preview Container */}
      <div className="flex-1 relative flex items-center justify-center bg-zinc-900 p-4">
        <div
          className="relative w-full max-h-full bg-zinc-950 rounded-lg overflow-hidden"
          style={{ aspectRatio: aspectValue }}
        >
          {currentMediaUrl ? (
            isVideo ? (
              <video
                ref={videoRef}
                src={currentMediaUrl}
                className="absolute inset-0 w-full h-full object-contain bg-black"
                loop={false}
                muted={volume === 0}
                playsInline
                onTimeUpdate={(e) => {
                  if (currentClip && isPlaying) {
                    const videoTime = e.currentTarget.currentTime - currentClip.inPoint
                    setCurrentTime(currentClip.startTime + videoTime)
                  }
                }}
              />
            ) : (
              <img
                src={currentMediaUrl}
                alt={currentClip?.asset?.name || "Clip"}
                className="absolute inset-0 w-full h-full object-cover bg-black"
              />
            )
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-center">
              <div>
                <Image className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No clips on timeline</p>
                <p className="text-xs text-zinc-700 mt-2">
                  Add video clips from your assets
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 bg-zinc-900/80 border-t border-zinc-800 flex-shrink-0">
        {/* Preview indicator - shows timeline > current clip */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            {/* Timeline info */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
              <Film className="w-3.5 h-3.5" />
              <span>{clips.length} clip{clips.length !== 1 ? 's' : ''}</span>
              {totalDuration > 0 && (
                <span className="text-zinc-500">• {formatTime(totalDuration)}</span>
              )}
            </div>

            {/* Current clip at playhead */}
            {currentClip && (
              <>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border",
                  selectedClipId === currentClip.id
                    ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                    : "bg-sky-500/20 text-sky-400 border-sky-500/30"
                )}>
                  {currentClip.asset?.type === 'video' ? (
                    <Film className="w-3.5 h-3.5" />
                  ) : (
                    <Image className="w-3.5 h-3.5" />
                  )}
                  <span>{currentClip.asset?.name || "Untitled"}</span>
                  <span className="text-xs opacity-60">
                    {currentClip.startTime.toFixed(1)}s - {(currentClip.startTime + currentClip.duration).toFixed(1)}s
                  </span>
                </div>
              </>
            )}

            {/* No clip indicator */}
            {!currentClip && clips.length > 0 && (
              <>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
                <div className="px-3 py-1.5 rounded-lg text-xs text-zinc-500 border border-dashed border-zinc-700">
                  Gap in timeline
                </div>
              </>
            )}
          </div>

          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-zinc-800 text-zinc-300 border border-zinc-500 hover:bg-zinc-700 hover:text-white"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div
            className="h-2 bg-zinc-700 rounded-full overflow-hidden cursor-pointer"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full transition-all"
              style={{ width: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setCurrentTime(0)}
            className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 transition-all hover:scale-105"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
          </button>

          <button
            onClick={() => setCurrentTime(Math.min(currentTime + 5, totalDuration))}
            className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <div className="ml-4 flex items-center gap-2">
            <button
              onClick={() => setVolume(volume > 0 ? 0 : 0.75)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <div
              className="w-20 h-1.5 bg-zinc-700 rounded-full cursor-pointer"
              onClick={handleVolumeClick}
            >
              <div
                className="h-full bg-zinc-400 rounded-full transition-all"
                style={{ width: `${volume * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// TIMELINE COMPONENT
// ============================================

function Timeline() {
  const {
    project,
    selectedClipId,
    setSelectedClip,
    currentTime,
    setCurrentTime,
    moveClip,
    deleteClip,
    splitClip,
    addClip,
  } = useWorkspaceStore()

  const [scale, setScale] = useState(1)
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragStartTime, setDragStartTime] = useState(0)
  const [isDroppingAsset, setIsDroppingAsset] = useState(false)
  const timelineRef = useRef<HTMLDivElement>(null)

  if (!project) return null

  const clips = getClipsWithAssets(project.timeline.clips, project.assets)
  const totalDuration = clips.length > 0
    ? Math.max(...clips.map((c) => c.startTime + c.duration), 30)
    : 30

  const handleClipClick = (clipId: string) => {
    setSelectedClip(selectedClipId === clipId ? null : clipId)
  }

  const handleDragStart = (e: React.DragEvent, clip: TimelineClipWithAsset) => {
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", clip.id)
    setDraggedClipId(clip.id)
    setDragStartX(e.clientX)
    setDragStartTime(clip.startTime)
  }

  const handleDragEnd = () => {
    setDraggedClipId(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()

    // Check if this is an asset drop from the side panel
    const hasAssetData = e.dataTransfer.types.includes("application/json")
    if (hasAssetData) {
      setIsDroppingAsset(true)
      e.dataTransfer.dropEffect = "copy"
      return
    }

    // Otherwise it's a clip move
    if (!draggedClipId || !timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - 80 // Subtract track label width
    const newTime = Math.max(0, x / (BASE_SCALE * scale))

    // Snap to grid (0.1s increments)
    const snappedTime = Math.round(newTime * 10) / 10

    // Update clip position (optimistic)
    moveClip(draggedClipId, snappedTime)
  }

  const handleDragLeave = () => {
    setIsDroppingAsset(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDroppingAsset(false)

    // Check if this is an asset drop from the side panel
    try {
      const jsonData = e.dataTransfer.getData("application/json")
      if (jsonData) {
        const data = JSON.parse(jsonData)
        if (data.type === "asset" && data.assetId && timelineRef.current) {
          const rect = timelineRef.current.getBoundingClientRect()
          const x = e.clientX - rect.left - 80 // Subtract track label width
          const dropTime = Math.max(0, x / (BASE_SCALE * scale))
          const snappedTime = Math.round(dropTime * 10) / 10

          // Add clip at the drop position
          await addClip(data.assetId, snappedTime, {
            duration: data.duration || 5,
          })
          return
        }
      }
    } catch {
      // Not JSON data, ignore
    }

    // Regular clip drop
    setDraggedClipId(null)
  }

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = Math.max(0, x / (BASE_SCALE * scale))
    setCurrentTime(time)
    setSelectedClip(null)
  }

  const handleDeleteClip = async (clipId: string) => {
    await deleteClip(clipId)
  }

  const handleSplitClip = async (clipId: string, splitTime: number) => {
    await splitClip(clipId, splitTime)
  }

  // Calculate playhead position
  const playheadPosition = currentTime * BASE_SCALE * scale

  return (
    <div className="border-t border-zinc-800 bg-zinc-900/50">
      {/* Timeline Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-medium text-zinc-300">Timeline</h3>
          <span className="text-xs text-zinc-500">
            {clips.length} clip{clips.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(Math.max(0.5, scale - 0.25))}
            className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-zinc-500 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(Math.min(2, scale + 0.25))}
            className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="p-4 overflow-x-auto">
        {/* Time ruler */}
        <div className="h-6 mb-2 flex items-end border-b border-zinc-800">
          {Array.from({ length: Math.ceil(totalDuration / 5) + 1 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 text-[10px] text-zinc-600"
              style={{ width: `${5 * BASE_SCALE * scale}px` }}
            >
              {i * 5}s
            </div>
          ))}
        </div>

        {/* Track Container */}
        <div
          ref={timelineRef}
          className={cn(
            "relative h-16 rounded-lg cursor-pointer transition-colors",
            isDroppingAsset
              ? "bg-sky-500/20 border-2 border-dashed border-sky-500/50"
              : "bg-zinc-800/50"
          )}
          style={{ width: `${totalDuration * BASE_SCALE * scale}px`, minWidth: "100%" }}
          onClick={handleTimelineClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Track label */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-zinc-900 border-r border-zinc-700 flex items-center justify-center text-xs text-zinc-500 z-20">
            Video
          </div>

          {/* Clips */}
          <div className="absolute left-20 right-0 top-0 bottom-0">
            {clips.map((clip) => (
              <ClipBlock
                key={clip.id}
                clip={clip}
                isSelected={clip.id === selectedClipId}
                scale={scale}
                onClick={() => handleClipClick(clip.id)}
                onDragStart={(e) => handleDragStart(e, clip)}
                onDragEnd={handleDragEnd}
                onDelete={() => handleDeleteClip(clip.id)}
                onSplit={(splitTime) => handleSplitClip(clip.id, splitTime)}
              />
            ))}
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
            style={{ left: `${80 + playheadPosition}px` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
          </div>

          {/* Empty state */}
          {clips.length === 0 && (
            <div className="absolute left-20 right-0 top-0 bottom-0 flex items-center justify-center text-zinc-600 text-sm">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>Add clips from your asset library</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// EDITOR PAGE
// ============================================

export function EditorPage() {
  const { project } = useWorkspaceStore()

  if (!project) return null

  const aspectRatio = project.brief.aspectRatio || "16:9"

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Video Player Section */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="max-w-5xl w-full mx-auto">
          <VideoPlayer aspectRatio={aspectRatio} />
        </div>
      </div>

      {/* Timeline */}
      <Timeline />
    </div>
  )
}
