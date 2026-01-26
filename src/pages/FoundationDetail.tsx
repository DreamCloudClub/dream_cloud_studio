import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Edit2, Trash2, Copy } from "lucide-react"
import { useFoundationStore } from "@/state/foundationStore"
import { useUIStore } from "@/state/uiStore"
import { DashboardHeader, DashboardNav } from "@/components/dashboard"
import { BubblePanel } from "@/components/create"
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
  const { isBubbleCollapsed, toggleBubbleCollapsed } = useUIStore()
  const { foundations, removeFoundation, duplicateFoundation } = useFoundationStore()
  const { loadFoundation } = useFoundationWizardStore()

  const foundation = foundations.find((f) => f.id === foundationId)

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
    loadFoundation(foundation)
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
        <main className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6 lg:py-8">
            {/* Back Button */}
            <button
              onClick={() => navigate("/library/foundations")}
              className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Foundations</span>
            </button>

            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden grid grid-cols-2 grid-rows-2 flex-shrink-0">
                  {foundation.colorPalette.slice(0, 4).map((color, i) => (
                    <div key={i} style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-zinc-100">{foundation.name}</h1>
                  {foundation.description && (
                    <p className="text-zinc-400 mt-1">{foundation.description}</p>
                  )}
                  <p className="text-sm text-zinc-500 mt-2">
                    Used in {foundation.projectCount} project{foundation.projectCount !== 1 ? "s" : ""} •
                    Created {formatDate(foundation.createdAt)}
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
                {foundation.colorPalette.map((color, i) => (
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
            {foundation.moodImages.length > 0 && (
              <section className="mb-8">
                <h2 className="text-sm font-medium text-zinc-300 mb-3">Reference Images</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {foundation.moodImages.map((image) => (
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

            {/* Preview */}
            <section>
              <h2 className="text-sm font-medium text-zinc-300 mb-3">Preview</h2>
              <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
                <div className="flex gap-1 h-16 rounded-lg overflow-hidden mb-4">
                  {foundation.colorPalette.map((color, i) => (
                    <div key={i} className="flex-1" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {foundation.style && (
                    <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-300">
                      {getLabel(STYLE_OPTIONS, foundation.style)}
                    </span>
                  )}
                  {foundation.mood && (
                    <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-300">
                      {getLabel(MOOD_OPTIONS, foundation.mood)}
                    </span>
                  )}
                  {foundation.typography && (
                    <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-300">
                      {getLabel(TYPOGRAPHY_OPTIONS, foundation.typography)}
                    </span>
                  )}
                  {foundation.tone && (
                    <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-300">
                      {getLabel(TONE_OPTIONS, foundation.tone)}
                    </span>
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      <DashboardNav />
    </div>
  )
}
