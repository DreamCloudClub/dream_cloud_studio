import { useState, useRef, useEffect } from "react"
import { Mic, Send, Loader2, MessageSquare, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useProjectWizardStore, WIZARD_STEPS } from "@/state/projectWizardStore"

interface BubblePanelProps {
  className?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

// Initial greeting messages based on step and context
function getInitialMessage(step: string, initialPrompt: string): string {
  const hasPrompt = initialPrompt.trim().length > 0

  switch (step) {
    case "platform":
      if (hasPrompt) {
        return `Great idea! "${initialPrompt}" sounds like an interesting project. Let's start by choosing a creative platform. Would you like to build on an existing platform or create a new one?`
      }
      return "Welcome! Let's create your new video project. First, would you like to use an existing creative platform or start fresh with a new one?"

    case "brief":
      return "Now let's define your project brief. What's the main goal of this video? Who's your target audience?"

    case "mood":
      return "Time to set the visual direction. Upload some reference images that inspire you, or describe the look and feel you're going for."

    case "story":
      return "Let's structure your story. What's the beginning, middle, and end? What are the key moments you want to capture?"

    case "shots":
      return "Based on your story, I'll help generate a shot list. We can then refine it together."

    case "filming":
      return "Now we'll create the media for each shot. You can generate with AI, pick from your library, or upload your own files."

    case "audio":
      return "Let's add the audio layer. Would you like to add voiceover, background music, or sound effects?"

    case "review":
      return "Looking good! Review everything below, and when you're ready, I'll assemble your raw edit."

    default:
      return "How can I help you with your project?"
  }
}

export function BubblePanel({ className, isCollapsed = false, onToggleCollapse }: BubblePanelProps) {
  const [inputValue, setInputValue] = useState("")
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    currentStep,
    initialPrompt,
    bubbleMessages,
    isBubbleTyping,
    addBubbleMessage,
    setBubbleTyping,
  } = useProjectWizardStore()

  // Add initial message when step changes
  useEffect(() => {
    // Only add if no messages exist for this step context
    if (bubbleMessages.length === 0) {
      const greeting = getInitialMessage(currentStep, initialPrompt)
      addBubbleMessage({
        role: "assistant",
        content: greeting,
      })
    }
  }, []) // Only on mount

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [bubbleMessages, isBubbleTyping])

  const handleSend = () => {
    if (!inputValue.trim()) return

    // Add user message
    addBubbleMessage({
      role: "user",
      content: inputValue.trim(),
    })

    setInputValue("")

    // Simulate Bubble response (in real app, this calls Claude API)
    setBubbleTyping(true)
    setTimeout(() => {
      setBubbleTyping(false)
      addBubbleMessage({
        role: "assistant",
        content: getMockResponse(inputValue, currentStep),
      })
    }, 1000 + Math.random() * 1000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleMicClick = () => {
    // TODO: Implement voice input with Web Speech API or Whisper
    setIsListening(!isListening)
  }

  const currentStepMeta = WIZARD_STEPS.find((s) => s.id === currentStep)

  // Collapsed state - show only the expand button
  if (isCollapsed) {
    return (
      <div
        className={cn(
          "flex flex-col h-full bg-zinc-900 border-r border-zinc-800 w-16 items-center py-4",
          className
        )}
      >
        <button
          onClick={onToggleCollapse}
          className="w-11 h-11 rounded-lg bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 transition-all hover:scale-105"
          title="Open Bubble chat"
        >
          <MessageSquare className="w-5 h-5 text-white" />
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-zinc-900 border-r border-zinc-800",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Bubble</h3>
              <p className="text-xs text-zinc-500">
                {currentStepMeta?.description || "Your production assistant"}
              </p>
            </div>
          </div>

          {/* Collapse Button */}
          <button
            onClick={onToggleCollapse}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Collapse chat panel"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {bubbleMessages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                message.role === "user"
                  ? "bg-sky-500 text-white rounded-br-md"
                  : "bg-zinc-800 text-zinc-100 rounded-bl-md"
              )}
            >
              {message.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isBubbleTyping && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" />
                <span
                  className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <span
                  className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <button
            onClick={handleMicClick}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0",
              isListening
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30 animate-pulse"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"
            )}
          >
            <Mic className="w-4 h-4" />
          </button>

          <div className="flex-1 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Bubble..."
              className="w-full h-10 px-4 pr-10 bg-zinc-800 border border-zinc-700 focus:border-zinc-600 rounded-full text-sm text-white placeholder:text-zinc-500 focus:outline-none transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isBubbleTyping}
              className={cn(
                "absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all",
                inputValue.trim() && !isBubbleTyping
                  ? "bg-sky-500 text-white hover:bg-sky-400"
                  : "bg-transparent text-zinc-600"
              )}
            >
              {isBubbleTyping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Mock responses for demonstration (in real app, this calls Claude API)
function getMockResponse(userInput: string, step: string): string {
  const input = userInput.toLowerCase()

  if (step === "platform") {
    if (input.includes("new") || input.includes("fresh") || input.includes("start")) {
      return "Great choice! A new platform gives you complete creative freedom. Click 'New Platform' to proceed, and I'll guide you through setting up your visual and audio direction."
    }
    if (input.includes("existing") || input.includes("saved") || input.includes("use")) {
      return "Using an existing platform is smart for consistent branding. Select 'Existing Platform' to see your saved options."
    }
    return "Would you like to create a brand new platform or use one you've already set up? New platforms let you define fresh visual styles, while existing ones keep your branding consistent."
  }

  if (step === "brief") {
    if (input.includes("commercial") || input.includes("ad") || input.includes("product")) {
      return "A product commercial! What's the product you're featuring? And who's your ideal customer?"
    }
    if (input.includes("tutorial") || input.includes("how to") || input.includes("educational")) {
      return "Educational content is great for engagement. What topic will you be teaching? Keep your audience's skill level in mind."
    }
    return "Tell me more about your vision. What's the main message you want to convey, and who needs to hear it?"
  }

  if (step === "mood") {
    if (input.includes("minimal") || input.includes("clean") || input.includes("simple")) {
      return "Minimalist aesthetic! Think clean lines, lots of negative space, and a focused color palette. Should we go with cool tones or warm tones?"
    }
    if (input.includes("vibrant") || input.includes("colorful") || input.includes("bold")) {
      return "Bold and vibrant! This works great for energetic content. Any specific colors you want to emphasize?"
    }
    return "Describe the visual feeling you're going for, or upload some reference images that inspire you."
  }

  if (step === "story") {
    return "Good input! Let's break this down into acts. What's the hook that grabs attention at the start? What's the core message in the middle? And what's the call-to-action or takeaway at the end?"
  }

  if (step === "shots") {
    return "Based on your story structure, I'm generating a shot list now. You'll be able to edit, add, or remove shots as needed."
  }

  if (step === "filming") {
    return "For this shot, you can generate new media with AI, pick something from your asset library, or upload your own file. What would you like to do?"
  }

  if (step === "audio") {
    if (input.includes("voice") || input.includes("narrat")) {
      return "For voiceover, I can generate it from a script or you can upload a recording. What script should the voiceover read?"
    }
    if (input.includes("music") || input.includes("soundtrack")) {
      return "What mood should the music set? Upbeat and energetic? Calm and inspirational? Something else?"
    }
    return "Would you like to add voiceover narration, background music, or sound effects? You can do any combination."
  }

  if (step === "review") {
    return "Everything looks set! When you're ready, click 'Create Project' and I'll assemble your raw edit in the workspace."
  }

  return "I'm here to help. What would you like to know about this step?"
}
