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

export function WorkspaceNav() {
  const { activeTab, setActiveTab, isSaving, saveStatus, handleSave, project } = useWorkspaceStore()

  return (
    <nav className="bg-zinc-900/80 backdrop-blur-sm border-t border-zinc-800">
      <div className="flex items-center justify-center gap-2 px-4 py-3">
        {WORKSPACE_TABS.map((tab) => {
          const Icon = iconMap[tab.icon]
          const isActive = activeTab === tab.id

          // Custom colors for specific tabs
          const getTabStyles = () => {
            if (tab.id === "editor") {
              return isActive
                ? "bg-gradient-to-br from-sky-400/20 via-sky-500/20 to-blue-600/20 text-sky-400"
                : "text-sky-500/70 hover:text-sky-400 hover:bg-sky-500/10"
            }
            if (tab.id === "export") {
              return isActive
                ? "bg-gradient-to-br from-orange-400/20 via-orange-500/20 to-amber-600/20 text-orange-400"
                : "text-orange-500/70 hover:text-orange-400 hover:bg-orange-500/10"
            }
            // Default style for other tabs
            return isActive
              ? "bg-gradient-to-br from-sky-400/20 via-sky-500/20 to-blue-600/20 text-sky-400"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all",
                getTabStyles()
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
            "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all",
            saveStatus === "saved"
              ? "bg-gradient-to-br from-green-400/20 via-green-500/20 to-emerald-600/20 text-green-400"
              : saveStatus === "saving"
              ? "bg-gradient-to-br from-green-400/20 via-green-500/20 to-emerald-600/20 text-green-400"
              : "text-green-500/70 hover:text-green-400 hover:bg-green-500/10",
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
