import { useState, useEffect, useRef } from "react"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Maximize2,
  Minimize2,
  Mic,
  Plus,
  ZoomIn,
  ZoomOut,
  Film,
  Layers,
  Clapperboard,
  GripVertical,
  Image,
  ChevronRight,
  Sparkles,
  Wand2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkspaceStore, Scene, Shot, AspectRatio, ShotEffect } from "@/state/workspaceStore"
import { getAssetDisplayUrl } from "@/services/localStorage"

// Drag data types
type DragType = "scene" | "shot"
interface DragData {
  type: DragType
  id: string
  sceneId?: string // For shots, which scene they belong to
}

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
  onDragStart: (e: React.DragEvent, shotId: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, targetShotId: string) => void
  isDragOver: boolean
}

function ShotBlock({ shot, sceneId, isSelected, scale, onClick, onDragStart, onDragOver, onDrop, isDragOver }: ShotBlockProps) {
  // Use video duration if available, default 5s for images
  const effectiveDuration = shot.videoAsset?.duration || 5
  const width = effectiveDuration * BASE_SCALE * scale

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick()
  }

  // Get thumbnail info from shot assets
  const getThumbnailInfo = () => {
    if (shot.imageAsset) {
      return { url: getAssetDisplayUrl(shot.imageAsset), isVideo: false }
    }
    if (shot.videoAsset) {
      return { url: getAssetDisplayUrl(shot.videoAsset), isVideo: true }
    }
    return null
  }

  const thumbnailInfo = getThumbnailInfo()
  const thumbnailUrl = thumbnailInfo?.url
  const hasEffects = shot.effectsLayer && shot.effectsLayer.length > 0
  const isAnimationShot = !!shot.animationAsset

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, shot.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, shot.id)}
      onClick={handleClick}
      className={cn(
        "h-12 rounded-lg flex items-center text-xs font-medium transition-all overflow-hidden cursor-grab active:cursor-grabbing relative",
        isAnimationShot
          ? "bg-gradient-to-br from-purple-500 to-purple-600"
          : thumbnailUrl
          ? "bg-zinc-800"
          : "bg-gradient-to-br from-orange-500 to-orange-600",
        isSelected
          ? "ring-2 ring-white shadow-lg shadow-orange-500/30"
          : "hover:brightness-110",
        isDragOver && "ring-2 ring-orange-300"
      )}
      style={{ width: `${Math.max(width, 50)}px` }}
    >
      {/* Effects indicator */}
      {hasEffects && (
        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center z-10">
          <Sparkles className="w-2.5 h-2.5 text-white" />
        </div>
      )}
      {thumbnailUrl ? (
        <>
          {thumbnailInfo?.isVideo ? (
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
              alt={shot.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />
          <div className="relative flex items-center w-full px-1">
            <GripVertical className="w-3 h-3 text-white/70 flex-shrink-0" />
            <span className="truncate px-1 text-white text-shadow">
              {shot.name}
            </span>
            <span className="ml-auto text-[10px] text-white/70">{shot.duration}s</span>
          </div>
        </>
      ) : (
        <>
          <GripVertical className="w-3 h-3 text-white/50 flex-shrink-0 ml-1" />
          <span className="truncate px-1 text-white">
            {shot.name}
          </span>
        </>
      )}
    </div>
  )
}

interface VoiceoverBlockProps {
  scene: Scene
  scale: number
}

function VoiceoverBlock({ scene, scale }: VoiceoverBlockProps) {
  // Use video duration if available, default 5s for images
  const getEffectiveDuration = (shot: Shot) => shot.videoAsset?.duration || 5
  const sceneDuration = scene.shots.reduce((acc, s) => acc + getEffectiveDuration(s), 0)
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

interface EffectsRowProps {
  scene: Scene
  scale: number
  selectedShotId: string | null
}

function EffectsRow({ scene, scale, selectedShotId }: EffectsRowProps) {
  const getEffectiveDuration = (shot: Shot) => shot.videoAsset?.duration || 5

  // Collect all effects from all shots in this scene
  const allEffects: { shot: Shot; effect: ShotEffect; startOffset: number }[] = []
  let cumulativeTime = 0

  for (const shot of [...scene.shots].sort((a, b) => a.order - b.order)) {
    const shotDuration = getEffectiveDuration(shot)
    if (shot.effectsLayer) {
      for (const effect of shot.effectsLayer) {
        allEffects.push({
          shot,
          effect,
          startOffset: cumulativeTime,
        })
      }
    }
    cumulativeTime += shotDuration
  }

  const sceneDuration = cumulativeTime
  const width = sceneDuration * BASE_SCALE * scale
  const hasEffects = allEffects.length > 0

  return (
    <div
      className={cn(
        "h-6 rounded-md flex items-center gap-1 px-1 text-xs relative",
        hasEffects
          ? "bg-purple-500/20"
          : "border border-dashed border-zinc-700 text-zinc-600"
      )}
      style={{ width: `${Math.max(width, 50)}px` }}
    >
      {hasEffects ? (
        // Render effect blocks positioned on the timeline
        allEffects.map(({ shot, effect, startOffset }) => {
          const effectStart = startOffset + effect.timing[0]
          const effectEnd = startOffset + effect.timing[1]
          const effectDuration = effectEnd - effectStart
          const left = effectStart * BASE_SCALE * scale
          const effectWidth = effectDuration * BASE_SCALE * scale

          return (
            <div
              key={effect.id}
              className={cn(
                "absolute h-4 rounded flex items-center gap-1 px-1 text-[10px]",
                shot.id === selectedShotId
                  ? "bg-purple-500 text-white"
                  : "bg-purple-500/60 text-purple-200"
              )}
              style={{
                left: `${left}px`,
                width: `${Math.max(effectWidth, 20)}px`,
              }}
              title={`${effect.name} (${effect.timing[0]}s - ${effect.timing[1]}s)`}
            >
              <Sparkles className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{effect.name}</span>
            </div>
          )
        })
      ) : (
        <>
          <Wand2 className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">No effects</span>
        </>
      )}
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
  onSceneDragStart: (e: React.DragEvent, sceneId: string) => void
  onSceneDragOver: (e: React.DragEvent) => void
  onSceneDrop: (e: React.DragEvent, targetSceneId: string) => void
  onShotDragStart: (e: React.DragEvent, shotId: string, sceneId: string) => void
  onShotDragOver: (e: React.DragEvent) => void
  onShotDrop: (e: React.DragEvent, targetShotId: string, targetSceneId: string) => void
  isDragOver: boolean
  dragOverShotId: string | null
}

function SceneContainer({
  scene,
  isSelected,
  selectedShotId,
  scale,
  onSceneClick,
  onShotClick,
  onSceneDragStart,
  onSceneDragOver,
  onSceneDrop,
  onShotDragStart,
  onShotDragOver,
  onShotDrop,
  isDragOver,
  dragOverShotId,
}: SceneContainerProps) {
  // Use video duration if available, default 5s for images (same as ShotBlock)
  const getEffectiveDuration = (shot: Shot) => shot.videoAsset?.duration || 5
  const sceneDuration = scene.shots.reduce((acc, s) => acc + getEffectiveDuration(s), 0)
  const width = sceneDuration * BASE_SCALE * scale + 24 // padding for inner container

  return (
    <div
      draggable
      onDragStart={(e) => onSceneDragStart(e, scene.id)}
      onDragOver={onSceneDragOver}
      onDrop={(e) => onSceneDrop(e, scene.id)}
      className={cn(
        "relative rounded-xl flex-shrink-0 overflow-hidden transition-colors",
        isSelected
          ? "bg-sky-500"
          : "bg-sky-500/60 hover:bg-sky-500/80",
        isDragOver && "ring-2 ring-sky-300"
      )}
      style={{ width: `${Math.max(width, 80)}px` }}
    >
      {/* Scene Header - Clickable and draggable area */}
      <div
        onClick={onSceneClick}
        className={cn(
          "w-full px-3 py-2 text-left text-xs font-medium transition-colors cursor-grab active:cursor-grabbing flex items-center gap-1",
          isSelected
            ? "text-white"
            : "text-sky-100 hover:text-white"
        )}
      >
        <GripVertical className="w-3 h-3 opacity-50 flex-shrink-0" />
        {scene.name}
      </div>

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
                onClick={() => onShotClick(shot.id)}
                onDragStart={(e, shotId) => onShotDragStart(e, shotId, scene.id)}
                onDragOver={onShotDragOver}
                onDrop={(e, targetShotId) => onShotDrop(e, targetShotId, scene.id)}
                isDragOver={dragOverShotId === shot.id}
              />
            ))}
        </div>

        {/* Voiceover Row */}
        <VoiceoverBlock scene={scene} scale={scale} />

        {/* Effects Row */}
        <div className="mt-1">
          <EffectsRow scene={scene} scale={scale} selectedShotId={selectedShotId} />
        </div>
      </div>
    </div>
  )
}

