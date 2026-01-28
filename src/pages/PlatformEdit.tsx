import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Save,
  FolderOpen,
  Loader2,
  Trash2,
  Plus,
  PenLine,
  CheckCircle2,
  Box,
  Palette,
  X,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LibraryLayout } from "@/components/library"
import { useAuth } from "@/contexts/AuthContext"
import { getPlatform, updatePlatform } from "@/services/platforms"
import {
  getProjectsByPlatform,
  getAllProjects,
  updateProject,
} from "@/services/projects"
import {
  getAssetsByPlatform,
  getAllAssets,
} from "@/services/assets"
import {
  getFoundationsByPlatform,
  getFoundations,
} from "@/services/foundations"
import type { Platform, Project, Asset } from "@/types/database"
import type { Foundation } from "@/services/foundations"

interface AddItemModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  items: { id: string; name: string; thumbnail?: string }[]
  onAdd: (id: string) => void
}

function AddItemModal({ isOpen, onClose, title, items, onAdd }: AddItemModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (!isOpen) return null

  const handleAdd = () => {
    if (selectedId) {
      onAdd(selectedId)
      setSelectedId(null)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {items.length > 0 ? (
          <div className="flex-1 overflow-y-auto space-y-2 mb-4">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left",
                  selectedId === item.id
                    ? "border-sky-500 bg-sky-500/10"
                    : "border-zinc-700 hover:border-zinc-600"
                )}
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <FolderOpen className="w-5 h-5 text-zinc-600" />
                  )}
                </div>
                <span className="text-sm text-zinc-200 truncate">{item.name}</span>
                {selectedId === item.id && (
                  <Check className="w-4 h-4 text-sky-400 ml-auto flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-8">
            <p className="text-zinc-500 text-sm">No items available to add</p>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedId}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-500 hover:bg-sky-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

interface ItemRowProps {
  name: string
  thumbnail?: string
  icon?: React.ElementType
  onRemove: () => void
}

function ItemRow({ name, thumbnail, icon: Icon, onRemove }: ItemRowProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl group">
      <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {thumbnail ? (
          <img src={thumbnail} alt={name} className="w-full h-full object-cover" />
        ) : Icon ? (
          <Icon className="w-5 h-5 text-zinc-500" />
        ) : (
          <FolderOpen className="w-5 h-5 text-zinc-500" />
        )}
      </div>
      <span className="text-sm text-zinc-200 truncate flex-1">{name}</span>
      <button
        onClick={onRemove}
        className="p-1.5 text-zinc-500 hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

interface CategorySectionProps {
  title: string
  icon: React.ElementType
  iconColor: string
  items: { id: string; name: string; thumbnail?: string }[]
  onRemove: (id: string) => void
  onAdd: () => void
}

function CategorySection({
  title,
  icon: Icon,
  iconColor,
  items,
  onRemove,
  onAdd,
}: CategorySectionProps) {
  return (
    <div className="space-y-3">
      <div className={cn("flex items-center gap-2", iconColor)}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-semibold uppercase tracking-wide">{title}</span>
        <span className="text-xs text-zinc-500">({items.length})</span>
      </div>
      <div className="space-y-2 ml-6">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            name={item.name}
            thumbnail={item.thumbnail}
            onRemove={() => onRemove(item.id)}
          />
        ))}
        <button
          onClick={onAdd}
          className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-zinc-700 hover:border-zinc-600 rounded-xl text-zinc-500 hover:text-zinc-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Add {title}</span>
        </button>
      </div>
    </div>
  )
}

