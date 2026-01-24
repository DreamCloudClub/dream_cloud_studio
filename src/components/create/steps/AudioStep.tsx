import { useState } from "react"
import { Mic, Music, Volume2, Wand2, Upload, FolderOpen, Play, X, Loader2, Check } from "lucide-react"
import { useProjectWizardStore, type Asset } from "@/state/projectWizardStore"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type AudioType = "voiceover" | "soundtrack" | "sfx"

export function AudioStep() {
  const {
    audio,
    addVoiceover,
    setSoundtrack,
    addSfx,
    removeAudio,
    goToNextStep,
    goToPreviousStep,
    markStepComplete,
  } = useProjectWizardStore()

  const [activeTab, setActiveTab] = useState<AudioType>("voiceover")
  const [isGenerating, setIsGenerating] = useState(false)
  const [voiceoverScript, setVoiceoverScript] = useState("")
  const [musicPrompt, setMusicPrompt] = useState("")
  const [sfxPrompt, setSfxPrompt] = useState("")

  const handleGenerateVoiceover = () => {
    if (!voiceoverScript.trim()) return

    setIsGenerating(true)
    setTimeout(() => {
      const newVoiceover: Asset = {
        id: crypto.randomUUID(),
        type: "audio",
        url: "#",
        name: `Voiceover ${audio.voiceovers.length + 1}`,
      }
      addVoiceover(newVoiceover)
      setVoiceoverScript("")
      setIsGenerating(false)
    }, 2000)
  }

  const handleGenerateSoundtrack = () => {
    if (!musicPrompt.trim()) return

    setIsGenerating(true)
    setTimeout(() => {
      const newSoundtrack: Asset = {
        id: crypto.randomUUID(),
        type: "audio",
        url: "#",
        name: `Soundtrack - ${musicPrompt.slice(0, 30)}`,
      }
      setSoundtrack(newSoundtrack)
      setMusicPrompt("")
      setIsGenerating(false)
    }, 2000)
  }

  const handleGenerateSfx = () => {
    if (!sfxPrompt.trim()) return

    setIsGenerating(true)
    setTimeout(() => {
      const newSfx: Asset = {
        id: crypto.randomUUID(),
        type: "audio",
        url: "#",
        name: sfxPrompt.slice(0, 40),
      }
      addSfx(newSfx)
      setSfxPrompt("")
      setIsGenerating(false)
    }, 1500)
  }

  const handleContinue = () => {
    markStepComplete("audio")
    goToNextStep()
  }

  const tabs = [
    { id: "voiceover" as const, label: "Voiceover", icon: Mic, count: audio.voiceovers.length },
    { id: "soundtrack" as const, label: "Soundtrack", icon: Music, count: audio.soundtrack ? 1 : 0 },
    { id: "sfx" as const, label: "Sound Effects", icon: Volume2, count: audio.sfx.length },
  ]

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-zinc-100 mb-2">
            Audio Layer
          </h1>
          <p className="text-zinc-400">
            Add voiceover narration, background music, and sound effects.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-sky-500 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full",
                    activeTab === tab.id ? "bg-white/20" : "bg-zinc-700"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          {/* Voiceover Tab */}
          {activeTab === "voiceover" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-zinc-200 mb-2">
                  Generate Voiceover
                </h3>
                <p className="text-sm text-zinc-500 mb-4">
                  Enter your script and we'll generate professional voiceover audio.
                </p>

                <textarea
                  value={voiceoverScript}
                  onChange={(e) => setVoiceoverScript(e.target.value)}
                  placeholder="Enter your voiceover script here..."
                  rows={4}
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 focus:border-sky-500 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
                />

                <div className="flex gap-3 mt-4">
                  <Button
                    onClick={handleGenerateVoiceover}
                    disabled={!voiceoverScript.trim() || isGenerating}
                    className="bg-sky-500 hover:bg-sky-400 text-white"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate Voiceover
                      </>
                    )}
                  </Button>
                  <Button variant="outline" className="border-zinc-700 text-zinc-300">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Recording
                  </Button>
                </div>
              </div>

              {/* Generated Voiceovers */}
              {audio.voiceovers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-zinc-400 mb-3">
                    Generated Voiceovers
                  </h4>
                  <div className="space-y-2">
                    {audio.voiceovers.map((vo) => (
                      <div
                        key={vo.id}
                        className="flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg"
                      >
                        <button className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 hover:bg-sky-500/30">
                          <Play className="w-4 h-4 ml-0.5" />
                        </button>
                        <div className="flex-1">
                          <p className="text-sm text-zinc-200">{vo.name}</p>
                          <div className="h-1 bg-zinc-700 rounded-full mt-1">
                            <div className="h-full w-0 bg-sky-500 rounded-full" />
                          </div>
                        </div>
                        <button
                          onClick={() => removeAudio("voiceover", vo.id)}
                          className="p-1 text-zinc-600 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Soundtrack Tab */}
          {activeTab === "soundtrack" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-zinc-200 mb-2">
                  Background Music
                </h3>
                <p className="text-sm text-zinc-500 mb-4">
                  Describe the mood and style of music you want for your video.
                </p>

                <input
                  type="text"
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                  placeholder="e.g., Upbeat corporate, inspiring and modern"
                  className="w-full h-12 px-4 bg-zinc-800/50 border border-zinc-700 focus:border-sky-500 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />

                <div className="flex gap-3 mt-4">
                  <Button
                    onClick={handleGenerateSoundtrack}
                    disabled={!musicPrompt.trim() || isGenerating}
                    className="bg-sky-500 hover:bg-sky-400 text-white"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate Music
                      </>
                    )}
                  </Button>
                  <Button variant="outline" className="border-zinc-700 text-zinc-300">
                    <FolderOpen className="w-4 h-4 mr-2" />
                    From Library
                  </Button>
                </div>
              </div>

              {/* Current Soundtrack */}
              {audio.soundtrack && (
                <div>
                  <h4 className="text-sm font-medium text-zinc-400 mb-3">
                    Current Soundtrack
                  </h4>
                  <div className="flex items-center gap-3 p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                    <button className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 hover:bg-sky-500/30">
                      <Play className="w-5 h-5 ml-0.5" />
                    </button>
                    <div className="flex-1">
                      <p className="text-zinc-200">{audio.soundtrack.name}</p>
                      <div className="h-1.5 bg-zinc-700 rounded-full mt-2">
                        <div className="h-full w-0 bg-sky-500 rounded-full" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-400" />
                      <button
                        onClick={() => setSoundtrack(null)}
                        className="p-1 text-zinc-600 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SFX Tab */}
          {activeTab === "sfx" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-zinc-200 mb-2">
                  Sound Effects
                </h3>
                <p className="text-sm text-zinc-500 mb-4">
                  Add ambient sounds, transitions, or specific sound effects.
                </p>

                <input
                  type="text"
                  value={sfxPrompt}
                  onChange={(e) => setSfxPrompt(e.target.value)}
                  placeholder="e.g., Whoosh transition, typing sounds, crowd ambience"
                  className="w-full h-12 px-4 bg-zinc-800/50 border border-zinc-700 focus:border-sky-500 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />

                <div className="flex gap-3 mt-4">
                  <Button
                    onClick={handleGenerateSfx}
                    disabled={!sfxPrompt.trim() || isGenerating}
                    className="bg-sky-500 hover:bg-sky-400 text-white"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate SFX
                      </>
                    )}
                  </Button>
                  <Button variant="outline" className="border-zinc-700 text-zinc-300">
                    <FolderOpen className="w-4 h-4 mr-2" />
                    From Library
                  </Button>
                </div>
              </div>

              {/* Added SFX */}
              {audio.sfx.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-zinc-400 mb-3">
                    Added Sound Effects
                  </h4>
                  <div className="space-y-2">
                    {audio.sfx.map((sfx) => (
                      <div
                        key={sfx.id}
                        className="flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg"
                      >
                        <button className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400 hover:bg-zinc-600">
                          <Play className="w-4 h-4 ml-0.5" />
                        </button>
                        <p className="flex-1 text-sm text-zinc-200">{sfx.name}</p>
                        <button
                          onClick={() => removeAudio("sfx", sfx.id)}
                          className="p-1 text-zinc-600 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Skip Note */}
        <p className="text-center text-sm text-zinc-600 mt-4">
          Audio is optional. You can skip this step and add audio later in the workspace.
        </p>

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between">
          <Button
            variant="ghost"
            onClick={goToPreviousStep}
            className="text-zinc-400 hover:text-zinc-300"
          >
            &larr; Back
          </Button>
          <Button
            onClick={handleContinue}
            className="bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 hover:from-sky-300 hover:via-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/20 px-8"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
