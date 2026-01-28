import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Plus, FolderOpen, Clock, Loader2 } from "lucide-react"
import { LibraryLayout } from "@/components/library"
import { useAuth } from "@/contexts/AuthContext"
import { getPlatforms } from "@/services/platforms"
import type { Platform } from "@/types/database"

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

interface PlatformCardProps {
  platform: Platform
  onClick: () => void
}

function PlatformCard({ platform, onClick }: PlatformCardProps) {
  return (
    <div
      onClick={onClick}
      className="group text-left bg-zinc-900 rounded-xl overflow-hidden transition-colors focus:outline-none flex flex-col cursor-pointer relative border border-zinc-800 hover:border-zinc-700"
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-zinc-800 relative flex-shrink-0">
        {platform.logo_url ? (
          <img
            src={platform.logo_url}
            alt={platform.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <FolderOpen className="w-12 h-12 text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-medium truncate text-zinc-200 group-hover:text-sky-400 transition-colors">
          {platform.name}
        </h3>
        {platform.description && (
          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
            {platform.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
          <Clock className="w-3 h-3" />
          <span>{formatRelativeTime(platform.updated_at)}</span>
        </div>
      </div>
    </div>
  )
}

export function LibraryPlatformsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch platforms from database
  useEffect(() => {
    async function fetchPlatforms() {
      if (!user) return
      setIsLoading(true)
      try {
        const data = await getPlatforms(user.id)
        setPlatforms(data)
      } catch (error) {
        console.error("Error fetching platforms:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchPlatforms()
  }, [user])

  // Filter platforms
  let filteredPlatforms = platforms
  if (searchQuery) {
    filteredPlatforms = filteredPlatforms.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const handlePlatformClick = (platformId: string) => {
    navigate(`/platform/${platformId}`)
  }

  const handleNewPlatform = () => {
    navigate("/create/platform")
  }

  return (
    <LibraryLayout>
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">All Platforms</h1>
            <p className="text-zinc-400 mt-1">
              {platforms.length} platform{platforms.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={handleNewPlatform}
            className="px-4 py-2 bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Platform
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search platforms..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Platform Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
          </div>
        ) : filteredPlatforms.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredPlatforms.map((platform) => (
              <PlatformCard
                key={platform.id}
                platform={platform}
                onClick={() => handlePlatformClick(platform.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
            <FolderOpen className="w-12 h-12 text-zinc-600 mb-3" />
            <p className="text-zinc-500 text-sm text-center">
              {searchQuery
                ? `No platforms matching "${searchQuery}"`
                : "No platforms yet"}
            </p>
          </div>
        )}
      </div>
    </LibraryLayout>
  )
}
