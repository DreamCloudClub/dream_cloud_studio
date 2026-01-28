import { ChevronRight, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkspaceStore, Shot, WorkspaceTab } from "@/state/workspaceStore"
import type { PanDirection } from "@/remotion/components"

// Library page types for non-workspace contexts
export type LibraryPageType = "dashboard" | "platforms" | "projects" | "assets" | "foundations"

// Available pan direction options for images
const PAN_OPTIONS: { value: PanDirection; label: string; description: string }[] = [
  { value: "none", label: "None", description: "Static center crop" },
  { value: "zoom-in", label: "Zoom In", description: "Push into center" },
  { value: "zoom-out", label: "Zoom Out", description: "Pull back from center" },
  { value: "left-to-right", label: "Pan Right", description: "Move left to right" },
  { value: "right-to-left", label: "Pan Left", description: "Move right to left" },
  { value: "top-to-bottom", label: "Pan Down", description: "Move top to bottom" },
  { value: "bottom-to-top", label: "Pan Up", description: "Move bottom to top" },
  { value: "top-left-to-bottom-right", label: "Diagonal ↘", description: "Top-left to bottom-right" },
  { value: "bottom-right-to-top-left", label: "Diagonal ↖", description: "Bottom-right to top-left" },
]

// Shot Inspector Content - always visible on Editor tab
function ShotInspectorContent() {
  const { project, selectedShotId, updateShot } = useWorkspaceStore()

  // Find the selected shot
  let selectedShot: Shot | null = null
  let selectedSceneId: string | null = null
  if (project && selectedShotId) {
    for (const scene of project.scenes) {
      const shot = scene.shots.find(s => s.id === selectedShotId)
      if (shot) {
        selectedShot = shot
        selectedSceneId = scene.id
        break
      }
    }
  }

  // Check asset types if shot is selected
  const hasImageAsset = selectedShot && (
    selectedShot.imageAsset
    || selectedShot.media?.type === "image"
    || selectedShot.assets?.scene?.type === "image"
  )
  const hasVideoAsset = selectedShot && (
    selectedShot.videoAsset
    || selectedShot.media?.type === "video"
    || selectedShot.assets?.scene?.type === "video"
  )

  const handlePanChange = (pan: PanDirection) => {
    if (selectedSceneId && selectedShotId) {
      updateShot(selectedSceneId, selectedShotId, { pan })
    }
  }

  const handleScaleChange = (scale: number) => {
    if (selectedSceneId && selectedShotId) {
      updateShot(selectedSceneId, selectedShotId, { scale })
    }
  }

  const handlePositionXChange = (positionX: number) => {
    if (selectedSceneId && selectedShotId) {
      updateShot(selectedSceneId, selectedShotId, { positionX })
    }
  }

  const handlePositionYChange = (positionY: number) => {
    if (selectedSceneId && selectedShotId) {
      updateShot(selectedSceneId, selectedShotId, { positionY })
    }
  }

  const handleReset = () => {
    if (selectedSceneId && selectedShotId) {
      updateShot(selectedSceneId, selectedShotId, { scale: 1, positionX: 0, positionY: 0 })
    }
  }

  // Current values (from selected shot or defaults)
  const currentScale = selectedShot?.scale || 1
  const currentPositionX = selectedShot?.positionX || 0
  const currentPositionY = selectedShot?.positionY || 0
  const currentPan = selectedShot?.pan || "zoom-in"

  const isDisabled = !selectedShot

  return (
    <div className="space-y-6">
      {/* Header - shows which shot is targeted */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-100 mb-1">Shot Properties</h3>
        <p className="text-xs text-zinc-500">
          {selectedShot ? selectedShot.name : "Select a shot to edit"}
        </p>
      </div>

      {/* Scale/Position controls (for video or general use) */}
      <div className={cn("space-y-5", isDisabled && "opacity-50")}>
        {/* Scale slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-zinc-400">Scale / Zoom</label>
            <span className="text-xs text-sky-400 font-mono">{Math.round(currentScale * 100)}%</span>
          </div>
          <input
            type="range"
            min="50"
            max="200"
            value={currentScale * 100}
            onChange={(e) => handleScaleChange(Number(e.target.value) / 100)}
            disabled={isDisabled}
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-500 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-xs text-zinc-600 mt-1">
            <span>50%</span>
            <span>200%</span>
          </div>
        </div>

        {/* Horizontal Position */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-zinc-400">Horizontal</label>
            <span className="text-xs text-sky-400 font-mono">{currentPositionX}%</span>
          </div>
          <input
            type="range"
            min="-50"
            max="50"
            value={currentPositionX}
            onChange={(e) => handlePositionXChange(Number(e.target.value))}
            disabled={isDisabled}
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-500 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-xs text-zinc-600 mt-1">
            <span>Left</span>
            <span>Right</span>
          </div>
        </div>

        {/* Vertical Position */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-zinc-400">Vertical</label>
            <span className="text-xs text-sky-400 font-mono">{currentPositionY}%</span>
          </div>
          <input
            type="range"
            min="-50"
            max="50"
            value={currentPositionY}
            onChange={(e) => handlePositionYChange(Number(e.target.value))}
            disabled={isDisabled}
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-500 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-xs text-zinc-600 mt-1">
            <span>Up</span>
            <span>Down</span>
          </div>
        </div>

        {/* Reset button */}
        <button
          onClick={handleReset}
          disabled={isDisabled}
          className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:cursor-not-allowed disabled:hover:text-zinc-500 disabled:hover:bg-zinc-800"
        >
          Reset to default
        </button>
      </div>

      {/* Pan controls for images */}
      <div className={cn("space-y-4", (isDisabled || hasVideoAsset) && "opacity-50")}>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-3">Pan / Zoom Effect</label>
          <div className="grid grid-cols-2 gap-2">
            {PAN_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handlePanChange(option.value)}
                disabled={isDisabled || !!hasVideoAsset}
                className={cn(
                  "px-3 py-2 text-xs rounded-lg border transition-all text-left disabled:cursor-not-allowed",
                  currentPan === option.value
                    ? "bg-sky-500/20 border-sky-500 text-sky-400"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600 disabled:hover:border-zinc-700"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-zinc-600">
          {hasVideoAsset ? "Pan effects are for images only" : PAN_OPTIONS.find(o => o.value === currentPan)?.description}
        </p>
      </div>
    </div>
  )
}

// Generic placeholder for tabs without specific settings yet
function TabPlaceholder({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-zinc-600" />
      </div>
      <p className="text-sm text-zinc-400 mb-1">{title}</p>
      <p className="text-xs text-zinc-600">{description}</p>
    </div>
  )
}

// Tab-specific settings configurations for workspace
const TAB_CONFIG: Record<WorkspaceTab, { title: string; subtitle: string; icon: React.ElementType }> = {
  platform: { title: "Control Panel", subtitle: "System Properties", icon: Settings },
  brief: { title: "Control Panel", subtitle: "System Properties", icon: Settings },
  script: { title: "Control Panel", subtitle: "System Properties", icon: Settings },
  moodboard: { title: "Control Panel", subtitle: "System Properties", icon: Settings },
  storyboard: { title: "Control Panel", subtitle: "System Properties", icon: Settings },
  editor: { title: "Control Panel", subtitle: "System Properties", icon: Settings },
  scenes: { title: "Control Panel", subtitle: "System Properties", icon: Settings },
  assets: { title: "Control Panel", subtitle: "System Properties", icon: Settings },
  export: { title: "Control Panel", subtitle: "System Properties", icon: Settings },
}

// Library page configurations for non-workspace contexts
const LIBRARY_CONFIG: Record<LibraryPageType, { title: string; subtitle: string; icon: React.ElementType }> = {
  dashboard: { title: "Control Panel", subtitle: "System Properties", icon: Settings },
  platforms: { title: "Control Panel", subtitle: "System Properties", icon: Settings },
  projects: { title: "Control Panel", subtitle: "System Properties", icon: Settings },
  assets: { title: "Control Panel", subtitle: "System Properties", icon: Settings },
  foundations: { title: "Control Panel", subtitle: "System Properties", icon: Settings },
}

// Library page placeholder content
function LibraryPlaceholder({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-zinc-600" />
      </div>
      <p className="text-sm text-zinc-400 mb-1">{title}</p>
      <p className="text-xs text-zinc-600">{description}</p>
    </div>
  )
}

interface InspectorPanelProps {
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  // Optional: for library pages (non-workspace context)
  libraryPage?: LibraryPageType
}

export function InspectorPanel({ isCollapsed = false, onToggleCollapse, libraryPage }: InspectorPanelProps) {
  const { activeTab, selectedShotId } = useWorkspaceStore()

  // Determine which config to use
  const isLibraryMode = !!libraryPage
  const tabConfig = isLibraryMode
    ? LIBRARY_CONFIG[libraryPage!] || LIBRARY_CONFIG.dashboard
    : TAB_CONFIG[activeTab] || TAB_CONFIG.editor
  const TabIcon = tabConfig.icon

  // Render content for library pages
  const renderLibraryContent = () => {
    return <LibraryPlaceholder icon={Settings} title="Control Panel" description="System Properties" />
  }

  // Render content based on active tab (workspace mode)
  const renderContent = () => {
    // If in library mode, use library content
    if (isLibraryMode) {
      return renderLibraryContent()
    }

    // Editor always shows shot tools
    if (activeTab === "editor") {
      return <ShotInspectorContent />
    }

    // All other tabs show the same placeholder
    return <TabPlaceholder icon={Settings} title="Control Panel" description="System Properties" />
  }

  // Always render full width (w-80) - parent container handles clipping during animation
  // ml-auto keeps content anchored to the right edge
  return (
    <div className="w-80 h-full bg-zinc-900 border-l border-zinc-800 flex flex-col ml-auto">
      {/* Panel Header */}
      <div className={`border-b border-zinc-800 ${isCollapsed ? 'py-4 flex justify-center' : 'p-4'}`}>
        {isCollapsed ? (
          // Collapsed: just the gear button, clickable to expand
          <button
            onClick={onToggleCollapse}
            className="w-11 h-11 rounded-lg bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all hover:scale-105"
            title="Open Control Panel"
          >
            <Settings className="w-5 h-5 text-white" />
          </button>
        ) : (
          // Expanded: full header with arrow, text, and gear
          <div className="flex items-center justify-between">
            {/* Collapse arrow - inner edge (left) */}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Collapse panel"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Text (left-aligned) */}
            <div className="flex-1 ml-3">
              <h3 className="text-sm font-semibold text-zinc-100">Control Panel</h3>
              <p className="text-xs text-zinc-500">{tabConfig.subtitle}</p>
            </div>

            {/* Gear - outer edge (right) */}
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <TabIcon className="w-5 h-5 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Panel Content - hidden when collapsed */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {renderContent()}
        </div>
      )}
    </div>
  )
}
