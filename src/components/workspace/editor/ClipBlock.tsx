import { useState, useCallback, useEffect } from "react"
import { Scissors, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { TimelineClipWithAsset } from "@/state/workspaceStore"
import { getAssetDisplayUrl } from "@/services/localStorage"

// Base timeline scale: pixels per second
export const BASE_SCALE = 40

// Minimum clip duration in seconds
const MIN_CLIP_DURATION = 0.5

interface ClipBlockProps {
  clip: TimelineClipWithAsset
  isSelected: boolean
  scale: number
  onClick: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onDelete: () => void
  onSplit: (splitTime: number) => void
  onTrimStart?: (clipId: string, newStartTime: number, newInPoint: number, newDuration: number) => void
  onTrimEnd?: (clipId: string, newDuration: number) => void
}

export function ClipBlock({
  clip,
  isSelected,
  scale,
  onClick,
  onDragStart,
  onDragEnd,
  onDelete,
  onSplit,
  onTrimStart,
  onTrimEnd,
}: ClipBlockProps) {
  const [isTrimming, setIsTrimming] = useState<"start" | "end" | null>(null)
  const [trimStartX, setTrimStartX] = useState(0)
  const [originalClipData, setOriginalClipData] = useState<{
    startTime: number
    inPoint: number
    duration: number
  } | null>(null)

  const width = clip.duration * BASE_SCALE * scale
  const left = clip.startTime * BASE_SCALE * scale

  const asset = clip.asset
  const thumbnailUrl = asset ? getAssetDisplayUrl(asset) : null
  const isVideo = asset?.type === "video"

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isTrimming) {
      onClick()
    }
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

  // Trim handle mouse down - start trimming
  const handleTrimMouseDown = useCallback((e: React.MouseEvent, edge: "start" | "end") => {
    e.stopPropagation()
    e.preventDefault()
    setIsTrimming(edge)
    setTrimStartX(e.clientX)
    setOriginalClipData({
      startTime: clip.startTime,
      inPoint: clip.inPoint || 0,
      duration: clip.duration,
    })
  }, [clip.startTime, clip.inPoint, clip.duration])

  // Handle trim dragging
  useEffect(() => {
    if (!isTrimming || !originalClipData) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - trimStartX
      const deltaTime = deltaX / (BASE_SCALE * scale)

      if (isTrimming === "start") {
        // Trimming start: adjust startTime, inPoint, and duration
        const maxDelta = originalClipData.duration - MIN_CLIP_DURATION
        const minDelta = -originalClipData.inPoint // Can't go before the source start
        const clampedDelta = Math.max(minDelta, Math.min(maxDelta, deltaTime))

        const newStartTime = Math.max(0, originalClipData.startTime + clampedDelta)
        const newInPoint = Math.max(0, originalClipData.inPoint + clampedDelta)
        const newDuration = originalClipData.duration - clampedDelta

        if (newDuration >= MIN_CLIP_DURATION) {
          onTrimStart?.(clip.id, newStartTime, newInPoint, newDuration)
        }
      } else {
        // Trimming end: can shorten or extend back, but not beyond source length
        const assetDuration = asset?.duration
        const currentInPoint = originalClipData.inPoint

        // Max duration is whatever source content remains after the in-point
        // For images (no duration), use current duration as max (can't extend)
        const maxDuration = assetDuration
          ? assetDuration - currentInPoint
          : originalClipData.duration

        const newDuration = Math.max(
          MIN_CLIP_DURATION,
          Math.min(maxDuration, originalClipData.duration + deltaTime)
        )
        onTrimEnd?.(clip.id, newDuration)
      }
    }

    const handleMouseUp = () => {
      setIsTrimming(null)
      setOriginalClipData(null)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isTrimming, trimStartX, originalClipData, scale, clip.id, asset, onTrimStart, onTrimEnd])

  return (
    <div
      draggable={!isTrimming}
      onDragStart={isTrimming ? undefined : onDragStart}
      onDragEnd={onDragEnd}
      onClick={handleClick}
      className={cn(
        "absolute top-1 h-12 rounded-lg flex items-center text-xs font-medium transition-all overflow-hidden group",
        isTrimming ? "cursor-ew-resize" : "cursor-grab active:cursor-grabbing",
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
      {/* Left trim handle */}
      <div
        onMouseDown={(e) => handleTrimMouseDown(e, "start")}
        className={cn(
          "absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 group/trim",
          "hover:bg-white/30 transition-colors",
          isTrimming === "start" && "bg-white/40"
        )}
      >
        <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white/50 rounded-full opacity-0 group-hover/trim:opacity-100 transition-opacity" />
      </div>

      {/* Right trim handle */}
      <div
        onMouseDown={(e) => handleTrimMouseDown(e, "end")}
        className={cn(
          "absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 group/trim",
          "hover:bg-white/30 transition-colors",
          isTrimming === "end" && "bg-white/40"
        )}
      >
        <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white/50 rounded-full opacity-0 group-hover/trim:opacity-100 transition-opacity" />
      </div>

      {/* Thumbnail/Preview */}
      {thumbnailUrl && (
        <>
          {isVideo ? (
            <video
              src={thumbnailUrl}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              preload="metadata"
              muted
              playsInline
            />
          ) : (
            <img
              src={thumbnailUrl}
              alt={asset?.name || "Clip"}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60 pointer-events-none" />
        </>
      )}

      {/* Content */}
      <div className="relative flex items-center w-full px-3 z-10 pointer-events-none">
        <span className="truncate text-white text-shadow flex-1">
          {asset?.name || "Untitled"}
        </span>
        <span className="text-[10px] text-white/70 ml-1 flex-shrink-0">
          {clip.duration.toFixed(1)}s
        </span>
      </div>

      {/* Action buttons - visible on selection */}
      {isSelected && !isTrimming && (
        <div className="absolute -top-8 left-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-30">
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
