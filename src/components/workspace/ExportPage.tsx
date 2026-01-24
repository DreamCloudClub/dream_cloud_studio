import { useState } from "react"
import {
  Download,
  Monitor,
  Film,
  Gauge,
  Sparkles,
  Clock,
  HardDrive,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Loader2,
  Maximize2,
  Volume2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkspaceStore, ExportSettings } from "@/state/workspaceStore"

type RenderStatus = "idle" | "rendering" | "complete" | "error"

const resolutionOptions: { value: ExportSettings["resolution"]; label: string; description: string }[] = [
  { value: "720p", label: "720p HD", description: "1280 x 720 • Good for web" },
  { value: "1080p", label: "1080p Full HD", description: "1920 x 1080 • Recommended" },
  { value: "4k", label: "4K Ultra HD", description: "3840 x 2160 • Best quality" },
]

const formatOptions: { value: ExportSettings["format"]; label: string; description: string }[] = [
  { value: "mp4", label: "MP4", description: "H.264 • Most compatible" },
  { value: "webm", label: "WebM", description: "VP9 • Web optimized" },
  { value: "mov", label: "MOV", description: "ProRes • Professional editing" },
]

const frameRateOptions: { value: ExportSettings["frameRate"]; label: string }[] = [
  { value: 24, label: "24 fps • Cinematic" },
  { value: 30, label: "30 fps • Standard" },
  { value: 60, label: "60 fps • Smooth" },
]

const qualityOptions: { value: ExportSettings["quality"]; label: string; description: string }[] = [
  { value: "draft", label: "Draft", description: "Fast preview • Lower quality" },
  { value: "standard", label: "Standard", description: "Balanced • Good for most uses" },
  { value: "high", label: "High", description: "Maximum quality • Larger file" },
]

