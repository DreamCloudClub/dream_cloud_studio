import { useState, useEffect, useRef } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ChevronDown,
  Loader2,
  Check,
  Trash2,
  Mic,
  Play,
  Pause,
  Volume2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAssetWizardStore } from "@/state/assetWizardStore"
import {
  generateVoice,
  getVoices,
  DEFAULT_VOICES,
  type Voice,
  type VoiceSettings,
} from "@/services/elevenlabs"

// Voice model options
const VOICE_MODELS = [
  { id: "eleven_multilingual_v2", label: "Multilingual v2", description: "Best quality, 29 languages" },
  { id: "eleven_turbo_v2_5", label: "Turbo v2.5", description: "Low latency, English" },
  { id: "eleven_turbo_v2", label: "Turbo v2", description: "Fast, English only" },
  { id: "eleven_monolingual_v1", label: "English v1", description: "Legacy English model" },
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

// Slider component for voice settings
interface SliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  description?: string
}

function Slider({ label, value, onChange, min = 0, max = 1, step = 0.05, description }: SliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-300">{label}</label>
        <span className="text-sm text-zinc-500">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
      />
      {description && (
        <p className="text-xs text-zinc-500">{description}</p>
      )}
    </div>
  )
}

interface GeneratedVoice {
  id: string
  url: string
  text: string
  voiceId: string
  voiceName: string
  selected: boolean
  timestamp: number
}

