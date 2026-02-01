import { useState, useEffect, useRef } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ChevronDown,
  Loader2,
  Check,
  Trash2,
  Music,
  Waves,
  Play,
  Pause,
  Clock,
  SkipBack,
  Download,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAssetWizardStore } from "@/state/assetWizardStore"
import { generateMusic, generateSoundEffect } from "@/services/elevenlabs"

// Auto-growing textarea hook
function useAutoGrow(value: string, minRows: number = 3) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = ref.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24
    const minHeight = lineHeight * minRows + 20
    const newHeight = Math.max(textarea.scrollHeight, minHeight)
    textarea.style.height = `${newHeight}px`
  }, [value, minRows])

  return ref
}

// Audio Card Component with custom progress bar
interface AudioCardProps {
  asset: {
    id: string
    url: string
    selected: boolean
    duration?: number
  }
  assetIndex: number
  audioType: "music" | "sfx"
  isPlaying: boolean
  onPlayPause: () => void
  onToggleSelection: () => void
  onRemove: () => void
  audioRef: React.MutableRefObject<Map<string, HTMLAudioElement>>
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

function AudioCard({
  asset,
  assetIndex,
  audioType,
  isPlaying,
  onPlayPause,
  onToggleSelection,
  onRemove,
  audioRef,
}: AudioCardProps) {
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(asset.duration || 0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const speedMenuRef = useRef<HTMLDivElement>(null)

  // Close speed menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (speedMenuRef.current && !speedMenuRef.current.contains(event.target as Node)) {
        setShowSpeedMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Create audio element on mount and update progress
  useEffect(() => {
    let audio = audioRef.current.get(asset.id)

    // Create audio element if it doesn't exist
    if (!audio) {
      audio = new Audio(asset.url)
      audioRef.current.set(asset.id, audio)
    }

    const handleTimeUpdate = () => {
      if (audio && audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100)
        setCurrentTime(audio.currentTime)
        setDuration(audio.duration)
      }
    }

    const handleLoadedMetadata = () => {
      if (audio) setDuration(audio.duration)
    }

    const handleEnded = () => {
      setProgress(0)
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      if (audio) {
        audio.removeEventListener('timeupdate', handleTimeUpdate)
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audio.removeEventListener('ended', handleEnded)
      }
    }
  }, [asset.id, asset.url, audioRef])

  // Handle clicking on progress bar to seek
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const audio = audioRef.current.get(asset.id)
    if (!audio || !progressBarRef.current) return

    const rect = progressBarRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    audio.currentTime = percentage * audio.duration
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation()
    const audio = audioRef.current.get(asset.id)
    if (audio) {
      audio.currentTime = 0
      setCurrentTime(0)
      setProgress(0)
    }
  }

