import { forwardRef } from "react"
import { Player, PlayerRef } from "@remotion/player"
import { VideoComposition } from "./VideoComposition"
import { VIDEO_FPS, VIDEO_WIDTH, VIDEO_HEIGHT } from "./Root"
import type { CompositionProps, Shot, TextOverlayConfig } from "./Root"

interface VideoPreviewProps {
  shots: Shot[]
  title?: CompositionProps["title"]
  outro?: CompositionProps["outro"]
  textOverlays?: TextOverlayConfig[]
  backgroundColor?: string
  width?: number
  height?: number
  autoPlay?: boolean
  loop?: boolean
  controls?: boolean
}

export const VideoPreview = forwardRef<PlayerRef, VideoPreviewProps>(function VideoPreview({
  shots,
  title,
  outro,
  textOverlays = [],
  backgroundColor = "#000000",
  width = 640,
  height = 360,
  autoPlay = false,
  loop = false,
  controls = true,
}, ref) {
  // Calculate total duration in frames
  let totalFrames = 0

  if (title) {
    totalFrames += 3 * VIDEO_FPS // 3 seconds for title
  }

  for (const shot of shots) {
    totalFrames += Math.round(shot.duration * VIDEO_FPS)
  }

  if (outro) {
    totalFrames += 3 * VIDEO_FPS // 3 seconds for outro
  }

  // Minimum duration of 1 second
  if (totalFrames < VIDEO_FPS) {
    totalFrames = VIDEO_FPS
  }

  return (
    <Player
      ref={ref}
      component={VideoComposition}
      inputProps={{
        shots,
        title,
        outro,
        textOverlays,
        backgroundColor,
      }}
      durationInFrames={totalFrames}
      fps={VIDEO_FPS}
      compositionWidth={VIDEO_WIDTH}
      compositionHeight={VIDEO_HEIGHT}
      style={{
        width,
        height,
        borderRadius: 8,
        overflow: "hidden",
      }}
      autoPlay={autoPlay}
      loop={loop}
      controls={controls}
    />
  )
})
