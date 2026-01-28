import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion"

// Pan direction presets for fitting square images in landscape
export type PanDirection =
  | "none"           // Static center crop
  | "left-to-right"  // Pan from left to right
  | "right-to-left"  // Pan from right to left
  | "top-to-bottom"  // Pan from top to bottom
  | "bottom-to-top"  // Pan from bottom to top
  | "zoom-in"        // Zoom into center
  | "zoom-out"       // Zoom out from center
  | "top-left-to-bottom-right"
  | "bottom-right-to-top-left"

interface ImageShotProps {
  src: string
  durationInFrames: number
  // Pan and zoom settings
  pan?: PanDirection
  // Manual control (overrides pan preset)
  startPosition?: { x: number; y: number } // 0-100 percentage
  endPosition?: { x: number; y: number }   // 0-100 percentage
  startScale?: number  // e.g., 1.2 for 120%
  endScale?: number    // e.g., 1.4 for 140%
  // Legacy
  kenBurns?: boolean
}

// Get start/end positions based on pan direction
function getPanPositions(pan: PanDirection): {
  startPos: { x: number; y: number }
  endPos: { x: number; y: number }
  startScale: number
  endScale: number
} {
  // For fitting square (1:1) into landscape (16:9), we need ~1.78x scale minimum
  // Using 1.4-1.6 gives nice cropping with room to pan
  const baseScale = 1.4

  switch (pan) {
    case "left-to-right":
      return {
        startPos: { x: 30, y: 50 },
        endPos: { x: 70, y: 50 },
        startScale: baseScale,
        endScale: baseScale,
      }
    case "right-to-left":
      return {
        startPos: { x: 70, y: 50 },
        endPos: { x: 30, y: 50 },
        startScale: baseScale,
        endScale: baseScale,
      }
    case "top-to-bottom":
      return {
        startPos: { x: 50, y: 30 },
        endPos: { x: 50, y: 70 },
        startScale: baseScale,
        endScale: baseScale,
      }
    case "bottom-to-top":
      return {
        startPos: { x: 50, y: 70 },
        endPos: { x: 50, y: 30 },
        startScale: baseScale,
        endScale: baseScale,
      }
    case "zoom-in":
      return {
        startPos: { x: 50, y: 50 },
        endPos: { x: 50, y: 50 },
        startScale: baseScale,
        endScale: baseScale * 1.3,
      }
    case "zoom-out":
      return {
        startPos: { x: 50, y: 50 },
        endPos: { x: 50, y: 50 },
        startScale: baseScale * 1.3,
        endScale: baseScale,
      }
    case "top-left-to-bottom-right":
      return {
        startPos: { x: 35, y: 35 },
        endPos: { x: 65, y: 65 },
        startScale: baseScale,
        endScale: baseScale * 1.1,
      }
    case "bottom-right-to-top-left":
      return {
        startPos: { x: 65, y: 65 },
        endPos: { x: 35, y: 35 },
        startScale: baseScale * 1.1,
        endScale: baseScale,
      }
    case "none":
    default:
      return {
        startPos: { x: 50, y: 50 },
        endPos: { x: 50, y: 50 },
        startScale: baseScale,
        endScale: baseScale,
      }
  }
}

export function ImageShot({
  src,
  durationInFrames,
  pan = "zoom-in",
  startPosition,
  endPosition,
  startScale: customStartScale,
  endScale: customEndScale,
  kenBurns,
}: ImageShotProps) {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()

  // Handle legacy kenBurns prop
  const effectivePan = kenBurns === false ? "none" : pan

  // Get positions from preset or custom values
  const presetPositions = getPanPositions(effectivePan)
  const startPos = startPosition || presetPositions.startPos
  const endPos = endPosition || presetPositions.endPos
  const startScale = customStartScale ?? presetPositions.startScale
  const endScale = customEndScale ?? presetPositions.endScale

  // Interpolate current values
  const currentScale = interpolate(
    frame,
    [0, durationInFrames],
    [startScale, endScale],
    { extrapolateRight: "clamp" }
  )

  const currentX = interpolate(
    frame,
    [0, durationInFrames],
    [startPos.x, endPos.x],
    { extrapolateRight: "clamp" }
  )

  const currentY = interpolate(
    frame,
    [0, durationInFrames],
    [startPos.y, endPos.y],
    { extrapolateRight: "clamp" }
  )

  // Convert percentage position to translate values
  // 50% = center (no translate), 0% = left edge visible, 100% = right edge visible
  const translateX = (50 - currentX) * (currentScale - 1) * (width / 100)
  const translateY = (50 - currentY) * (currentScale - 1) * (height / 100)

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${currentScale}) translate(${translateX}px, ${translateY}px)`,
          transformOrigin: "center center",
        }}
      />
    </AbsoluteFill>
  )
}
