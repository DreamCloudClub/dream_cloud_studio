import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Plus, FolderOpen, Clock, Loader2, Trash2, AlertTriangle } from "lucide-react"
import { LibraryLayout } from "@/components/library"
import { useAuth } from "@/contexts/AuthContext"
import { getPlatforms, deletePlatform } from "@/services/platforms"
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
  onDelete: () => void
}

function PlatformCard({ platform, onClick, onDelete }: PlatformCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }

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
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-sky-600 via-sky-700 to-blue-800" />
            <FolderOpen className="w-12 h-12 text-white/60 relative z-10 drop-shadow-lg" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

        {/* Delete button */}
        <button
          onClick={handleDelete}
          className="absolute top-2 left-2 p-1.5 bg-zinc-900/80 hover:bg-orange-500 text-zinc-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
          title="Delete platform"
        >
          <Trash2 className="w-4 h-4" />
        </button>
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
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; platform: Platform | null }>({
    isOpen: false,
    platform: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)

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

  const handleDeleteClick = (platform: Platform) => {
    setDeleteModal({ isOpen: true, platform })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal.platform) return

    setIsDeleting(true)
    try {
      await deletePlatform(deleteModal.platform.id)
      setPlatforms(platforms.filter((p) => p.id !== deleteModal.platform!.id))
      setDeleteModal({ isOpen: false, platform: null })
    } catch (error) {
      console.error("Error deleting platform:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, platform: null })
  }

  return (
    <LibraryLayout libraryPage="platforms">
      <div className="h-full flex flex-col">
        {/* Secondary Header */}
        <div className="h-[72px] border-b border-zinc-800 flex-shrink-0">
          <div className="h-full max-w-4xl mx-auto px-6 lg:px-8 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-zinc-100">Platforms</h1>

            <button
              onClick={handleNewPlatform}
              className="px-4 py-2 bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Platform
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 pt-10 pb-6 space-y-6">
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
                    onDelete={() => handleDeleteClick(platform)}
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
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleDeleteCancel}
          />

          {/* Modal */}
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-zinc-100">
                  Delete Platform
                </h3>
                <p className="text-sm text-zinc-400 mt-1">
                  Are you sure you want to delete <span className="text-zinc-200 font-medium">"{deleteModal.platform?.name}"</span>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </LibraryLayout>
  )
}
