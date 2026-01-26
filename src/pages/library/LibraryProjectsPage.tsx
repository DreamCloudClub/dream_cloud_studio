import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Plus, ChevronDown, FolderOpen, Clock, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { LibraryLayout } from "@/components/library"
import { useAuth } from "@/contexts/AuthContext"
import { getProjects } from "@/services/projects"
import type { Project as DBProject } from "@/types/database"

interface Project {
  id: string
  name: string
  description?: string
  thumbnail?: string
  updatedAt: string
  createdAt: string
}

type SortOption = "recent" | "name" | "created"

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
}

function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <button
      onClick={onClick}
      className="group text-left bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 flex flex-col"
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
            <FolderOpen className="w-12 h-12 text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-medium text-zinc-100 truncate group-hover:text-sky-400 transition-colors">
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
    </button>
  )
}

export function LibraryProjectsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [dbProjects, setDbProjects] = useState<DBProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("recent")
  const [showSortMenu, setShowSortMenu] = useState(false)

  // Fetch projects from Supabase
  useEffect(() => {
    async function fetchProjects() {
      if (!user) return
      setIsLoading(true)
      try {
        const data = await getProjects(user.id)
        setDbProjects(data)
      } catch (error) {
        console.error("Error fetching projects:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchProjects()
  }, [user])

  // Transform DB projects to display format
  const allProjects: Project[] = dbProjects.map(p => ({
    id: p.id,
    name: p.name,
    updatedAt: formatRelativeTime(p.updated_at),
    createdAt: new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  }))

  const sortLabels: Record<SortOption, string> = {
    recent: "Recently Updated",
    name: "Name",
    created: "Date Created",
  }

  // Filter projects
  let filteredProjects = allProjects
  if (searchQuery) {
    filteredProjects = filteredProjects.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  // Sort projects
  if (sortBy === "name") {
    filteredProjects = [...filteredProjects].sort((a, b) => a.name.localeCompare(b.name))
  } else if (sortBy === "created") {
    filteredProjects = [...filteredProjects].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  const handleProjectClick = (projectId: string) => {
    navigate(`/project/${projectId}`)
  }

  const handleNewProject = () => {
    navigate("/create/project")
  }

  return (
    <LibraryLayout>
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">All Projects</h1>
            <p className="text-zinc-400 mt-1">
              {allProjects.length} projects in your library
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

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-sm text-zinc-300 hover:bg-zinc-800 transition-colors inline-flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-zinc-500" />
              {sortLabels[sortBy]}
              <ChevronDown className={cn(
                "w-4 h-4 text-zinc-500 transition-transform",
                showSortMenu && "rotate-180"
              )} />
            </button>

            {showSortMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSortMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-20 py-1">
                  {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setSortBy(option)
                        setShowSortMenu(false)
                      }}
                      className={cn(
                        "w-full px-4 py-2 text-left text-sm transition-colors",
                        sortBy === option
                          ? "bg-sky-500/20 text-sky-400"
                          : "text-zinc-300 hover:bg-zinc-700"
                      )}
                    >
                      {sortLabels[option]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Project Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 items-start">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleProjectClick(project.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <FolderOpen className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500">
              {searchQuery
                ? `No projects matching "${searchQuery}"`
                : "No projects yet"}
            </p>
            <button
              onClick={handleNewProject}
              className="mt-4 text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Create your first project
            </button>
          </div>
        )}
      </div>
    </LibraryLayout>
  )
}
