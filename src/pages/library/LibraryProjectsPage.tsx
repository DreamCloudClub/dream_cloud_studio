import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Plus, FolderOpen, Clock, PenLine, CheckCircle2, Trash2, AlertTriangle, Filter, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { LibraryLayout } from "@/components/library"
import { useAuth } from "@/contexts/AuthContext"
import { useProjectWizardStore } from "@/state/projectWizardStore"
import { getCompletedProjects, getDraftProjects, deleteProject } from "@/services/projects"
import type { Project as DBProject } from "@/types/database"

interface Project {
  id: string
  name: string
  description?: string
  thumbnail?: string
  updatedAt: string
  createdAt: string
  status: string
}

type StatusFilter = "all" | "draft" | "in_progress" | "completed"

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

interface ProjectCardProps {
  project: Project
  onClick: () => void
  onDelete: () => void
}

function ProjectCard({ project, onClick, onDelete }: ProjectCardProps) {
  const isDraft = project.status === "draft"

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "group text-left bg-zinc-900 rounded-xl overflow-hidden transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 flex flex-col cursor-pointer relative",
        isDraft
          ? "border-2 border-dashed border-orange-500/50 hover:border-orange-400/70"
          : "border border-zinc-800 hover:border-zinc-700"
      )}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-zinc-800 relative flex-shrink-0">
        {project.thumbnail ? (
          <img
            src={project.thumbnail}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {isDraft ? (
              <PenLine className="w-10 h-10 text-orange-500/70" />
            ) : (
              <FolderOpen className="w-12 h-12 text-zinc-700" />
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        {isDraft && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-orange-500/90 text-white text-[10px] font-medium rounded">
            Draft
          </div>
        )}
        {/* Delete button - shows on hover */}
        <button
          onClick={handleDelete}
          className="absolute top-2 left-2 p-1.5 bg-zinc-900/80 hover:bg-red-500 text-zinc-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
          title="Delete project"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className={cn(
          "font-medium truncate transition-colors",
          isDraft
            ? "text-orange-200 group-hover:text-orange-300"
            : "text-zinc-100 group-hover:text-sky-400"
        )}>
          {project.name}
        </h3>
        {project.description && (
          <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
            {project.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-3 text-xs text-zinc-500">
          <Clock className="w-3 h-3" />
          <span>{project.updatedAt}</span>
        </div>
      </div>
    </div>
  )
}

export function LibraryProjectsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const resetWizard = useProjectWizardStore((state) => state.resetWizard)
  const [completedProjects, setCompletedProjects] = useState<DBProject[]>([])
  const [draftProjects, setDraftProjects] = useState<DBProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [expandedSections, setExpandedSections] = useState({
    drafts: true,
    active: true,
    completed: true,
  })

  const toggleSection = (section: "drafts" | "active" | "completed") => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; project: Project | null }>({
    isOpen: false,
    project: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch projects from Supabase
  useEffect(() => {
    async function fetchProjects() {
      if (!user) return
      setIsLoading(true)
      try {
        const [completed, drafts] = await Promise.all([
          getCompletedProjects(user.id),
          getDraftProjects(user.id),
        ])
        setCompletedProjects(completed)
        setDraftProjects(drafts)
      } catch (error) {
        console.error("Error fetching projects:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchProjects()
  }, [user])

  // Transform DB projects to display format
  const transformProject = (p: DBProject): Project => ({
    id: p.id,
    name: p.name,
    updatedAt: formatRelativeTime(p.updated_at),
    createdAt: new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    status: p.status,
  })

  // Combine all projects (already sorted by updated_at from DB)
  const allProjects: Project[] = [
    ...draftProjects.map(transformProject),
    ...completedProjects.map(transformProject),
  ]

  const statusLabels: Record<StatusFilter, string> = {
    all: "All",
    draft: "Drafts",
    in_progress: "Active",
    completed: "Completed",
  }

  // Filter projects
  let filteredProjects = allProjects
  if (searchQuery) {
    filteredProjects = filteredProjects.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  // Filter by status
  if (statusFilter !== "all") {
    filteredProjects = filteredProjects.filter((p) => p.status === statusFilter)
  }

  const handleProjectClick = (project: Project) => {
    if (project.status === "draft") {
      // Drafts open in wizard to continue setup
      navigate(`/create/project?draft=${project.id}`)
    } else {
      // Completed projects open in workspace
      navigate(`/project/${project.id}`)
    }
  }

  const handleNewProject = () => {
    resetWizard()
    navigate("/create/project")
  }

  const handleDeleteClick = (project: Project) => {
    setDeleteModal({ isOpen: true, project })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal.project) return

    setIsDeleting(true)
    try {
      await deleteProject(deleteModal.project.id)
      // Remove from local state
      setCompletedProjects(prev => prev.filter(p => p.id !== deleteModal.project!.id))
      setDraftProjects(prev => prev.filter(p => p.id !== deleteModal.project!.id))
      setDeleteModal({ isOpen: false, project: null })
    } catch (error) {
      console.error("Error deleting project:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, project: null })
  }

  return (
    <LibraryLayout>
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6 lg:py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">All Projects</h1>
            <p className="text-zinc-400 mt-1">
              {completedProjects.length} project{completedProjects.length !== 1 ? "s" : ""}
              {draftProjects.length > 0 && ` · ${draftProjects.length} draft${draftProjects.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={handleNewProject}
            className="px-4 py-2 bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Status filter toggle */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <div className="flex items-center bg-zinc-800/50 rounded-xl p-1">
              {(Object.keys(statusLabels) as StatusFilter[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    statusFilter === status
                      ? "bg-sky-500 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Drafts Section - only show when filter is "all" or "draft" */}
        {(statusFilter === "all" || statusFilter === "draft") &&
          filteredProjects.filter(p => p.status === "draft").length > 0 && (
          <div className="space-y-3">
            {statusFilter === "all" ? (
              <button
                onClick={() => toggleSection("drafts")}
                className="flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors"
              >
                {expandedSections.drafts ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <PenLine className="w-4 h-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">
                  Continue Setup
                </span>
                <span className="text-xs text-zinc-500">
                  ({filteredProjects.filter(p => p.status === "draft").length})
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-orange-400">
                <PenLine className="w-4 h-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">
                  Continue Setup
                </span>
                <span className="text-xs text-zinc-500">
                  ({filteredProjects.filter(p => p.status === "draft").length})
                </span>
              </div>
            )}
            {(statusFilter !== "all" || expandedSections.drafts) && (
              <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 items-start", statusFilter === "all" && "ml-6")}>
                {filteredProjects
                  .filter(p => p.status === "draft")
                  .map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onClick={() => handleProjectClick(project)}
                      onDelete={() => handleDeleteClick(project)}
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Active Projects Section - only show when filter is "all" or "in_progress" */}
        {(statusFilter === "all" || statusFilter === "in_progress") &&
          filteredProjects.filter(p => p.status === "in_progress").length > 0 && (
          <div className="space-y-3">
            {statusFilter === "all" ? (
              <button
                onClick={() => toggleSection("active")}
                className="flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors"
              >
                {expandedSections.active ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <FolderOpen className="w-4 h-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">
                  Active Projects
                </span>
                <span className="text-xs text-zinc-500">
                  ({filteredProjects.filter(p => p.status === "in_progress").length})
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-sky-400">
                <FolderOpen className="w-4 h-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">
                  Active Projects
                </span>
                <span className="text-xs text-zinc-500">
                  ({filteredProjects.filter(p => p.status === "in_progress").length})
                </span>
              </div>
            )}
            {(statusFilter !== "all" || expandedSections.active) && (
              <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 items-start", statusFilter === "all" && "ml-6")}>
                {filteredProjects
                  .filter(p => p.status === "in_progress")
                  .map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onClick={() => handleProjectClick(project)}
                      onDelete={() => handleDeleteClick(project)}
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Completed Projects Section - only show when filter is "all" or "completed" AND there are completed projects */}
        {(statusFilter === "all" || statusFilter === "completed") &&
          filteredProjects.filter(p => p.status === "completed").length > 0 && (
          <div className="space-y-3">
            {statusFilter === "all" ? (
              <button
                onClick={() => toggleSection("completed")}
                className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {expandedSections.completed ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">
                  Completed
                </span>
                <span className="text-xs text-zinc-500">
                  ({filteredProjects.filter(p => p.status === "completed").length})
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">
                  Completed
                </span>
                <span className="text-xs text-zinc-500">
                  ({filteredProjects.filter(p => p.status === "completed").length})
                </span>
              </div>
            )}
            {(statusFilter !== "all" || expandedSections.completed) && (
              <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 items-start", statusFilter === "all" && "ml-6")}>
                {filteredProjects
                  .filter(p => p.status === "completed")
                  .map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onClick={() => handleProjectClick(project)}
                      onDelete={() => handleDeleteClick(project)}
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State - only show if no projects match current filter */}
        {filteredProjects.length === 0 && (
          <div className="text-center py-16">
            <FolderOpen className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500">
              {searchQuery
                ? `No projects matching "${searchQuery}"`
                : `No ${statusFilter === "all" ? "" : statusLabels[statusFilter].toLowerCase() + " "}projects`}
            </p>
          </div>
        )}
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
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-zinc-100">
                  Delete Project
                </h3>
                <p className="text-sm text-zinc-400 mt-1">
                  Are you sure you want to delete <span className="text-zinc-200 font-medium">"{deleteModal.project?.name}"</span>? This action cannot be undone.
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
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
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
    </LibraryLayout>
  )
}
