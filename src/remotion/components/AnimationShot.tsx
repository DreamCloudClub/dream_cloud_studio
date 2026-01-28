import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Img } from "remotion"

export type AnimationType = 'fadeIn' | 'fadeOut' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scale' | 'typewriter'

export interface AnimationLayer {
  type: 'text' | 'shape' | 'image'
  content: string
  animation: AnimationType
  timing: [number, number] // [startSec, endSec]
  position?: { x: number; y: number } // percentage
  style?: Record<string, any>
}

export interface AnimationConfig {
  duration: number // seconds
  layers: AnimationLayer[]
  background?: { color?: string; gradient?: string }
}

interface AnimationShotProps {
  config: AnimationConfig
}

export function AnimationShot({ config }: AnimationShotProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const { layers, background } = config

  // Background style
  const backgroundStyle: React.CSSProperties = {}
  if (background?.gradient) {
    backgroundStyle.background = background.gradient
  } else if (background?.color) {
    backgroundStyle.backgroundColor = background.color
  } else {
    backgroundStyle.backgroundColor = "#000000"
  }

  return (
    <AbsoluteFill style={backgroundStyle}>
      {layers.map((layer, index) => (
        <AnimatedLayer key={index} layer={layer} fps={fps} frame={frame} />
      ))}
    </AbsoluteFill>
  )
}

interface AnimatedLayerProps {
  layer: AnimationLayer
  fps: number
  frame: number
}

function AnimatedLayer({ layer, fps, frame }: AnimatedLayerProps) {
  const { type, content, animation, timing, position, style = {} } = layer
  const [startSec, endSec] = timing
  const startFrame = Math.round(startSec * fps)
  const endFrame = Math.round(endSec * fps)
  const duration = endFrame - startFrame

  // Don't render if outside timing window
  if (frame < startFrame || frame >= endFrame) {
    return null
  }

  const localFrame = frame - startFrame

  // Calculate animation values
  const animationDuration = Math.min(fps * 0.5, duration * 0.3) // 0.5s or 30% of duration
  const fadeOutStart = duration - animationDuration

  // Get animation transforms and opacity
  const { opacity, transform } = getAnimationValues(
    animation,
    localFrame,
    duration,
    animationDuration,
    fadeOutStart,
    fps
  )

  // Position styles
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
    positionStyle.left = "50%"
    positionStyle.top = "50%"
    positionStyle.transform = `translate(-50%, -50%) ${transform}`.trim()
  }

  // Typewriter-specific text handling
  let displayContent = content
  if (type === 'text' && animation === 'typewriter') {
    const chars = Math.floor(
      interpolate(localFrame, [0, duration * 0.7], [0, content.length], {
        extrapolateRight: "clamp",
      })
    )
    displayContent = content.slice(0, chars)
  }

  return (
    <div style={{ ...positionStyle, opacity }}>
      {type === 'text' && (
        <TextElement
          content={displayContent}
          animation={animation}
          localFrame={localFrame}
          originalLength={content.length}
          style={style}
        />
      )}
      {type === 'shape' && <ShapeElement content={content} style={style} />}
      {type === 'image' && <ImageElement content={content} style={style} />}
    </div>
  )
}

function getAnimationValues(
  animation: AnimationType,
  localFrame: number,
  duration: number,
  animationDuration: number,
  fadeOutStart: number,
  fps: number
): { opacity: number; transform: string } {
  let opacity = 1
  let transform = ""

  switch (animation) {
    case 'fadeIn': {
      opacity = interpolate(localFrame, [0, animationDuration], [0, 1], {
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
      const slideY = interpolate(localFrame, [0, animationDuration], [100, 0], {
        extrapolateRight: "clamp",
      })
      opacity = interpolate(localFrame, [0, animationDuration], [0, 1], {
        extrapolateRight: "clamp",
      })
      transform = `translateY(${slideY}px)`
      break
    }
    case 'slideDown': {
      const slideY = interpolate(localFrame, [0, animationDuration], [-100, 0], {
        extrapolateRight: "clamp",
      })
      opacity = interpolate(localFrame, [0, animationDuration], [0, 1], {
        extrapolateRight: "clamp",
      })
      transform = `translateY(${slideY}px)`
      break
    }
    case 'slideLeft': {
      const slideX = interpolate(localFrame, [0, animationDuration], [100, 0], {
        extrapolateRight: "clamp",
      })
      opacity = interpolate(localFrame, [0, animationDuration], [0, 1], {
        extrapolateRight: "clamp",
      })
      transform = `translateX(${slideX}px)`
      break
    }
    case 'slideRight': {
      const slideX = interpolate(localFrame, [0, animationDuration], [-100, 0], {
        extrapolateRight: "clamp",
      })
      opacity = interpolate(localFrame, [0, animationDuration], [0, 1], {
        extrapolateRight: "clamp",
      })
      transform = `translateX(${slideX}px)`
      break
    }
    case 'scale': {
      const scale = interpolate(localFrame, [0, animationDuration], [0.5, 1], {
        extrapolateRight: "clamp",
      })
      opacity = interpolate(localFrame, [0, animationDuration], [0, 1], {
        extrapolateRight: "clamp",
      })
      transform = `scale(${scale})`
      break
    }
    case 'typewriter': {
      // Opacity handled separately, cursor blink in text element
      opacity = interpolate(
        localFrame,
        [0, animationDuration * 0.3, fadeOutStart, duration],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
      break
    }
  }

  return { opacity, transform }
}

interface TextElementProps {
  content: string
  animation: AnimationType
  localFrame: number
  originalLength: number
  style: Record<string, any>
}

function TextElement({ content, animation, localFrame, originalLength, style }: TextElementProps) {
  const defaultStyle: React.CSSProperties = {
    fontFamily: "Inter, sans-serif",
    fontSize: 64,
    fontWeight: 700,
    color: "#ffffff",
    textAlign: "center",
    letterSpacing: "-0.02em",
    textShadow: "0 4px 12px rgba(0,0,0,0.3)",
    ...style,
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

interface ShapeElementProps {
  content: string // 'circle' | 'rectangle' | 'line' | custom SVG path
  style: Record<string, any>
}

function ShapeElement({ content, style }: ShapeElementProps) {
  const defaultStyle: React.CSSProperties = {
    width: 100,
    height: 100,
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
            width: style.width || 200,
            height: style.height || 4,
            backgroundColor: style.backgroundColor || "#ffffff",
            ...style,
          }}
        />
      )
    default:
      // Custom SVG path or other content
      if (content.startsWith('<svg') || content.startsWith('M') || content.startsWith('m')) {
        return (
          <svg
            viewBox="0 0 100 100"
            style={{ width: style.width || 100, height: style.height || 100 }}
          >
            <path d={content.startsWith('M') || content.startsWith('m') ? content : ''} fill={style.fill || "#ffffff"} />
          </svg>
        )
      }
      return <div style={defaultStyle} />
  }
}

interface ImageElementProps {
  content: string // URL or base64
  style: Record<string, any>
}

function ImageElement({ content, style }: ImageElementProps) {
  const defaultStyle: React.CSSProperties = {
    maxWidth: "80%",
    maxHeight: "80%",
    objectFit: "contain" as const,
    ...style,
  }

  return <Img src={content} style={defaultStyle} />
}
