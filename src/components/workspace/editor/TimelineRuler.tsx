import { useCallback, useRef } from "react"
import { BASE_SCALE } from "./ClipBlock"

interface TimelineRulerProps {
  totalDuration: number
  scale: number
  onTimeChange: (time: number) => void
}

export function TimelineRuler({ totalDuration, scale, onTimeChange }: TimelineRulerProps) {
  const markerCount = Math.ceil(totalDuration / 5) + 1
  const rulerRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerRef.current) return
    const rect = rulerRef.current.getBoundingClientRect()
    // Subtract the 80px track label offset
    const x = e.clientX - rect.left - 80
    const time = Math.max(0, x / (BASE_SCALE * scale))
    onTimeChange(time)
  }, [scale, onTimeChange])

  return (
    <div
      ref={rulerRef}
      className="h-6 flex items-end border-b border-zinc-800 sticky top-0 bg-zinc-900/95 z-10 cursor-pointer"
      onClick={handleClick}
    >
      {/* Offset for track labels */}
      <div className="w-20 flex-shrink-0 pointer-events-none" />

      {/* Time markers */}
      <div className="flex items-end h-full pointer-events-none">
        {Array.from({ length: markerCount }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 text-[10px] text-zinc-600 relative h-full"
            style={{ width: `${5 * BASE_SCALE * scale}px` }}
          >
            <span className="absolute bottom-1 left-0">{i * 5}s</span>
            {/* Sub-markers */}
            <div className="absolute bottom-0 left-0 right-0 flex">
              {[0, 1, 2, 3, 4].map((j) => (
                <div
                  key={j}
                  className="flex-1 border-l border-zinc-700"
                  style={{ height: j === 0 ? "8px" : "4px" }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
