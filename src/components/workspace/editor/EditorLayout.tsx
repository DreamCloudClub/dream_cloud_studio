import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Panel, Group } from "react-resizable-panels"
import {
  useWorkspaceStore,
  AspectRatio,
  getClipsWithAssets,
  TimelineClipWithAsset,
  ProjectAsset,
} from "@/state/workspaceStore"
import { useLibraryStore } from "@/state/libraryStore"
import { ResizeHandle } from "./ResizeHandle"
import { VideoPreviewPanel } from "./VideoPreviewPanel"
import { TransportControls } from "./TransportControls"
import { TimelinePanel, TrackAudioSettings } from "./TimelinePanel"
import { getAssetDisplayUrl } from "@/services/localStorage"

// Hook to get merged assets from project and library - MEMOIZED
function useMergedAssets(): ProjectAsset[] {
  const { project } = useWorkspaceStore()
  const { assets: libraryAssets } = useLibraryStore()
  const projectAssets = project?.assets

  return useMemo(() => {
    const assets = projectAssets || []
    const assetMap = new Map<string, ProjectAsset>()

    for (const asset of assets) {
      assetMap.set(asset.id, asset)
    }

    for (const libAsset of libraryAssets) {
      if (!assetMap.has(libAsset.id)) {
        assetMap.set(libAsset.id, {
          id: libAsset.id,
          name: libAsset.name,
          type: libAsset.type as ProjectAsset["type"],
          category: libAsset.category as ProjectAsset["category"],
          url: libAsset.url || null,
          localPath: libAsset.localPath,
          storageType: libAsset.storageType || "cloud",
          duration: libAsset.duration,
          userDescription: libAsset.userDescription,
          aiPrompt: libAsset.aiPrompt,
          generationModel: libAsset.generationModel,
          createdAt: libAsset.createdAt,
        })
      }
    }

    return Array.from(assetMap.values())
  }, [projectAssets, libraryAssets])
}

// Helper to get track number - extracted to avoid regex in hot path
function getTrackNumber(trackId: string | undefined): number {
  if (!trackId || trackId === "video-main") return 1
  const num = parseInt(trackId.split("-")[1])
  return isNaN(num) ? 999 : num
}

interface EditorLayoutProps {
  aspectRatio: AspectRatio
}