export function ExportPage() {
  const { project, updateExportSettings } = useWorkspaceStore()
  const [renderStatus, setRenderStatus] = useState<RenderStatus>("idle")
  const [renderProgress, setRenderProgress] = useState(0)

  if (!project) return null

  const { exportSettings } = project

  // Calculate estimated values
  const totalDuration = project.scenes.reduce(
    (acc, scene) =>
      acc + scene.shots.reduce((shotAcc, shot) => shotAcc + shot.duration, 0),
    0
  )

  const estimatedSize = (() => {
    const baseSize = totalDuration * 2 // ~2MB per second at 1080p standard
    const resMultiplier = exportSettings.resolution === "4k" ? 4 : exportSettings.resolution === "720p" ? 0.5 : 1
    const qualityMultiplier = exportSettings.quality === "high" ? 1.5 : exportSettings.quality === "draft" ? 0.5 : 1
    return Math.round(baseSize * resMultiplier * qualityMultiplier)
  })()

  const handleStartRender = () => {
    setRenderStatus("rendering")
    setRenderProgress(0)

    // Simulate rendering progress
    const interval = setInterval(() => {
      setRenderProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setRenderStatus("complete")
          return 100
        }
        return prev + Math.random() * 5
      })
    }, 200)
  }

  const [isPlaying, setIsPlaying] = useState(false)
  const [previewTime, setPreviewTime] = useState(0)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${String(secs).padStart(2, "0")}`
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-8">
        {/* Video Preview Panel */}
        <div className="bg-black rounded-2xl overflow-hidden">
          {/* Video Display */}
          <div className="aspect-video relative bg-zinc-900 flex items-center justify-center">
            {/* Placeholder for video */}
            <div className="text-zinc-600 text-center">
              <Film className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Final video preview</p>
            </div>

            {/* Fullscreen button */}
            <button className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-black/50 hover:bg-black/70 flex items-center justify-center text-white/70 hover:text-white transition-colors">
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>

          {/* Playback Controls */}
          <div className="p-4 bg-zinc-900/80">
            {/* Progress bar */}
            <div className="mb-3">
              <div className="h-1 bg-zinc-700 rounded-full overflow-hidden cursor-pointer">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full transition-all"
                  style={{ width: `${(previewTime / totalDuration) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-zinc-500 mt-1">
                <span>{formatTime(previewTime)}</span>
                <span>{formatTime(totalDuration)}</span>
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 transition-all hover:scale-105"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>

              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-zinc-500" />
                <div className="w-20 h-1 bg-zinc-700 rounded-full">
                  <div className="w-3/4 h-full bg-zinc-500 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Export Settings</h1>
          <p className="text-zinc-400 mt-1">
            Configure your render settings and export your project
          </p>
        </div>

        {/* Project Summary */}
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-2xl p-6">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-4">
            Project Summary
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold text-zinc-100">
                {project.scenes.length}
              </p>
              <p className="text-sm text-zinc-500">Scenes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">
                {project.scenes.reduce((acc, s) => acc + s.shots.length, 0)}
              </p>
              <p className="text-sm text-zinc-500">Shots</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">
                {Math.floor(totalDuration / 60)}:{String(totalDuration % 60).padStart(2, "0")}
              </p>
              <p className="text-sm text-zinc-500">Duration</p>
            </div>
          </div>
        </div>

        {/* Resolution */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Monitor className="w-4 h-4 text-sky-400" />
            Resolution
          </label>
          <div className="grid grid-cols-3 gap-3">
            {resolutionOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => updateExportSettings({ resolution: option.value })}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  exportSettings.resolution === option.value
                    ? "border-sky-500 bg-sky-500/10"
                    : "border-zinc-700 hover:border-zinc-600 bg-zinc-800/30"
                )}
              >
                <p className="font-medium text-zinc-100">{option.label}</p>
                <p className="text-xs text-zinc-500 mt-1">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Film className="w-4 h-4 text-sky-400" />
            Format
          </label>
          <div className="grid grid-cols-3 gap-3">
            {formatOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => updateExportSettings({ format: option.value })}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  exportSettings.format === option.value
                    ? "border-sky-500 bg-sky-500/10"
                    : "border-zinc-700 hover:border-zinc-600 bg-zinc-800/30"
                )}
              >
                <p className="font-medium text-zinc-100">{option.label}</p>
                <p className="text-xs text-zinc-500 mt-1">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Frame Rate */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Gauge className="w-4 h-4 text-sky-400" />
            Frame Rate
          </label>
          <div className="flex items-center gap-3">
            {frameRateOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => updateExportSettings({ frameRate: option.value })}
                className={cn(
                  "px-4 py-2.5 rounded-xl border-2 text-sm transition-all",
                  exportSettings.frameRate === option.value
                    ? "border-sky-500 bg-sky-500/10 text-zinc-100"
                    : "border-zinc-700 hover:border-zinc-600 bg-zinc-800/30 text-zinc-400"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quality */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Sparkles className="w-4 h-4 text-sky-400" />
            Quality
          </label>
          <div className="grid grid-cols-3 gap-3">
            {qualityOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => updateExportSettings({ quality: option.value })}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  exportSettings.quality === option.value
                    ? "border-sky-500 bg-sky-500/10"
                    : "border-zinc-700 hover:border-zinc-600 bg-zinc-800/30"
                )}
              >
                <p className="font-medium text-zinc-100">{option.label}</p>
                <p className="text-xs text-zinc-500 mt-1">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Estimates */}
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-2xl p-6">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-4">
            Estimated Output
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <p className="text-lg font-semibold text-zinc-100">~2-5 min</p>
                <p className="text-sm text-zinc-500">Render time</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <p className="text-lg font-semibold text-zinc-100">~{estimatedSize} MB</p>
                <p className="text-sm text-zinc-500">File size</p>
              </div>
            </div>
          </div>
        </div>

        {/* Render Status / Button */}
        {renderStatus === "idle" && (
          <button
            onClick={handleStartRender}
            className="w-full py-4 bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 rounded-2xl text-white font-semibold text-lg shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 transition-all hover:scale-[1.02] inline-flex items-center justify-center gap-3"
          >
            <Download className="w-5 h-5" />
            Start Render
          </button>
        )}

        {renderStatus === "rendering" && (
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
                <span className="font-medium text-zinc-100">Rendering...</span>
              </div>
              <span className="text-sm text-zinc-400">
                {Math.round(renderProgress)}%
              </span>
            </div>
            <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${renderProgress}%` }}
              />
            </div>
            <p className="text-sm text-zinc-500">
              Processing scene {Math.ceil((renderProgress / 100) * project.scenes.length)} of {project.scenes.length}...
            </p>
          </div>
        )}

        {renderStatus === "complete" && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
              <span className="font-semibold text-emerald-400">Render Complete!</span>
            </div>
            <p className="text-sm text-zinc-400">
              Your video has been rendered successfully and is ready for download.
            </p>
            <div className="flex items-center gap-3">
              <button className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 rounded-xl text-white font-medium inline-flex items-center justify-center gap-2 transition-colors">
                <Download className="w-4 h-4" />
                Download Video
              </button>
              <button className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 font-medium inline-flex items-center justify-center gap-2 transition-colors">
                <Play className="w-4 h-4" />
                Preview
              </button>
            </div>
          </div>
        )}

        {renderStatus === "error" && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <span className="font-semibold text-red-400">Render Failed</span>
            </div>
            <p className="text-sm text-zinc-400">
              Something went wrong during rendering. Please try again.
            </p>
            <button
              onClick={handleStartRender}
              className="py-3 px-6 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-red-400 font-medium inline-flex items-center justify-center gap-2 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
