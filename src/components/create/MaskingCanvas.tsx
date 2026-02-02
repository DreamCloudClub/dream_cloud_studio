import { useState, useRef, useEffect, useCallback } from "react"
import {
  Brush,
  Eraser,
  RotateCcw,
  RotateCw,
  Trash2,
  RefreshCw,
  Square,
  Lasso,
  Blend,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================
// Types
// ============================================

type MaskTool = "brush" | "eraser" | "rectangle" | "lasso"

interface Point {
  x: number
  y: number
}

interface MaskingCanvasProps {
  imageUrl: string
  onMaskChange: (maskDataUrl: string | null, hasMask: boolean) => void
  className?: string
}

// ============================================
// MaskingCanvas Component
// ============================================

export function MaskingCanvas({ imageUrl, onMaskChange, className }: MaskingCanvasProps) {
  // Tool state
  const [activeTool, setActiveTool] = useState<MaskTool>("brush")
  const [brushSize, setBrushSize] = useState(30)
  const [feather, setFeather] = useState(0)
  const [showFeatherSlider, setShowFeatherSlider] = useState(false)

  // Canvas refs
  const containerRef = useRef<HTMLDivElement>(null)
  const imageCanvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [originalImageSize, setOriginalImageSize] = useState({ width: 0, height: 0 })
  const lastPointRef = useRef<Point | null>(null)

  // Rectangle/Lasso state
  const [rectStart, setRectStart] = useState<Point | null>(null)
  const [rectEnd, setRectEnd] = useState<Point | null>(null)
  const [lassoPoints, setLassoPoints] = useState<Point[]>([])

  // Undo/Redo history
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const maxHistorySize = 20

  // Mask color for drawing on mask canvas
  const MASK_SOLID = "rgb(255, 255, 255)" // White for actual mask data

  // ============================================
  // Initialize canvases when image loads
  // ============================================

  useEffect(() => {
    if (!imageUrl || !containerRef.current) return

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const container = containerRef.current
      if (!container) return

      // Store original image dimensions for mask export
      setOriginalImageSize({ width: img.naturalWidth, height: img.naturalHeight })

      // Calculate canvas size to fit container while maintaining aspect ratio
      const containerWidth = container.clientWidth
      const aspectRatio = img.height / img.width
      const width = containerWidth
      const height = containerWidth * aspectRatio

      setCanvasSize({ width, height })

      // Set up image canvas
      const imageCanvas = imageCanvasRef.current
      if (imageCanvas) {
        imageCanvas.width = width
        imageCanvas.height = height
        const ctx = imageCanvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
        }
      }

      // Set up mask canvas (stores actual mask data)
      const maskCanvas = maskCanvasRef.current
      if (maskCanvas) {
        maskCanvas.width = width
        maskCanvas.height = height
        const ctx = maskCanvas.getContext("2d")
        if (ctx) {
          ctx.fillStyle = "black"
          ctx.fillRect(0, 0, width, height)
        }
      }

      // Set up overlay canvas (visible mask preview)
      const overlayCanvas = overlayCanvasRef.current
      if (overlayCanvas) {
        overlayCanvas.width = width
        overlayCanvas.height = height
      }

      // Initialize history with empty state
      if (maskCanvas) {
        const ctx = maskCanvas.getContext("2d")
        if (ctx) {
          const initialState = ctx.getImageData(0, 0, width, height)
          setHistory([initialState])
          setHistoryIndex(0)
        }
      }

      // Notify parent that mask is empty
      onMaskChange(null, false)
    }
    img.src = imageUrl
  }, [imageUrl, onMaskChange])

  // ============================================
  // Save state to history
  // ============================================

  const saveToHistory = useCallback(() => {
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return

    const ctx = maskCanvas.getContext("2d")
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, canvasSize.width, canvasSize.height)

    setHistory(prev => {
      // Remove any redo states
      const newHistory = prev.slice(0, historyIndex + 1)
      // Add new state
      newHistory.push(imageData)
      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory.shift()
        return newHistory
      }
      return newHistory
    })
    setHistoryIndex(prev => Math.min(prev + 1, maxHistorySize - 1))
  }, [canvasSize, historyIndex])

  // ============================================
  // Update overlay from mask
  // ============================================

  const updateOverlay = useCallback(() => {
    const maskCanvas = maskCanvasRef.current
    const overlayCanvas = overlayCanvasRef.current
    if (!maskCanvas || !overlayCanvas || canvasSize.width === 0) return

    const maskCtx = maskCanvas.getContext("2d")
    const overlayCtx = overlayCanvas.getContext("2d")
    if (!maskCtx || !overlayCtx) return

    // Clear overlay
    overlayCtx.clearRect(0, 0, canvasSize.width, canvasSize.height)

    // Get mask data
    const maskData = maskCtx.getImageData(0, 0, canvasSize.width, canvasSize.height)
    const data = maskData.data

    // Create overlay image data with orange color where mask is white
    const overlayData = overlayCtx.createImageData(canvasSize.width, canvasSize.height)
    const overlayPixels = overlayData.data

    let hasMaskContent = false
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 128) { // White = masked
        hasMaskContent = true
        overlayPixels[i] = 249     // R (orange)
        overlayPixels[i + 1] = 115 // G
        overlayPixels[i + 2] = 22  // B
        overlayPixels[i + 3] = 128 // A (50% opacity)
      }
    }

    overlayCtx.putImageData(overlayData, 0, 0)

    // Export mask as data URL if it has content
    if (hasMaskContent && originalImageSize.width > 0) {
      // Create a scaled canvas at original image dimensions
      const exportCanvas = document.createElement("canvas")
      exportCanvas.width = originalImageSize.width
      exportCanvas.height = originalImageSize.height
      const exportCtx = exportCanvas.getContext("2d")

      if (exportCtx) {
        // First fill with black background
        exportCtx.fillStyle = "black"
        exportCtx.fillRect(0, 0, originalImageSize.width, originalImageSize.height)

        // Scale the mask to match original image dimensions
        exportCtx.imageSmoothingEnabled = false // Keep mask edges sharp
        exportCtx.drawImage(
          maskCanvas,
          0, 0, canvasSize.width, canvasSize.height,
          0, 0, originalImageSize.width, originalImageSize.height
        )

        // Threshold to ensure pure black and white (no gray pixels)
        const exportData = exportCtx.getImageData(0, 0, originalImageSize.width, originalImageSize.height)
        const pixels = exportData.data
        for (let i = 0; i < pixels.length; i += 4) {
          const isWhite = pixels[i] > 128
          pixels[i] = isWhite ? 255 : 0     // R
          pixels[i + 1] = isWhite ? 255 : 0 // G
          pixels[i + 2] = isWhite ? 255 : 0 // B
          pixels[i + 3] = 255               // A (fully opaque)
        }
        exportCtx.putImageData(exportData, 0, 0)

        const maskDataUrl = exportCanvas.toDataURL("image/png")
        console.log(`Mask exported: ${originalImageSize.width}x${originalImageSize.height}, data URL length: ${maskDataUrl.length}`)
        onMaskChange(maskDataUrl, true)
      }
    } else {
      onMaskChange(null, false)
    }
  }, [canvasSize, originalImageSize, onMaskChange])

  // ============================================
  // Drawing functions
  // ============================================

  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    let clientX: number, clientY: number
    if ("touches" in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }, [])

  const drawBrushStroke = useCallback((from: Point, to: Point, erase: boolean) => {
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return

    const ctx = maskCanvas.getContext("2d")
    if (!ctx) return

    ctx.globalCompositeOperation = erase ? "destination-out" : "source-over"
    ctx.strokeStyle = MASK_SOLID
    ctx.fillStyle = MASK_SOLID
    ctx.lineWidth = brushSize
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    // Apply feather via shadow blur
    if (feather > 0 && !erase) {
      ctx.shadowBlur = feather
      ctx.shadowColor = MASK_SOLID
    } else {
      ctx.shadowBlur = 0
    }

    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()

    // Draw a circle at the point for smooth strokes
    ctx.beginPath()
    ctx.arc(to.x, to.y, brushSize / 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalCompositeOperation = "source-over"
    ctx.shadowBlur = 0
  }, [brushSize, feather])

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const point = getCanvasPoint(e)
    setIsDrawing(true)
    lastPointRef.current = point

    if (activeTool === "brush" || activeTool === "eraser") {
      // Draw a single point
      drawBrushStroke(point, point, activeTool === "eraser")
      updateOverlay()
    } else if (activeTool === "rectangle") {
      setRectStart(point)
    } else if (activeTool === "lasso") {
      setLassoPoints([point])
    }
  }, [activeTool, getCanvasPoint, drawBrushStroke, updateOverlay])

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()

    const point = getCanvasPoint(e)

    if (activeTool === "brush" || activeTool === "eraser") {
      if (lastPointRef.current) {
        drawBrushStroke(lastPointRef.current, point, activeTool === "eraser")
        updateOverlay()
      }
      lastPointRef.current = point
    } else if (activeTool === "rectangle" && rectStart) {
      // Track the end point
      setRectEnd(point)
      // Draw preview rectangle on overlay
      const overlayCanvas = overlayCanvasRef.current
      if (overlayCanvas) {
        const ctx = overlayCanvas.getContext("2d")
        if (ctx) {
          // Redraw existing mask overlay first
          updateOverlay()
          // Draw rectangle preview
          ctx.strokeStyle = "rgba(249, 115, 22, 0.8)"
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
          ctx.strokeRect(
            rectStart.x,
            rectStart.y,
            point.x - rectStart.x,
            point.y - rectStart.y
          )
          ctx.setLineDash([])
        }
      }
    } else if (activeTool === "lasso") {
      setLassoPoints(prev => [...prev, point])
      // Draw lasso preview
      const overlayCanvas = overlayCanvasRef.current
      if (overlayCanvas) {
        const ctx = overlayCanvas.getContext("2d")
        if (ctx && lassoPoints.length > 0) {
          updateOverlay()
          ctx.strokeStyle = "rgba(249, 115, 22, 0.8)"
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y)
          lassoPoints.forEach(p => ctx.lineTo(p.x, p.y))
          ctx.lineTo(point.x, point.y)
          ctx.stroke()
        }
      }
    }
  }, [isDrawing, activeTool, getCanvasPoint, drawBrushStroke, updateOverlay, rectStart, lassoPoints])

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return
    setIsDrawing(false)
    lastPointRef.current = null

    if (activeTool === "rectangle" && rectStart && rectEnd) {
      // Draw rectangle to mask
      const maskCanvas = maskCanvasRef.current
      if (maskCanvas) {
        const ctx = maskCanvas.getContext("2d")
        if (ctx) {
          ctx.fillStyle = MASK_SOLID
          ctx.fillRect(
            Math.min(rectStart.x, rectEnd.x),
            Math.min(rectStart.y, rectEnd.y),
            Math.abs(rectEnd.x - rectStart.x),
            Math.abs(rectEnd.y - rectStart.y)
          )
        }
      }
      setRectStart(null)
      setRectEnd(null)
      updateOverlay()
      saveToHistory()
    } else if (activeTool === "lasso" && lassoPoints.length > 2) {
      // Fill lasso path to mask
      const maskCanvas = maskCanvasRef.current
      if (maskCanvas) {
        const ctx = maskCanvas.getContext("2d")
        if (ctx) {
          ctx.fillStyle = MASK_SOLID
          ctx.beginPath()
          ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y)
          lassoPoints.forEach(p => ctx.lineTo(p.x, p.y))
          ctx.closePath()
          ctx.fill()
        }
      }
      setLassoPoints([])
      updateOverlay()
      saveToHistory()
    } else if (activeTool === "brush" || activeTool === "eraser") {
      saveToHistory()
    }
  }, [isDrawing, activeTool, rectStart, rectEnd, lassoPoints, updateOverlay, saveToHistory])

  // ============================================
  // Tool actions
  // ============================================

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return

    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return

    const ctx = maskCanvas.getContext("2d")
    if (!ctx) return

    const newIndex = historyIndex - 1
    ctx.putImageData(history[newIndex], 0, 0)
    setHistoryIndex(newIndex)
    updateOverlay()
  }, [history, historyIndex, updateOverlay])

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return

    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return

    const ctx = maskCanvas.getContext("2d")
    if (!ctx) return

    const newIndex = historyIndex + 1
    ctx.putImageData(history[newIndex], 0, 0)
    setHistoryIndex(newIndex)
    updateOverlay()
  }, [history, historyIndex, updateOverlay])

  const handleClearMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return

    const ctx = maskCanvas.getContext("2d")
    if (!ctx) return

    ctx.fillStyle = "black"
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)
    updateOverlay()
    saveToHistory()
  }, [canvasSize, updateOverlay, saveToHistory])

  const handleInvertMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return

    const ctx = maskCanvas.getContext("2d")
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, canvasSize.width, canvasSize.height)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i]       // R
      data[i + 1] = 255 - data[i + 1] // G
      data[i + 2] = 255 - data[i + 2] // B
      // Alpha stays the same
    }

    ctx.putImageData(imageData, 0, 0)
    updateOverlay()
    saveToHistory()
  }, [canvasSize, updateOverlay, saveToHistory])

  // ============================================
  // Render
  // ============================================

  const tools = [
    { id: "brush" as MaskTool, icon: Brush, label: "Brush" },
    { id: "eraser" as MaskTool, icon: Eraser, label: "Eraser" },
    { id: "rectangle" as MaskTool, icon: Square, label: "Rectangle" },
    { id: "lasso" as MaskTool, icon: Lasso, label: "Lasso" },
  ]

  const actions = [
    { id: "undo", icon: RotateCcw, label: "Undo", action: handleUndo, disabled: historyIndex <= 0 },
    { id: "redo", icon: RotateCw, label: "Redo", action: handleRedo, disabled: historyIndex >= history.length - 1 },
    { id: "invert", icon: RefreshCw, label: "Invert", action: handleInvertMask },
    { id: "clear", icon: Trash2, label: "Clear", action: handleClearMask },
  ]

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-zinc-900/50 rounded-xl border border-zinc-800">
        {/* Tool buttons */}
        <div className="flex items-center gap-1">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={cn(
                "p-2 rounded-lg transition-all",
                activeTool === tool.id
                  ? "bg-orange-500 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
              )}
              title={tool.label}
            >
              <tool.icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-zinc-700" />

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {actions.map(action => (
            <button
              key={action.id}
              onClick={action.action}
              disabled={action.disabled}
              className={cn(
                "p-2 rounded-lg transition-all",
                action.disabled
                  ? "bg-zinc-800/50 text-zinc-600 cursor-not-allowed"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
              )}
              title={action.label}
            >
              <action.icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-zinc-700" />

        {/* Feather toggle */}
        <button
          onClick={() => setShowFeatherSlider(!showFeatherSlider)}
          className={cn(
            "p-2 rounded-lg transition-all",
            showFeatherSlider || feather > 0
              ? "bg-orange-500/20 text-orange-400 border border-orange-500/50"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          )}
          title="Feather/Softness"
        >
          <Blend className="w-4 h-4" />
        </button>

        {/* Brush size slider */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-zinc-500">Size</span>
          <input
            type="range"
            min={5}
            max={100}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-24 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <span className="text-xs text-zinc-400 w-8 text-right">{brushSize}px</span>
        </div>
      </div>

      {/* Feather slider (conditional) */}
      {showFeatherSlider && (
        <div className="flex items-center gap-2 px-2">
          <span className="text-xs text-zinc-500">Feather</span>
          <input
            type="range"
            min={0}
            max={20}
            value={feather}
            onChange={(e) => setFeather(Number(e.target.value))}
            className="flex-1 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <span className="text-xs text-zinc-400 w-8 text-right">{feather}px</span>
        </div>
      )}

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="relative w-full rounded-xl overflow-hidden border-2 border-zinc-700 bg-zinc-900 cursor-crosshair"
        style={{ aspectRatio: canvasSize.width && canvasSize.height ? `${canvasSize.width}/${canvasSize.height}` : "16/9" }}
      >
        {/* Base image layer */}
        <canvas
          ref={imageCanvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: "none" }}
        />

        {/* Mask data layer (hidden) */}
        <canvas
          ref={maskCanvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ display: "none" }}
        />

        {/* Overlay layer (visible mask preview) */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full touch-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        />

        {/* Brush size cursor preview */}
        {(activeTool === "brush" || activeTool === "eraser") && (
          <div
            className="pointer-events-none absolute border-2 border-orange-400 rounded-full opacity-50"
            style={{
              width: brushSize,
              height: brushSize,
              transform: "translate(-50%, -50%)",
              left: "50%",
              top: "50%",
              display: "none", // Would need mouse tracking to show properly
            }}
          />
        )}
      </div>

      {/* Instructions */}
      <p className="text-xs text-zinc-500 text-center">
        Paint on the image to select regions to regenerate. Orange overlay = masked area.
      </p>
    </div>
  )
}
