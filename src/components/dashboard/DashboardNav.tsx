import { useLocation, useNavigate } from "react-router-dom"
import { Home, FolderOpen, Video, Layers, Box, Image, Film, Volume2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAssetWizardStore } from "@/state/assetWizardStore"

type NavTab = "home" | "platforms" | "projects" | "assets" | "images" | "videos" | "audio" | "animation" | "foundations"

const NAV_TABS: { id: NavTab; label: string; icon: React.ElementType; path?: string; assetType?: string; color?: string }[] = [
  { id: "home", label: "Home", icon: Home, path: "/" },
  { id: "platforms", label: "Platforms", icon: FolderOpen, path: "/library/platforms" },
  { id: "projects", label: "Projects", icon: Video, path: "/library/projects" },
  { id: "assets", label: "Assets", icon: Layers, path: "/library/assets" },
  { id: "images", label: "Images", icon: Image, assetType: "image", color: "orange" },
  { id: "videos", label: "Videos", icon: Film, assetType: "video", color: "red" },
  { id: "audio", label: "Audio", icon: Volume2, assetType: "audio", color: "violet" },
  { id: "animation", label: "Animation", icon: Sparkles, path: "/animations", color: "emerald" },
  { id: "foundations", label: "Foundations", icon: Box, path: "/library/foundations" },
]

// Color classes for asset type tabs
const ASSET_TYPE_COLORS: Record<string, { active: string; hover: string }> = {
  orange: {
    active: "bg-gradient-to-br from-orange-400/20 via-orange-500/20 to-amber-600/20 text-orange-400",
    hover: "hover:text-orange-400",
  },
  red: {
    active: "bg-gradient-to-br from-red-400/20 via-red-500/20 to-rose-600/20 text-red-400",
    hover: "hover:text-red-400",
  },
  violet: {
    active: "bg-gradient-to-br from-violet-400/20 via-violet-500/20 to-purple-600/20 text-violet-400",
    hover: "hover:text-violet-400",
  },
  emerald: {
    active: "bg-gradient-to-br from-emerald-400/20 via-emerald-500/20 to-green-600/20 text-emerald-400",
    hover: "hover:text-emerald-400",
  },
}

export function DashboardNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { assetType } = useAssetWizardStore()

  const getActiveTab = (): NavTab => {
    if (location.pathname.startsWith("/library/platforms")) return "platforms"
    if (location.pathname.startsWith("/platform/")) return "platforms"
    if (location.pathname.startsWith("/library/projects")) return "projects"
    if (location.pathname.startsWith("/library/assets")) return "assets"
    if (location.pathname.startsWith("/library/foundations")) return "foundations"
    if (location.pathname.startsWith("/create/foundation")) return "foundations"
    if (location.pathname.startsWith("/foundation/")) return "foundations"
    // Asset creation flow - highlight the specific asset type
    if (location.pathname.startsWith("/create/image")) return "images"
    if (location.pathname.startsWith("/create/video")) return "videos"
    if (location.pathname.startsWith("/create/audio")) return "audio"
    if (location.pathname.startsWith("/animations")) return "animation"
    if (location.pathname.startsWith("/create/animation")) return "animation"
    if (location.pathname.startsWith("/create/asset")) {
      // Check wizard store for selected type first, then URL param
      if (assetType === "image") return "images"
      if (assetType === "video") return "videos"
      if (assetType === "audio") return "audio"
      if (assetType === "animation") return "animation"
      // Fallback to URL param
      const params = new URLSearchParams(location.search)
      const type = params.get("type")
      if (type === "image") return "images"
      if (type === "video") return "videos"
      if (type === "audio") return "audio"
      if (type === "animation") return "animation"
      return "assets"
    }
    return "home"
  }

  const activeTab = getActiveTab()

  const handleTabClick = (tab: typeof NAV_TABS[0]) => {
    if (tab.assetType) {
      // Asset type shortcut - pass type via URL param to skip to prompt type selection
      navigate(`/create/asset?type=${tab.assetType}`)
    } else if (tab.path) {
      navigate(tab.path)
    }
  }

  return (
    <nav className="bg-zinc-900/80 backdrop-blur-sm border-t border-zinc-800">
      <div className="flex items-center justify-center gap-1 px-2 py-3">
        {NAV_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const colorConfig = tab.color ? ASSET_TYPE_COLORS[tab.color] : null

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
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
      </div>
    </nav>
  )
}
