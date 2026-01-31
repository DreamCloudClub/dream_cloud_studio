import { Film, Music, Plus, Lock, Unlock } from "lucide-react"
import { cn } from "@/lib/utils"
import { TimelineClipWithAsset } from "@/state/workspaceStore"
import { ClipBlock, BASE_SCALE } from "./ClipBlock"

export type TrackType = "video" | "audio"

interface TimelineTrackProps {
  id: string
  type: TrackType
  label: string
  clips: TimelineClipWithAsset[]
  selectedClipId: string | null
  scale: number
  totalDuration: number
  isDroppingAsset: boolean
  isDragTarget?: boolean
  autoSnap: boolean
  onToggleAutoSnap: () => void
  onClipClick: (clipId: string) => void
  onClipDragStart: (e: React.DragEvent, clip: TimelineClipWithAsset) => void
  onClipDragEnd: () => void
  onClipDelete: (clipId: string) => void
  onClipSplit: (clipId: string, splitTime: number) => void
  onClipTrimStart: (clipId: string, newStartTime: number, newInPoint: number, newDuration: number) => void
  onClipTrimEnd: (clipId: string, newDuration: number) => void
  onTrackClick: (e: React.MouseEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
}

export function TimelineTrack({
  id: _id,
  type,
  label,
  clips,
  selectedClipId,
  scale,
  totalDuration,
  isDroppingAsset,
  isDragTarget,
  autoSnap,
  onToggleAutoSnap,
  onClipClick,
  onClipDragStart,
  onClipDragEnd,
  onClipDelete,
  onClipSplit,
  onClipTrimStart,
  onClipTrimEnd,
  onTrackClick,
  onDragOver,
  onDragLeave,
  onDrop,
}: TimelineTrackProps) {
  const Icon = type === "video" ? Film : Music

  return (
    <div className="flex h-16 border-b border-zinc-800 last:border-b-0">
      {/* Track Label - Sticky on left */}
      <div className="w-20 flex-shrink-0 bg-zinc-900 border-r border-zinc-700 flex items-center justify-center gap-1 sticky left-0 z-20">
        <Icon className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs text-zinc-500">{label}</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleAutoSnap()
          }}
          className={cn(
            "w-5 h-5 rounded flex items-center justify-center transition-colors ml-0.5",
            autoSnap
              ? "bg-sky-500/20 text-sky-400 hover:bg-sky-500/30"
              : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800"
          )}
          title={autoSnap ? "Auto-snap ON" : "Auto-snap OFF"}
        >
          {autoSnap ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
        </button>
      </div>

      {/* Track Content */}
      <div
        className={cn(
          "relative flex-1 cursor-pointer transition-colors",
          isDroppingAsset
            ? "bg-sky-500/20 border-2 border-dashed border-sky-500/50"
            : isDragTarget
            ? "bg-emerald-500/20 border-2 border-dashed border-emerald-500/50"
            : "bg-zinc-800/50 hover:bg-zinc-800/70"
        )}
        style={{
          width: `${totalDuration * BASE_SCALE * scale}px`,
          minWidth: "100%"
        }}
        onClick={onTrackClick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Clips */}
        {clips.map((clip) => (
          <ClipBlock
            key={clip.id}
            clip={clip}
            isSelected={clip.id === selectedClipId}
            scale={scale}
            onClick={() => onClipClick(clip.id)}
            onDragStart={(e) => onClipDragStart(e, clip)}
            onDragEnd={onClipDragEnd}
            onDelete={() => onClipDelete(clip.id)}
            onSplit={(splitTime) => onClipSplit(clip.id, splitTime)}
            onTrimStart={onClipTrimStart}
            onTrimEnd={onClipTrimEnd}
          />
        ))}

        {/* Empty state */}
        {clips.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-start pl-6 text-zinc-600 text-sm pointer-events-none">
            <div className="flex items-center gap-2 opacity-50">
              <Plus className="w-4 h-4" />
              <span>Drop {type} clips here</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
