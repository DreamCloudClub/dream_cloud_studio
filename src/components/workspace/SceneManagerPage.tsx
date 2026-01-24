import { useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Edit3,
  Trash2,
  Save,
  RotateCcw,
  Mountain,
  Square,
  User,
  Cloud,
  Box,
  Sparkles,
  Volume2,
  Clock,
  GripVertical,
  Play,
  Wand2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useWorkspaceStore,
  Scene,
  Shot,
  ProjectAsset,
  AssetCategory,
  ASSET_CATEGORIES,
} from "@/state/workspaceStore"

const iconMap: Record<string, React.ElementType> = {
  Mountain,
  Square,
  User,
  Cloud,
  Box,
  Sparkles,
  Volume2,
}

interface AssetSlotProps {
  category: { id: AssetCategory; label: string; icon: string }
  asset?: ProjectAsset
  assets?: ProjectAsset[]
  onEdit: () => void
}

function AssetSlot({ category, asset, assets, onEdit }: AssetSlotProps) {
  const Icon = iconMap[category.icon]
  const isMultiple = category.id === "character" || category.id === "prop" || category.id === "effect"
  const hasAssets = isMultiple ? (assets && assets.length > 0) : !!asset

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/30 border border-zinc-700/50">
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center",
        hasAssets ? "bg-sky-500/20 text-sky-400" : "bg-zinc-700/50 text-zinc-500"
      )}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-500">{category.label}</p>
        {isMultiple ? (
          <p className="text-sm text-zinc-300 truncate">
            {assets && assets.length > 0
              ? `${assets.length} ${category.label.toLowerCase()}`
              : "None"}
          </p>
        ) : (
          <p className="text-sm text-zinc-300 truncate">
            {asset?.name || "None"}
          </p>
        )}
      </div>
      <button
        onClick={onEdit}
        className="w-7 h-7 rounded-md bg-zinc-700/50 hover:bg-zinc-600 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <Edit3 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

interface ShotCardProps {
  shot: Shot
  sceneId: string
  isExpanded: boolean
  onToggle: () => void
}