// Preview mode indicator - breadcrumb style
type PreviewMode = "project" | "scene" | "shot"

interface PreviewIndicatorProps {
  mode: PreviewMode
  sceneName?: string
  shotName?: string
  onClear: () => void
  onSelectScene: () => void
}

function PreviewIndicator({ mode, sceneName, shotName, onClear, onSelectScene }: PreviewIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5">
      {/* Full Project - always visible */}
      <button
        onClick={onClear}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-zinc-800 text-zinc-300 border border-zinc-500 hover:bg-zinc-700 hover:text-white"
      >
        <Film className="w-3.5 h-3.5" />
        <span>Full Project</span>
      </button>

      {/* Scene - visible when scene or shot is selected */}
      {(mode === "scene" || mode === "shot") && sceneName && (
        <>
          <ChevronRight className="w-4 h-4 text-zinc-600" />
          <button
            onClick={onSelectScene}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{sceneName}</span>
          </button>
        </>
      )}

      {/* Shot - visible when shot is selected */}
      {mode === "shot" && shotName && (
        <>
          <ChevronRight className="w-4 h-4 text-zinc-600" />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
            <Film className="w-3.5 h-3.5" />
            <span>{shotName}</span>
          </div>
        </>
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

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const [volume, setVolume] = useState(0.75)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const aspectValue = getAspectRatioValue(aspectRatio)

  // Handle fullscreen toggle
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

  // Listen for fullscreen changes (e.g., user presses Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  // Get effective duration for a shot (video duration if video, default 5s for images)
  const getShotDuration = (shot: Shot) => {
    if (shot.videoAsset?.duration) {
      return shot.videoAsset.duration
    }
    // Default 5 seconds for images
    return 5
  }

  // Build shot list based on selection mode
  const getPlayableShots = () => {
    if (!project) return []
    const shots: { shot: Shot; scene: Scene; startTime: number; endTime: number }[] = []
    let cumTime = 0

    // Single shot selected
    if (selectedShotId) {
      for (const scene of project.scenes) {
        const shot = scene.shots.find(s => s.id === selectedShotId)
        if (shot) {
          const duration = getShotDuration(shot)
          return [{
            shot,
            scene,
            startTime: 0,
            endTime: duration,
          }]
        }
      }
      return []
    }

    // Scene selected - only shots from that scene
    if (selectedSceneId) {
      const scene = project.scenes.find(s => s.id === selectedSceneId)
      if (scene) {
        for (const shot of [...scene.shots].sort((a, b) => a.order - b.order)) {
          const duration = getShotDuration(shot)
          shots.push({
            shot,
            scene,
            startTime: cumTime,
            endTime: cumTime + duration,
          })
          cumTime += duration
        }
      }
      return shots
    }

    // Full project - all shots
    for (const scene of [...project.scenes].sort((a, b) => a.order - b.order)) {
      for (const shot of [...scene.shots].sort((a, b) => a.order - b.order)) {
        const duration = getShotDuration(shot)
        shots.push({
          shot,
          scene,
          startTime: cumTime,
          endTime: cumTime + duration,
        })
        cumTime += duration
      }
    }
    return shots
  }

  const playableShots = getPlayableShots()
  const totalDuration = playableShots.length > 0 ? playableShots[playableShots.length - 1].endTime : 0

  // Get current shot based on currentTime
  const getCurrentShot = () => {
    for (const item of playableShots) {
      if (currentTime >= item.startTime && currentTime < item.endTime) {
        return item
      }
    }
    // Return last shot if at end
    return playableShots[playableShots.length - 1] || null
  }

  const currentShotInfo = getCurrentShot()

  // Reset time when selection changes
  useEffect(() => {
    setCurrentTime(0)
    setIsPlaying(false)
  }, [selectedSceneId, selectedShotId, setCurrentTime, setIsPlaying])

  // Playback timer (for images - videos sync via onTimeUpdate but this provides fallback)
  useEffect(() => {
    if (isPlaying) {
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
    if (currentTime >= totalDuration && isPlaying) {
      setIsPlaying(false)
    }
  }, [currentTime, totalDuration, isPlaying, setIsPlaying])

  // Determine preview mode and content
  const getPreviewInfo = () => {
    if (selectedShotId && project) {
      for (const scene of project.scenes) {
        const shot = scene.shots.find(s => s.id === selectedShotId)
        if (shot) {
          return {
            mode: "shot" as PreviewMode,
            sceneId: scene.id,
            sceneName: scene.name,
            shotName: shot.name,
          }
        }
      }
    }

    if (selectedSceneId && project) {
      const scene = project.scenes.find(s => s.id === selectedSceneId)
      if (scene) {
        return {
          mode: "scene" as PreviewMode,
          sceneId: scene.id,
          sceneName: scene.name,
          shotName: undefined,
        }
      }
    }

    return {
      mode: "project" as PreviewMode,
      sceneId: undefined,
      sceneName: undefined,
      shotName: undefined,
    }
  }

  const previewInfo = getPreviewInfo()

  // Get media URL for current shot
  const getCurrentMediaUrl = () => {
    if (!currentShotInfo) return null
    const { shot } = currentShotInfo
    // Prioritize video over image for playback
    if (shot.videoAsset) return getAssetDisplayUrl(shot.videoAsset)
    if (shot.imageAsset) return getAssetDisplayUrl(shot.imageAsset)
    return null
  }

  const currentMediaUrl = getCurrentMediaUrl()
  // Check if current shot has a video asset
  const isVideo = !!currentShotInfo?.shot.videoAsset

  // Get transform style from shot scale/position
  const getMediaTransform = () => {
    if (!currentShotInfo) return {}
    const { shot } = currentShotInfo
    const scale = shot.scale || 1
    const posX = shot.positionX || 0
    const posY = shot.positionY || 0

    if (scale === 1 && posX === 0 && posY === 0) return {}

    return {
      transform: `scale(${scale}) translate(${posX}%, ${posY}%)`,
      transformOrigin: 'center center',
    }
  }

  const mediaTransform = getMediaTransform()

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${String(secs).padStart(2, "0")}`
  }

  const handleClearSelection = () => {
    setSelectedScene(null)
    setSelectedShot(null)
  }

  const handleSelectScene = () => {
    if (previewInfo.sceneId) {
      setSelectedScene(previewInfo.sceneId)
      setSelectedShot(null)
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = x / rect.width
    const newTime = percent * totalDuration
    setCurrentTime(newTime)

    // Seek the video to the correct position within the current shot
    if (videoRef.current && isVideo) {
      // Find which shot this time falls into
      for (const item of playableShots) {
        if (newTime >= item.startTime && newTime < item.endTime) {
          // Calculate time within this shot
          const timeInShot = newTime - item.startTime
          videoRef.current.currentTime = timeInShot
          break
        }
      }
    }
  }

  // Sync video playback with Editor controls
  useEffect(() => {
    if (videoRef.current && isVideo) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {})
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying, isVideo])

  // Reload video when shot changes (new video source)
  useEffect(() => {
    if (videoRef.current && isVideo && currentMediaUrl) {
      // Reset video to beginning and reload
      videoRef.current.currentTime = 0
      videoRef.current.load()
      if (isPlaying) {
        videoRef.current.play().catch(() => {})
      }
    }
  }, [currentMediaUrl])

  // Update video volume when it changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume
    }
  }, [volume])

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
        {/* Aspect Ratio Video Frame */}
        <div
          className="relative w-full max-h-full bg-zinc-950 rounded-lg overflow-hidden"
          style={{ aspectRatio: aspectValue }}
        >
          {/* Actual Media */}
          {currentMediaUrl ? (
            isVideo ? (
              <video
                ref={videoRef}
                src={currentMediaUrl}
                className="absolute inset-0 w-full h-full object-contain bg-black"
                style={mediaTransform}
                loop
                muted={volume === 0}
                playsInline
                onTimeUpdate={(e) => {
                  // Sync timeline with video playback
                  if (currentShotInfo && isPlaying) {
                    const videoTime = e.currentTarget.currentTime
                    setCurrentTime(currentShotInfo.startTime + videoTime)
                  }
                }}
              />
            ) : (
              <img
                src={currentMediaUrl}
                alt={currentShotInfo?.shot.name || "Shot"}
                className="absolute inset-0 w-full h-full object-cover bg-black"
                style={mediaTransform}
              />
            )
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-center">
              <div>
                <Image className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No media</p>
                <p className="text-xs text-zinc-700 mt-2">Add images or videos to your shots</p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Controls */}
      <div className="p-4 bg-zinc-900/80 border-t border-zinc-800 flex-shrink-0">
        {/* Preview Mode Indicator */}
        <div className="flex items-center justify-between mb-3">
          <PreviewIndicator
            mode={previewInfo.mode}
            sceneName={previewInfo.sceneName}
            shotName={previewInfo.shotName}
            onClear={handleClearSelection}
            onSelectScene={handleSelectScene}
          />
          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-zinc-800 text-zinc-300 border border-zinc-500 hover:bg-zinc-700 hover:text-white"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? "Exit" : "Fullscreen"}</span>
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
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
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

function Timeline() {
  const { project, selectedSceneId, selectedShotId, setSelectedScene, setSelectedShot, reorderScenes, reorderShots } = useWorkspaceStore()
  const [scale, setScale] = useState(1)

  // Drag state
  const [dragData, setDragData] = useState<DragData | null>(null)
  const [dragOverSceneId, setDragOverSceneId] = useState<string | null>(null)
  const [dragOverShotId, setDragOverShotId] = useState<string | null>(null)

  if (!project) return null

  const { scenes } = project

  // Use video duration if available, default 5s for images
  const getEffectiveDuration = (shot: Shot) => shot.videoAsset?.duration || 5

  // Calculate total timeline width
  const totalDuration = scenes.reduce(
    (acc, scene) =>
      acc + scene.shots.reduce((shotAcc, shot) => shotAcc + getEffectiveDuration(shot), 0),
    0
  )

  const handleSceneClick = (sceneId: string) => {
    if (selectedSceneId === sceneId) {
      setSelectedScene(null)
    } else {
      setSelectedScene(sceneId)
    }
  }

  const handleShotClick = (shotId: string, sceneId: string) => {
    if (selectedShotId === shotId) {
      setSelectedShot(null)
    } else {
      setSelectedScene(sceneId)
      setSelectedShot(shotId)
    }
  }

  // Scene drag handlers
  const handleSceneDragStart = (e: React.DragEvent, sceneId: string) => {
    e.stopPropagation()
    setDragData({ type: "scene", id: sceneId })
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", sceneId)
  }

  const handleSceneDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (dragData?.type === "scene") {
      e.dataTransfer.dropEffect = "move"
    }
  }

  const handleSceneDrop = (e: React.DragEvent, targetSceneId: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (dragData?.type === "scene" && dragData.id !== targetSceneId) {
      const sortedScenes = [...scenes].sort((a, b) => a.order - b.order)
      const dragIndex = sortedScenes.findIndex(s => s.id === dragData.id)
      const dropIndex = sortedScenes.findIndex(s => s.id === targetSceneId)

      if (dragIndex !== -1 && dropIndex !== -1) {
        const newOrder = [...sortedScenes]
        const [removed] = newOrder.splice(dragIndex, 1)
        newOrder.splice(dropIndex, 0, removed)
        reorderScenes(newOrder.map(s => s.id))
      }
    }

    setDragData(null)
    setDragOverSceneId(null)
  }

  const handleSceneDragEnter = (sceneId: string) => {
    if (dragData?.type === "scene" && dragData.id !== sceneId) {
      setDragOverSceneId(sceneId)
    }
  }

  const handleSceneDragLeave = () => {
    setDragOverSceneId(null)
  }

  // Shot drag handlers
  const handleShotDragStart = (e: React.DragEvent, shotId: string, sceneId: string) => {
    e.stopPropagation()
    setDragData({ type: "shot", id: shotId, sceneId })
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", shotId)
  }

  const handleShotDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (dragData?.type === "shot") {
      e.dataTransfer.dropEffect = "move"
    }
  }

  const handleShotDrop = (e: React.DragEvent, targetShotId: string, targetSceneId: string) => {
    e.preventDefault()
    e.stopPropagation()

    // Only allow reordering within same scene for now
    if (dragData?.type === "shot" && dragData.id !== targetShotId && dragData.sceneId === targetSceneId) {
      const scene = scenes.find(s => s.id === targetSceneId)
      if (scene) {
        const sortedShots = [...scene.shots].sort((a, b) => a.order - b.order)
        const dragIndex = sortedShots.findIndex(s => s.id === dragData.id)
        const dropIndex = sortedShots.findIndex(s => s.id === targetShotId)

        if (dragIndex !== -1 && dropIndex !== -1) {
          const newOrder = [...sortedShots]
          const [removed] = newOrder.splice(dragIndex, 1)
          newOrder.splice(dropIndex, 0, removed)
          reorderShots(targetSceneId, newOrder.map(s => s.id))
        }
      }
    }

    setDragData(null)
    setDragOverShotId(null)
  }

  const handleShotDragEnter = (shotId: string, sceneId: string) => {
    if (dragData?.type === "shot" && dragData.id !== shotId && dragData.sceneId === sceneId) {
      setDragOverShotId(shotId)
    }
  }

  const handleShotDragLeave = () => {
    setDragOverShotId(null)
  }

  const handleDragEnd = () => {
    setDragData(null)
    setDragOverSceneId(null)
    setDragOverShotId(null)
  }

  return (
    <div className="border-t border-zinc-800 bg-zinc-900/50" onDragEnd={handleDragEnd}>
      {/* Timeline Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-medium text-zinc-300">Timeline</h3>
          <span className="text-xs text-zinc-500">
            {scenes.length} scenes • {scenes.reduce((acc, s) => acc + s.shots.length, 0)} shots
          </span>
          {scenes.reduce((acc, s) => acc + s.shots.reduce((shotAcc, shot) => shotAcc + (shot.effectsLayer?.length || 0), 0), 0) > 0 && (
            <span className="text-xs text-purple-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {scenes.reduce((acc, s) => acc + s.shots.reduce((shotAcc, shot) => shotAcc + (shot.effectsLayer?.length || 0), 0), 0)} effects
            </span>
          )}
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

        {/* Scenes Container */}
        <div className="flex items-start gap-4">
          {scenes
            .sort((a, b) => a.order - b.order)
            .map((scene) => (
              <div
                key={scene.id}
                onDragEnter={() => handleSceneDragEnter(scene.id)}
                onDragLeave={handleSceneDragLeave}
              >
                <SceneContainer
                  scene={scene}
                  isSelected={scene.id === selectedSceneId}
                  selectedShotId={selectedShotId}
                  scale={scale}
                  onSceneClick={() => handleSceneClick(scene.id)}
                  onShotClick={(shotId) => handleShotClick(shotId, scene.id)}
                  onSceneDragStart={handleSceneDragStart}
                  onSceneDragOver={handleSceneDragOver}
                  onSceneDrop={handleSceneDrop}
                  onShotDragStart={handleShotDragStart}
                  onShotDragOver={handleShotDragOver}
                  onShotDrop={handleShotDrop}
                  isDragOver={dragOverSceneId === scene.id}
                  dragOverShotId={dragOverShotId}
                />
              </div>
            ))}
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
    <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* Video Player Section - fills viewport height minus header (~56px) and bottom nav (~72px) */}
      <div
        className="p-4 lg:p-6 flex flex-col"
        style={{ minHeight: "calc(100vh - 56px - 72px)" }}
      >
        <div className="flex-1 max-w-6xl w-full mx-auto flex flex-col">
          <VideoPlayer aspectRatio={aspectRatio} />
        </div>
      </div>

      {/* Timeline - Below the fold, scroll to see */}
      <Timeline />
    </div>
  )
}
