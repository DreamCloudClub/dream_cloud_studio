import { useLocation, useNavigate } from "react-router-dom"
import { Home, Video, Layers, Box } from "lucide-react"
import { cn } from "@/lib/utils"

type NavTab = "home" | "projects" | "assets" | "foundations"

const NAV_TABS: { id: NavTab; label: string; icon: React.ElementType; path: string }[] = [
  { id: "home", label: "Home", icon: Home, path: "/" },
  { id: "projects", label: "Projects", icon: Video, path: "/library/projects" },
  { id: "assets", label: "Assets", icon: Layers, path: "/library/assets" },
  { id: "foundations", label: "Foundations", icon: Box, path: "/library/foundations" },
]

export function DashboardNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const getActiveTab = (): NavTab => {
    if (location.pathname.startsWith("/library/projects")) return "projects"
    if (location.pathname.startsWith("/library/assets")) return "assets"
    if (location.pathname.startsWith("/library/foundations")) return "foundations"
    return "home"
  }

  const activeTab = getActiveTab()

  return (
    <nav className="bg-zinc-900/80 backdrop-blur-sm border-t border-zinc-800">
      <div className="flex items-center justify-center gap-2 px-4 py-3">
        {NAV_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
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