  const handleSpeedChange = (newSpeed: number) => {
    setPlaybackSpeed(newSpeed)
    const audio = audioRef.current.get(asset.id)
    if (audio) {
      audio.playbackRate = newSpeed
    }
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    const link = document.createElement('a')
    link.href = asset.url
    link.download = `${audioType}-variation-${assetIndex + 1}.mp3`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div
      onClick={onToggleSelection}
      className={cn(
        "group relative rounded-xl border-2 transition-all cursor-pointer",
        asset.selected
          ? "border-violet-500 ring-2 ring-violet-500/30"
          : "border-zinc-700 hover:border-zinc-600"
      )}
    >
      {/* Card content area */}
      <div className="bg-zinc-800/80 px-5 pb-5 pt-7 flex items-center gap-4 rounded-t-xl">
        {/* Reset button */}
        <button
          onClick={handleReset}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 bg-zinc-700 text-zinc-400 hover:bg-zinc-600 hover:text-white"
          title="Reset to start"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {/* Play button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPlayPause()
          }}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all flex-shrink-0",
            isPlaying
              ? "bg-violet-500 text-white"
              : "bg-zinc-700 text-zinc-300 hover:bg-violet-500 hover:text-white"
          )}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </button>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-zinc-200 mb-1">
            {audioType === "music" ? (
              <Music className="w-4 h-4 text-violet-400" />
            ) : (
              <Waves className="w-4 h-4 text-violet-400" />
            )}
            <span className="font-medium">
              Variation {assetIndex + 1}
            </span>
          </div>
          <div className="text-xs text-zinc-500">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Playback speed dropdown */}
        <div ref={speedMenuRef} className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowSpeedMenu(!showSpeedMenu)
            }}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1",
              showSpeedMenu
                ? "bg-violet-500 text-white"
                : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
            )}
          >
            {playbackSpeed}x
            <ChevronDown className={cn("w-3 h-3 transition-transform", showSpeedMenu && "rotate-180")} />
          </button>

          {showSpeedMenu && (
            <div className="absolute bottom-full mb-1 right-0 py-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl shadow-black/30 overflow-hidden min-w-[70px] z-[100]">
              {PLAYBACK_SPEEDS.map((speed) => (
                <button
                  key={speed}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSpeedChange(speed)
                    setShowSpeedMenu(false)
                  }}
                  className={cn(
                    "w-full px-3 py-1.5 text-xs text-left transition-all",
                    speed === playbackSpeed
                      ? "bg-violet-500/20 text-violet-400"
                      : "text-zinc-300 hover:bg-zinc-700"
                  )}
                >
                  {speed}x
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 bg-zinc-700 text-zinc-400 hover:bg-violet-500 hover:text-white"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Full-width progress bar at bottom */}
      <div className="px-4 pb-4 pt-2 bg-zinc-800/80 rounded-b-xl">
        <div
          ref={progressBarRef}
          onClick={handleProgressClick}
          className="h-1.5 bg-zinc-700 rounded-full cursor-pointer relative overflow-hidden"
        >
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
          {/* Hover indicator */}
          <div className="absolute inset-0 bg-violet-400/20 opacity-0 hover:opacity-100 transition-opacity rounded-full" />
        </div>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all pointer-events-none" />

      {/* Trash button - top left on hover */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="p-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-all"
          title="Remove"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Selection checkmark - top right */}
      {asset.selected && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  )
}

// Audio type options
const AUDIO_TYPES = [
  { id: "music", label: "Music", description: "Background music, scores, jingles" },
  { id: "sfx", label: "Sound Effect", description: "Foley, impacts, ambient sounds" },
]

// Music duration options
const MUSIC_DURATIONS = [
  { id: "30", label: "30 sec" },
  { id: "60", label: "1 min" },
  { id: "120", label: "2 min" },
  { id: "240", label: "4 min" },
  { id: "360", label: "6 min" },
  { id: "custom", label: "Custom" },
]

// Variation count options
const VARIATION_COUNTS = [
  { id: "1", label: "1" },
  { id: "2", label: "2" },
  { id: "3", label: "3" },
  { id: "4", label: "4" },
]

// Lyrics mode options
const LYRICS_MODES = [
  { id: "auto", label: "Auto", description: "AI generates lyrics from prompt" },
  { id: "custom", label: "Custom", description: "Use your own lyrics" },
  { id: "instrumental", label: "Instrumental", description: "No vocals" },
]

// SFX duration options
const SFX_DURATIONS = [
  { id: "auto", label: "Auto" },
  { id: "2", label: "2 seconds" },
  { id: "5", label: "5 seconds" },
  { id: "10", label: "10 seconds" },
]

// Custom Dropdown Component
interface DropdownOption {
  value: string
  label: string
  description?: string
}

interface CustomDropdownProps {
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  placeholder?: string
  className?: string
}

function CustomDropdown({ value, onChange, options, placeholder = "Select...", className }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-4 py-2.5 bg-zinc-900/80 border rounded-xl text-left transition-all",
          "flex items-center justify-between gap-2",
          "hover:bg-zinc-800/80",
          isOpen
            ? "border-violet-500 ring-1 ring-violet-500/20"
            : "border-zinc-700/50 hover:border-zinc-600"
        )}
      >
        <span className={selectedOption ? "text-zinc-100" : "text-zinc-500"}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-zinc-400 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 py-1 bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-xl shadow-black/30 overflow-hidden max-h-64 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={cn(
                "w-full px-4 py-2.5 text-left transition-all",
                "flex items-center justify-between",
                option.value === value
                  ? "bg-violet-500/10 text-violet-400"
                  : "text-zinc-300 hover:bg-zinc-800"
              )}
            >
              <div className="flex flex-col">
                <span className="font-medium">{option.label}</span>
                {option.description && (
                  <span className="text-xs text-zinc-500">{option.description}</span>
                )}
              </div>
              {option.value === value && (
                <Check className="w-4 h-4 text-violet-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Parse time string like "2:30" to seconds
function parseTimeToSeconds(timeStr: string): number | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const minutes = parseInt(match[1], 10)
  const seconds = parseInt(match[2], 10)
  if (seconds >= 60) return null
  const total = minutes * 60 + seconds
  // ElevenLabs supports 3-600 seconds
  if (total < 3 || total > 600) return null
  return total
}

interface GeneratedBatch {
  id: string
  assets: {
    id: string
    url: string
    selected: boolean
    duration?: number
  }[]
  prompt: string
  customLyrics?: string
  timestamp: number
  refinement: string
}

export function MusicSfxGenerateStep() {
  const {
    assetName,
    userDescription,
    setAssetName,
    setUserDescription,
    setCategory,
    setGeneratedAssets,
    cachedBatches,
    setCachedBatches,
    nextStep,
    prevStep,
  } = useAssetWizardStore()

  // Audio type
  const [audioType, setAudioType] = useState<"music" | "sfx">("music")

  useEffect(() => {
    setCategory(audioType === "music" ? "music" : "sound_effect")
  }, [audioType, setCategory])

  // Music settings
  const [durationOption, setDurationOption] = useState("60")
  const [customDuration, setCustomDuration] = useState("2:00")
  const [variationCount, setVariationCount] = useState("1")
  const [lyricsMode, setLyricsMode] = useState("auto")
  const [lyrics, setLyrics] = useState("")

  // SFX settings
  const [sfxDuration, setSfxDuration] = useState("auto")
  const [promptInfluence, setPromptInfluence] = useState(0.3)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize batches from cache
  const [batches, setBatchesLocal] = useState<GeneratedBatch[]>(() => {
    // Convert cached batches to GeneratedBatch format
    return cachedBatches.map(b => ({
      ...b,
      customLyrics: undefined,
    })) as GeneratedBatch[]
  })

  // Wrapper to sync batches to store cache
  const setBatches = (updater: GeneratedBatch[] | ((prev: GeneratedBatch[]) => GeneratedBatch[])) => {
    setBatchesLocal(prev => {
      const newBatches = typeof updater === 'function' ? updater(prev) : updater
      // Sync to store cache (strip lyrics field for storage)
      setCachedBatches(newBatches.map(b => ({
        id: b.id,
        assets: b.assets,
        prompt: b.prompt,
        timestamp: b.timestamp,
        refinement: b.refinement,
      })))
      return newBatches
    })
  }

  // Audio playback state
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())

  // Auto-growing textarea refs
  const descriptionRef = useAutoGrow(userDescription, 3)
  const lyricsRef = useAutoGrow(lyrics, 6)

  // Get effective duration in seconds
  const getEffectiveDuration = (): number => {
    if (durationOption === "custom") {
      const parsed = parseTimeToSeconds(customDuration)
      return parsed || 60 // Default to 60 if invalid
    }
    return parseInt(durationOption)
  }

  const handleGenerate = async () => {
    if (!userDescription.trim()) {
      setError("Please enter a description")
      return
    }

    // Validate custom duration
    if (audioType === "music" && durationOption === "custom") {
      const parsed = parseTimeToSeconds(customDuration)
      if (!parsed) {
        setError("Invalid duration format. Use MM:SS (e.g., 2:30). Min 0:03, Max 10:00")
        return
      }
    }

    setIsGenerating(true)
    setError(null)

    const batchId = `batch-${Date.now()}`
    const lastBatch = batches[batches.length - 1]

    // Build effective prompt with refinement
    let effectivePrompt = userDescription.trim()
    if (lastBatch?.refinement.trim()) {
      effectivePrompt = `${effectivePrompt}. ${lastBatch.refinement.trim()}`
    }

    try {
      if (audioType === "music") {
        const duration = getEffectiveDuration()
        const numVariations = parseInt(variationCount)
        const isInstrumental = lyricsMode === "instrumental"

        // Build prompt with lyrics if custom
        let finalPrompt = effectivePrompt
        if (lyricsMode === "custom" && lyrics.trim()) {
          finalPrompt = `${effectivePrompt}\n\nLyrics:\n${lyrics.trim()}`
        }

        // Generate requested number of variations
        const generatedUrls: string[] = []
        for (let i = 0; i < numVariations; i++) {
          const audioUrl = await generateMusic({
            prompt: finalPrompt,
            duration_seconds: duration,
            force_instrumental: isInstrumental,
          })
          generatedUrls.push(audioUrl)
        }

        const newBatch: GeneratedBatch = {
          id: batchId,
          assets: generatedUrls.map((url, i) => ({
            id: `${batchId}-${i}`,
            url,
            selected: i === 0 && batches.length === 0, // Auto-select first one on first batch
            duration,
          })),
          prompt: effectivePrompt,
          customLyrics: lyricsMode === "custom" ? lyrics : undefined,
          timestamp: Date.now(),
          refinement: "",
        }

        setBatches(prev => [...prev, newBatch])
      } else {
        // Sound effect
        const durationSeconds = sfxDuration === "auto" ? undefined : parseInt(sfxDuration)

        const audioUrl = await generateSoundEffect({
          text: effectivePrompt,
          duration_seconds: durationSeconds,
          prompt_influence: promptInfluence,
        })

        const newBatch: GeneratedBatch = {
          id: batchId,
          assets: [{
            id: `${batchId}-0`,
            url: audioUrl,
            selected: batches.length === 0,
            duration: durationSeconds,
          }],
          prompt: effectivePrompt,
          timestamp: Date.now(),
          refinement: "",
        }

        setBatches(prev => [...prev, newBatch])
      }
    } catch (err) {
      console.error("Audio generation error:", err)
      setError(err instanceof Error ? err.message : "Failed to generate audio")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleToggleSelection = (batchId: string, assetId: string) => {
    setBatches(prev => prev.map(batch => {
      if (batch.id === batchId) {
        return {
          ...batch,
          assets: batch.assets.map(asset =>
            asset.id === assetId ? { ...asset, selected: !asset.selected } : asset
          )
        }
      }
      return batch
    }))
  }

  const handleUpdateRefinement = (batchId: string, text: string) => {
    setBatches(prev => prev.map(batch => {
      if (batch.id === batchId) {
        return { ...batch, refinement: text }
      }
      return batch
    }))
  }

  const handleRemoveBatch = (batchId: string) => {
    // Stop any playing audio from this batch
    const batch = batches.find(b => b.id === batchId)
    batch?.assets.forEach(asset => {
      const audio = audioRefs.current.get(asset.id)
      if (audio) {
        audio.pause()
        audioRefs.current.delete(asset.id)
      }
      if (playingId === asset.id) setPlayingId(null)
    })
    setBatches(prev => prev.filter(b => b.id !== batchId))
  }

  const handleRemoveAsset = (batchId: string, assetId: string) => {
    const audio = audioRefs.current.get(assetId)
    if (audio) {
      audio.pause()
      audioRefs.current.delete(assetId)
    }
    if (playingId === assetId) setPlayingId(null)

    setBatches(prev => prev.map(batch => {
      if (batch.id === batchId) {
        const newAssets = batch.assets.filter(a => a.id !== assetId)
        return newAssets.length > 0 ? { ...batch, assets: newAssets } : null
      }
      return batch
    }).filter(Boolean) as GeneratedBatch[])
  }

  const handlePlayPause = (id: string, url: string) => {
    if (playingId === id) {
      const audio = audioRefs.current.get(id)
      if (audio) audio.pause()
      setPlayingId(null)
      return
    }

    if (playingId) {
      const currentAudio = audioRefs.current.get(playingId)
      if (currentAudio) currentAudio.pause()
    }

    let audio = audioRefs.current.get(id)
    if (!audio) {
      audio = new Audio(url)
      audio.onended = () => setPlayingId(null)
      audioRefs.current.set(id, audio)
    }
    audio.play()
    setPlayingId(id)
  }

  // Count selected across all batches
  const selectedCount = batches.reduce((acc, batch) =>
    acc + batch.assets.filter(a => a.selected).length, 0
  )
  const canContinue = selectedCount > 0

  const handleContinue = () => {
    if (canContinue) {
      const selected = batches.flatMap(batch =>
        batch.assets.filter(a => a.selected).map(a => ({
          id: a.id,
          url: a.url,
          selected: true,
          duration: a.duration,
        }))
      )
      setGeneratedAssets(selected)
      nextStep()
    }
  }

  const getPlaceholder = () => {
    if (audioType === "music") {
      return "Describe the music style, mood, instruments, genre... (e.g., 'upbeat electronic pop with synths and driving drums')"
    }
    return "Describe the sound effect (e.g., 'whoosh transition', 'thunderstorm with rain')"
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="h-[72px] border-b border-zinc-800 flex-shrink-0">
        <div className="h-full px-6 lg:px-8 flex items-center">
          <div className="w-24">
            <button
              onClick={prevStep}
              className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
          </div>

          <h1 className="flex-1 text-center text-xl font-semibold text-zinc-100">
            Create {audioType === "music" ? "Music" : "Sound Effect"}
          </h1>

          <div className="w-24 flex justify-end">
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className={cn(
                "flex items-center gap-1 transition-colors",
                canContinue
                  ? "text-violet-400 hover:opacity-80"
                  : "text-zinc-600 cursor-not-allowed"
              )}
            >
              <span className="text-sm font-medium">Continue</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl w-full mx-auto px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Audio Type Toggle */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Audio Type</label>
              <div className="grid grid-cols-2 gap-3">
                {AUDIO_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setAudioType(type.id as "music" | "sfx")}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all text-left",
                      audioType === type.id
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        audioType === type.id ? "bg-violet-500/20" : "bg-zinc-700"
                      )}>
                        {type.id === "music" ? (
                          <Music className={cn("w-5 h-5", audioType === type.id ? "text-violet-400" : "text-zinc-400")} />
                        ) : (
                          <Waves className={cn("w-5 h-5", audioType === type.id ? "text-violet-400" : "text-zinc-400")} />
                        )}
                      </div>
                      <div>
                        <p className={cn("font-medium", audioType === type.id ? "text-violet-400" : "text-zinc-200")}>
                          {type.label}
                        </p>
                        <p className="text-xs text-zinc-500">{type.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder={`Name this ${audioType === "music" ? "track" : "sound effect"}...`}
                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Description/Prompt */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                ref={descriptionRef}
                value={userDescription}
                onChange={(e) => setUserDescription(e.target.value)}
                placeholder={getPlaceholder()}
                rows={3}
                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
                style={{ overflow: 'hidden' }}
              />
            </div>

            {/* Music-specific settings */}
            {audioType === "music" && (
              <>
                {/* Duration & Variations Row */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Duration</label>
                    <CustomDropdown
                      value={durationOption}
                      onChange={setDurationOption}
                      options={MUSIC_DURATIONS.map(d => ({
                        value: d.id,
                        label: d.label,
                      }))}
                    />
                  </div>
                  {durationOption === "custom" && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                        Custom (MM:SS)
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          type="text"
                          value={customDuration}
                          onChange={(e) => setCustomDuration(e.target.value)}
                          placeholder="2:30"
                          className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/80 border border-zinc-700/50 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 font-mono"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Variations</label>
                    <CustomDropdown
                      value={variationCount}
                      onChange={setVariationCount}
                      options={VARIATION_COUNTS.map(v => ({
                        value: v.id,
                        label: v.label,
                      }))}
                    />
                  </div>
                </div>

                {/* Lyrics Mode */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Vocals</label>
                  <div className="grid grid-cols-3 gap-2">
                    {LYRICS_MODES.map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setLyricsMode(mode.id)}
                        className={cn(
                          "p-3 rounded-xl border transition-all text-center",
                          lyricsMode === mode.id
                            ? "border-violet-500 bg-violet-500/10 text-violet-400"
                            : "border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-600"
                        )}
                      >
                        <p className="font-medium text-sm">{mode.label}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{mode.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lyrics Text Field */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Lyrics
                    {lyricsMode === "custom" && <span className="text-violet-400 ml-2">(will be used)</span>}
                    {lyricsMode === "auto" && <span className="text-zinc-500 ml-2">(optional - AI will generate if empty)</span>}
                    {lyricsMode === "instrumental" && <span className="text-zinc-500 ml-2">(ignored for instrumental)</span>}
                  </label>
                  <textarea
                    ref={lyricsRef}
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    placeholder={lyricsMode === "instrumental"
                      ? "Lyrics are ignored for instrumental tracks"
                      : "Write your lyrics here...\n\n[Verse 1]\nYour verse lyrics...\n\n[Chorus]\nYour chorus lyrics..."
                    }
                    rows={6}
                    disabled={lyricsMode === "instrumental"}
                    className={cn(
                      "w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 resize-none",
                      lyricsMode === "instrumental" && "opacity-50 cursor-not-allowed"
                    )}
                    style={{ overflow: 'hidden' }}
                  />
                </div>
              </>
            )}

            {/* SFX-specific settings */}
            {audioType === "sfx" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Duration</label>
                  <CustomDropdown
                    value={sfxDuration}
                    onChange={setSfxDuration}
                    options={SFX_DURATIONS.map(d => ({
                      value: d.id,
                      label: d.label,
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Prompt Influence ({Math.round(promptInfluence * 100)}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={promptInfluence}
                    onChange={(e) => setPromptInfluence(parseFloat(e.target.value))}
                    className="w-full h-10 bg-transparent cursor-pointer accent-violet-500"
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Generated Batches */}
            <div className="space-y-6">
              {batches.map((batch, batchIndex) => (
                <div key={batch.id}>
                  {/* Batch Panel */}
                  <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-4">
                    {/* Batch Header */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-zinc-500">
                        Batch {batchIndex + 1} • {batch.assets.length} {batch.assets.length === 1 ? "track" : "tracks"}
                      </span>
                      <button
                        onClick={() => handleRemoveBatch(batch.id)}
                        className="text-xs text-zinc-500 hover:text-red-400 transition-colors inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                    </div>

                    {/* Audio Cards - Full width */}
                    <div className="space-y-3">
                      {batch.assets.map((asset, assetIndex) => (
                        <AudioCard
                          key={asset.id}
                          asset={asset}
                          assetIndex={assetIndex}
                          audioType={audioType}
                          isPlaying={playingId === asset.id}
                          onPlayPause={() => handlePlayPause(asset.id, asset.url)}
                          onToggleSelection={() => handleToggleSelection(batch.id, asset.id)}
                          onRemove={() => handleRemoveAsset(batch.id, asset.id)}
                          audioRef={audioRefs}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Refinement section - only for last batch */}
                  {batchIndex === batches.length - 1 && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-zinc-400 mb-2">
                        Refinements for next generation
                      </label>
                      <textarea
                        value={batch.refinement}
                        onChange={(e) => handleUpdateRefinement(batch.id, e.target.value)}
                        placeholder="Add changes or adjustments for the next batch... (e.g., 'make it more upbeat', 'add more bass', 'slower tempo')"
                        rows={2}
                        className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Generate Button */}
            <div className="pb-16">
              {!isGenerating && (
                <button
                  onClick={handleGenerate}
                  disabled={!userDescription.trim()}
                  className={cn(
                    "w-full px-5 py-3 rounded-xl font-medium transition-all inline-flex items-center justify-center gap-2",
                    userDescription.trim()
                      ? "bg-gradient-to-br from-violet-400 via-violet-500 to-purple-600 text-white hover:opacity-90"
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  {batches.length === 0
                    ? `Generate ${audioType === "music" ? (parseInt(variationCount) > 1 ? `${variationCount} Tracks` : "Music") : "Sound Effect"}`
                    : `Regenerate${parseInt(variationCount) > 1 ? ` ${variationCount}` : ""}`
                  }
                </button>
              )}

              {/* Loading State */}
              {isGenerating && (
                <div className="py-8 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800 text-center">
                  <Loader2 className="w-10 h-10 text-violet-500 animate-spin mx-auto mb-3" />
                  <p className="text-zinc-400">
                    Generating {audioType === "music" ? "music" : "sound effect"}...
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">
                    {audioType === "music"
                      ? `Creating ${variationCount} variation${parseInt(variationCount) > 1 ? "s" : ""} • This may take a minute`
                      : "This usually takes a few seconds"
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
