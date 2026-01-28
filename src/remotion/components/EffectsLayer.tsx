import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Img } from "remotion"
import type { ReactNode } from "react"

export type EffectAnimationType = 'fadeIn' | 'fadeOut' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scale' | 'typewriter'

export interface EffectElement {
  type: 'text' | 'shape' | 'image'
  content: string
  animation: EffectAnimationType
  timing: [number, number] // [startSec, endSec]
  position?: { x: number; y: number } // percentage
  style?: Record<string, any>
}

interface EffectsLayerProps {
  children: ReactNode
  effects: EffectElement[]
}

/**
 * EffectsLayer renders overlay effects on top of child content (shots).
 * Use for text overlays, lower thirds, animated graphics, etc.
 */
export function EffectsLayer({ children, effects }: EffectsLayerProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  return (
    <AbsoluteFill>
      {/* Base content layer */}
      {children}

      {/* Effects overlay layer */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {effects.map((effect, index) => (
          <EffectItem key={index} effect={effect} fps={fps} frame={frame} />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

interface EffectItemProps {
  effect: EffectElement
  fps: number
  frame: number
}

function EffectItem({ effect, fps, frame }: EffectItemProps) {
  const { type, content, animation, timing, position, style = {} } = effect
  const [startSec, endSec] = timing
  const startFrame = Math.round(startSec * fps)
  const endFrame = Math.round(endSec * fps)
  const duration = endFrame - startFrame

  // Don't render if outside timing window
  if (frame < startFrame || frame >= endFrame) {
    return null
  }

  const localFrame = frame - startFrame

  // Animation timing
  const animInDuration = Math.min(fps * 0.4, duration * 0.25)
  const animOutDuration = Math.min(fps * 0.4, duration * 0.25)
  const fadeOutStart = duration - animOutDuration

  // Get animation values
  const { opacity, transform } = computeAnimation(
    animation,
    localFrame,
    duration,
    animInDuration,
    fadeOutStart,
    fps
  )

  // Position handling
  const positionStyle: React.CSSProperties = {
    position: "absolute",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }

  if (position) {
    positionStyle.left = `${position.x}%`
    positionStyle.top = `${position.y}%`
    positionStyle.transform = `translate(-50%, -50%) ${transform}`.trim()
  } else {
    // Default to center
    positionStyle.left = "50%"
    positionStyle.top = "50%"
    positionStyle.transform = `translate(-50%, -50%) ${transform}`.trim()
  }

  // Typewriter content handling
  let displayContent = content
  if (type === 'text' && animation === 'typewriter') {
    const charCount = Math.floor(
      interpolate(localFrame, [0, duration * 0.6], [0, content.length], {
        extrapolateRight: "clamp",
      })
    )
    displayContent = content.slice(0, charCount)
  }

  return (
    <div style={{ ...positionStyle, opacity }}>
      {type === 'text' && (
        <EffectText
          content={displayContent}
          animation={animation}
          localFrame={localFrame}
          originalLength={content.length}
          style={style}
        />
      )}
      {type === 'shape' && <EffectShape content={content} style={style} />}
      {type === 'image' && <EffectImage content={content} style={style} />}
    </div>
  )
}

function computeAnimation(
  animation: EffectAnimationType,
  localFrame: number,
  duration: number,
  animInDuration: number,
  fadeOutStart: number,
  fps: number
): { opacity: number; transform: string } {
  let opacity = 1
  let transform = ""

  // Common fade in/out pattern for most animations
  const getBaseOpacity = () =>
    interpolate(
      localFrame,
      [0, animInDuration, fadeOutStart, duration],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    )

  switch (animation) {
    case 'fadeIn': {
      opacity = interpolate(localFrame, [0, animInDuration], [0, 1], {
        extrapolateRight: "clamp",
      })
      break
    }
    case 'fadeOut': {
      opacity = interpolate(localFrame, [fadeOutStart, duration], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
      break
    }
    case 'slideUp': {
      const slideY = interpolate(localFrame, [0, animInDuration], [60, 0], {
        extrapolateRight: "clamp",
      })
      opacity = getBaseOpacity()
      transform = `translateY(${slideY}px)`
      break
    }
    case 'slideDown': {
      const slideY = interpolate(localFrame, [0, animInDuration], [-60, 0], {
        extrapolateRight: "clamp",
      })
      opacity = getBaseOpacity()
      transform = `translateY(${slideY}px)`
      break
    }
    case 'slideLeft': {
      const slideX = interpolate(localFrame, [0, animInDuration], [80, 0], {
        extrapolateRight: "clamp",
      })
      opacity = getBaseOpacity()
      transform = `translateX(${slideX}px)`
      break
    }
    case 'slideRight': {
      const slideX = interpolate(localFrame, [0, animInDuration], [-80, 0], {
        extrapolateRight: "clamp",
      })
      opacity = getBaseOpacity()
      transform = `translateX(${slideX}px)`
      break
    }
    case 'scale': {
      const scale = interpolate(localFrame, [0, animInDuration], [0.7, 1], {
        extrapolateRight: "clamp",
      })
      opacity = getBaseOpacity()
      transform = `scale(${scale})`
      break
    }
    case 'typewriter': {
      opacity = getBaseOpacity()
      break
    }
  }

  return { opacity, transform }
}

interface EffectTextProps {
  content: string
  animation: EffectAnimationType
  localFrame: number
  originalLength: number
  style: Record<string, any>
}

function EffectText({ content, animation, localFrame, originalLength, style }: EffectTextProps) {
  const defaultStyle: React.CSSProperties = {
    fontFamily: "Inter, sans-serif",
    fontSize: 48,
    fontWeight: 600,
    color: "#ffffff",
    textAlign: "center",
    letterSpacing: "-0.01em",
    textShadow: "0 2px 8px rgba(0,0,0,0.5)",
    padding: "8px 16px",
    ...style,
  }

  // Add background if specified
  if (style.backgroundColor) {
    defaultStyle.borderRadius = style.borderRadius || 8
  }

  return (
    <span style={defaultStyle}>
      {content}
      {animation === 'typewriter' && content.length < originalLength && (
        <span style={{ opacity: localFrame % 15 < 8 ? 1 : 0 }}>|</span>
      )}
    </span>
  )
}

interface EffectShapeProps {
  content: string
  style: Record<string, any>
}

function EffectShape({ content, style }: EffectShapeProps) {
  const defaultStyle: React.CSSProperties = {
    width: 80,
    height: 80,
    backgroundColor: "#ffffff",
    ...style,
  }

  switch (content) {
    case 'circle':
      return <div style={{ ...defaultStyle, borderRadius: "50%" }} />
    case 'rectangle':
      return <div style={defaultStyle} />
    case 'line':
      return (
        <div
          style={{
            width: style.width || 150,
            height: style.height || 3,
            backgroundColor: style.backgroundColor || "#ffffff",
            ...style,
          }}
        />
      )
    case 'dot':
      return (
        <div
          style={{
            width: style.width || 12,
            height: style.height || 12,
            backgroundColor: style.backgroundColor || "#ffffff",
            borderRadius: "50%",
            ...style,
          }}
        />
      )
    default:
      return <div style={defaultStyle} />
  }
}

interface EffectImageProps {
  content: string
  style: Record<string, any>
}

function EffectImage({ content, style }: EffectImageProps) {
  const defaultStyle: React.CSSProperties = {
    maxWidth: 200,
    maxHeight: 200,
    objectFit: "contain" as const,
    ...style,
  }

  return <Img src={content} style={defaultStyle} />
}
