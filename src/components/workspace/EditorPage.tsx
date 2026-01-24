import { useState } from "react"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Maximize2,
  Mic,
  Plus,
  ZoomIn,
  ZoomOut,
  Film,
  Layers,
  Clapperboard,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkspaceStore, Scene, Shot, AspectRatio } from "@/state/workspaceStore"

// Base timeline scale: pixels per second
const BASE_SCALE = 40

// Convert aspect ratio string to numeric ratio for CSS
function getAspectRatioValue(ratio: AspectRatio): number {
  const [w, h] = ratio.split(":").map(Number)
  return w / h
}

interface ShotBlockProps {
  shot: Shot
  sceneId: string
  isSelected: boolean
  scale: number
  onClick: () => void
}

function ShotBlock({ shot, sceneId, isSelected, scale, onClick }: ShotBlockProps) {
  const width = shot.duration * BASE_SCALE * scale

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick()
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "h-12 rounded-lg flex items-center justify-center text-xs font-medium transition-all overflow-hidden",
        "bg-gradient-to-br from-orange-500 to-orange-600",
        isSelected
          ? "ring-2 ring-white shadow-lg shadow-orange-500/30"
          : "hover:brightness-110"
      )}
      style={{ width: `${Math.max(width, 50)}px` }}
    >
      <span className="truncate px-2 text-white">
        {shot.name}
      </span>
    </button>
  )
}

interface VoiceoverBlockProps {
  scene: Scene
  scale: number
}

function VoiceoverBlock({ scene, scale }: VoiceoverBlockProps) {
  const sceneDuration = scene.shots.reduce((acc, s) => acc + s.duration, 0)
  const width = sceneDuration * BASE_SCALE * scale
  const hasVoiceover = scene.voiceover?.audioUrl

  return (
    <div
      className={cn(
        "h-8 rounded-md flex items-center gap-2 px-2 text-xs",
        hasVoiceover
          ? "bg-sky-500/30 text-sky-300"
          : "border border-dashed border-zinc-600 text-zinc-500"
      )}
      style={{ width: `${Math.max(width, 50)}px` }}
    >
      <Mic className="w-3 h-3 flex-shrink-0" />
      <span className="truncate">
        {scene.voiceover?.script || "No voiceover"}
      </span>
    </div>
  )
}

interface SceneContainerProps {
  scene: Scene
  isSelected: boolean
  selectedShotId: string | null
  scale: number
  onSceneClick: () => void
  onShotClick: (shotId: string) => void
}

function SceneContainer({ scene, isSelected, selectedShotId, scale, onSceneClick, onShotClick }: SceneContainerProps) {
  const sceneDuration = scene.shots.reduce((acc, s) => acc + s.duration, 0)
  const width = sceneDuration * BASE_SCALE * scale + 24 // padding for inner container

  return (
    <div
      className={cn(
        "relative rounded-xl flex-shrink-0 overflow-hidden transition-colors",
        isSelected
          ? "bg-sky-500"
          : "bg-sky-500/60 hover:bg-sky-500/80"
      )}
      style={{ width: `${Math.max(width, 80)}px` }}
    >
      {/* Scene Header - Clickable area to select scene */}
      <button
        onClick={onSceneClick}
        className={cn(
          "w-full px-3 py-2 text-left text-xs font-medium transition-colors",
          isSelected
            ? "text-white"
            : "text-sky-100 hover:text-white"
        )}
      >
        {scene.name}
      </button>

      {/* Inner dark container for shots */}
      <div className="bg-zinc-900 rounded-lg mx-1 mb-1 p-2">
        {/* Shots Row */}
        <div className="flex items-center gap-1 mb-2">
          {scene.shots
            .sort((a, b) => a.order - b.order)
            .map((shot) => (
              <ShotBlock
                key={shot.id}
                shot={shot}
                sceneId={scene.id}
                isSelected={shot.id === selectedShotId}
                scale={scale}
                onClick={() => {
                  onShotClick(shot.id)
                }}
              />
            ))}
          {/* Add shot button */}
          <button
            className="w-8 h-12 rounded-lg border-2 border-dashed border-orange-500/30 hover:border-orange-500/60 flex items-center justify-center text-orange-500/50 hover:text-orange-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Voiceover Row */}
        <VoiceoverBlock scene={scene} scale={scale} />
      </div>
    </div>
  )
}