function ShotCard({ shot, sceneId, isExpanded, onToggle }: ShotCardProps) {
  const { updateShot, removeShot, project } = useWorkspaceStore()
  const [notes, setNotes] = useState(shot.notes)
  const [hasChanges, setHasChanges] = useState(false)

  const handleNotesChange = (value: string) => {
    setNotes(value)
    setHasChanges(value !== shot.notes)
  }

  const handleSave = () => {
    updateShot(sceneId, shot.id, { notes })
    setHasChanges(false)
  }

  const handleReset = () => {
    setNotes(shot.notes)
    setHasChanges(false)
  }

  // Get asset categories for this shot
  const assetCategories = ASSET_CATEGORIES.filter(c => c.id !== "audio")

  return (
    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl overflow-hidden">
      {/* Shot Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="w-6 h-6 rounded-md bg-orange-500/20 flex items-center justify-center">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-orange-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-orange-400" />
          )}
        </div>
        <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab" />
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-zinc-200">{shot.name}</p>
          <p className="text-xs text-zinc-500 truncate">{shot.description}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Clock className="w-3 h-3" />
          {shot.duration}s
        </div>
        {shot.media && (
          <div className="w-10 h-10 rounded-lg bg-zinc-700 overflow-hidden">
            {shot.media.type === "video" ? (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                <Play className="w-4 h-4 text-zinc-500" />
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800" />
            )}
          </div>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 border-t border-zinc-700/50 space-y-4">
          {/* Description */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Description</label>
            <input
              type="text"
              value={shot.description}
              onChange={(e) => updateShot(sceneId, shot.id, { description: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Duration */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs text-zinc-500 mb-1">Duration (seconds)</label>
              <input
                type="number"
                value={shot.duration}
                min={1}
                max={60}
                onChange={(e) => updateShot(sceneId, shot.id, { duration: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-zinc-500 mb-1">Shot Type</label>
              <input
                type="text"
                value={shot.shotType}
                onChange={(e) => updateShot(sceneId, shot.id, { shotType: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-sky-500"
                placeholder="Wide, Close-up, etc."
              />
            </div>
          </div>

          {/* Assets Grid */}
          <div>
            <label className="block text-xs text-zinc-500 mb-2">Assets</label>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {assetCategories.map((category) => {
                const isMultiple = category.id === "character" || category.id === "prop" || category.id === "effect"
                return (
                  <AssetSlot
                    key={category.id}
                    category={category}
                    asset={isMultiple ? undefined : shot.assets[category.id as keyof typeof shot.assets] as ProjectAsset | undefined}
                    assets={isMultiple ? shot.assets[category.id === "character" ? "characters" : category.id === "prop" ? "props" : "effects"] as ProjectAsset[] : undefined}
                    onEdit={() => {/* TODO: Open asset picker */}}
                  />
                )
              })}
            </div>
          </div>

          {/* Notes for Regeneration */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Notes for Regeneration
            </label>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-sky-500 resize-none"
              placeholder="Add notes about changes you want... e.g., 'Change shirt color to blue'"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => removeShot(sceneId, shot.id)}
              className="text-xs text-red-400 hover:text-red-300 inline-flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Delete Shot
            </button>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <>
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-xs rounded-lg inline-flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" />
                    Save
                  </button>
                </>
              )}
              <button className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:brightness-110 text-white text-xs rounded-lg inline-flex items-center gap-1">
                <Wand2 className="w-3 h-3" />
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface SceneSectionProps {
  scene: Scene
}

function SceneSection({ scene }: SceneSectionProps) {
  const { expandedSceneIds, toggleSceneExpanded, removeScene } = useWorkspaceStore()
  const [expandedShots, setExpandedShots] = useState<string[]>([])

  const isExpanded = expandedSceneIds.includes(scene.id)

  const toggleShot = (shotId: string) => {
    if (expandedShots.includes(shotId)) {
      setExpandedShots(expandedShots.filter((id) => id !== shotId))
    } else {
      setExpandedShots([...expandedShots, shotId])
    }
  }

  const sceneDuration = scene.shots.reduce((acc, s) => acc + s.duration, 0)

  return (
    <div className="border border-sky-500/30 rounded-2xl overflow-hidden">
      {/* Scene Header */}
      <button
        onClick={() => toggleSceneExpanded(scene.id)}
        className="w-full flex items-center gap-3 p-4 bg-sky-500/5 hover:bg-sky-500/10 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-sky-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-sky-400" />
          )}
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-base font-semibold text-zinc-100">{scene.name}</h3>
          <p className="text-sm text-zinc-500">{scene.description}</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <span>{scene.shots.length} shots</span>
          <span>{sceneDuration}s</span>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-3 bg-zinc-900/50">
          {/* Voiceover Section */}
          {scene.voiceover && (
            <div className="p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                <Volume2 className="w-4 h-4 text-sky-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-zinc-500 mb-1">Scene Voiceover</p>
                <p className="text-sm text-zinc-300 italic">
                  "{scene.voiceover.script}"
                </p>
              </div>
              {scene.voiceover.duration && (
                <span className="text-xs text-zinc-500">
                  {scene.voiceover.duration}s
                </span>
              )}
            </div>
          )}

          {/* Shots List */}
          <div className="space-y-2">
            {scene.shots
              .sort((a, b) => a.order - b.order)
              .map((shot) => (
                <ShotCard
                  key={shot.id}
                  shot={shot}
                  sceneId={scene.id}
                  isExpanded={expandedShots.includes(shot.id)}
                  onToggle={() => toggleShot(shot.id)}
                />
              ))}
          </div>

          {/* Add Shot Button */}
          <button className="w-full py-3 border-2 border-dashed border-orange-500/30 hover:border-orange-500/60 rounded-xl flex items-center justify-center gap-2 text-orange-500/60 hover:text-orange-400 transition-colors">
            <Plus className="w-4 h-4" />
            <span className="text-sm">Add Shot</span>
          </button>

          {/* Scene Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => removeScene(scene.id)}
              className="text-xs text-red-400 hover:text-red-300 inline-flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Delete Scene
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function SceneManagerPage() {
  const { project, addScene } = useWorkspaceStore()

  if (!project) return null

  const { scenes } = project

  const handleAddScene = () => {
    const newScene: Scene = {
      id: crypto.randomUUID(),
      name: `Scene ${scenes.length + 1}`,
      description: "New scene",
      order: scenes.length,
      shots: [],
    }
    addScene(newScene)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Scene Manager</h1>
            <p className="text-zinc-400 mt-1">
              {scenes.length} scenes • {scenes.reduce((acc, s) => acc + s.shots.length, 0)} total shots
            </p>
          </div>
          <button
            onClick={handleAddScene}
            className="px-4 py-2 bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Scene
          </button>
        </div>

        {/* Scenes List */}
        <div className="space-y-4">
          {scenes
            .sort((a, b) => a.order - b.order)
            .map((scene) => (
              <SceneSection key={scene.id} scene={scene} />
            ))}
        </div>

        {scenes.length === 0 && (
          <div className="text-center py-16">
            <p className="text-zinc-500 mb-4">No scenes yet. Add your first scene to get started.</p>
            <button
              onClick={handleAddScene}
              className="px-6 py-3 bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create First Scene
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
