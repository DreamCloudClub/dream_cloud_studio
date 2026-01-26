import { AbsoluteFill, Video } from "remotion"

interface VideoShotProps {
  src: string
  volume?: number
}

export function VideoShot({ src, volume = 1 }: VideoShotProps) {
  return (
    <AbsoluteFill>
      <Video
        src={src}
        volume={volume}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </AbsoluteFill>
  )
}
