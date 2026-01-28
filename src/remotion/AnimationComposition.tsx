import { AbsoluteFill, Sequence, useVideoConfig } from "remotion"
import { AnimationShot, type AnimationConfig, type AnimationLayer } from "./components/AnimationShot"
import { EffectsLayer, type EffectElement } from "./components/EffectsLayer"

export interface AnimationSegment {
  id: string
  type: 'animation'
  config: AnimationConfig
  effects?: EffectElement[]
}

export interface AnimationCompositionProps {
  segments: AnimationSegment[]
  backgroundColor?: string
}

/**
 * AnimationComposition renders a sequence of animation segments.
 * Each segment can have its own layers and optional overlay effects.
 */
export function AnimationComposition({
  segments,
  backgroundColor = "#000000",
}: AnimationCompositionProps) {
  const { fps } = useVideoConfig()

  // Calculate frame positions for each segment
  let currentFrame = 0
  const segmentPositions: Array<{
    segment: AnimationSegment
    startFrame: number
    durationFrames: number
  }> = []

  for (const segment of segments) {
    const durationFrames = Math.round(segment.config.duration * fps)
    segmentPositions.push({
      segment,
      startFrame: currentFrame,
      durationFrames,
    })
    currentFrame += durationFrames
  }

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {segmentPositions.map(({ segment, startFrame, durationFrames }) => (
        <Sequence key={segment.id} from={startFrame} durationInFrames={durationFrames}>
          {segment.effects && segment.effects.length > 0 ? (
            <EffectsLayer effects={segment.effects}>
              <AnimationShot config={segment.config} />
            </EffectsLayer>
          ) : (
            <AnimationShot config={segment.config} />
          )}
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}

// Re-export types for convenience
export type { AnimationConfig, AnimationLayer } from "./components/AnimationShot"
export type { EffectElement } from "./components/EffectsLayer"
