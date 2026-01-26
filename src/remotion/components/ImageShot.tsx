import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion"

interface ImageShotProps {
  src: string
  durationInFrames: number
  kenBurns?: boolean // Subtle zoom/pan effect
}

export function ImageShot({ src, durationInFrames, kenBurns = true }: ImageShotProps) {
  const frame = useCurrentFrame()

  // Ken Burns effect - subtle zoom over duration
  const scale = kenBurns
    ? interpolate(frame, [0, durationInFrames], [1, 1.1], {
        extrapolateRight: "clamp",
      })
    : 1

  return (
    <AbsoluteFill>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  )
}
