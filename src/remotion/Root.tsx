import { Composition } from "remotion"
import { VideoComposition } from "./VideoComposition"

// Default composition settings
export const VIDEO_FPS = 30
export const VIDEO_WIDTH = 1920
export const VIDEO_HEIGHT = 1080

export interface Shot {
  id: string
  type: "video" | "image" | "title"
  src?: string // URL for video/image
  duration: number // in seconds
  transition?: "none" | "fade" | "wipe-left" | "wipe-right" | "zoom"
  transitionDuration?: number // in seconds
}

export interface TitleConfig {
  text: string
  subtitle?: string
  font?: string
  fontSize?: number
  color?: string
  backgroundColor?: string
  animation?: "fade" | "slide-up" | "zoom" | "typewriter"
}

export interface CompositionProps {
  shots: Shot[]
  title?: TitleConfig
  outro?: TitleConfig
  backgroundColor?: string
}

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="VideoComposition"
        component={VideoComposition}
        durationInFrames={300} // Will be calculated from shots
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={{
          shots: [],
          backgroundColor: "#000000",
        }}
      />
    </>
  )
}
