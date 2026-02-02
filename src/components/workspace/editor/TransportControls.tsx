import { useState } from "react"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Volume2,
  VolumeX,
  RefreshCw,
} from "lucide-react"
import { syncAllVideoDurations } from "@/services/assets"

interface TransportControlsProps {
  isPlaying: boolean
  currentTime: number
  totalDuration: number
  isMuted: boolean
  isFullscreen: boolean
  scale: number
  onPlayPause: () => void
  onSkipBack: () => void
  onSkipForward: () => void
  onToggleMute: () => void
  onToggleFullscreen: () => void
  onScaleChange: (scale: number) => void
  onDurationsSync?: () => void
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${String(secs).padStart(2, "0")}`
}

export function TransportControls({
  isPlaying,
  currentTime,
  totalDuration,
  isMuted,
  isFullscreen,
  scale,
  onPlayPause,
  onSkipBack,
  onSkipForward,
  onToggleMute,
  onToggleFullscreen,
  onScaleChange,
  onDurationsSync,
}: TransportControlsProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)

  const handleSyncDurations = async () => {
    setIsSyncing(true)
    setSyncStatus("Syncing...")
    try {
      const result = await syncAllVideoDurations((current, total, name) => {
        setSyncStatus(`${current}/${total}: ${name}`)
      })
      setSyncStatus(`Done! Updated ${result.updated}, failed ${result.failed}`)
      setTimeout(() => setSyncStatus(null), 3000)
      onDurationsSync?.()
    } catch (err) {
      setSyncStatus("Sync failed")
      setTimeout(() => setSyncStatus(null), 3000)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex-shrink-0 h-10 px-3 bg-zinc-900 border-b border-zinc-800 flex items-center gap-3">
      {/* Playback controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onSkipBack}
          className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onPlayPause}
          className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-md hover:shadow-lg transition-all hover:scale-105"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>

        <button
          onClick={onSkipForward}
          className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Time display */}
      <div className="text-xs text-zinc-400 tabular-nums">
        {formatTime(currentTime)} <span className="text-zinc-600">/</span> {formatTime(totalDuration)}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onScaleChange(Math.max(0.5, scale - 0.25))}
          className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
          <ZoomOut className="w-3 h-3" />
        </button>
        <span className="text-xs text-zinc-500 w-10 text-center tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => onScaleChange(Math.min(2, scale + 0.25))}
          className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
          <ZoomIn className="w-3 h-3" />
        </button>
      </div>

      {/* Mute */}
      <button
        onClick={onToggleMute}
        className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
      >
        {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      </button>

      {/* Fullscreen */}
      <button
        onClick={onToggleFullscreen}
        className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
      >
        {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
      </button>

      {/* Sync Durations */}
      <button
        onClick={handleSyncDurations}
        disabled={isSyncing}
        className="h-6 px-2 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center gap-1 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
        title="Sync video durations from actual files"
      >
        <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
        <span className="text-xs">{syncStatus || 'Sync'}</span>
      </button>
    </div>
  )
}
