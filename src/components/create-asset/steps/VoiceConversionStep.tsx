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
  Upload,
  Play,
  Pause,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAssetWizardStore } from "@/state/assetWizardStore"
import {
  getVoices,
  DEFAULT_VOICES,
  type Voice,
} from "@/services/elevenlabs"

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

interface GeneratedVoice {
  id: string
  url: string
  sourceFileName: string
  targetVoiceName: string
  selected: boolean
  timestamp: number
}

export function VoiceConversionStep() {
  const {
    assetName,
    setAssetName,
    setCategory,
    setGeneratedAssets,
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

  // Source audio state
  const [sourceAudioFile, setSourceAudioFile] = useState<File | null>(null)
  const [sourceAudioUrl, setSourceAudioUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedVoices, setGeneratedVoices] = useState<GeneratedVoice[]>([])

  // Audio playback state
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [playingSource, setPlayingSource] = useState(false)
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  const sourceAudioRef = useRef<HTMLAudioElement | null>(null)

  // Load available voices on mount
  useEffect(() => {
    async function loadVoices() {
      try {
        const voiceList = await getVoices()
        setVoices(voiceList)
      } catch (err) {
        console.error("Failed to load voices:", err)
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith("audio/")) {
        setError("Please select an audio file")
        return
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB")
        return
      }
      setSourceAudioFile(file)
      setSourceAudioUrl(URL.createObjectURL(file))
      setError(null)
    }
  }

  const handleRemoveSource = () => {
    if (sourceAudioUrl) {
      URL.revokeObjectURL(sourceAudioUrl)
    }
    setSourceAudioFile(null)
    setSourceAudioUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handlePlaySourceToggle = () => {
    if (!sourceAudioUrl) return

    if (playingSource) {
      sourceAudioRef.current?.pause()
      setPlayingSource(false)
    } else {
      if (!sourceAudioRef.current) {
        sourceAudioRef.current = new Audio(sourceAudioUrl)
        sourceAudioRef.current.onended = () => setPlayingSource(false)
      }
      sourceAudioRef.current.play()
      setPlayingSource(true)
    }
  }

  const handleGenerate = async () => {
    if (!sourceAudioFile) {
      setError("Please upload a source audio file")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // Voice conversion requires uploading audio to ElevenLabs speech-to-speech API
      // This needs server-side implementation with file upload support
      // For now, show a not-yet-implemented message
      throw new Error(
        "Voice conversion is coming soon. This feature requires speech-to-speech API integration with file upload support."
      )

      // TODO: Implement when edge function supports file upload
      // const formData = new FormData()
      // formData.append("audio", sourceAudioFile)
      // formData.append("voice_id", selectedVoiceId)
      // const audioDataUrl = await convertVoice(formData)
      // ...

    } catch (err) {
      console.error("Voice conversion error:", err)
      setError(err instanceof Error ? err.message : "Failed to convert voice")
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
    const audio = audioRefs.current.get(id)
    if (audio) {
      audio.pause()
      audioRefs.current.delete(id)
    }
    if (playingId === id) setPlayingId(null)
    setGeneratedVoices(prev => prev.filter(v => v.id !== id))
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
            Voice Conversion
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
            {/* Coming Soon Notice */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-400">Coming Soon</p>
                  <p className="text-sm text-amber-400/80 mt-1">
                    Voice conversion requires speech-to-speech API integration with file upload support.
                    This feature is currently in development.
                  </p>
                </div>
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
                placeholder="Name this voice clip..."
                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Source Audio Upload */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Source Audio <span className="text-red-400">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              {sourceAudioFile ? (
                <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePlaySourceToggle}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        playingSource
                          ? "bg-violet-500 text-white"
                          : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                      )}
                    >
                      {playingSource ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">
                        {sourceAudioFile.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {(sourceAudioFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={handleRemoveSource}
                      className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {sourceAudioUrl && (
                    <audio src={sourceAudioUrl} className="w-full mt-3 h-8" controls />
                  )}
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-8 rounded-xl border-2 border-dashed border-zinc-700 hover:border-violet-500 hover:bg-violet-500/5 flex flex-col items-center justify-center gap-3 text-zinc-500 hover:text-violet-400 transition-all"
                >
                  <Upload className="w-10 h-10" />
                  <div className="text-center">
                    <p className="font-medium">Upload Audio File</p>
                    <p className="text-xs text-zinc-600 mt-1">MP3, WAV, M4A up to 10MB</p>
                  </div>
                </button>
              )}
            </div>

            {/* Target Voice */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Target Voice
              </label>
              <CustomDropdown
                value={selectedVoiceId}
                onChange={setSelectedVoiceId}
                options={voiceOptions}
                placeholder={loadingVoices ? "Loading voices..." : "Select voice"}
              />
              <p className="text-xs text-zinc-500 mt-1.5">
                The source audio will be converted to sound like this voice
              </p>
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
                <h3 className="text-sm font-medium text-zinc-300">Converted Audio</h3>
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
                      <button
                        onClick={() => handleToggleSelection(voice.id)}
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all mt-0.5",
                          voice.selected ? "bg-violet-500" : "bg-zinc-700 hover:bg-zinc-600"
                        )}
                      >
                        {voice.selected && <Check className="w-4 h-4 text-white" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                            <Mic className="w-4 h-4 text-violet-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-200">
                              Converted to {voice.targetVoiceName}
                            </p>
                            <p className="text-xs text-zinc-500">
                              From: {voice.sourceFileName}
                            </p>
                          </div>
                        </div>

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
                          <audio src={voice.url} className="flex-1 h-8" controls />
                        </div>
                      </div>

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
                  disabled={!sourceAudioFile}
                  className={cn(
                    "w-full px-5 py-3 rounded-xl font-medium transition-all inline-flex items-center justify-center gap-2",
                    sourceAudioFile
                      ? "bg-gradient-to-br from-violet-400 via-violet-500 to-purple-600 text-white hover:opacity-90"
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  Convert Voice
                </button>
              )}

              {/* Loading State */}
              {isGenerating && (
                <div className="py-8 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800 text-center">
                  <Loader2 className="w-10 h-10 text-violet-500 animate-spin mx-auto mb-3" />
                  <p className="text-zinc-400">Converting voice...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