export function PlatformEdit() {
  const { platformId } = useParams<{ platformId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [platform, setPlatform] = useState<Platform | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const [projects, setProjects] = useState<Project[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [foundations, setFoundations] = useState<Foundation[]>([])

  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [allAssets, setAllAssets] = useState<Asset[]>([])
  const [allFoundations, setAllFoundations] = useState<Foundation[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [addModal, setAddModal] = useState<{
    isOpen: boolean
    type: "drafts" | "active" | "completed" | "assets" | "foundations" | null
  }>({ isOpen: false, type: null })

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      if (!platformId || !user) return
      setIsLoading(true)
      try {
        const [platformData, projectsData, assetsData, foundationsData] = await Promise.all([
          getPlatform(platformId),
          getProjectsByPlatform(platformId),
          getAssetsByPlatform(platformId),
          getFoundationsByPlatform(platformId),
        ])
        setPlatform(platformData)
        setName(platformData?.name || "")
        setDescription(platformData?.description || "")
        setProjects(projectsData)
        setAssets(assetsData)
        setFoundations(foundationsData)

        // Fetch all items for the add modals
        const [allProjectsData, allAssetsData, allFoundationsData] = await Promise.all([
          getAllProjects(user.id),
          getAllAssets(user.id),
          getFoundations(user.id),
        ])
        setAllProjects(allProjectsData)
        setAllAssets(allAssetsData)
        setAllFoundations(allFoundationsData)
      } catch (error) {
        console.error("Error fetching platform data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [platformId, user])

  // Group projects by status
  const draftProjects = projects.filter((p) => p.status === "draft")
  const activeProjects = projects.filter((p) => p.status === "in_progress")
  const completedProjects = projects.filter((p) => p.status === "completed")

  // Get available items (not already in this platform)
  const availableProjects = (status: string) =>
    allProjects.filter(
      (p) => p.status === status && p.platform_id !== platformId
    )
  const availableAssets = allAssets.filter((a) => !assets.some((pa) => pa.id === a.id))
  const availableFoundations = allFoundations.filter(
    (f) => !foundations.some((pf) => pf.id === f.id)
  )

  const handleSave = async () => {
    if (!platformId) return
    setIsSaving(true)
    try {
      await updatePlatform(platformId, { name, description })
      navigate(`/platform/${platformId}`)
    } catch (error) {
      console.error("Error saving platform:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveProject = async (projectId: string) => {
    try {
      await updateProject(projectId, { platform_id: null })
      setProjects((prev) => prev.filter((p) => p.id !== projectId))
    } catch (error) {
      console.error("Error removing project:", error)
    }
  }

  const handleAddProject = async (projectId: string) => {
    try {
      await updateProject(projectId, { platform_id: platformId })
      const project = allProjects.find((p) => p.id === projectId)
      if (project && platformId) {
        setProjects((prev) => [...prev, { ...project, platform_id: platformId }])
      }
    } catch (error) {
      console.error("Error adding project:", error)
    }
  }

  const handleRemoveAsset = async (assetId: string) => {
    try {
      // Note: Assets don't have platform_id yet - this would need schema update
      // For now, just remove from local state
      setAssets((prev) => prev.filter((a) => a.id !== assetId))
    } catch (error) {
      console.error("Error removing asset:", error)
    }
  }

  const handleAddAsset = async (assetId: string) => {
    // Note: Assets don't have platform_id yet - this would need schema update
    const asset = allAssets.find((a) => a.id === assetId)
    if (asset) {
      setAssets((prev) => [...prev, asset])
    }
  }

  const handleRemoveFoundation = async (foundationId: string) => {
    try {
      // Note: Foundations don't have platform_id yet - this would need schema update
      setFoundations((prev) => prev.filter((f) => f.id !== foundationId))
    } catch (error) {
      console.error("Error removing foundation:", error)
    }
  }

  const handleAddFoundation = async (foundationId: string) => {
    // Note: Foundations don't have platform_id yet - this would need schema update
    const foundation = allFoundations.find((f) => f.id === foundationId)
    if (foundation) {
      setFoundations((prev) => [...prev, foundation])
    }
  }

  const getModalItems = () => {
    switch (addModal.type) {
      case "drafts":
        return availableProjects("draft").map((p) => ({ id: p.id, name: p.name }))
      case "active":
        return availableProjects("in_progress").map((p) => ({ id: p.id, name: p.name }))
      case "completed":
        return availableProjects("completed").map((p) => ({ id: p.id, name: p.name }))
      case "assets":
        return availableAssets.map((a) => ({ id: a.id, name: a.name, thumbnail: a.url || undefined }))
      case "foundations":
        return availableFoundations.map((f) => ({ id: f.id, name: f.name }))
      default:
        return []
    }
  }

  const handleModalAdd = (id: string) => {
    switch (addModal.type) {
      case "drafts":
      case "active":
      case "completed":
        handleAddProject(id)
        break
      case "assets":
        handleAddAsset(id)
        break
      case "foundations":
        handleAddFoundation(id)
        break
    }
  }

  if (isLoading) {
    return (
      <LibraryLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
        </div>
      </LibraryLayout>
    )
  }

  if (!platform) {
    return (
      <LibraryLayout>
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6 lg:py-8">
          <div className="flex flex-col items-center justify-center py-12 px-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
            <FolderOpen className="w-12 h-12 text-zinc-600 mb-3" />
            <p className="text-zinc-500 text-sm text-center">Platform not found</p>
          </div>
        </div>
      </LibraryLayout>
    )
  }

  return (
    <LibraryLayout>
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6 lg:py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/platform/${platformId}`)}
              className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-zinc-100">Edit Platform</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="px-4 py-2 bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save
              </>
            )}
          </button>
        </div>

        {/* Basic Info */}
        <div className="space-y-4 p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Platform Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter platform name..."
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description..."
              rows={3}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Projects Sections */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-zinc-200">Projects</h2>

          <CategorySection
            title="Drafts"
            icon={PenLine}
            iconColor="text-orange-400"
            items={draftProjects.map((p) => ({ id: p.id, name: p.name }))}
            onRemove={handleRemoveProject}
            onAdd={() => setAddModal({ isOpen: true, type: "drafts" })}
          />

          <CategorySection
            title="Active"
            icon={FolderOpen}
            iconColor="text-sky-400"
            items={activeProjects.map((p) => ({ id: p.id, name: p.name }))}
            onRemove={handleRemoveProject}
            onAdd={() => setAddModal({ isOpen: true, type: "active" })}
          />

          <CategorySection
            title="Completed"
            icon={CheckCircle2}
            iconColor="text-emerald-400"
            items={completedProjects.map((p) => ({ id: p.id, name: p.name }))}
            onRemove={handleRemoveProject}
            onAdd={() => setAddModal({ isOpen: true, type: "completed" })}
          />
        </div>

        {/* Assets Section */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-zinc-200">Assets</h2>

          <CategorySection
            title="Assets"
            icon={Box}
            iconColor="text-purple-400"
            items={assets.map((a) => ({
              id: a.id,
              name: a.name,
              thumbnail: a.url || undefined,
            }))}
            onRemove={handleRemoveAsset}
            onAdd={() => setAddModal({ isOpen: true, type: "assets" })}
          />
        </div>

        {/* Foundations Section */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-zinc-200">Foundations</h2>

          <CategorySection
            title="Foundations"
            icon={Palette}
            iconColor="text-amber-400"
            items={foundations.map((f) => ({ id: f.id, name: f.name }))}
            onRemove={handleRemoveFoundation}
            onAdd={() => setAddModal({ isOpen: true, type: "foundations" })}
          />
        </div>
      </div>

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={addModal.isOpen}
        onClose={() => setAddModal({ isOpen: false, type: null })}
        title={`Add ${addModal.type === "drafts" ? "Draft Project" : addModal.type === "active" ? "Active Project" : addModal.type === "completed" ? "Completed Project" : addModal.type === "assets" ? "Asset" : "Foundation"}`}
        items={getModalItems()}
        onAdd={handleModalAdd}
      />
    </LibraryLayout>
  )
}