export function EditorLayout({ aspectRatio }: EditorLayoutProps) {
  const {
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    project,
    loadProject,
  } = useWorkspaceStore()

  const mergedAssets = useMergedAssets()
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [scale, setScale] = useState(1)
  const [trackAudioSettings, setTrackAudioSettings] = useState<Record<string, TrackAudioSettings>>({})

  // Audio elements for audio track clips
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())

  // Memoize clips array - only recompute when timeline or assets change
  const clips = useMemo(() => {
    if (!project) return []
    return getClipsWithAssets(project.timeline.clips, mergedAssets)
  }, [project?.timeline.clips, mergedAssets])

  // Memoize total duration
  const totalDuration = useMemo(() => {
    if (clips.length === 0) return 0
    return Math.max(...clips.map((c) => c.startTime + c.duration))
  }, [clips])

  // Pre-sort clips by start time for efficient lookup - only when clips change
  const sortedClips = useMemo(() => {
    return [...clips]
      .filter((c) => c.asset?.type === "video" || c.asset?.type === "image")
      .sort((a, b) => a.startTime - b.startTime)
  }, [clips])

  // Get current clip at playhead position using binary search
  const currentClip = useMemo((): TimelineClipWithAsset | null => {
    if (sortedClips.length === 0) return null

    // Find all clips that contain currentTime
    const clipsAtTime: TimelineClipWithAsset[] = []
    for (const clip of sortedClips) {
      // Early exit: if clip starts after currentTime, no more clips will match
      if (clip.startTime > currentTime) break

      if (currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration) {
        clipsAtTime.push(clip)
      }
    }

    if (clipsAtTime.length === 0) return null
    if (clipsAtTime.length === 1) return clipsAtTime[0]

    // Multiple clips at same time: pick highest track number (top layer wins)
    // V1 = background, V2 = on top of V1, etc.
    return clipsAtTime.reduce((best, clip) => {
      return getTrackNumber(clip.trackId) > getTrackNumber(best.trackId) ? clip : best
    })
  }, [sortedClips, currentTime])

  // Get audio clips currently at playhead
  const currentAudioClips = useMemo(() => {
    return clips.filter((clip) => {
      if (clip.asset?.type !== "audio") return false
      return currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration
    })
  }, [clips, currentTime])

  // Audio playback effect - manages audio elements for audio clips
  useEffect(() => {
    const audioElements = audioElementsRef.current

    // Get IDs of clips that should be playing
    const activeClipIds = new Set(currentAudioClips.map(c => c.id))

    // Stop and remove audio elements for clips no longer active
    for (const [clipId, audio] of audioElements) {
      if (!activeClipIds.has(clipId)) {
        audio.pause()
        audioElements.delete(clipId)
      }
    }

    // Handle each active audio clip
    for (const clip of currentAudioClips) {
      const url = clip.asset ? getAssetDisplayUrl(clip.asset) : null
      if (!url) continue

      let audio = audioElements.get(clip.id)

      // Create audio element if it doesn't exist
      if (!audio) {
        audio = new Audio(url)
        audio.preload = "auto"
        audioElements.set(clip.id, audio)
      }

      // Get track settings
      const trackId = clip.trackId || "audio-1"
      const settings = trackAudioSettings[trackId]
      const trackMuted = settings?.muted ?? false
      const trackVolume = settings?.volume ?? 100

      // Apply volume (global mute, track mute, track volume)
      audio.muted = isMuted || trackMuted
      audio.volume = trackVolume / 100

      // Calculate where in the audio we should be
      const timeInClip = currentTime - clip.startTime
      const audioTime = (clip.inPoint || 0) + timeInClip

      if (isPlaying) {
        // Sync audio time if needed (allow small drift)
        if (Math.abs(audio.currentTime - audioTime) > 0.3) {
          audio.currentTime = audioTime
        }
        if (audio.paused) {
          audio.play().catch(() => {})
        }
      } else {
        audio.pause()
        audio.currentTime = audioTime
      }
    }

    // Cleanup on unmount
    return () => {
      for (const audio of audioElements.values()) {
        audio.pause()
      }
    }
  }, [currentAudioClips, currentTime, isPlaying, isMuted, trackAudioSettings])

  if (!project) return null

  // Toggle fullscreen state (VideoPreviewPanel handles actual fullscreen)
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev)
  }, [])

  // Spacebar to play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      if (e.code === "Space") {
        e.preventDefault()
        setIsPlaying(!isPlaying)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isPlaying, setIsPlaying])

  // Playback timer - only used for images, videos drive their own time
  const currentClipIsVideo = currentClip?.asset?.type === "video"
  const currentTimeRef = useRef(currentTime)
  currentTimeRef.current = currentTime
  const rafRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number | null>(null)

  useEffect(() => {
    // If current clip is a video, let the video's onTimeUpdate drive the timeline
    // Only use requestAnimationFrame for images or when there's no clip
    if (isPlaying && totalDuration > 0 && !currentClipIsVideo) {
      lastFrameTimeRef.current = null

      const animate = (timestamp: number) => {
        if (lastFrameTimeRef.current === null) {
          lastFrameTimeRef.current = timestamp
        }

        // Calculate actual elapsed time for accurate playback
        const elapsed = (timestamp - lastFrameTimeRef.current) / 1000
        lastFrameTimeRef.current = timestamp

        const newTime = Math.min(currentTimeRef.current + elapsed, totalDuration)
        setCurrentTime(newTime)

        if (newTime < totalDuration) {
          rafRef.current = requestAnimationFrame(animate)
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      lastFrameTimeRef.current = null
    }
  }, [isPlaying, totalDuration, setCurrentTime, currentClipIsVideo])

  // Stop at end
  useEffect(() => {
    if (currentTime >= totalDuration && isPlaying && totalDuration > 0) {
      setIsPlaying(false)
    }
  }, [currentTime, totalDuration, isPlaying, setIsPlaying])

  const handlePlayPause = () => setIsPlaying(!isPlaying)
  const handleSkipBack = () => setCurrentTime(0)
  const handleSkipForward = () => setCurrentTime(Math.min(currentTime + 5, totalDuration))
  const handleToggleMute = () => setIsMuted(!isMuted)

  const handleVideoTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time)
  }, [setCurrentTime])

  // Pause playback when user starts scrubbing
  const handleScrubStart = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false)
    }
  }, [isPlaying, setIsPlaying])

  return (
    <div className="h-full w-full flex flex-col bg-zinc-950">
      <Group orientation="vertical" className="flex-1">
        {/* Video Preview Panel */}
        <Panel defaultSize="60%" minSize="30%" className="flex flex-col">
          <VideoPreviewPanel
            aspectRatio={aspectRatio}
            currentClip={currentClip}
            currentTime={currentTime}
            totalDuration={totalDuration}
            isPlaying={isPlaying}
            isMuted={isMuted}
            isFullscreen={isFullscreen}
            onTimeUpdate={handleVideoTimeUpdate}
            onPlayPause={handlePlayPause}
            onSkipBack={handleSkipBack}
            onSkipForward={handleSkipForward}
            onToggleMute={handleToggleMute}
            onToggleFullscreen={toggleFullscreen}
          />
        </Panel>

        {/* Resize Handle */}
        <ResizeHandle />

        {/* Timeline Section */}
        <Panel defaultSize="40%" minSize="20%" className="flex flex-col">
          {/* Fixed Transport Controls */}
          <TransportControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            totalDuration={totalDuration}
            isMuted={isMuted}
            isFullscreen={isFullscreen}
            scale={scale}
            onPlayPause={handlePlayPause}
            onSkipBack={handleSkipBack}
            onSkipForward={handleSkipForward}
            onToggleMute={handleToggleMute}
            onToggleFullscreen={toggleFullscreen}
            onScaleChange={setScale}
            onDurationsSync={() => project && loadProject(project.id)}
          />

          {/* Scrollable Timeline */}
          <TimelinePanel
            currentTime={currentTime}
            scale={scale}
            onTimeChange={setCurrentTime}
            onScrubStart={handleScrubStart}
            onTrackAudioChange={setTrackAudioSettings}
          />
        </Panel>
      </Group>
    </div>
  )
}
