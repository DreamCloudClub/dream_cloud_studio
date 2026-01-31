import { useParams, useNavigate } from "react-router-dom"
import { useEffect } from "react"
import { ChevronLeft, Edit2, Trash2, Copy, Loader2 } from "lucide-react"
import { useFoundationStore } from "@/state/foundationStore"
import { useUIStore } from "@/state/uiStore"
import { useAuth } from "@/contexts/AuthContext"
import { DashboardHeader, DashboardNav } from "@/components/dashboard"
import { BubblePanel } from "@/components/create"
import { InspectorPanel } from "@/components/workspace"
import {
  useFoundationWizardStore,
  STYLE_OPTIONS,
  MOOD_OPTIONS,
  TYPOGRAPHY_OPTIONS,
  TONE_OPTIONS,
} from "@/state/foundationWizardStore"

export function FoundationDetail() {
  const { foundationId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isBubbleCollapsed, toggleBubbleCollapsed, isInspectorCollapsed, toggleInspectorCollapsed } = useUIStore()
  const { foundations, isLoading, loadFoundations, removeFoundation, duplicateFoundation } = useFoundationStore()
  const { loadFoundation } = useFoundationWizardStore()

  // Load foundations if not loaded
  useEffect(() => {
    if (user && foundations.length === 0 && !isLoading) {
      loadFoundations(user.id)
    }
  }, [user, foundations.length, isLoading, loadFoundations])

  const foundation = foundations.find((f) => f.id === foundationId)

  if (isLoading) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    )
  }

  if (!foundation) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-100 mb-2">Foundation not found</h1>
          <button
            onClick={() => navigate("/library/foundations")}
            className="text-sky-400 hover:text-sky-300"
          >
            Back to Foundations
          </button>
        </div>
      </div>
    )
  }

  // Safely access color_palette with fallback
  const colorPalette = foundation.color_palette || []

  const getLabel = (options: { id: string; label: string }[], id: string | null) => {
    return options.find((o) => o.id === id)?.label || "Not set"
  }

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${foundation.name}"?`)) {
      removeFoundation(foundation.id)
      navigate("/library/foundations")
    }
  }

  const handleDuplicate = () => {
    const newId = duplicateFoundation(foundation.id)
    if (newId) {
      navigate(`/foundation/${newId}`)
    }
  }

  const handleEdit = () => {
    loadFoundation({
      id: foundation.id,
      name: foundation.name,
      description: foundation.description || undefined,
      colorPalette: colorPalette,
      style: foundation.style,
      mood: foundation.mood,
      typography: foundation.typography,
      tone: foundation.tone,
      moodImages: foundation.mood_images || [],
    })
    navigate("/create/foundation")
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      <DashboardHeader />

      <div className="flex-1 flex overflow-hidden">
        {/* Bubble Panel */}
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

        {/* Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Secondary Header */}
          <div className="h-[72px] border-b border-zinc-800 flex-shrink-0">
            <div className="h-full px-6 lg:px-8 flex items-center">
              <div className="w-24">
                <button
                  onClick={() => navigate("/library/foundations")}
                  className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="text-sm font-medium">Back</span>
                </button>
              </div>
              <h1 className="flex-1 text-center text-xl font-semibold text-zinc-100">
                {foundation.name}
              </h1>
              <div className="w-24" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 pt-10 pb-6">
            {/* Header with actions */}
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden grid grid-cols-2 grid-rows-2 flex-shrink-0">
                  {colorPalette.slice(0, 4).map((color, i) => (
                    <div key={i} style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div>
                  {foundation.description && (
                    <p className="text-zinc-400">{foundation.description}</p>
                  )}
                  <p className="text-sm text-zinc-500 mt-2">
                    Used in {foundation.project_count} project{foundation.project_count !== 1 ? "s" : ""} •
                    Created {formatDate(foundation.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleEdit}
                  className="p-2 rounded-lg text-zinc-400 hover:text-sky-400 hover:bg-zinc-800 transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDuplicate}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                  title="Duplicate"
                >
                  <Copy className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Color Palette */}
            <section className="mb-8">
              <h2 className="text-sm font-medium text-zinc-300 mb-3">Color Palette</h2>
              <div className="flex gap-3 flex-wrap">
                {colorPalette.map((color, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div
                      className="w-16 h-16 rounded-xl border border-zinc-700"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-zinc-500 mt-2">{color}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Style Attributes */}
            <section className="mb-8">
              <h2 className="text-sm font-medium text-zinc-300 mb-3">Style Attributes</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Visual Style</p>
                  <p className="text-zinc-100">{getLabel(STYLE_OPTIONS, foundation.style)}</p>
                </div>
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Mood</p>
                  <p className="text-zinc-100">{getLabel(MOOD_OPTIONS, foundation.mood)}</p>
                </div>
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Typography</p>
                  <p className="text-zinc-100">{getLabel(TYPOGRAPHY_OPTIONS, foundation.typography)}</p>
                </div>
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Tone</p>
                  <p className="text-zinc-100">{getLabel(TONE_OPTIONS, foundation.tone)}</p>
                </div>
              </div>
            </section>

            {/* Mood Images */}
            {foundation.mood_images && foundation.mood_images.length > 0 && (
              <section className="mb-8">
                <h2 className="text-sm font-medium text-zinc-300 mb-3">Reference Images</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {foundation.mood_images.map((image) => (
                    <div
                      key={image.id}
                      className="aspect-square rounded-xl overflow-hidden bg-zinc-800"
                    >
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
          </div>
        </main>

        {/* Inspector Panel (Right Sidebar) */}
        <div
          className={`${
            isInspectorCollapsed ? "w-16" : "w-80"
          } flex-shrink-0 hidden md:flex transition-all duration-300 overflow-hidden`}
        >
          <InspectorPanel
            isCollapsed={isInspectorCollapsed}
            onToggleCollapse={toggleInspectorCollapsed}
            libraryPage="foundations"
          />
        </div>
      </div>

      <DashboardNav />
    </div>
  )
}