export function VoiceGenerateStep() {
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

  // Set category to voice on mount
  useEffect(() => {
    setCategory("voice")
  }, [setCategory])

  // Voice selection state
  const [voices, setVoices] = useState<Voice[]>([])
  const [loadingVoices, setLoadingVoices] = useState(true)
  const [selectedVoiceId, setSelectedVoiceId] = useState(DEFAULT_VOICES.rachel)
  const [modelId, setModelId] = useState("eleven_multilingual_v2")

  // Voice settings
  const [stability, setStability] = useState(0.5)
  const [similarityBoost, setSimilarityBoost] = useState(0.75)
  const [style, setStyle] = useState(0)
  const [useSpeakerBoost, setUseSpeakerBoost] = useState(true)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize voices from cache
  const [generatedVoices, setGeneratedVoicesLocal] = useState<GeneratedVoice[]>(() => {
    // Convert cached batches to GeneratedVoice format
    // Each batch asset becomes a voice entry
    return cachedBatches.flatMap(b =>
      b.assets.map(a => ({
        id: a.id,
        url: a.url,
        text: b.prompt,
        voiceId: '',
        voiceName: '',
        selected: a.selected,
        timestamp: b.timestamp,
      }))
    )
  })

  // Wrapper to sync voices to store cache
  const setGeneratedVoices = (updater: GeneratedVoice[] | ((prev: GeneratedVoice[]) => GeneratedVoice[])) => {
    setGeneratedVoicesLocal(prev => {
      const newVoices = typeof updater === 'function' ? updater(prev) : updater
      // Convert to batch format for caching
      // Group by timestamp to maintain batch structure
      const batchMap = new Map<number, GeneratedVoice[]>()
      newVoices.forEach(v => {
        const existing = batchMap.get(v.timestamp) || []
        existing.push(v)
        batchMap.set(v.timestamp, existing)
      })

      const batches = Array.from(batchMap.entries()).map(([timestamp, voices]) => ({
        id: `voice-batch-${timestamp}`,
        assets: voices.map(v => ({
          id: v.id,
          url: v.url,
          selected: v.selected,
        })),
        prompt: voices[0]?.text || '',
        timestamp,
        refinement: '',
      }))

      setCachedBatches(batches)
      return newVoices
    })
  }

  // Audio playback state
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())

  // Load available voices on mount
  useEffect(() => {
    async function loadVoices() {
      try {
        const voiceList = await getVoices()
        setVoices(voiceList)
      } catch (err) {
        console.error("Failed to load voices:", err)
        // Fall back to default voices
      } finally {
        setLoadingVoices(false)
      }
    }
    loadVoices()
  }, [])

  // Build voice options for dropdown
  const voiceOptions: DropdownOption[] = voices.length > 0
    ? voices.map(v => ({
        value: v.voice_id,
        label: v.name,
        description: v.category,
      }))
    : Object.entries(DEFAULT_VOICES).map(([name, id]) => ({
        value: id,
        label: name.charAt(0).toUpperCase() + name.slice(1),
        description: "Default voice",
      }))

  const selectedVoiceName = voices.find(v => v.voice_id === selectedVoiceId)?.name
    || Object.entries(DEFAULT_VOICES).find(([, id]) => id === selectedVoiceId)?.[0]
    || "Unknown"

  const handleGenerate = async () => {
    if (!userDescription.trim()) {
      setError("Please enter text to speak")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const voiceSettings: VoiceSettings = {
        stability,
        similarity_boost: similarityBoost,
        style,
        use_speaker_boost: useSpeakerBoost,
      }

      const audioDataUrl = await generateVoice({
        text: userDescription.trim(),
        voiceId: selectedVoiceId,
        modelId,
        voiceSettings,
      })

      const newVoice: GeneratedVoice = {
        id: `voice-${Date.now()}`,
        url: audioDataUrl,
        text: userDescription.trim(),
        voiceId: selectedVoiceId,
        voiceName: selectedVoiceName,
        selected: generatedVoices.length === 0, // Auto-select first one
        timestamp: Date.now(),
      }

      setGeneratedVoices(prev => [...prev, newVoice])
    } catch (err) {
      console.error("Voice generation error:", err)
      setError(err instanceof Error ? err.message : "Failed to generate voice")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleToggleSelection = (id: string) => {
    setGeneratedVoices(prev => prev.map(v =>
      v.id === id ? { ...v, selected: !v.selected } : v
    ))
  }

  const handleRemove = (id: string) => {
    // Stop playback if playing
    const audio = audioRefs.current.get(id)
    if (audio) {
      audio.pause()
      audioRefs.current.delete(id)
    }
    if (playingId === id) setPlayingId(null)
    setGeneratedVoices(prev => prev.filter(v => v.id !== id))
  }

  const handlePlayPause = (id: string, url: string) => {
    // If currently playing this one, pause it
    if (playingId === id) {
      const audio = audioRefs.current.get(id)
      if (audio) {
        audio.pause()
      }
      setPlayingId(null)
      return
    }

    // Pause any currently playing audio
    if (playingId) {
      const currentAudio = audioRefs.current.get(playingId)
      if (currentAudio) {
        currentAudio.pause()
      }
    }

    // Play the new one
    let audio = audioRefs.current.get(id)
    if (!audio) {
      audio = new Audio(url)
      audio.onended = () => setPlayingId(null)
      audioRefs.current.set(id, audio)
    }
    audio.play()
    setPlayingId(id)
  }

  // Count selected
  const selectedCount = generatedVoices.filter(v => v.selected).length
  const canContinue = selectedCount > 0

  const handleContinue = () => {
    if (canContinue) {
      const selected = generatedVoices.filter(v => v.selected).map(v => ({
        id: v.id,
        url: v.url,
        selected: true,
      }))
      setGeneratedAssets(selected)
      nextStep()
    }
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
            Create Voice
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
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="Name this voice clip..."
                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Text to Speak */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Text to Speak <span className="text-red-400">*</span>
              </label>
              <textarea
                value={userDescription}
                onChange={(e) => setUserDescription(e.target.value)}
                placeholder="Enter the text you want to convert to speech..."
                rows={4}
                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
              />
              <p className="text-xs text-zinc-500 mt-1.5">
                {userDescription.length} characters
              </p>
            </div>

            {/* Voice & Model Selection Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Voice</label>
                <CustomDropdown
                  value={selectedVoiceId}
                  onChange={setSelectedVoiceId}
                  options={voiceOptions}
                  placeholder={loadingVoices ? "Loading voices..." : "Select voice"}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Model</label>
                <CustomDropdown
                  value={modelId}
                  onChange={setModelId}
                  options={VOICE_MODELS.map(m => ({
                    value: m.id,
                    label: m.label,
                    description: m.description,
                  }))}
                />
              </div>
            </div>

            {/* Voice Settings */}
            <div className="p-4 bg-zinc-900/30 rounded-xl border border-zinc-800 space-y-4">
              <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Voice Settings
              </h3>

              <Slider
                label="Stability"
                value={stability}
                onChange={setStability}
                description="Higher = more consistent, Lower = more expressive"
              />

              <Slider
                label="Clarity + Similarity"
                value={similarityBoost}
                onChange={setSimilarityBoost}
                description="Higher = closer to original voice"
              />

              <Slider
                label="Style Exaggeration"
                value={style}
                onChange={setStyle}
                description="Amplifies the style of the original speaker"
              />

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-zinc-300">Speaker Boost</label>
                  <p className="text-xs text-zinc-500">Enhance speaker similarity</p>
                </div>
                <button
                  onClick={() => setUseSpeakerBoost(!useSpeakerBoost)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    useSpeakerBoost ? "bg-violet-500" : "bg-zinc-700"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                      useSpeakerBoost ? "left-7" : "left-1"
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Generated Voices */}
            {generatedVoices.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-zinc-300">Generated Audio</h3>
                {generatedVoices.map(voice => (
                  <div
                    key={voice.id}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all",
                      voice.selected
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-zinc-700 bg-zinc-800/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Selection checkbox */}
                      <button
                        onClick={() => handleToggleSelection(voice.id)}
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all mt-0.5",
                          voice.selected ? "bg-violet-500" : "bg-zinc-700 hover:bg-zinc-600"
                        )}
                      >
                        {voice.selected && <Check className="w-4 h-4 text-white" />}
                      </button>

                      {/* Voice info and controls */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                            <Mic className="w-4 h-4 text-violet-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-200">{voice.voiceName}</p>
                            <p className="text-xs text-zinc-500">
                              {new Date(voice.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>

                        {/* Text preview */}
                        <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
                          "{voice.text}"
                        </p>

                        {/* Audio controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePlayPause(voice.id, voice.url)}
                            className={cn(
                              "p-2 rounded-lg transition-colors",
                              playingId === voice.id
                                ? "bg-violet-500 text-white"
                                : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                            )}
                          >
                            {playingId === voice.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                          <audio
                            src={voice.url}
                            className="flex-1 h-8"
                            controls
                          />
                        </div>
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => handleRemove(voice.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
                  {generatedVoices.length === 0 ? "Generate Voice" : "Generate Another"}
                </button>
              )}

              {/* Loading State */}
              {isGenerating && (
                <div className="py-8 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800 text-center">
                  <Loader2 className="w-10 h-10 text-violet-500 animate-spin mx-auto mb-3" />
                  <p className="text-zinc-400">Generating voice...</p>
                  <p className="text-xs text-zinc-600 mt-1">This usually takes a few seconds</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
