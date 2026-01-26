import { useState, useRef, useEffect, useCallback } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Mic, Send, Loader2, MessageSquare, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useProjectWizardStore, WIZARD_STEPS } from "@/state/projectWizardStore"
import { useWorkspaceStore } from "@/state/workspaceStore"
import { sendMessage, getInitialGreeting, type BubbleContext, type Message, type ToolCall } from "@/services/claude"

interface BubblePanelProps {
  className?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function BubblePanel({ className, isCollapsed = false, onToggleCollapse }: BubblePanelProps) {
  const [inputValue, setInputValue] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isCollapsedListening, setIsCollapsedListening] = useState(false)
  const [textareaHeight, setTextareaHeight] = useState(40)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const initialMessageSent = useRef(false)
  const collapsedRecognitionRef = useRef<SpeechRecognition | null>(null)
  const collapsedSilenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const location = useLocation()
  const navigate = useNavigate()
  const { project: workspaceProject, activeTab } = useWorkspaceStore()

  // Detect context based on route
  const isOnDashboard = location.pathname === "/"
  const isInWorkspace = location.pathname.startsWith("/project/")
  const isInCreateWizard = location.pathname.startsWith("/create/")

  // Auto-resize textarea based on content
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Wait if textarea not in DOM yet (width 0 means not rendered)
    if (textarea.offsetWidth === 0) return

    const minHeight = 40
    const maxHeight = 120

    // If empty, use min height
    if (!textarea.value) {
      textarea.style.height = `${minHeight}px`
      setTextareaHeight(minHeight)
      return
    }

