import { AbsoluteFill, Sequence, useVideoConfig } from "remotion"
import type { CompositionProps, Shot } from "./Root"
import { VideoShot } from "./components/VideoShot"
import { ImageShot } from "./components/ImageShot"
import { TitleCard } from "./components/TitleCard"
import { Transition } from "./components/Transition"
import { VIDEO_FPS } from "./Root"

export function VideoComposition({ shots, title, outro, backgroundColor = "#000000" }: CompositionProps) {
  const { fps } = useVideoConfig()

  // Calculate frame positions for each shot
  let currentFrame = 0
  const shotPositions: { shot: Shot; startFrame: number; durationFrames: number }[] = []

  // Add title card if provided
  if (title) {
    const titleDuration = 3 * fps // 3 seconds
    shotPositions.push({
      shot: { id: "title", type: "title", duration: 3 },
      startFrame: currentFrame,
      durationFrames: titleDuration,
    })
    currentFrame += titleDuration
  }

  // Add main shots
  for (const shot of shots) {
    const durationFrames = Math.round(shot.duration * fps)
    shotPositions.push({
      shot,
      startFrame: currentFrame,
      durationFrames,
    })
    currentFrame += durationFrames
  }

  // Add outro if provided
  if (outro) {
    const outroDuration = 3 * fps // 3 seconds
    shotPositions.push({
      shot: { id: "outro", type: "title", duration: 3 },
      startFrame: currentFrame,
      durationFrames: outroDuration,
    })
  }

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* Title Card */}
      {title && (
        <Sequence from={0} durationInFrames={3 * fps}>
          <TitleCard config={title} />
        </Sequence>
      )}

      {/* Main Shots */}
      {shotPositions
        .filter((p) => p.shot.type !== "title" || (p.shot.id !== "title" && p.shot.id !== "outro"))
        .map(({ shot, startFrame, durationFrames }, index) => {
          const transitionFrames = shot.transitionDuration
            ? Math.round(shot.transitionDuration * fps)
            : Math.round(0.5 * fps) // Default 0.5s transition

          return (
            <Sequence key={shot.id} from={startFrame} durationInFrames={durationFrames}>
              {/* Transition wrapper */}
              <Transition type={shot.transition || "fade"} durationInFrames={transitionFrames}>
                {shot.type === "video" && shot.src && (
                  <VideoShot
                    src={shot.src}
                    scale={shot.scale}
                    positionX={shot.positionX}
                    positionY={shot.positionY}
                  />
                )}
                {shot.type === "image" && shot.src && (
                  <ImageShot
                    src={shot.src}
                    durationInFrames={durationFrames}
                    pan={shot.pan}
                    startPosition={shot.startPosition}
                    endPosition={shot.endPosition}
                    startScale={shot.startScale}
                    endScale={shot.endScale}
                  />
                )}
              </Transition>
            </Sequence>
          )
        })}

      {/* Outro Card */}
      {outro && (
        <Sequence from={currentFrame - 3 * fps} durationInFrames={3 * fps}>
          <TitleCard config={outro} />
        </Sequence>
      )}
    </AbsoluteFill>
  )
}
