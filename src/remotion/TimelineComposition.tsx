import { useMemo, useEffect } from "react"
import { AbsoluteFill, Sequence, Video, Img, Audio, prefetch, useCurrentFrame, interpolate } from "remotion"
import { TimelineClipWithAsset } from "@/state/workspaceStore"
import { TransitionType } from "@/types/timeline"
import { getAssetDisplayUrl } from "@/services/localStorage"

export const FPS = 30

// Track audio settings type
export interface TrackAudioSettings {
  muted: boolean
  volume: number // 0-100
}

// Transition wrapper - applies transition effects based on clip settings
function TransitionClip({
  children,
  transitionIn,
  transitionOut,
  transitionDuration,
  durationFrames,
}: {
  children: React.ReactNode
  transitionIn?: TransitionType
  transitionOut?: TransitionType
  transitionDuration: number
  durationFrames: number
}) {
  const frame = useCurrentFrame()

  let opacity = 1
  let scale = 1
  let translateX = 0

  // Transition IN at start of clip
  if (transitionIn && transitionIn !== "none" && frame < transitionDuration) {
    const progress = interpolate(frame, [0, transitionDuration], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })

    switch (transitionIn) {
      case "crossfade":
      case "fade-black":
        opacity = progress
        break
      case "wipe-left":
        translateX = interpolate(progress, [0, 1], [-100, 0])
        break
      case "wipe-right":
        translateX = interpolate(progress, [0, 1], [100, 0])
        break
      case "zoom-in":
        scale = interpolate(progress, [0, 1], [0.5, 1])
        opacity = progress
        break
      case "zoom-out":
        scale = interpolate(progress, [0, 1], [1.5, 1])
        opacity = progress
        break
    }
  }

  // Transition OUT at end of clip
  if (transitionOut && transitionOut !== "none" && frame > durationFrames - transitionDuration) {
    const progress = interpolate(
      frame,
      [durationFrames - transitionDuration, durationFrames],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    )

    switch (transitionOut) {
      case "crossfade":
      case "fade-black":
        opacity = 1 - progress
        break
      case "wipe-left":
        translateX = interpolate(progress, [0, 1], [0, -100])
        break
      case "wipe-right":
        translateX = interpolate(progress, [0, 1], [0, 100])
        break
      case "zoom-in":
        scale = interpolate(progress, [0, 1], [1, 1.5])
        opacity = 1 - progress
        break
      case "zoom-out":
        scale = interpolate(progress, [0, 1], [1, 0.5])
        opacity = 1 - progress
        break
    }
  }

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `scale(${scale}) translateX(${translateX}%)`,
      }}
    >
      {children}
    </AbsoluteFill>
  )
}

// Timeline composition that renders all clips with proper audio handling
export interface TimelineCompositionProps {
  clips?: TimelineClipWithAsset[]
  trackAudioSettings?: Record<string, TrackAudioSettings>
  globalMuted?: boolean
}

export function TimelineComposition({
  clips = [],
  trackAudioSettings = {},
  globalMuted = false,
}: TimelineCompositionProps) {
  // Separate video/image clips from audio clips
  const visualClips = useMemo(() => {
    return [...clips]
      .filter((c) => c.asset?.type === "video" || c.asset?.type === "image")
      .sort((a, b) => {
        const aTrack = parseInt(a.trackId?.split("-")[1] || "1")
        const bTrack = parseInt(b.trackId?.split("-")[1] || "1")
        if (aTrack !== bTrack) return aTrack - bTrack
        return a.startTime - b.startTime
      })
  }, [clips])

  const audioClips = useMemo(() => {
    return [...clips]
      .filter((c) => c.asset?.type === "audio")
      .sort((a, b) => a.startTime - b.startTime)
  }, [clips])

  // Helper to get volume for a clip based on track settings
  const getClipVolume = (clip: TimelineClipWithAsset): number => {
    if (globalMuted) return 0
    const trackId = clip.trackId || (clip.asset?.type === "audio" ? "audio-1" : "video-1")
    const settings = trackAudioSettings[trackId]
    if (settings?.muted) return 0
    return (settings?.volume ?? 100) / 100
  }

  // Prefetch all video/audio URLs for seamless playback
  useEffect(() => {
    const prefetchers: (() => void)[] = []
    for (const clip of [...visualClips, ...audioClips]) {
      if (clip.asset?.type === "video" || clip.asset?.type === "audio") {
        const url = clip.asset ? getAssetDisplayUrl(clip.asset) : null
        if (url) {
          const { free } = prefetch(url, { method: "blob-url" })
          prefetchers.push(free)
        }
      }
    }
    return () => {
      prefetchers.forEach((free) => free())
    }
  }, [visualClips, audioClips])

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Render visual clips (video/image) */}
      {visualClips.map((clip) => {
        const url = clip.asset ? getAssetDisplayUrl(clip.asset) : null
        if (!url) return null

        const startFrame = Math.round(clip.startTime * FPS)

        // For videos: use asset's actual duration, not clip.duration (which may have defaulted to 5)
        const actualDuration = (clip.asset?.type === 'video' && clip.asset?.duration)
          ? clip.asset.duration
          : clip.duration

        const durationFrames = Math.round(actualDuration * FPS)
        const inPointFrames = Math.round((clip.inPoint || 0) * FPS)
        const volume = getClipVolume(clip)

        // Get transition settings from clip (defaults to no transition)
        const transitionIn = clip.transitionIn
        const transitionOut = clip.transitionOut
        const transitionDuration = Math.round((clip.transitionDuration || 0.5) * FPS)

        return (
          <Sequence
            key={clip.id}
            from={startFrame}
            durationInFrames={durationFrames}
          >
            <TransitionClip
              transitionIn={transitionIn}
              transitionOut={transitionOut}
              transitionDuration={transitionDuration}
              durationFrames={durationFrames}
            >
              {clip.asset?.type === "video" ? (
                <Video
                  src={url}
                  startFrom={inPointFrames}
                  volume={volume}
                  muted={globalMuted || volume === 0}
                  pauseWhenBuffering={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <Img
                  src={url}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              )}
            </TransitionClip>
          </Sequence>
        )
      })}

      {/* Render audio clips */}
      {audioClips.map((clip) => {
        const url = clip.asset ? getAssetDisplayUrl(clip.asset) : null
        if (!url) return null

        const startFrame = Math.round(clip.startTime * FPS)
        const durationFrames = Math.round(clip.duration * FPS)
        const inPointFrames = Math.round((clip.inPoint || 0) * FPS)
        const volume = getClipVolume(clip)

        return (
          <Sequence
            key={clip.id}
            from={startFrame}
            durationInFrames={durationFrames}
          >
            <Audio
              src={url}
              startFrom={inPointFrames}
              volume={volume}
              muted={globalMuted || volume === 0}
            />
          </Sequence>
        )
      })}
    </AbsoluteFill>
  )
}
