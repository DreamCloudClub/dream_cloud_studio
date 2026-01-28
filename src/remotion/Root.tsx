import { Composition } from "remotion"
import { VideoComposition } from "./VideoComposition"
import { AnimationComposition } from "./AnimationComposition"
import type { AnimationCompositionProps } from "./AnimationComposition"
import type { PanDirection } from "./components"

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
  // Scale/crop settings (works for both images and videos)
  scale?: number  // 1 = 100%, 1.5 = 150% zoomed in
  positionX?: number  // -50 to 50, percentage offset from center
  positionY?: number  // -50 to 50, percentage offset from center
  // Image pan/zoom animation settings (Ken Burns effect - images only)
  pan?: PanDirection
  startPosition?: { x: number; y: number } // 0-100 percentage (manual override)
  endPosition?: { x: number; y: number }   // 0-100 percentage (manual override)
  startScale?: number  // e.g., 1.2 for 120%
  endScale?: number    // e.g., 1.4 for 140%
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

export interface TextOverlayConfig {
  id: string
  text: string
  position?: "top" | "center" | "bottom" | "lower-third"
  animation?: "fade" | "slide-up" | "slide-left" | "typewriter" | "glitch"
  shotId?: string  // If set, overlay is relative to this shot
  startTime?: number  // Seconds from start (or from shot start if shotId is set)
  duration?: number  // How long to show (seconds)
  // Styling
  font?: string
  fontSize?: number
  fontWeight?: number
  color?: string
  backgroundColor?: string
}

export interface CompositionProps {
  shots: Shot[]
  title?: TitleConfig
  outro?: TitleConfig
  textOverlays?: TextOverlayConfig[]
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
      <Composition
        id="AnimationComposition"
        component={AnimationComposition}
        durationInFrames={300} // Will be calculated from segments
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={{
          segments: [],
          backgroundColor: "#000000",
        } as AnimationCompositionProps}
      />
    </>
  )
}
