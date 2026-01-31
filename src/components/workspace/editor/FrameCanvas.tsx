import { useRef, useEffect, useCallback, useState, memo } from "react"

interface FrameCanvasProps {
  frameData: string | null // base64 JPEG from Rust
  width: number
  height: number
  aspectRatio: number
}

/**
 * FrameCanvas - A canvas component that displays a single video frame
 *
 * Renders base64-encoded JPEG frames from the Tauri backend onto a canvas.
 * Handles loading states and maintains aspect ratio.
 */
export const FrameCanvas = memo(function FrameCanvas({
  frameData,
  width,
  height,
  aspectRatio,
}: FrameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const lastFrameDataRef = useRef<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Calculate canvas dimensions that maintain aspect ratio within bounds
  const calculateDimensions = useCallback(() => {
    const containerAspect = width / height

    let canvasWidth: number
    let canvasHeight: number

    if (aspectRatio > containerAspect) {
      // Frame is wider than container - fit to width
      canvasWidth = width
      canvasHeight = width / aspectRatio
    } else {
      // Frame is taller than container - fit to height
      canvasHeight = height
      canvasWidth = height * aspectRatio
    }

    return {
      width: Math.floor(canvasWidth),
      height: Math.floor(canvasHeight),
    }
  }, [width, height, aspectRatio])

  // Draw the frame to the canvas
  const drawFrame = useCallback((image: HTMLImageElement) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { alpha: false })
    if (!ctx) return

    const { width: canvasWidth, height: canvasHeight } = calculateDimensions()

    // Only resize canvas if dimensions changed (expensive operation)
    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth
      canvas.height = canvasHeight
    }

    // Use high-quality image rendering
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"

    // Clear and draw the new frame
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight)
  }, [calculateDimensions])

  // Handle frame data changes
  useEffect(() => {
    // Skip if frame data hasn't changed
    if (frameData === lastFrameDataRef.current) {
      return
    }
    lastFrameDataRef.current = frameData

    if (!frameData) {
      // Clear canvas when no frame data
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
      }
      setHasError(false)
      return
    }

    setIsLoading(true)
    setHasError(false)

    // Create image element to decode the base64 data
    const img = new Image()
    imageRef.current = img

    img.onload = () => {
      if (imageRef.current === img) {
        drawFrame(img)
        setIsLoading(false)
      }
    }

    img.onerror = () => {
      if (imageRef.current === img) {
        console.error("Failed to decode frame data")
        setHasError(true)
        setIsLoading(false)
      }
    }

    // Set the base64 source (add data URL prefix if not present)
    const src = frameData.startsWith("data:")
      ? frameData
      : `data:image/jpeg;base64,${frameData}`
    img.src = src

    // Cleanup function
    return () => {
      if (imageRef.current === img) {
        imageRef.current = null
      }
    }
  }, [frameData, drawFrame])

  // Handle resize - redraw current frame at new dimensions
  useEffect(() => {
    if (imageRef.current && imageRef.current.complete && frameData) {
      drawFrame(imageRef.current)
    }
  }, [width, height, drawFrame, frameData])

  const dimensions = calculateDimensions()

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width, height }}
    >
      <canvas
        ref={canvasRef}
        className="bg-black"
        style={{
          width: dimensions.width,
          height: dimensions.height,
        }}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {hasError && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-red-400 text-sm text-center px-4">
            Failed to load frame
          </div>
        </div>
      )}

      {/* No frame placeholder */}
      {!frameData && !isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <div className="text-zinc-500 text-sm">No frame available</div>
        </div>
      )}
    </div>
  )
})
