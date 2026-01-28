import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Plus, Palette, ChevronRight, FolderOpen, Loader2 } from "lucide-react"
import { LibraryLayout } from "@/components/library"
import { useAuth } from "@/contexts/AuthContext"
import { useFoundationStore, Foundation } from "@/state/foundationStore"

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`
  return date.toLocaleDateString()
}

interface FoundationCardProps {
  foundation: Foundation
  onClick: () => void
}

function FoundationCard({ foundation, onClick }: FoundationCardProps) {
  const colorPalette = foundation.color_palette || []

  return (
    <button
      onClick={onClick}
      className="group text-left w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
    >
      <div className="flex items-start gap-4">
        {/* Color palette preview */}
        <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2">
          {colorPalette.length > 0 ? (
            colorPalette.slice(0, 4).map((color, i) => (
              <div key={i} style={{ backgroundColor: color }} />
            ))
          ) : (
            <div className="col-span-2 row-span-2 bg-zinc-800 flex items-center justify-center">
              <Palette className="w-6 h-6 text-zinc-600" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-zinc-100 group-hover:text-sky-400 transition-colors">
            {foundation.name}
          </h3>
          {foundation.description && (
            <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
              {foundation.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
            <span>{foundation.project_count} project{foundation.project_count !== 1 ? "s" : ""}</span>
            <span>Updated {formatRelativeTime(foundation.updated_at)}</span>
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
      </div>
    </button>
  )
}

export function LibraryFoundationsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { foundations, isLoading, loadFoundations } = useFoundationStore()
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch foundations from database
  useEffect(() => {
    if (user) {
      loadFoundations(user.id)
    }
  }, [user, loadFoundations])

  // Filter foundations
  let filteredFoundations = foundations
  if (searchQuery) {
    filteredFoundations = filteredFoundations.filter((f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const handleFoundationClick = (foundationId: string) => {
    navigate(`/foundation/${foundationId}`)
  }

  const handleCreateFoundation = () => {
    navigate("/create/foundation")
  }

  return (
    <LibraryLayout>
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Foundations</h1>
            <p className="text-zinc-400 mt-1">
              Visual styles that maintain consistency across your projects
            </p>
          </div>
          <button
            onClick={handleCreateFoundation}
            className="px-4 py-2 bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Foundation
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search foundations..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Foundation List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
          </div>
        ) : filteredFoundations.length > 0 ? (
          <div className="space-y-3">
            {filteredFoundations.map((foundation) => (
              <FoundationCard
                key={foundation.id}
                foundation={foundation}
                onClick={() => handleFoundationClick(foundation.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
            <FolderOpen className="w-12 h-12 text-zinc-600 mb-3" />
            <p className="text-zinc-500 text-sm text-center">
              {searchQuery
                ? `No foundations matching "${searchQuery}"`
                : "No foundations yet"}
            </p>
          </div>
        )}

        {/* Info section */}
        {filteredFoundations.length > 0 && (
          <div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
            <h4 className="text-sm font-medium text-zinc-300 mb-2">What are Foundations?</h4>
            <p className="text-sm text-zinc-500">
              Foundations define the visual DNA of your brand - including color palettes, typography preferences,
              mood references, and style guidelines. When you create a new project, you can apply a foundation
              to ensure visual consistency across all your content.
            </p>
          </div>
        )}
      </div>
    </LibraryLayout>
  )
}
