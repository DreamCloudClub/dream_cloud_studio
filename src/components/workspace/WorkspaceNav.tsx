import {
  FileText,
  Image,
  BookOpen,
  Film,
  Layers,
  FolderOpen,
  Download,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { WorkspaceTab, WORKSPACE_TABS, useWorkspaceStore } from "@/state/workspaceStore"

const iconMap: Record<string, React.ElementType> = {
  FileText,
  Image,
  BookOpen,
  Film,
  Layers,
  FolderOpen,
  Download,
}

export function WorkspaceNav() {
  const { activeTab, setActiveTab } = useWorkspaceStore()

  return (
    <nav className="bg-zinc-900/80 backdrop-blur-sm border-t border-zinc-800">
      <div className="flex items-center justify-center gap-2 px-4 py-3">
        {WORKSPACE_TABS.map((tab) => {
          const Icon = iconMap[tab.icon]
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all",
                isActive
                  ? "bg-gradient-to-br from-sky-400/20 via-sky-500/20 to-blue-600/20 text-sky-400"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
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
      </div>
    </nav>
  )
}
