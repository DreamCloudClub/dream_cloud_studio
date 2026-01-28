// Remotion Render Service
// This service builds props for Remotion compositions and can trigger renders

import type { AnimationConfig, AnimationSegment } from "@/remotion"
import type { ShotEffect } from "@/state/workspaceStore"

export interface RenderJob {
  id: string
  type: "animation" | "video"
  status: "pending" | "rendering" | "completed" | "failed"
  outputPath?: string
  error?: string
  createdAt: string
  completedAt?: string
}

// Convert ShotEffect to Remotion EffectElement format
export function shotEffectToEffectElement(effect: ShotEffect) {
  return {
    type: effect.config.layers[0]?.type || "text",
    content: effect.config.layers[0]?.content || "",
    animation: effect.config.layers[0]?.animation || "fadeIn",
    timing: effect.timing,
    position: effect.config.layers[0]?.position,
    style: effect.config.layers[0]?.style,
  }
}

// Build AnimationSegment from animation config
export function buildAnimationSegment(
  id: string,
  config: AnimationConfig,
  effects?: ShotEffect[]
): AnimationSegment {
  return {
    id,
    type: "animation",
    config,
    effects: effects?.map(shotEffectToEffectElement),
  }
}

// Build props for AnimationComposition
export function buildAnimationProps(segments: AnimationSegment[], backgroundColor = "#000000") {
  // Calculate total duration
  const totalDuration = segments.reduce((acc, seg) => acc + seg.config.duration, 0)
  const fps = 30
  const durationInFrames = Math.ceil(totalDuration * fps)

  return {
    compositionId: "AnimationComposition",
    durationInFrames,
    fps,
    width: 1920,
    height: 1080,
    props: {
      segments,
      backgroundColor,
    },
  }
}

// Generate CLI command for rendering
export function generateRenderCommand(
  compositionId: string,
  outputPath: string,
  props: Record<string, unknown>
): string {
  const propsJson = JSON.stringify(props)
  // Escape for shell
  const escapedProps = propsJson.replace(/'/g, "'\\''")

  return `npx remotion render ${compositionId} ${outputPath} --props='${escapedProps}'`
}

// Quick render helpers for common use cases

export function createTextAnimation(
  text: string,
  options: {
    duration?: number
    animation?: "fadeIn" | "slideUp" | "typewriter" | "scale"
    subtitle?: string
    backgroundColor?: string
  } = {}
): AnimationConfig {
  const {
    duration = 3,
    animation = "fadeIn",
    subtitle,
    backgroundColor = "#000000",
  } = options

  const layers: AnimationConfig["layers"] = [
    {
      id: "main-text",
      type: "text",
      content: text,
      animation,
      timing: [0, duration * 0.9],
      position: { x: 50, y: subtitle ? 40 : 50 },
      style: {
        fontSize: 72,
        fontFamily: "Inter, sans-serif",
        color: "#ffffff",
      },
    },
  ]

  if (subtitle) {
    layers.push({
      id: "subtitle",
      type: "text",
      content: subtitle,
      animation: "fadeIn",
      timing: [0.5, duration * 0.9],
      position: { x: 50, y: 55 },
      style: {
        fontSize: 36,
        fontFamily: "Inter, sans-serif",
        color: "#cccccc",
      },
    })
  }

  return {
    duration,
    layers,
    background: { color: backgroundColor },
  }
}

export function createLowerThird(
  title: string,
  subtitle?: string,
  options: {
    duration?: number
    position?: "left" | "right"
  } = {}
): ShotEffect {
  const { duration = 4, position = "left" } = options
  const xPos = position === "left" ? 15 : 85

  const layers: AnimationConfig["layers"] = [
    {
      id: "lower-third-title",
      type: "text",
      content: title,
      animation: "slideUp",
      timing: [0, duration - 0.5],
      position: { x: xPos, y: 80 },
      style: {
        fontSize: 32,
        fontFamily: "Inter, sans-serif",
        color: "#ffffff",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
      },
    },
  ]

  if (subtitle) {
    layers.push({
      id: "lower-third-subtitle",
      type: "text",
      content: subtitle,
      animation: "slideUp",
      timing: [0.2, duration - 0.5],
      position: { x: xPos, y: 87 },
      style: {
        fontSize: 20,
        fontFamily: "Inter, sans-serif",
        color: "#aaaaaa",
      },
    })
  }

  return {
    id: `lower-third-${Date.now()}`,
    type: "lower_third",
    name: title,
    config: {
      duration,
      layers,
    },
    timing: [0, duration],
  }
}

// Example usage for Claude Code:
//
// 1. Create a simple text animation:
//    const config = createTextAnimation("Welcome", { animation: "slideUp", duration: 4 })
//    const segment = buildAnimationSegment("intro", config)
//    const props = buildAnimationProps([segment])
//    const cmd = generateRenderCommand("AnimationComposition", "renders/intro.mp4", props.props)
//    // Run: npx remotion render AnimationComposition renders/intro.mp4 --props='...'
//
// 2. Add a lower third effect to a shot:
//    const effect = createLowerThird("John Smith", "CEO, Acme Corp")
//    // Add to shot.effectsLayer
