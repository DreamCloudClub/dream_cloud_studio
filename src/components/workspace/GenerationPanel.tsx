import { useState } from "react"
import {
  Wand2,
  Image as ImageIcon,
  Video,
  Music,
  Mic,
  Loader2,
  Check,
  Sparkles,
  X,
  RefreshCw,
  Link as LinkIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import {
  generateImageAssets,
  generateVideoAsset,
  generateMusicAsset,
  generateVoiceAsset,
} from "@/services/replicate"
import type { Asset, AssetCategory } from "@/types/database"
import { getAssetDisplayUrl } from "@/services/localStorage"
import type { ProjectAsset } from "@/state/workspaceStore"

// Image generation styles
const IMAGE_STYLES = [
  { id: "realistic", label: "Realistic", description: "Photorealistic" },
  { id: "cinematic", label: "Cinematic", description: "Film-like" },
  { id: "animated", label: "Animated", description: "3D animation" },
  { id: "illustration", label: "Illustration", description: "Digital art" },
  { id: "anime", label: "Anime", description: "Japanese style" },
]

// Video motion presets
const MOTION_PRESETS = [
  { id: "cinematic", label: "Cinematic", prompt: "Smooth cinematic motion, gentle camera movement" },
  { id: "dynamic", label: "Dynamic", prompt: "Dynamic motion, energetic movement" },
  { id: "subtle", label: "Subtle", prompt: "Subtle gentle motion, minimal movement" },
  { id: "zoom", label: "Slow Zoom", prompt: "Slow zoom in, dramatic reveal" },
  { id: "pan", label: "Pan Shot", prompt: "Smooth horizontal pan, sweeping view" },
]

type GenerationType = "image" | "video" | "music" | "voice"

// Helper to convert ProjectAsset to Asset-like object for getAssetDisplayUrl
function toAssetLike(asset: ProjectAsset | Asset | null | undefined): { url?: string | null; local_path?: string | null; storage_type?: string } | null {
  if (!asset) return null
  // Check if it's a ProjectAsset (has localPath) or Asset (has local_path)
  if ('localPath' in asset) {
    return {
      url: asset.url,
      local_path: asset.localPath,
      storage_type: asset.storageType,
    }
  }
  // It's already an Asset
  return asset as Asset
}

// Helper to get user description from either Asset or ProjectAsset
function getUserDescription(asset: ProjectAsset | Asset | null | undefined): string | null | undefined {
  if (!asset) return null
  if ('userDescription' in asset) return asset.userDescription
  if ('user_description' in asset) return asset.user_description
  return null
}

// Helper to get generation model from either Asset or ProjectAsset
function getGenerationModel(asset: ProjectAsset | Asset | null | undefined): string | null | undefined {
  if (!asset) return null
  if ('generationModel' in asset) return asset.generationModel
  if ('generation_model' in asset) return asset.generation_model
  return null
}

interface GenerationPanelProps {
  shotId: string
  shotDescription: string
  projectId: string
  currentImageAsset?: ProjectAsset | Asset | null
  currentVideoAsset?: ProjectAsset | Asset | null
  aspectRatio?: string
  onImageGenerated?: (asset: Asset) => void
  onVideoGenerated?: (asset: Asset) => void
  onClose?: () => void
}

export function GenerationPanel({
  shotId,
  shotDescription,
  projectId,
  currentImageAsset,
  currentVideoAsset,
  aspectRatio = "16:9",
  onImageGenerated,
  onVideoGenerated,
  onClose,
}: GenerationPanelProps) {
  const { user } = useAuth()
  const [activeType, setActiveType] = useState<GenerationType>("image")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Image generation state
  const [imageStyle, setImageStyle] = useState("cinematic")
  const [imagePrompt, setImagePrompt] = useState(shotDescription || "")
  const [generatedImages, setGeneratedImages] = useState<Asset[]>([])
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)

  // Video generation state
  const [motionPreset, setMotionPreset] = useState("cinematic")
  const [videoDuration, setVideoDuration] = useState<5 | 10>(5)
  const [videoQuality, setVideoQuality] = useState<"standard" | "pro">("pro")

  // Audio generation state
  const [musicPrompt, setMusicPrompt] = useState("")
  const [voiceText, setVoiceText] = useState("")

  // Calculate dimensions from aspect ratio
  const getDimensions = () => {
    switch (aspectRatio) {
      case "16:9": return { width: 1024, height: 576 }
      case "9:16": return { width: 576, height: 1024 }
      case "1:1": return { width: 1024, height: 1024 }
      case "4:3": return { width: 1024, height: 768 }
      case "4:5": return { width: 819, height: 1024 }
      case "21:9": return { width: 1024, height: 439 }
      default: return { width: 1024, height: 576 }
    }
  }

  const handleGenerateImages = async () => {
    if (!user || !imagePrompt.trim()) return

    setIsGenerating(true)
    setError(null)
    setGeneratedImages([])
    setSelectedImageIndex(null)

    try {
      const { width, height } = getDimensions()

      const result = await generateImageAssets({
        userId: user.id,
        projectId,
        shotId,
        assetName: `Shot Image`,
        category: "scene" as AssetCategory,
        prompt: imagePrompt,
        style: imageStyle,
        width,
        height,
        numOutputs: 4,
        model: "flux-pro",
      })

      setGeneratedImages(result.assets)

      // Auto-select first image
      if (result.assets.length > 0) {
        setSelectedImageIndex(0)
      }
    } catch (err) {
      console.error("Image generation error:", err)
      setError(err instanceof Error ? err.message : "Failed to generate images")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSelectImage = () => {
    if (selectedImageIndex === null || !generatedImages[selectedImageIndex]) return

    const selectedAsset = generatedImages[selectedImageIndex]
    onImageGenerated?.(selectedAsset)
    setGeneratedImages([])
    setSelectedImageIndex(null)
  }

  const handleGenerateVideo = async () => {
    if (!user) return

    // Need an image to generate video from
    const sourceImage = currentImageAsset || (selectedImageIndex !== null ? generatedImages[selectedImageIndex] : null)
    if (!sourceImage) {
      setError("Generate an image first before creating a video")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const motionPromptText = MOTION_PRESETS.find(p => p.id === motionPreset)?.prompt || ""
      const fullPrompt = shotDescription
        ? `${shotDescription}. ${motionPromptText}`
        : motionPromptText

      const assetLike = toAssetLike(sourceImage)
      const imageUrl = assetLike ? getAssetDisplayUrl(assetLike) : ''

      const result = await generateVideoAsset({
        userId: user.id,
        projectId,
        shotId,
        assetName: "Shot Video",
        category: "scene" as AssetCategory,
        imageUrl,
        prompt: fullPrompt,
        duration: videoDuration,
        quality: videoQuality,
        model: "kling",
        sourceImageAssetId: sourceImage.id,
      })

      onVideoGenerated?.(result.asset)
    } catch (err) {
      console.error("Video generation error:", err)
      setError(err instanceof Error ? err.message : "Failed to generate video")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateMusic = async () => {
    if (!user || !musicPrompt.trim()) return

    setIsGenerating(true)
    setError(null)

    try {
      const asset = await generateMusicAsset({
        userId: user.id,
        projectId,
        assetName: `Music - ${musicPrompt.slice(0, 30)}`,
        prompt: musicPrompt,
        duration: 30,
      })

      // TODO: Handle music asset (add to project assets)
      console.log("Music generated:", asset)
    } catch (err) {
      console.error("Music generation error:", err)
      setError(err instanceof Error ? err.message : "Failed to generate music")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateVoice = async () => {
    if (!user || !voiceText.trim()) return

    setIsGenerating(true)
    setError(null)

    try {
      const asset = await generateVoiceAsset({
        userId: user.id,
        projectId,
        assetName: "Voiceover",
        text: voiceText,
        language: "en",
      })

      // TODO: Handle voice asset (add to scene/project)
      console.log("Voice generated:", asset)
    } catch (err) {
      console.error("Voice generation error:", err)
      setError(err instanceof Error ? err.message : "Failed to generate voice")
    } finally {
      setIsGenerating(false)
    }
  }

  const generationTypes: { id: GenerationType; label: string; icon: React.ElementType }[] = [
    { id: "image", label: "Image", icon: ImageIcon },
    { id: "video", label: "Video", icon: Video },
    { id: "music", label: "Music", icon: Music },
    { id: "voice", label: "Voice", icon: Mic },
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-sky-400" />
          <h3 className="font-semibold text-zinc-100">Generate Assets</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Type Tabs */}
      <div className="flex border-b border-zinc-800">
        {generationTypes.map((type) => {
          const Icon = type.icon
          return (
            <button
              key={type.id}
              onClick={() => setActiveType(type.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                activeType === type.id
                  ? "bg-sky-500/10 text-sky-400 border-b-2 border-sky-500"
                  : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50"
              )}
            >
              <Icon className="w-4 h-4" />
              {type.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Image Generation */}
        {activeType === "image" && (
          <>
            {/* Prompt */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Prompt</label>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                rows={3}
                placeholder="Describe the image you want to generate..."
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 focus:border-sky-500 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
              />
            </div>

            {/* Style */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Style</label>
              <div className="flex flex-wrap gap-2">
                {IMAGE_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setImageStyle(style.id)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-lg border transition-colors",
                      imageStyle === style.id
                        ? "bg-sky-500/20 border-sky-500 text-sky-400"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                    )}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateImages}
              disabled={isGenerating || !imagePrompt.trim()}
              className="w-full py-3 bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 hover:from-sky-300 hover:via-sky-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate 4 Options
                </>
              )}
            </button>

            {/* Generated Images Grid */}
            {generatedImages.length > 0 && (
              <div className="space-y-3">
                <label className="block text-xs text-zinc-500">Select an image</label>
                <div className="grid grid-cols-2 gap-2">
                  {generatedImages.map((asset, idx) => (
                    <button
                      key={asset.id}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={cn(
                        "relative aspect-video rounded-lg overflow-hidden border-2 transition-all",
                        selectedImageIndex === idx
                          ? "border-sky-500 ring-2 ring-sky-500/30"
                          : "border-zinc-700 hover:border-zinc-600"
                      )}
                    >
                      <img
                        src={getAssetDisplayUrl(asset)}
                        alt={`Option ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {selectedImageIndex === idx && (
                        <div className="absolute top-1 right-1 w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerateImages}
                    disabled={isGenerating}
                    className="flex-1 py-2 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-lg text-sm flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </button>
                  <button
                    onClick={handleSelectImage}
                    disabled={selectedImageIndex === null}
                    className="flex-1 py-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm flex items-center justify-center gap-2"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Use Selected
                  </button>
                </div>
              </div>
            )}

            {/* Current Image */}
            {currentImageAsset && generatedImages.length === 0 && (
              <div className="space-y-2">
                <label className="block text-xs text-zinc-500">Current Image</label>
                <div className="relative aspect-video rounded-lg overflow-hidden border border-zinc-700">
                  <img
                    src={getAssetDisplayUrl(toAssetLike(currentImageAsset) || {})}
                    alt="Current"
                    className="w-full h-full object-cover"
                  />
                </div>
                {getUserDescription(currentImageAsset) && (
                  <p className="text-xs text-zinc-500 mt-1 italic">
                    "{getUserDescription(currentImageAsset)}"
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Video Generation */}
        {activeType === "video" && (
          <>
            {/* Source Image Info */}
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-xs text-zinc-500 mb-1">Source Image</p>
              {currentImageAsset ? (
                <div className="flex items-center gap-3">
                  <div className="w-16 h-10 rounded overflow-hidden bg-zinc-700">
                    <img
                      src={getAssetDisplayUrl(toAssetLike(currentImageAsset) || {})}
                      alt="Source"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300">{currentImageAsset.name}</p>
                    {getGenerationModel(currentImageAsset) && (
                      <p className="text-xs text-zinc-500">{getGenerationModel(currentImageAsset)}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-400">No image selected. Generate an image first.</p>
              )}
            </div>

            {/* Motion Preset */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Motion Style</label>
              <div className="flex flex-wrap gap-2">
                {MOTION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setMotionPreset(preset.id)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-lg border transition-colors",
                      motionPreset === preset.id
                        ? "bg-purple-500/20 border-purple-500 text-purple-400"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration & Quality */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Duration</label>
                <select
                  value={videoDuration}
                  onChange={(e) => setVideoDuration(Number(e.target.value) as 5 | 10)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
                >
                  <option value={5}>5 seconds</option>
                  <option value={10}>10 seconds</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Quality</label>
                <select
                  value={videoQuality}
                  onChange={(e) => setVideoQuality(e.target.value as "standard" | "pro")}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="pro">1080p Pro</option>
                  <option value="standard">720p Standard</option>
                </select>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateVideo}
              disabled={isGenerating || !currentImageAsset}
              className="w-full py-3 bg-gradient-to-r from-purple-400 via-purple-500 to-indigo-600 hover:from-purple-300 hover:via-purple-400 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Video...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  Generate Video
                </>
              )}
            </button>

            {/* Current Video */}
            {currentVideoAsset && (
              <div className="space-y-2">
                <label className="block text-xs text-zinc-500">Current Video</label>
                <div className="relative aspect-video rounded-lg overflow-hidden border border-zinc-700">
                  <video
                    src={getAssetDisplayUrl(toAssetLike(currentVideoAsset) || {})}
                    controls
                    loop
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>{currentVideoAsset.name}</span>
                  {currentVideoAsset.duration && (
                    <span>{currentVideoAsset.duration}s</span>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Music Generation */}
        {activeType === "music" && (
          <>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Describe the music</label>
              <textarea
                value={musicPrompt}
                onChange={(e) => setMusicPrompt(e.target.value)}
                rows={3}
                placeholder="e.g., Upbeat corporate, inspiring and modern..."
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 focus:border-sky-500 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
              />
            </div>

            <button
              onClick={handleGenerateMusic}
              disabled={isGenerating || !musicPrompt.trim()}
              className="w-full py-3 bg-gradient-to-r from-orange-400 via-orange-500 to-red-600 hover:from-orange-300 hover:via-orange-400 hover:to-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Music className="w-4 h-4" />
                  Generate Music (30s)
                </>
              )}
            </button>
          </>
        )}

        {/* Voice Generation */}
        {activeType === "voice" && (
          <>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Voiceover Script</label>
              <textarea
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                rows={4}
                placeholder="Enter the text to convert to speech..."
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 focus:border-sky-500 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
              />
            </div>

            <button
              onClick={handleGenerateVoice}
              disabled={isGenerating || !voiceText.trim()}
              className="w-full py-3 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-600 hover:from-emerald-300 hover:via-emerald-400 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  Generate Voiceover
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
