import { useState, useCallback } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import {
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
  Maximize,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { useAssetWizardStore } from "@/state/assetWizardStore"
import { BubblePanel } from "@/components/create"
import { InspectorPanel } from "@/components/workspace"
import { HeaderActions } from "@/components/shared"
import { DashboardNav } from "@/components/dashboard"
import studioLogo from "@/assets/images/studio_logo.png"
import { ReferenceModal } from "@/components/create-asset/ReferenceModal"
import { upscaleImage } from "@/services/google-ai"
import { getAssetDisplayUrl } from "@/services/localStorage"
import type { Asset, AssetCategory } from "@/types/database"
import { useUIStore } from "@/state/uiStore"

// ============================================
// Types
// ============================================
type ScaleFactor = 2 | 4
type EnhancementStrength = "low" | "medium" | "high"

// ============================================
// Main Component
// ============================================
export function UpscalePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get("projectId")
  const { user, profile, signOut } = useAuth()
  const { isBubbleCollapsed, toggleBubbleCollapsed, isInspectorCollapsed, toggleInspectorCollapsed } = useUIStore()

  // Parameters
  const [scaleFactor, setScaleFactor] = useState<ScaleFactor>(2)
  const [enhancementStrength, setEnhancementStrength] = useState<EnhancementStrength>("medium")
  const [preserveFaces, setPreserveFaces] = useState(false)

  // Source image
  const [sourceImage, setSourceImage] = useState<Asset | null>(null)
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null)
  const [showReferenceModal, setShowReferenceModal] = useState(false)

  // Result
  const [upscaledImageUrl, setUpscaledImageUrl] = useState<string | null>(null)
  const [isSelected, setIsSelected] = useState(false)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Comparison view state
  const [comparisonMode, setComparisonMode] = useState<"side-by-side" | "slider">("side-by-side")
  const [sliderPosition, setSliderPosition] = useState(50)
  const [zoom, setZoom] = useState(1)

  // Asset wizard store for save flow
  const {
    setAssetType: setWizardAssetType,
    setPromptType: setWizardPromptType,
    setGeneratedAssets,
    setUserDescription: setWizardDescription,
    setAiPrompt: setWizardPrompt,
    setCurrentStep,
  } = useAssetWizardStore()

  const handleBack = () => {
    navigate(-1)
  }

  const handleSelectImage = (asset: Asset) => {
    setSourceImage(asset)
    setSourceImageUrl(getAssetDisplayUrl(asset))
    setShowReferenceModal(false)
    setUpscaledImageUrl(null) // Clear previous result
    setIsSelected(false)
  }

  const handleRemoveImage = () => {
    setSourceImage(null)
    setSourceImageUrl(null)
    setUpscaledImageUrl(null)
    setIsSelected(false)
  }

  const handleGenerate = async () => {
    if (!sourceImageUrl) {
      setError("Please select an image to upscale")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const result = await upscaleImage({
        imageUrl: sourceImageUrl,
        scaleFactor,
        enhancementStrength,
        preserveFaces,
      })

      setUpscaledImageUrl(result)
      setIsSelected(true) // Auto-select the result
    } catch (err) {
      console.error("Upscale error:", err)
      setError(err instanceof Error ? err.message : "Upscaling failed")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = () => {
    if (!upscaledImageUrl || !isSelected) return

    // Transfer data to wizard store
    setWizardAssetType("image")
    setWizardPromptType("upscale")
    setWizardDescription(`Upscaled ${scaleFactor}x with ${enhancementStrength} enhancement`)
    setWizardPrompt(`AI Upscaling: ${scaleFactor}x, ${enhancementStrength} enhancement${preserveFaces ? ", face preservation" : ""}`)
    setGeneratedAssets([{
      id: `upscale-${Date.now()}`,
      url: upscaledImageUrl,
      selected: true,
    }])
    setCurrentStep("save")

    const url = projectId ? `/create/asset?projectId=${projectId}` : "/create/asset"
    navigate(url)
  }

  const handleSliderDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderPosition(percentage)
  }, [])

  const canGenerate = !!sourceImageUrl && !isGenerating
  const hasResult = !!upscaledImageUrl

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      {/* Primary Header */}
      <header className="h-14 border-b border-zinc-800 px-4 sm:px-6 flex items-center justify-between bg-zinc-950 flex-shrink-0">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
          <img
            src={studioLogo}
            alt="Dream Cloud Studio"
            className="w-8 h-8 rounded-lg object-contain flex-shrink-0"
          />
          <h1 className="text-base sm:text-lg font-semibold text-zinc-100 truncate">Dream Cloud Studio</h1>
        </Link>

        <HeaderActions
          userName={profile?.full_name || user?.email?.split("@")[0] || "User"}
          userEmail={user?.email || ""}
          userAvatar={profile?.avatar_url}
          onSignOut={signOut}
        />
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Bubble Panel (Left) */}
        <div
          className={`${
            isBubbleCollapsed ? "w-16" : "w-80"
          } flex-shrink-0 hidden md:flex transition-all duration-300`}
        >
          <BubblePanel
            isCollapsed={isBubbleCollapsed}
            onToggleCollapse={toggleBubbleCollapsed}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Secondary Header */}
          <div className="h-[72px] border-b border-zinc-800 bg-zinc-900/50 flex-shrink-0">
            <div className="h-full px-6 lg:px-8 flex items-center">
              <div className="w-24">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="text-sm font-medium">Back</span>
                </button>
              </div>

              <div className="flex-1 flex items-center justify-center gap-2">
                <Maximize className="w-5 h-5 text-orange-400" />
                <h1 className="text-xl font-semibold text-zinc-100">AI Upscaling</h1>
              </div>

              <div className="w-24 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={!hasResult || !isSelected}
                  className={cn(
                    "flex items-center gap-1 transition-colors",
                    hasResult && isSelected
                      ? "text-orange-400 hover:text-orange-300"
                      : "text-zinc-600 cursor-not-allowed"
                  )}
                >
                  <span className="text-sm font-medium">Continue</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Content - Full Width */}
          <main className="flex-1 overflow-auto py-6">
            <div className="px-6 lg:px-8 space-y-6">
              {/* Info Banner */}
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Maximize className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-orange-300 font-medium">AI-Powered Resolution Enhancement</p>
                    <p className="text-xs text-orange-400/70 mt-1">
                      Upscaling preserves your original image exactly while enhancing resolution and clarity. No creative changes will be made.
                    </p>
                  </div>
                </div>
              </div>

              {/* Parameters Section */}
              <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-5">
                <h3 className="text-sm font-medium text-zinc-300 mb-4">Parameters</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Scale Factor */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">Scale Factor</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setScaleFactor(2)}
                        className={cn(
                          "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all border",
                          scaleFactor === 2
                            ? "bg-orange-500/20 border-orange-500 text-orange-400"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                        )}
                      >
                        2x
                      </button>
                      <button
                        onClick={() => setScaleFactor(4)}
                        className={cn(
                          "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all border",
                          scaleFactor === 4
                            ? "bg-orange-500/20 border-orange-500 text-orange-400"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                        )}
                      >
                        4x
                      </button>
                    </div>
                  </div>

                  {/* Enhancement Strength */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">Enhancement Strength</label>
                    <div className="flex gap-2">
                      {(["low", "medium", "high"] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => setEnhancementStrength(level)}
                          className={cn(
                            "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all border capitalize",
                            enhancementStrength === level
                              ? "bg-orange-500/20 border-orange-500 text-orange-400"
                              : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                          )}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preserve Faces */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">Preserve Faces</label>
                    <button
                      onClick={() => setPreserveFaces(!preserveFaces)}
                      className={cn(
                        "w-full py-2.5 rounded-lg text-sm font-medium transition-all border flex items-center justify-center gap-2",
                        preserveFaces
                          ? "bg-orange-500/20 border-orange-500 text-orange-400"
                          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                      )}
                    >
                      {preserveFaces ? (
                        <>
                          <Check className="w-4 h-4" />
                          Enabled
                        </>
                      ) : (
                        "Disabled"
                      )}
                    </button>
                  </div>
                </div>

                {/* Model Info */}
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-400">Google Imagen 3</span>
                    <span>Professional-grade AI upscaling</span>
                  </div>
                </div>
              </div>

              {/* Image Upload Section */}
              <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-5">
                <h3 className="text-sm font-medium text-zinc-300 mb-4">Source Image</h3>

                {!sourceImage ? (
                  <button
                    onClick={() => setShowReferenceModal(true)}
                    className="w-full aspect-[2/1] max-h-64 rounded-xl border-2 border-dashed border-zinc-700 hover:border-orange-500 hover:bg-orange-500/5 flex flex-col items-center justify-center gap-3 text-zinc-500 hover:text-orange-400 transition-all"
                  >
                    <Upload className="w-10 h-10" />
                    <span className="text-sm font-medium">Select Image to Upscale</span>
                    <span className="text-xs text-zinc-600">From library or upload new</span>
                  </button>
                ) : (
                  <div className="relative">
                    <div className="rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800">
                      <img
                        src={sourceImageUrl || ""}
                        alt="Source"
                        className="w-full h-auto max-h-64 object-contain"
                      />
                    </div>
                    <button
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 p-2 rounded-lg bg-black/70 hover:bg-red-500 text-white transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-zinc-300">
                      {sourceImage.name}
                    </div>
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className={cn(
                  "w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 border text-lg",
                  canGenerate
                    ? "bg-orange-500/20 text-orange-400 border-orange-500/50 hover:bg-orange-500/30 hover:border-orange-500"
                    : "bg-zinc-800/50 text-zinc-500 border-zinc-700 cursor-not-allowed"
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Upscaling...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Upscale Image</span>
                  </>
                )}
              </button>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Before/After Comparison */}
              {hasResult && sourceImageUrl && (
                <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-zinc-300">Before / After Comparison</h3>
                    <div className="flex items-center gap-2">
                      {/* View Mode Toggle */}
                      <div className="flex bg-zinc-800 rounded-lg p-0.5">
                        <button
                          onClick={() => setComparisonMode("side-by-side")}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                            comparisonMode === "side-by-side"
                              ? "bg-zinc-700 text-white"
                              : "text-zinc-400 hover:text-white"
                          )}
                        >
                          Side by Side
                        </button>
                        <button
                          onClick={() => setComparisonMode("slider")}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                            comparisonMode === "slider"
                              ? "bg-zinc-700 text-white"
                              : "text-zinc-400 hover:text-white"
                          )}
                        >
                          Slider
                        </button>
                      </div>

                      {/* Zoom Controls */}
                      <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-0.5">
                        <button
                          onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                          className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-zinc-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
                        <button
                          onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                          className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setZoom(1)}
                          className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Selection Toggle */}
                      <button
                        onClick={() => setIsSelected(!isSelected)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
                          isSelected
                            ? "bg-orange-500/20 border-orange-500 text-orange-400"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                        )}
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : null}
                        {isSelected ? "Selected" : "Select to Save"}
                      </button>
                    </div>
                  </div>

                  {comparisonMode === "side-by-side" ? (
                    /* Side by Side View */
                    <div className="grid grid-cols-2 gap-4 overflow-auto">
                      <div className="space-y-2">
                        <div className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Original</div>
                        <div className="rounded-xl overflow-auto border border-zinc-700 bg-zinc-800">
                          <img
                            src={sourceImageUrl}
                            alt="Original"
                            className="w-full h-auto"
                            style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-zinc-500 font-medium uppercase tracking-wide flex items-center gap-2">
                          Upscaled
                          <span className="text-orange-400">({scaleFactor}x)</span>
                        </div>
                        <div
                          className={cn(
                            "rounded-xl overflow-auto border-2 bg-zinc-800 transition-colors",
                            isSelected ? "border-orange-500 ring-2 ring-orange-500/30" : "border-zinc-700"
                          )}
                        >
                          <img
                            src={upscaledImageUrl}
                            alt="Upscaled"
                            className="w-full h-auto"
                            style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Slider View */
                    <div
                      className="relative rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800 cursor-ew-resize select-none"
                      onMouseDown={(e) => {
                        handleSliderDrag(e)
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          const x = moveEvent.clientX - rect.left
                          const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
                          setSliderPosition(percentage)
                        }
                        const handleMouseUp = () => {
                          document.removeEventListener("mousemove", handleMouseMove)
                          document.removeEventListener("mouseup", handleMouseUp)
                        }
                        document.addEventListener("mousemove", handleMouseMove)
                        document.addEventListener("mouseup", handleMouseUp)
                      }}
                    >
                      {/* Before (Original) */}
                      <div className="overflow-auto" style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
                        <img src={sourceImageUrl} alt="Original" className="w-full h-auto block" />
                      </div>

                      {/* After (Upscaled) - clipped */}
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
                      >
                        <div className="overflow-auto" style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
                          <img src={upscaledImageUrl} alt="Upscaled" className="w-full h-auto block" />
                        </div>
                      </div>

                      {/* Slider Line */}
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                        style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
                      >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                          <div className="flex gap-0.5">
                            <ChevronLeft className="w-3 h-3 text-zinc-800" />
                            <ChevronRight className="w-3 h-3 text-zinc-800" />
                          </div>
                        </div>
                      </div>

                      {/* Labels */}
                      <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 rounded text-xs text-white">
                        Original
                      </div>
                      <div className="absolute top-3 right-3 px-2 py-1 bg-black/70 rounded text-xs text-orange-400">
                        Upscaled {scaleFactor}x
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Spacing */}
              <div className="h-16" />
            </div>
          </main>
        </div>

        {/* Inspector Panel (Right) */}
        <div
          className={`${
            isInspectorCollapsed ? "w-16" : "w-80"
          } flex-shrink-0 hidden md:flex transition-all duration-300 overflow-hidden`}
        >
          <InspectorPanel
            isCollapsed={isInspectorCollapsed}
            onToggleCollapse={toggleInspectorCollapsed}
            libraryPage="dashboard"
          />
        </div>
      </div>

      {/* Bottom Nav */}
      <DashboardNav />

      {/* Reference Modal */}
      <ReferenceModal
        isOpen={showReferenceModal}
        onClose={() => setShowReferenceModal(false)}
        onSelect={handleSelectImage}
        assetType="image"
        category={"scene" as AssetCategory}
      />
    </div>
  )
}
