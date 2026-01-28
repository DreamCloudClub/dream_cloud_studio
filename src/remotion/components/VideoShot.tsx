import { AbsoluteFill, Video, useVideoConfig } from "remotion"

interface VideoShotProps {
  src: string
  volume?: number
  // Scale: 1 = 100%, 1.5 = 150% (zoomed in), etc.
  scale?: number
  // Position offset as percentage (-50 to 50, where 0 = centered)
  positionX?: number
  positionY?: number
}

export function VideoShot({
  src,
  volume = 1,
  scale = 1,
  positionX = 0,
  positionY = 0,
}: VideoShotProps) {
  const { width, height } = useVideoConfig()

  // Convert position percentage to pixels
  const translateX = (positionX / 100) * width
  const translateY = (positionY / 100) * height

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Video
        src={src}
        volume={volume}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
          transformOrigin: "center center",
        }}
      />
    </AbsoluteFill>
  )
}
