import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion"

type Position = "top" | "center" | "bottom" | "lower-third"
type Animation = "fade" | "slide-up" | "slide-left" | "typewriter" | "glitch"

interface TextOverlayProps {
  text: string
  position?: Position
  animation?: Animation
  font?: string
  fontSize?: number
  fontWeight?: number
  color?: string
  backgroundColor?: string
  padding?: number
  startFrame?: number
  endFrame?: number
}

export function TextOverlay({
  text,
  position = "center",
  animation = "fade",
  font = "Inter, sans-serif",
  fontSize = 48,
  fontWeight = 600,
  color = "#ffffff",
  backgroundColor,
  padding = 16,
  startFrame = 0,
  endFrame,
}: TextOverlayProps) {
  const frame = useCurrentFrame()
  const { durationInFrames, fps } = useVideoConfig()

  const effectiveEndFrame = endFrame ?? durationInFrames
  const duration = effectiveEndFrame - startFrame
  const localFrame = frame - startFrame

  // Only render if within time range
  if (frame < startFrame || frame >= effectiveEndFrame) {
    return null
  }

  const fadeInDuration = Math.min(fps * 0.3, duration * 0.2)
  const fadeOutDuration = Math.min(fps * 0.3, duration * 0.2)
  const fadeOutStart = duration - fadeOutDuration

  // Base opacity
  let opacity = interpolate(
    localFrame,
    [0, fadeInDuration, fadeOutStart, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  )

  // Position styles
  const positionStyles: React.CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    display: "flex",
    justifyContent: "center",
  }

  switch (position) {
    case "top":
      positionStyles.top = "10%"
      break
    case "center":
      positionStyles.top = "50%"
      positionStyles.transform = "translateY(-50%)"
      break
    case "bottom":
      positionStyles.bottom = "10%"
      break
    case "lower-third":
      positionStyles.bottom = "15%"
      positionStyles.left = "5%"
      positionStyles.right = "auto"
      positionStyles.justifyContent = "flex-start"
      break
  }

  // Animation-specific effects
  let transform = ""
  let displayText = text

  switch (animation) {
    case "slide-up": {
      const slideY = interpolate(localFrame, [0, fadeInDuration], [30, 0], {
        extrapolateRight: "clamp",
      })
      transform = `translateY(${slideY}px)`
      break
    }
    case "slide-left": {
      const slideX = interpolate(localFrame, [0, fadeInDuration], [50, 0], {
        extrapolateRight: "clamp",
      })
      transform = `translateX(${slideX}px)`
      break
    }
    case "typewriter": {
      const chars = Math.floor(
        interpolate(localFrame, [0, fps * 1.5], [0, text.length], {
          extrapolateRight: "clamp",
        })
      )
      displayText = text.slice(0, chars)
      break
    }
    case "glitch": {
      // Subtle glitch effect on entrance
      if (localFrame < fadeInDuration) {
        const glitchOffset = Math.sin(localFrame * 2) * 3
        transform = `translateX(${glitchOffset}px)`
        opacity *= 0.8 + Math.random() * 0.2
      }
      break
    }
  }

  const textStyle: React.CSSProperties = {
    fontFamily: font,
    fontSize,
    fontWeight,
    color,
    margin: 0,
    padding,
    backgroundColor: backgroundColor || "transparent",
    borderRadius: backgroundColor ? 8 : 0,
    transform,
    letterSpacing: "-0.01em",
    textShadow: backgroundColor ? "none" : "0 2px 8px rgba(0,0,0,0.5)",
  }

  return (
    <div style={{ ...positionStyles, opacity }}>
      <span style={textStyle}>
        {displayText}
        {animation === "typewriter" && displayText.length < text.length && (
          <span style={{ opacity: localFrame % 15 < 8 ? 1 : 0 }}>|</span>
        )}
      </span>
    </div>
  )
}
