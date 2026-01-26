import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion"
import type { ReactNode } from "react"

type TransitionType = "none" | "fade" | "wipe-left" | "wipe-right" | "zoom"

interface TransitionProps {
  children: ReactNode
  type: TransitionType
  durationInFrames: number
}

export function Transition({ children, type, durationInFrames }: TransitionProps) {
  const frame = useCurrentFrame()

  if (type === "none") {
    return <AbsoluteFill>{children}</AbsoluteFill>
  }

  // Fade transition
  if (type === "fade") {
    const opacity = interpolate(frame, [0, durationInFrames], [0, 1], {
      extrapolateRight: "clamp",
    })

    return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>
  }

  // Wipe transitions
  if (type === "wipe-left" || type === "wipe-right") {
    const progress = interpolate(frame, [0, durationInFrames], [0, 100], {
      extrapolateRight: "clamp",
    })

    const clipPath =
      type === "wipe-left"
        ? `inset(0 ${100 - progress}% 0 0)`
        : `inset(0 0 0 ${100 - progress}%)`

    return (
      <AbsoluteFill style={{ clipPath }}>
        {children}
      </AbsoluteFill>
    )
  }

  // Zoom transition
  if (type === "zoom") {
    const scale = interpolate(frame, [0, durationInFrames], [1.2, 1], {
      extrapolateRight: "clamp",
    })
    const opacity = interpolate(frame, [0, durationInFrames * 0.5], [0, 1], {
      extrapolateRight: "clamp",
    })

    return (
      <AbsoluteFill style={{ transform: `scale(${scale})`, opacity }}>
        {children}
      </AbsoluteFill>
    )
  }

  return <AbsoluteFill>{children}</AbsoluteFill>
}
