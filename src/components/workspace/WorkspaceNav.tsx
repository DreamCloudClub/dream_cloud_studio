import { useNavigate, useLocation } from "react-router-dom"
import {
  FileText,
  ScrollText,
  Image,
  BookOpen,
  Film,
  Layers,
  Palette,
  Download,
  FolderOpen,
  Save,
  Loader2,
  Check,
  Home,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { WORKSPACE_TABS, useWorkspaceStore } from "@/state/workspaceStore"

const iconMap: Record<string, React.ElementType> = {
  FileText,
  ScrollText,
  Image,
  BookOpen,
  Film,
  Layers,
  Palette,
  Download,
  FolderOpen,
}

interface WorkspaceNavProps {
  activeTabOverride?: string
  projectId?: string
}

// Color config for specific tabs
const TAB_COLORS: Record<string, { active: string; hover: string }> = {
  editor: {
    active: "bg-gradient-to-br from-red-400/20 via-red-500/20 to-rose-600/20 text-red-400",
    hover: "hover:text-red-400",
  },
  storyboard: {
    active: "bg-gradient-to-br from-violet-400/20 via-violet-500/20 to-purple-600/20 text-violet-400",
    hover: "hover:text-violet-400",
  },
  export: {
    active: "bg-gradient-to-br from-orange-400/20 via-orange-500/20 to-amber-600/20 text-orange-400",
    hover: "hover:text-orange-400",
  },
}

export function WorkspaceNav({ activeTabOverride, projectId }: WorkspaceNavProps = {}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { activeTab: storeActiveTab, setActiveTab, isSaving, saveStatus, handleSave, project } = useWorkspaceStore()
  const activeTab = activeTabOverride || storeActiveTab

  // Determine if we're inside the workspace or on a different page
  const isInWorkspace = location.pathname.startsWith("/project/")
  const effectiveProjectId = projectId || project?.id

  const handleTabClick = (tabId: string) => {
    if (isInWorkspace) {
      // Inside workspace - just switch tabs
      setActiveTab(tabId)
    } else if (effectiveProjectId) {
      // Outside workspace - navigate back to workspace with tab
      navigate(`/project/${effectiveProjectId}?tab=${tabId}`)
    }
  }

  const handleHomeClick = () => {
    navigate("/")
  }

  return (
    <nav className="bg-zinc-900/80 backdrop-blur-sm border-t border-zinc-800">
      <div className="flex items-center justify-center gap-1 px-4 py-3">
        {/* Home button */}
        <button
          onClick={handleHomeClick}
          className="w-[80px] flex flex-col items-center gap-1 py-2 rounded-xl transition-all text-zinc-500 hover:bg-zinc-800/50 hover:text-sky-400"
        >
          <Home className="w-5 h-5" />
          <span className="text-xs font-medium">Home</span>
        </button>

        {WORKSPACE_TABS.map((tab) => {
          const Icon = iconMap[tab.icon]
          const isActive = activeTab === tab.id
          const colorConfig = TAB_COLORS[tab.id]

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "w-[80px] flex flex-col items-center gap-1 py-2 rounded-xl transition-all",
                isActive
                  ? colorConfig?.active || "bg-gradient-to-br from-sky-400/20 via-sky-500/20 to-blue-600/20 text-sky-400"
                  : cn("text-zinc-500 hover:bg-zinc-800/50", colorConfig?.hover || "hover:text-sky-400")
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-transform",
                  isActive && "scale-110"
                )}
              />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          )
        })}

        {/* Save button - Green */}
        <button
          onClick={handleSave}
          disabled={isSaving || !project}
          className={cn(
            "w-[80px] flex flex-col items-center gap-1 py-2 rounded-xl transition-all",
            saveStatus === "saved" || saveStatus === "saving"
              ? "bg-gradient-to-br from-green-400/20 via-green-500/20 to-emerald-600/20 text-green-400"
              : "text-zinc-500 hover:bg-zinc-800/50 hover:text-green-400",
            (isSaving || !project) && "opacity-50 cursor-not-allowed"
          )}
        >
          {saveStatus === "saving" ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : saveStatus === "saved" ? (
            <Check className="w-5 h-5" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          <span className="text-xs font-medium">
            {saveStatus === "saving" ? "Saving" : saveStatus === "saved" ? "Saved" : "Save"}
          </span>
        </button>
      </div>
    </nav>
  )
}