// Preview mode indicator
type PreviewMode = "project" | "scene" | "shot"

interface PreviewIndicatorProps {
  mode: PreviewMode
  sceneName?: string
  shotName?: string
  onClear: () => void
}

function PreviewIndicator({ mode, sceneName, shotName, onClear }: PreviewIndicatorProps) {
  const getIcon = () => {
    switch (mode) {
      case "project": return Film
      case "scene": return Layers
      case "shot": return Clapperboard
    }
  }

  const getLabel = () => {
    switch (mode) {
      case "project": return "Full Project"
      case "scene": return sceneName || "Scene"
      case "shot": return shotName || "Shot"
    }
  }

  const getColor = () => {
    switch (mode) {
      case "project": return "bg-zinc-700 text-zinc-300"
      case "scene": return "bg-sky-500/20 text-sky-400 border border-sky-500/30"
      case "shot": return "bg-orange-500/20 text-orange-400 border border-orange-500/30"
    }
  }

  const Icon = getIcon()

  return (
    <div className="absolute top-4 left-4 flex items-center gap-2">
      <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium", getColor())}>
        <Icon className="w-3.5 h-3.5" />
        <span>Previewing: {getLabel()}</span>
      </div>
      {mode !== "project" && (
        <button
          onClick={onClear}
          className="px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
        >
          View All
        </button>
      )}
    </div>
  )
}

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
    selectedSceneId,
    selectedShotId,
    setSelectedScene,
    setSelectedShot,
  } = useWorkspaceStore()

  const aspectValue = getAspectRatioValue(aspectRatio)

  // Determine preview mode and content
  const getPreviewInfo = () => {
    if (selectedShotId && project) {
      // Find the shot
      for (const scene of project.scenes) {
        const shot = scene.shots.find(s => s.id === selectedShotId)
        if (shot) {
          return {
            mode: "shot" as PreviewMode,
            duration: shot.duration,
            sceneName: scene.name,
            shotName: shot.name,
          }
        }
      }
    }

    if (selectedSceneId && project) {
      const scene = project.scenes.find(s => s.id === selectedSceneId)
      if (scene) {
        const duration = scene.shots.reduce((acc, s) => acc + s.duration, 0)
        return {
          mode: "scene" as PreviewMode,
          duration,
          sceneName: scene.name,
          shotName: undefined,
        }
      }
    }

    // Full project
    const duration = project?.scenes.reduce(
      (acc, scene) =>
        acc + scene.shots.reduce((shotAcc, shot) => shotAcc + shot.duration, 0),
      0
    ) || 0

    return {
      mode: "project" as PreviewMode,
      duration,
      sceneName: undefined,
      shotName: undefined,
    }
  }

  const previewInfo = getPreviewInfo()

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${String(secs).padStart(2, "0")}`
  }

  const handleClearSelection = () => {
    setSelectedScene(null)
    setSelectedShot(null)
  }

  return (
    <div className="flex flex-col bg-black rounded-2xl overflow-hidden">
      {/* Video Preview Container - centers the aspect ratio box */}
      <div className="flex-1 relative flex items-center justify-center bg-zinc-900 p-4">
        {/* Aspect Ratio Video Frame */}
        <div
          className="relative w-full max-h-full bg-zinc-950 rounded-lg overflow-hidden"
          style={{ aspectRatio: aspectValue }}
        >
          {/* Preview Mode Indicator */}
          <PreviewIndicator
            mode={previewInfo.mode}
            sceneName={previewInfo.sceneName}
            shotName={previewInfo.shotName}
            onClear={handleClearSelection}
          />

          {/* Placeholder for video */}
          <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-center">
            <div>
              <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-sm">
                {previewInfo.mode === "project" && "Full project preview"}
                {previewInfo.mode === "scene" && `Scene: ${previewInfo.sceneName}`}
                {previewInfo.mode === "shot" && `Shot: ${previewInfo.shotName}`}
              </p>
              <p className="text-xs text-zinc-700 mt-2">{aspectRatio}</p>
            </div>
          </div>

          {/* Fullscreen button */}
          <button className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-black/50 hover:bg-black/70 flex items-center justify-center text-white/70 hover:text-white transition-colors">
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 bg-zinc-900/80 border-t border-zinc-800 flex-shrink-0">
        {/* Progress bar */}
        <div className="mb-3">
          <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full transition-all"
              style={{ width: `${previewInfo.duration > 0 ? (currentTime / previewInfo.duration) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(previewInfo.duration)}</span>
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
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
          </button>

          <button
            onClick={() => setCurrentTime(previewInfo.duration)}
            className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <div className="ml-4 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-zinc-500" />
            <div className="w-20 h-1 bg-zinc-700 rounded-full">
              <div className="w-3/4 h-full bg-zinc-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Timeline() {
  const { project, selectedSceneId, selectedShotId, setSelectedScene, setSelectedShot } = useWorkspaceStore()
  const [scale, setScale] = useState(1)

  if (!project) return null

  const { scenes } = project

  // Calculate total timeline width
  const totalDuration = scenes.reduce(
    (acc, scene) =>
      acc + scene.shots.reduce((shotAcc, shot) => shotAcc + shot.duration, 0),
    0
  )

  const handleSceneClick = (sceneId: string) => {
    if (selectedSceneId === sceneId) {
      // Clicking same scene clears selection
      setSelectedScene(null)
    } else {
      setSelectedScene(sceneId)
    }
  }

  const handleShotClick = (shotId: string, sceneId: string) => {
    if (selectedShotId === shotId) {
      // Clicking same shot clears shot selection, keeps scene
      setSelectedShot(null)
    } else {
      setSelectedScene(sceneId)
      setSelectedShot(shotId)
    }
  }

  return (
    <div className="border-t border-zinc-800 bg-zinc-900/50">
      {/* Timeline Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-medium text-zinc-300">Timeline</h3>
          <span className="text-xs text-zinc-500">
            {scenes.length} scenes • {scenes.reduce((acc, s) => acc + s.shots.length, 0)} shots
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

        {/* Scenes Container - no transform, scale applied to widths */}
        <div className="flex items-start gap-4">
          {scenes
            .sort((a, b) => a.order - b.order)
            .map((scene) => (
              <SceneContainer
                key={scene.id}
                scene={scene}
                isSelected={scene.id === selectedSceneId}
                selectedShotId={selectedShotId}
                scale={scale}
                onSceneClick={() => handleSceneClick(scene.id)}
                onShotClick={(shotId) => handleShotClick(shotId, scene.id)}
              />
            ))}

          {/* Add Scene Button */}
          <button className="flex-shrink-0 h-[88px] px-6 rounded-xl border-2 border-dashed border-sky-500/30 hover:border-sky-500/60 flex flex-col items-center justify-center gap-1 text-sky-500/50 hover:text-sky-400 transition-colors">
            <Plus className="w-5 h-5" />
            <span className="text-xs">Add Scene</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export function EditorPage() {
  const { project } = useWorkspaceStore()

  if (!project) return null

  const aspectRatio = project.brief.aspectRatio || "16:9"

  return (
    <div className="h-full overflow-y-auto">
      {/* Video Player Section - fills viewport height minus header (~56px) and bottom nav (~72px) */}
      <div
        className="p-4 lg:p-6 flex flex-col"
        style={{ minHeight: "calc(100vh - 56px - 72px)" }}
      >
        <div className="flex-1 max-w-5xl w-full mx-auto flex flex-col">
          <VideoPlayer aspectRatio={aspectRatio} />
        </div>
      </div>

      {/* Timeline - Below the fold, scroll to see */}
      <Timeline />
    </div>
  )
}
