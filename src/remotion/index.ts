// Remotion Entry Point
// This file is used by the Remotion CLI for rendering

import { registerRoot } from "remotion"
import { RemotionRoot } from "./Root"

// Register the root component for CLI rendering
registerRoot(RemotionRoot)

// Re-export everything for programmatic use
export { RemotionRoot, VIDEO_FPS, VIDEO_WIDTH, VIDEO_HEIGHT } from "./Root"
export type { Shot, TitleConfig, TextOverlayConfig, CompositionProps } from "./Root"
export { VideoComposition } from "./VideoComposition"
export { AnimationComposition } from "./AnimationComposition"
export type { AnimationCompositionProps, AnimationSegment, AnimationConfig, AnimationLayer, EffectElement } from "./AnimationComposition"
export { TimelineComposition, FPS } from "./TimelineComposition"
export type { TimelineCompositionProps } from "./TimelineComposition"
export * from "./components"
