import { useState, useEffect, useRef, useCallback } from "react"
import { useWorkspaceStore } from "@/state/workspaceStore"

export function ScriptPage() {
  const { project, currentScript, updateCurrentScript } = useWorkspaceStore()

  const [content, setContent] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load script content on mount or when currentScript changes
  useEffect(() => {
    setContent(currentScript?.content || "")
  }, [currentScript])

  // Auto-resize textarea to fit content
  const autoResize = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      const minHeight = 320
      const newHeight = Math.max(textarea.scrollHeight, minHeight)
      textarea.style.height = `${newHeight}px`
    }
  }, [])

  useEffect(() => {
    autoResize()
  }, [content, autoResize])

  useEffect(() => {
    window.addEventListener("resize", autoResize)
    return () => window.removeEventListener("resize", autoResize)
  }, [autoResize])

  // Debounced save
  const saveScript = useCallback(async (newContent: string) => {
    if (!project?.id) return
    try {
      await updateCurrentScript(newContent)
    } catch (error) {
      console.error("Failed to save script:", error)
    }
  }, [project?.id, updateCurrentScript])

  const handleChange = useCallback((value: string) => {
    setContent(value)

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

    saveTimeoutRef.current = setTimeout(() => {
      saveScript(value)
    }, 1000)
  }, [saveScript])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  if (!project) return null

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Secondary Header */}
      <div className="h-[72px] border-b border-zinc-800 flex-shrink-0">
        <div className="h-full max-w-3xl mx-auto px-6 lg:px-8 flex items-center">
          <h1 className="text-xl font-semibold text-zinc-100">Script</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 pt-10 pb-6">
          {/* Script Content */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Start writing your script..."
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-4 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors resize-none leading-relaxed"
            style={{ minHeight: "320px" }}
          />
        </div>
      </div>
    </div>
  )
}
