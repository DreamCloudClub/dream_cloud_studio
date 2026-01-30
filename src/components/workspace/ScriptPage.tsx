import { useState, useEffect, useRef, useCallback } from "react"
import { useWorkspaceStore } from "@/state/workspaceStore"

export function ScriptPage() {
  const { project, updateScript } = useWorkspaceStore()

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load script from project on mount
  useEffect(() => {
    if (project?.script) {
      setTitle(project.script.title || "")
      setContent(project.script.content || "")
    }
  }, [project?.script])

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
  const saveScript = useCallback(async (newTitle: string, newContent: string) => {
    if (!project?.id) return
    try {
      await updateScript({ title: newTitle, content: newContent })
    } catch (error) {
      console.error("Failed to save script:", error)
    }
  }, [project?.id, updateScript])

  const handleChange = useCallback((field: "title" | "content", value: string) => {
    if (field === "title") setTitle(value)
    else setContent(value)

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

    saveTimeoutRef.current = setTimeout(() => {
      const newTitle = field === "title" ? value : title
      const newContent = field === "content" ? value : content
      saveScript(newTitle, newContent)
    }, 1000)
  }, [title, content, saveScript])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  if (!project) return null

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 py-6 lg:py-8">
          {/* Title */}
          <h1 className="text-2xl font-bold text-zinc-100 mb-1">Script</h1>

          {/* Subtitle / Script Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="Untitled script..."
            className="w-full bg-transparent text-zinc-400 text-sm placeholder:text-zinc-600 focus:outline-none mb-6"
          />

          {/* Script Content */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleChange("content", e.target.value)}
            placeholder="Start writing..."
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-4 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors resize-none leading-relaxed"
            style={{ minHeight: "320px" }}
          />
        </div>
      </div>
    </div>
  )
}
