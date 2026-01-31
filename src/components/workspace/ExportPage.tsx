import { useState, useMemo, useRef, useCallback } from "react"
import { PlayerRef } from "@remotion/player"
import {
  Download,
  Monitor,
  Film,
  Gauge,
  Sparkles,
  Clock,
  HardDrive,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  Copy,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkspaceStore, ExportSettings, getClipsWithAssets } from "@/state/workspaceStore"
import { VideoPreview } from "@/remotion/VideoPreview"
import type { Shot as RemotionShot } from "@/remotion/Root"
import { getAssetDisplayUrl } from "@/services/localStorage"

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
  const [copied, setCopied] = useState(false)
  const playerRef = useRef<PlayerRef>(null)

  if (!project) return null

  const { exportSettings } = project

  // Get clips with their assets
  const clips = getClipsWithAssets(project.timeline.clips, project.assets)

  // Transform timeline clips to Remotion format
  const remotionShots = useMemo((): RemotionShot[] => {
    const shots: RemotionShot[] = []

    // Sort clips by start time
    const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime)

    for (const clip of sortedClips) {
      if (!clip.asset) continue

      const src = getAssetDisplayUrl(clip.asset)
      if (!src) continue

      const type = clip.asset.type === "video" ? "video" : "image"

      shots.push({
        id: clip.id,
        type,
        src,
        duration: clip.duration,
        transition: "fade",
        scale: clip.transform?.scale,
        positionX: clip.transform?.positionX,
        positionY: clip.transform?.positionY,
        pan: clip.animation?.pan,
      })
    }

    return shots
  }, [clips])

  // Calculate estimated values
  const totalDuration = clips.reduce((acc, clip) => Math.max(acc, clip.startTime + clip.duration), 0)

  const estimatedSize = (() => {
    const baseSize = totalDuration * 2 // ~2MB per second at 1080p standard
    const resMultiplier = exportSettings.resolution === "4k" ? 4 : exportSettings.resolution === "720p" ? 0.5 : 1
    const qualityMultiplier = exportSettings.quality === "high" ? 1.5 : exportSettings.quality === "draft" ? 0.5 : 1
    return Math.round(baseSize * resMultiplier * qualityMultiplier)
  })()

  // Generate Remotion render command
  const getRenderCommand = useCallback(() => {
    const resolution = exportSettings.resolution === "4k" ? "3840x2160"
      : exportSettings.resolution === "720p" ? "1280x720"
      : "1920x1080"
    const [width, height] = resolution.split("x")

    return `npx remotion render src/remotion/index.ts VideoComposition out/${project.name || "video"}.${exportSettings.format} --props='${JSON.stringify({ shots: remotionShots })}' --width=${width} --height=${height} --fps=${exportSettings.frameRate}`
  }, [project.name, exportSettings, remotionShots])

  const handleCopyCommand = useCallback(() => {
    navigator.clipboard.writeText(getRenderCommand())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [getRenderCommand])

  // Download a single video/image source directly
  const handleDownloadSource = useCallback(async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error("Download error:", error)
      // Fallback: open in new tab
      window.open(url, "_blank")
    }
  }, [])

  const handleStartRender = useCallback(async () => {
    if (remotionShots.length === 0) {
      setRenderStatus("error")
      return
    }

    // For single shot, download directly
    if (remotionShots.length === 1 && remotionShots[0].src) {
      const shot = remotionShots[0]
      const ext = shot.type === "video" ? "mp4" : "jpg"
      await handleDownloadSource(shot.src, `${project.name || "export"}.${ext}`)
      return
    }

    // For multiple shots, show the CLI command
    setRenderStatus("complete")
    setRenderProgress(100)
  }, [remotionShots, project.name, handleDownloadSource])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${String(secs).padStart(2, "0")}`
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-8">
        {/* Video Preview Panel */}
        <div className="aspect-video relative bg-zinc-900 rounded-2xl overflow-hidden">
          {remotionShots.length > 0 ? (
            <VideoPreview
              ref={playerRef}
              shots={remotionShots}
              width="100%"
              height="100%"
              autoPlay={false}
              loop={false}
              controls={true}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600 text-center">
              <div>
                <Film className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No clips to preview</p>
                <p className="text-xs text-zinc-700 mt-2">Add clips to your timeline first</p>
              </div>
            </div>
          )}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-zinc-100">
                {clips.length}
              </p>
              <p className="text-sm text-zinc-500">Clips</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">
                {Math.floor(totalDuration / 60)}:{String(Math.round(totalDuration % 60)).padStart(2, "0")}
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
                <p className="text-lg font-semibold text-zinc-100">~{formatTime(totalDuration)}</p>
                <p className="text-sm text-zinc-500">Render time (real-time)</p>
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
            className="w-full py-4 bg-orange-500/10 border-2 border-orange-400 rounded-2xl text-orange-400 font-semibold text-lg hover:bg-orange-500/20 hover:border-orange-300 hover:text-orange-300 transition-all hover:scale-[1.02] inline-flex items-center justify-center gap-3"
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
              Processing clip {Math.ceil((renderProgress / 100) * clips.length)} of {clips.length}...
            </p>
          </div>
        )}

        {renderStatus === "complete" && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
              <span className="font-semibold text-emerald-400">Export Options</span>
            </div>

            {/* Download individual clips */}
            {remotionShots.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-zinc-400">Download source files:</p>
                <div className="flex flex-wrap gap-2">
                  {remotionShots.map((shot, i) => (
                    <button
                      key={shot.id}
                      onClick={() => handleDownloadSource(
                        shot.src!,
                        `${project.name || "clip"}-${i + 1}.${shot.type === "video" ? "mp4" : "jpg"}`
                      )}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
                    >
                      Clip {i + 1} ({shot.type})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CLI Command */}
            <div className="pt-2 border-t border-zinc-700">
              <p className="text-sm text-zinc-400 mb-2">
                For combined video with transitions, use Remotion CLI:
              </p>
              <div className="bg-zinc-900 rounded-lg p-3 font-mono text-xs text-zinc-300 overflow-x-auto">
                <code>{getRenderCommand()}</code>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyCommand}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 rounded-xl text-white font-medium inline-flex items-center justify-center gap-2 transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy CLI Command
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setRenderStatus("idle")
                  setRenderProgress(0)
                }}
                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 font-medium inline-flex items-center justify-center gap-2 transition-colors"
              >
                Back
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