    // Set to minHeight first to measure true scrollHeight
    textarea.style.height = `${minHeight}px`
    textarea.style.overflow = 'hidden'
    const scrollHeight = textarea.scrollHeight
    const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight))

    textarea.style.height = `${newHeight}px`
    textarea.style.overflow = newHeight >= maxHeight ? 'auto' : 'hidden'
    setTextareaHeight(newHeight)
  }, [])

  const {
    currentStep,
    initialPrompt,
    platform,
    brief,
    moodBoard,
    storyboard,
    shots,
    bubbleMessages,
    isBubbleTyping,
    addBubbleMessage,
    setBubbleTyping,
    clearBubbleMessages,
    // Actions for tool calls
    setPlatform,
    updateBrief,
    updateMoodBoard,
    goToNextStep,
    goToPreviousStep,
    markStepComplete,
  } = useProjectWizardStore()

  // Determine current context step for greeting
  const getContextStep = (): string => {
    if (isOnDashboard) return 'home'
    if (isInWorkspace) return 'workspace'
    if (isInCreateWizard) return currentStep
    return 'home'
  }

  // Get prompt/name for greeting based on context
  const getContextPrompt = (): string | undefined => {
    if (isInWorkspace && workspaceProject) return workspaceProject.name
    if (isInCreateWizard) return initialPrompt || undefined
    return undefined
  }

  // Build context for Claude - adapts based on where we are
  const buildContext = (): BubbleContext => {
    // Workspace context (existing project)
    if (isInWorkspace && workspaceProject) {
      return {
        currentStep: 'workspace',
        currentRoute: location.pathname,
        initialPrompt: workspaceProject.name,
        brief: {
          name: workspaceProject.brief.name,
          description: workspaceProject.brief.description,
          audience: workspaceProject.brief.audience,
          tone: workspaceProject.brief.tone,
          duration: workspaceProject.brief.duration,
          aspectRatio: workspaceProject.brief.aspectRatio,
        },
        storyboard: workspaceProject.storyboardCards.length > 0 ? {
          acts: workspaceProject.storyboardCards.map(c => ({
            name: c.title,
            description: c.description
          })),
        } : undefined,
        shotCount: workspaceProject.scenes.reduce((acc, s) => acc + s.shots.length, 0) || undefined,
      }
    }

    // Home/dashboard context
    if (isOnDashboard) {
      return {
        currentStep: 'home',
        currentRoute: location.pathname,
      }
    }

    // Create wizard context (new project)
    return {
      currentStep,
      currentRoute: location.pathname,
      initialPrompt: initialPrompt || undefined,
      platform: platform ? {
        type: platform.type,
        name: platform.platformName,
      } : undefined,
      brief: brief ? {
        name: brief.name,
        description: brief.description,
        audience: brief.audience,
        tone: brief.tone,
        duration: brief.duration,
        aspectRatio: brief.aspectRatio,
      } : undefined,
      moodBoard: moodBoard ? {
        keywords: moodBoard.keywords,
        colors: moodBoard.colors,
      } : undefined,
      storyboard: storyboard ? {
        acts: storyboard.acts.map(a => ({ name: a.name, description: a.description })),
      } : undefined,
      shotCount: shots.length || undefined,
    }
  }

  // Execute tool calls from Bubble's response
  const executeToolCalls = async (toolCalls: ToolCall[]) => {
    for (const tool of toolCalls) {
      console.log('Executing tool:', tool.name, tool.input)

      switch (tool.name) {
        case 'navigate': {
          const route = tool.input.route as string
          navigate(route)
          break
        }
        case 'select_platform': {
          const type = tool.input.type as 'new' | 'existing'
          const platformId = tool.input.platformId as string | undefined
          setPlatform({
            type,
            platformId,
            platformName: type === 'new' ? undefined : platformId,
          })
          markStepComplete('platform')
          goToNextStep()
          break
        }
        case 'update_brief': {
          const briefData: Record<string, string> = {}
          if (tool.input.name) briefData.name = tool.input.name as string
          if (tool.input.description) briefData.description = tool.input.description as string
          if (tool.input.audience) briefData.audience = tool.input.audience as string
          if (tool.input.tone) briefData.tone = tool.input.tone as string
          if (tool.input.duration) briefData.duration = tool.input.duration as string
          if (tool.input.aspectRatio) briefData.aspectRatio = tool.input.aspectRatio as string
          updateBrief(briefData)
          break
        }
        case 'update_mood_board': {
          const moodData: { keywords?: string[]; colors?: string[] } = {}
          if (tool.input.keywords) moodData.keywords = tool.input.keywords as string[]
          if (tool.input.colors) moodData.colors = tool.input.colors as string[]
          updateMoodBoard(moodData)
          break
        }
        case 'go_to_next_step': {
          markStepComplete(currentStep as 'platform' | 'brief' | 'mood' | 'story' | 'shots' | 'filming' | 'audio' | 'review')
          goToNextStep()
          break
        }
        case 'go_to_previous_step': {
          goToPreviousStep()
          break
        }
        default:
          console.warn('Unknown tool:', tool.name)
      }
    }
  }

  // Add initial message when step changes
  useEffect(() => {
    // Only add if no messages exist and we haven't sent one yet
    if (bubbleMessages.length === 0 && !initialMessageSent.current) {
      initialMessageSent.current = true
      const greeting = getInitialGreeting(getContextStep(), getContextPrompt())
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

  // Adjust textarea height when panel is open and input changes
  useEffect(() => {
    if (!isCollapsed) {
      // Retries with longer delays to let panel width transition complete (~300ms)
      const timers = [0, 50, 150, 300, 350].map(delay =>
        setTimeout(adjustTextareaHeight, delay)
      )
      return () => timers.forEach(clearTimeout)
    }
  }, [isCollapsed, inputValue, adjustTextareaHeight])

  const handleSend = async () => {
    if (!inputValue.trim()) return

    // Stop microphone if listening
    if (isListening && recognitionRef.current) {
      shouldIgnoreResults.current = true
      recognitionRef.current.stop()
      setIsListening(false)
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
    }

    const userMessage = inputValue.trim()

    // Add user message
    addBubbleMessage({
      role: "user",
      content: userMessage,
    })

    setInputValue("")
    setBubbleTyping(true)

    try {
      // Build message history for Claude (exclude the message we just added since it's not in state yet)
      const messageHistory: Message[] = [
        ...bubbleMessages.map(m => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: userMessage }
      ]

      const response = await sendMessage(messageHistory, buildContext())

      // Execute any tool calls first
      if (response.toolCalls.length > 0) {
        await executeToolCalls(response.toolCalls)
      }

      // Add the assistant's message
      if (response.message) {
        addBubbleMessage({
          role: "assistant",
          content: response.message,
        })
      }
    } catch (error) {
      console.error("Claude API error:", error)
      addBubbleMessage({
        role: "assistant",
        content: "Sorry, I'm having trouble connecting right now. Please try again.",
      })
    } finally {
      setBubbleTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const shouldIgnoreResults = useRef(false)

  const handleMicClick = () => {
    // Web Speech API for voice input
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Try Chrome.")
      return
    }

    // If already listening, stop
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
      return
    }

    // Capture existing input to append to
    const existingInput = inputValue

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = true

    let finalTranscript = ''

    const resetSilenceTimeout = () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
      // Stop after 30 seconds of silence
      silenceTimeoutRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.stop()
        }
      }, 30000)
    }

    recognition.onstart = () => {
      setIsListening(true)
      finalTranscript = ''
      shouldIgnoreResults.current = false
      resetSilenceTimeout()
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Ignore results if we've already sent the message
      if (shouldIgnoreResults.current) return

      resetSilenceTimeout()

      let interimTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      // Append to existing input
      const newText = finalTranscript + interimTranscript
      const combined = existingInput ? `${existingInput} ${newText}`.trim() : newText.trim()
      setInputValue(combined)

      // Scroll textarea to bottom to show new content
      if (textareaRef.current) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
    }

    recognition.start()
  }

  // Handler for collapsed mic - opens panel and starts listening to fill chat input
  const handleCollapsedMicClick = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Try Chrome.")
      return
    }

    // If already listening, stop
    if (isCollapsedListening && collapsedRecognitionRef.current) {
      collapsedRecognitionRef.current.stop()
      setIsCollapsedListening(false)
      if (collapsedSilenceTimeoutRef.current) {
        clearTimeout(collapsedSilenceTimeoutRef.current)
      }
      return
    }

    // Capture existing text to append to
    const existingInput = inputValue

    const recognition = new SpeechRecognition()
    collapsedRecognitionRef.current = recognition
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = true

    let finalTranscript = ''

    const resetSilenceTimeout = () => {
      if (collapsedSilenceTimeoutRef.current) {
        clearTimeout(collapsedSilenceTimeoutRef.current)
      }
      collapsedSilenceTimeoutRef.current = setTimeout(() => {
        if (collapsedRecognitionRef.current) {
          collapsedRecognitionRef.current.stop()
        }
      }, 30000)
    }

    recognition.onstart = () => {
      setIsCollapsedListening(true)
      finalTranscript = ''
      resetSilenceTimeout()
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      resetSilenceTimeout()

      let interimTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      const newText = finalTranscript + interimTranscript
      const combined = existingInput
        ? `${existingInput} ${newText.trim()}`
        : newText.trim()
      setInputValue(combined)

      // Scroll textarea to bottom to show new content (if panel is open)
      if (textareaRef.current) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      setIsCollapsedListening(false)
    }

    recognition.onend = () => {
      setIsCollapsedListening(false)
      if (collapsedSilenceTimeoutRef.current) {
        clearTimeout(collapsedSilenceTimeoutRef.current)
      }
    }

    recognition.start()
  }

  const handleRefresh = () => {
    clearBubbleMessages()
    initialMessageSent.current = false
    // Add initial greeting after clearing
    setTimeout(() => {
      const greeting = getInitialGreeting(getContextStep(), getContextPrompt())
      addBubbleMessage({
        role: "assistant",
        content: greeting,
      })
      initialMessageSent.current = true
    }, 0)
  }

  const currentStepMeta = WIZARD_STEPS.find((s) => s.id === currentStep)

  // Collapsed state - show chat button at top, mic at bottom
  if (isCollapsed) {
    return (
      <div
        className={cn(
          "flex flex-col h-full bg-zinc-900 border-r border-zinc-800 w-16 items-center py-4 justify-between",
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

        <button
          onClick={handleCollapsedMicClick}
          className={cn(
            "w-11 h-11 rounded-lg flex items-center justify-center transition-all bg-orange-500 text-white hover:bg-orange-400",
            isCollapsedListening && "shadow-lg shadow-orange-500/50 ring-4 ring-orange-500/30 animate-pulse"
          )}
          title={isOnDashboard ? "Voice input to prompt" : "Voice input to chat"}
        >
          <Mic className="w-5 h-5" />
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full w-full bg-zinc-900 border-r border-zinc-800",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 hover:scale-105 transition-all"
              title="Reset conversation"
            >
              <MessageSquare className="w-5 h-5 text-white" />
            </button>
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
      <div className="flex-1 overflow-y-auto pl-4 pr-2 py-4 space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-600">
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
        <div className="flex items-end gap-2">
          <button
            onClick={handleMicClick}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 bg-orange-500 text-white hover:bg-orange-400",
              isListening && "shadow-lg shadow-orange-500/50 ring-4 ring-orange-500/30 animate-pulse"
            )}
          >
            <Mic className="w-4 h-4" />
          </button>

          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Bubble..."
            rows={1}
            style={{ height: `${textareaHeight}px`, overflow: textareaHeight >= 120 ? 'auto' : 'hidden' }}
            className="flex-1 py-2.5 px-4 bg-zinc-800 border border-zinc-700 focus:border-zinc-600 rounded-2xl text-sm text-white placeholder:text-zinc-500 focus:outline-none transition-colors resize-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          />

          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isBubbleTyping}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 bg-sky-500 text-white hover:bg-sky-400"
          >
            {isBubbleTyping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4 translate-x-[1px]" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

