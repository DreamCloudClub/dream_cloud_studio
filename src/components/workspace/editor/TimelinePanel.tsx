import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import {
  useWorkspaceStore,
  getClipsWithAssets,
  TimelineClipWithAsset,
  ProjectAsset,
} from "@/state/workspaceStore"
import { useLibraryStore } from "@/state/libraryStore"
import { TimelineRuler } from "./TimelineRuler"
import { TimelineTrack } from "./TimelineTrack"
import { BASE_SCALE } from "./ClipBlock"

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

interface TimelinePanelProps {
  currentTime: number
  scale: number
  onTimeChange: (time: number) => void
  onScrubStart?: () => void
}

export function TimelinePanel({ currentTime, scale, onTimeChange, onScrubStart }: TimelinePanelProps) {
  const {
    project,
    selectedClipId,
    setSelectedClip,
    moveClip,
    deleteClip,
    splitClip,
    trimClip,
    addClip,
  } = useWorkspaceStore()

  const mergedAssets = useMergedAssets()
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null)
  const [dragGrabOffset, setDragGrabOffset] = useState(0)
  const [isDroppingAsset, setIsDroppingAsset] = useState(false)
  const [droppingTrackId, setDroppingTrackId] = useState<string | null>(null)
  const [dragOverTrackId, setDragOverTrackId] = useState<string | null>(null)
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false)
  // Tracks with auto-snap enabled (default: none - all tracks start unlocked)
  const [autoSnapTracks, setAutoSnapTracks] = useState<Set<string>>(new Set())
  const timelineRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const tracksContainerRef = useRef<HTMLDivElement>(null)
  // Store max track numbers at drag start to prevent endless track creation
  const dragStartMaxTracks = useRef<{ video: number; audio: number } | null>(null)
  // Store the source track when dragging starts so we can snap it after drag ends
  const dragSourceTrack = useRef<string | null>(null)

  // Keyboard shortcut for delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedClipId) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return
        }
        e.preventDefault()
        deleteClip(selectedClipId)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedClipId, deleteClip])

  // Memoize clips array - only recompute when timeline or assets change
  const clips = useMemo(() => {
    if (!project) return []
    return getClipsWithAssets(project.timeline.clips, mergedAssets)
  }, [project?.timeline.clips, mergedAssets])

  // Snap all clips on a track together (close all gaps)
  const snapClipsOnTrack = useCallback(async (trackId: string) => {
    const trackClips = clips.filter(c => {
      let clipTrackId = c.trackId
      if (clipTrackId === "video-main") clipTrackId = "video-1"
      return clipTrackId === trackId
    })

    if (trackClips.length === 0) return

    // Sort by start time
    const sortedClips = [...trackClips].sort((a, b) => a.startTime - b.startTime)

    // Move each clip to close gaps
    let nextStartTime = 0
    for (const clip of sortedClips) {
      if (clip.startTime !== nextStartTime) {
        await moveClip(clip.id, nextStartTime)
      }
      nextStartTime = nextStartTime + clip.duration
    }
  }, [clips, moveClip])

  // Memoize track grouping - only recompute when clips change
  const { videoTracks, audioTracks, totalDuration, maxVideoTrackNum, maxAudioTrackNum } = useMemo(() => {
    // Group clips by track
    const clipsByTrack = new Map<string, TimelineClipWithAsset[]>()

    for (const clip of clips) {
      let trackId = clip.trackId

      // Convert legacy "video-main" to "video-1"
      if (trackId === "video-main") {
        trackId = "video-1"
      }

      if (!trackId) {
        // Default assignment based on asset type
        if (clip.asset?.type === "video" || clip.asset?.type === "image") {
          trackId = "video-1"
        } else if (clip.asset?.type === "audio") {
          trackId = "audio-1"
        } else {
          trackId = "video-1"
        }
      }

      if (!clipsByTrack.has(trackId)) {
        clipsByTrack.set(trackId, [])
      }
      clipsByTrack.get(trackId)!.push(clip)
    }

    // Build video tracks
    const videoTrackIds = Array.from(clipsByTrack.keys())
      .filter(id => id.startsWith("video-"))
      .sort()
    const maxVideoTrack = videoTrackIds.length > 0
      ? Math.max(...videoTrackIds.map(id => parseInt(id.split("-")[1]) || 1))
      : 0

    const vTracks: { id: string; label: string; clips: TimelineClipWithAsset[] }[] = []
    // During drag: freeze track count to what existed at drag start + 1 (the empty drop target)
    // After drop: allow new empty track to appear
    const videoTracksToShow = draggedClipId && dragStartMaxTracks.current
      ? Math.max(maxVideoTrack, dragStartMaxTracks.current.video + 1)
      : maxVideoTrack + 1
    for (let i = 1; i <= videoTracksToShow; i++) {
      const trackId = `video-${i}`
      vTracks.push({
        id: trackId,
        label: `V${i}`,
        clips: clipsByTrack.get(trackId) || []
      })
    }
    if (vTracks.length === 0) {
      vTracks.push({ id: "video-1", label: "V1", clips: [] })
    }

    // Build audio tracks
    const audioTrackIds = Array.from(clipsByTrack.keys())
      .filter(id => id.startsWith("audio-"))
      .sort()
    const maxAudioTrack = audioTrackIds.length > 0
      ? Math.max(...audioTrackIds.map(id => parseInt(id.split("-")[1]) || 1))
      : 0

    const aTracks: { id: string; label: string; clips: TimelineClipWithAsset[] }[] = []
    // During drag: freeze track count to what existed at drag start + 1
    const audioTracksToShow = draggedClipId && dragStartMaxTracks.current
      ? Math.max(maxAudioTrack, dragStartMaxTracks.current.audio + 1)
      : maxAudioTrack + 1
    for (let i = 1; i <= audioTracksToShow; i++) {
      const trackId = `audio-${i}`
      aTracks.push({
        id: trackId,
        label: `A${i}`,
        clips: clipsByTrack.get(trackId) || []
      })
    }
    if (aTracks.length === 0) {
      aTracks.push({ id: "audio-1", label: "A1", clips: [] })
    }

    const duration = clips.length > 0
      ? Math.max(...clips.map((c) => c.startTime + c.duration), 30)
      : 30

    return {
      videoTracks: vTracks,
      audioTracks: aTracks,
      totalDuration: duration,
      maxVideoTrackNum: maxVideoTrack,
      maxAudioTrackNum: maxAudioTrack
    }
  }, [clips, draggedClipId])

  if (!project) return null

  const handleClipClick = (clipId: string) => {
    setSelectedClip(selectedClipId === clipId ? null : clipId)
  }

  const handleDragStart = (e: React.DragEvent, clip: TimelineClipWithAsset) => {
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", clip.id)
    setDraggedClipId(clip.id)

    // Store max track numbers at drag start to limit where clips can be dropped
    // This prevents endless track creation during drag
    dragStartMaxTracks.current = {
      video: maxVideoTrackNum,
      audio: maxAudioTrackNum
    }

    // Store the source track so we can snap it after drag ends
    let sourceTrack = clip.trackId
    if (sourceTrack === "video-main") sourceTrack = "video-1"
    dragSourceTrack.current = sourceTrack || null

    const clipElement = e.currentTarget as HTMLElement
    const clipRect = clipElement.getBoundingClientRect()
    setDragGrabOffset(e.clientX - clipRect.left)

    const emptyImg = document.createElement('img')
    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    e.dataTransfer.setDragImage(emptyImg, 0, 0)
  }

  const handleDragEnd = async () => {
    const sourceTrack = dragSourceTrack.current
    const targetTrack = dragOverTrackId

    // Snap the source track if it has auto-snap enabled (clip was moved away)
    if (sourceTrack && autoSnapTracks.has(sourceTrack) && sourceTrack !== targetTrack) {
      await snapClipsOnTrack(sourceTrack)
    }

    // Snap the target track if it has auto-snap enabled
    if (targetTrack && autoSnapTracks.has(targetTrack)) {
      await snapClipsOnTrack(targetTrack)
    }

    setDraggedClipId(null)
    setDragOverTrackId(null)
    dragStartMaxTracks.current = null
    dragSourceTrack.current = null
  }

  // Snap threshold in seconds
  const SNAP_THRESHOLD = 0.15

  // Check if an asset type is compatible with a track type
  const isAssetCompatibleWithTrack = (assetType: string | undefined, trackId: string): boolean => {
    const isVideoTrack = trackId.startsWith("video-")
    const isAudioTrack = trackId.startsWith("audio-")

    if (isVideoTrack) {
      // Video tracks accept video, image, animation
      return assetType === "video" || assetType === "image" || assetType === "animation"
    }
    if (isAudioTrack) {
      // Audio tracks only accept audio
      return assetType === "audio"
    }
    return false
  }

  const handleDragOver = (e: React.DragEvent, trackId: string) => {
    e.preventDefault()

    const hasAssetData = e.dataTransfer.types.includes("application/json")
    if (hasAssetData) {
      setIsDroppingAsset(true)
      setDroppingTrackId(trackId)
      e.dataTransfer.dropEffect = "copy"
      return
    }

    if (!draggedClipId || !timelineRef.current) return

    // Track which track we're dragging over for visual feedback
    setDragOverTrackId(trackId)

    // Find the dragged clip
    const draggedClip = clips.find(c => c.id === draggedClipId)
    if (!draggedClip) return

    // Check if clip type is compatible with target track
    const assetType = draggedClip.asset?.type
    if (!isAssetCompatibleWithTrack(assetType, trackId)) {
      e.dataTransfer.dropEffect = "none"
      setDragOverTrackId(null) // Clear visual feedback for incompatible track
      return
    }

    const trackElement = e.currentTarget as HTMLElement
    const rect = trackElement.getBoundingClientRect()
    const x = e.clientX - rect.left - dragGrabOffset
    let newTime = Math.max(0, x / (BASE_SCALE * scale))

    // Get other clips on the target track (excluding the dragged clip)
    const otherClips = clips.filter(c => {
      // Normalize track IDs
      let clipTrackId = c.trackId
      if (clipTrackId === "video-main") clipTrackId = "video-1"
      if (!clipTrackId) {
        clipTrackId = c.asset?.type === "audio" ? "audio-1" : "video-1"
      }
      return clipTrackId === trackId && c.id !== draggedClipId
    })

    // Calculate snap points from other clips
    const snapPoints: number[] = [0, currentTime] // Snap to 0 and playhead
    for (const clip of otherClips) {
      snapPoints.push(clip.startTime) // Snap to start of clips
      snapPoints.push(clip.startTime + clip.duration) // Snap to end of clips
    }

    // Check for snapping - both the start and end of dragged clip
    const draggedDuration = draggedClip.duration
    let snappedTime = newTime
    let activeSnapPoint: number | null = null

    // Try snapping the START of dragged clip to snap points
    for (const snapPoint of snapPoints) {
      if (Math.abs(newTime - snapPoint) < SNAP_THRESHOLD) {
        snappedTime = snapPoint
        break
      }
    }

    // Try snapping the END of dragged clip to snap points
    if (snappedTime === newTime) {
      for (const snapPoint of snapPoints) {
        if (Math.abs((newTime + draggedDuration) - snapPoint) < SNAP_THRESHOLD) {
          snappedTime = snapPoint - draggedDuration
          break
        }
      }
    }

    // Prevent overlap - find valid position
    const proposedStart = snappedTime
    const proposedEnd = proposedStart + draggedDuration

    // Check for overlaps and find nearest valid position
    let hasOverlap = false
    for (const clip of otherClips) {
      const clipEnd = clip.startTime + clip.duration
      // Check if there's any overlap
      if (proposedStart < clipEnd && proposedEnd > clip.startTime) {
        hasOverlap = true
        break
      }
    }

    if (hasOverlap) {
      // Find the nearest gap that can fit the clip
      // Sort clips by start time
      const sortedClips = [...otherClips].sort((a, b) => a.startTime - b.startTime)

      // Find all gaps
      const gaps: { start: number; end: number }[] = []

      // Gap before first clip
      if (sortedClips.length === 0 || sortedClips[0].startTime > 0) {
        gaps.push({ start: 0, end: sortedClips.length > 0 ? sortedClips[0].startTime : Infinity })
      }

      // Gaps between clips
      for (let i = 0; i < sortedClips.length - 1; i++) {
        const gapStart = sortedClips[i].startTime + sortedClips[i].duration
        const gapEnd = sortedClips[i + 1].startTime
        if (gapEnd > gapStart) {
          gaps.push({ start: gapStart, end: gapEnd })
        }
      }

      // Gap after last clip
      if (sortedClips.length > 0) {
        const lastClip = sortedClips[sortedClips.length - 1]
        gaps.push({ start: lastClip.startTime + lastClip.duration, end: Infinity })
      }

      // Find nearest valid position
      let bestPosition = snappedTime
      let bestDistance = Infinity

      for (const gap of gaps) {
        const gapSize = gap.end - gap.start
        if (gapSize >= draggedDuration) {
          // Clip fits in this gap
          // Try placing at gap start
          const distToGapStart = Math.abs(snappedTime - gap.start)
          if (distToGapStart < bestDistance) {
            bestDistance = distToGapStart
            bestPosition = gap.start
          }
          // Try placing at gap end (clip end aligns with gap end)
          if (gap.end !== Infinity) {
            const posAtGapEnd = gap.end - draggedDuration
            const distToGapEnd = Math.abs(snappedTime - posAtGapEnd)
            if (distToGapEnd < bestDistance) {
              bestDistance = distToGapEnd
              bestPosition = posAtGapEnd
            }
          }
        }
      }

      snappedTime = Math.max(0, bestPosition)
    }

    // Round to avoid floating point issues
    snappedTime = Math.round(snappedTime * 100) / 100

    // Limit target track to prevent endless track creation during drag
    // Can only drop on tracks that existed at drag start + one empty track above
    let finalTrackId = trackId
    if (dragStartMaxTracks.current) {
      const trackNum = parseInt(trackId.split("-")[1]) || 1
      if (trackId.startsWith("video-")) {
        const maxAllowed = dragStartMaxTracks.current.video + 1
        if (trackNum > maxAllowed) {
          finalTrackId = `video-${maxAllowed}`
        }
      } else if (trackId.startsWith("audio-")) {
        const maxAllowed = dragStartMaxTracks.current.audio + 1
        if (trackNum > maxAllowed) {
          finalTrackId = `audio-${maxAllowed}`
        }
      }
    }

    // Move clip to new time AND new track
    moveClip(draggedClipId, snappedTime, finalTrackId)
  }

  const handleDragLeave = () => {
    setIsDroppingAsset(false)
    setDroppingTrackId(null)
  }

  const handleDrop = async (e: React.DragEvent, trackId: string) => {
    e.preventDefault()
    setIsDroppingAsset(false)
    setDroppingTrackId(null)

    try {
      const jsonData = e.dataTransfer.getData("application/json")
      if (jsonData) {
        const data = JSON.parse(jsonData)
        if (data.type === "asset" && data.assetId) {
          // Check if asset type is compatible with target track
          if (!isAssetCompatibleWithTrack(data.assetType, trackId)) {
            return // Don't drop incompatible assets
          }

          let startTime: number

          if (autoSnapTracks.has(trackId)) {
            // Auto-snap: place clip at the end of existing clips on this track
            const trackClips = clips.filter(c => {
              let clipTrackId = c.trackId
              if (clipTrackId === "video-main") clipTrackId = "video-1"
              return clipTrackId === trackId
            })
            const trackEndTime = trackClips.length > 0
              ? Math.max(...trackClips.map(c => c.startTime + c.duration))
              : 0
            startTime = trackEndTime
          } else {
            // Free placement: drop where cursor is
            const trackElement = e.currentTarget as HTMLElement
            const rect = trackElement.getBoundingClientRect()
            const x = e.clientX - rect.left
            const dropTime = Math.max(0, x / (BASE_SCALE * scale))
            startTime = Math.round(dropTime * 10) / 10
          }

          await addClip(data.assetId, startTime, {
            duration: data.duration || 5,
            trackId: trackId,
          })
          // Re-snap if track is locked to ensure no gaps
          if (autoSnapTracks.has(trackId)) {
            // Small delay to let state update
            setTimeout(() => snapClipsOnTrack(trackId), 100)
          }
          return
        }
      }
    } catch {
      // Not JSON data, ignore
    }

    setDraggedClipId(null)
  }

  const handleTrackClick = (e: React.MouseEvent, _trackId: string) => {
    const trackElement = e.currentTarget as HTMLElement
    const rect = trackElement.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = Math.max(0, x / (BASE_SCALE * scale))
    // Pause playback when clicking on track
    onScrubStart?.()
    onTimeChange(time)
    setSelectedClip(null)
  }

  const handleDeleteClip = async (clipId: string) => {
    // Find the clip's track before deleting
    const clip = clips.find(c => c.id === clipId)
    let trackId = clip?.trackId
    if (trackId === "video-main") trackId = "video-1"

    await deleteClip(clipId)

    // Re-snap if track has auto-snap enabled
    if (trackId && autoSnapTracks.has(trackId)) {
      setTimeout(() => snapClipsOnTrack(trackId!), 100)
    }
  }

  const handleSplitClip = async (clipId: string, splitTime: number) => {
    await splitClip(clipId, splitTime)
  }

  // Handle trimming from the start edge (changes startTime, inPoint, and duration)
  const handleTrimStart = useCallback(
    (clipId: string, newStartTime: number, newInPoint: number, newDuration: number) => {
      trimClip(clipId, newInPoint, newDuration, newStartTime)
    },
    [trimClip]
  )

  // Handle trimming from the end edge (only changes duration)
  const handleTrimEnd = useCallback(
    (clipId: string, newDuration: number) => {
      trimClip(clipId, undefined, newDuration)
    },
    [trimClip]
  )

  // Playhead drag handlers
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingPlayhead(true)
    // Pause playback when user starts scrubbing
    onScrubStart?.()
  }

  // Handle playhead dragging with mouse move/up on window
  useEffect(() => {
    if (!isDraggingPlayhead) return

    let rafId: number | null = null
    let pendingTime: number | null = null

    const handleMouseMove = (e: MouseEvent) => {
      if (!tracksContainerRef.current) return
      const rect = tracksContainerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left - 80 // Subtract track label width
      pendingTime = Math.max(0, x / (BASE_SCALE * scale))

      // Use requestAnimationFrame for smooth updates
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          if (pendingTime !== null) {
            onTimeChange(pendingTime)
          }
          rafId = null
        })
      }
    }

    const handleMouseUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      // Final update on mouse up
      if (pendingTime !== null) {
        onTimeChange(pendingTime)
      }
      setIsDraggingPlayhead(false)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingPlayhead, scale, onTimeChange])

  // Calculate playhead position
  const playheadPosition = currentTime * BASE_SCALE * scale

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-900/50">
      {/* Timeline Content - Scrollable with permanent scrollbar */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-scroll overflow-y-auto min-h-0 timeline-scroll"
      >
        <div
          ref={timelineRef}
          className="relative min-w-full"
          style={{ width: `${Math.max(totalDuration * BASE_SCALE * scale + 80, 100)}px` }}
        >
          {/* Time Ruler - clickable to seek */}
          <TimelineRuler totalDuration={totalDuration} scale={scale} onTimeChange={(time) => {
            onScrubStart?.()
            onTimeChange(time)
          }} />

          {/* Tracks */}
          <div ref={tracksContainerRef} className="relative">
            {/* Video Tracks - reversed so V1 is at bottom (background), higher tracks on top */}
            {[...videoTracks].reverse().map((track) => (
              <TimelineTrack
                key={track.id}
                id={track.id}
                type="video"
                label={track.label}
                clips={track.clips}
                selectedClipId={selectedClipId}
                scale={scale}
                totalDuration={totalDuration}
                isDroppingAsset={isDroppingAsset && droppingTrackId === track.id}
                isDragTarget={draggedClipId !== null && dragOverTrackId === track.id}
                autoSnap={autoSnapTracks.has(track.id)}
                onToggleAutoSnap={async () => {
                  const isCurrentlySnapped = autoSnapTracks.has(track.id)
                  setAutoSnapTracks(prev => {
                    const next = new Set(prev)
                    if (next.has(track.id)) {
                      next.delete(track.id)
                    } else {
                      next.add(track.id)
                    }
                    return next
                  })
                  // If turning ON, snap all clips immediately
                  if (!isCurrentlySnapped) {
                    await snapClipsOnTrack(track.id)
                  }
                }}
                onClipClick={handleClipClick}
                onClipDragStart={handleDragStart}
                onClipDragEnd={handleDragEnd}
                onClipDelete={handleDeleteClip}
                onClipSplit={handleSplitClip}
                onClipTrimStart={handleTrimStart}
                onClipTrimEnd={handleTrimEnd}
                onTrackClick={(e) => handleTrackClick(e, track.id)}
                onDragOver={(e) => handleDragOver(e, track.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, track.id)}
              />
            ))}

            {/* Audio Tracks */}
            {audioTracks.map((track) => (
              <TimelineTrack
                key={track.id}
                id={track.id}
                type="audio"
                label={track.label}
                clips={track.clips}
                selectedClipId={selectedClipId}
                scale={scale}
                totalDuration={totalDuration}
                isDroppingAsset={isDroppingAsset && droppingTrackId === track.id}
                isDragTarget={draggedClipId !== null && dragOverTrackId === track.id}
                autoSnap={autoSnapTracks.has(track.id)}
                onToggleAutoSnap={async () => {
                  const isCurrentlySnapped = autoSnapTracks.has(track.id)
                  setAutoSnapTracks(prev => {
                    const next = new Set(prev)
                    if (next.has(track.id)) {
                      next.delete(track.id)
                    } else {
                      next.add(track.id)
                    }
                    return next
                  })
                  // If turning ON, snap all clips immediately
                  if (!isCurrentlySnapped) {
                    await snapClipsOnTrack(track.id)
                  }
                }}
                onClipClick={handleClipClick}
                onClipDragStart={handleDragStart}
                onClipDragEnd={handleDragEnd}
                onClipDelete={handleDeleteClip}
                onClipSplit={handleSplitClip}
                onClipTrimStart={handleTrimStart}
                onClipTrimEnd={handleTrimEnd}
                onTrackClick={(e) => handleTrackClick(e, track.id)}
                onDragOver={(e) => handleDragOver(e, track.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, track.id)}
              />
            ))}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 z-30"
              style={{ left: `${80 + playheadPosition}px` }}
            >
              {/* Playhead line */}
              <div className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 pointer-events-none ${
                isDraggingPlayhead ? 'bg-red-400' : 'bg-red-500'
              }`} />

              {/* Draggable handle */}
              <div
                onMouseDown={handlePlayheadMouseDown}
                className={`absolute -top-5 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-grab select-none ${
                  isDraggingPlayhead ? 'cursor-grabbing scale-110' : 'hover:scale-105'
                } transition-transform`}
              >
                {/* Handle head */}
                <div className={`w-5 h-5 rounded-full shadow-lg ${
                  isDraggingPlayhead ? 'bg-red-400 ring-2 ring-red-300' : 'bg-red-500 hover:bg-red-400'
                }`} />
                {/* Handle stem */}
                <div className={`w-1 h-2 ${isDraggingPlayhead ? 'bg-red-400' : 'bg-red-500'}`} />
              </div>

              {/* Invisible wider hit area */}
              <div
                onMouseDown={handlePlayheadMouseDown}
                className="absolute -top-6 left-1/2 -translate-x-1/2 w-8 h-8 cursor-grab"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
