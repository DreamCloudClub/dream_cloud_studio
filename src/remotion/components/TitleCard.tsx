import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion"
import type { TitleConfig } from "../Root"

interface TitleCardProps {
  config: TitleConfig
}

export function TitleCard({ config }: TitleCardProps) {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  const {
    text,
    subtitle,
    font = "Inter, sans-serif",
    fontSize = 72,
    color = "#ffffff",
    backgroundColor = "#000000",
    animation = "fade",
  } = config

  // Animation timing
  const fadeInEnd = fps * 0.5 // 0.5s fade in
  const fadeOutStart = durationInFrames - fps * 0.5 // 0.5s fade out

  // Opacity for fade in/out
  const opacity = interpolate(
    frame,
    [0, fadeInEnd, fadeOutStart, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  )

  // Animation-specific transforms
  let transform = ""
  let subtitleTransform = ""

  if (animation === "slide-up") {
    const slideY = interpolate(frame, [0, fadeInEnd], [50, 0], {
      extrapolateRight: "clamp",
    })
    transform = `translateY(${slideY}px)`
    subtitleTransform = `translateY(${slideY * 0.5}px)`
  } else if (animation === "zoom") {
    const scale = interpolate(frame, [0, fadeInEnd], [0.8, 1], {
      extrapolateRight: "clamp",
    })
    transform = `scale(${scale})`
  }

  // Typewriter effect for text
  const visibleChars =
    animation === "typewriter"
      ? Math.floor(interpolate(frame, [0, fps * 1.5], [0, text.length], { extrapolateRight: "clamp" }))
      : text.length

  const displayText = animation === "typewriter" ? text.slice(0, visibleChars) : text

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      }}
    >
      <h1
        style={{
          fontFamily: font,
          fontSize,
          fontWeight: 700,
          color,
          margin: 0,
          textAlign: "center",
          transform,
          letterSpacing: "-0.02em",
        }}
      >
        {displayText}
        {animation === "typewriter" && visibleChars < text.length && (
          <span style={{ opacity: frame % 15 < 8 ? 1 : 0 }}>|</span>
        )}
      </h1>

      {subtitle && (
        <p
          style={{
            fontFamily: font,
            fontSize: fontSize * 0.4,
            fontWeight: 400,
            color,
            opacity: 0.7,
            margin: 0,
            marginTop: 16,
            textAlign: "center",
            transform: subtitleTransform,
          }}
        >
          {subtitle}
        </p>
      )}
    </AbsoluteFill>
  )
}
