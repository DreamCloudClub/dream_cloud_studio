import { useState, useEffect, useRef, useCallback } from "react"
import {
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Settings,
  SlidersHorizontal,
  StickyNote,
  Layers,
  Play,
  GripVertical,
  Trash2,
  Plus,
  Film,
  Image,
  Music,
  ScrollText,
  FileText,
  Palette,
  BookOpen,
  Download,
  FolderOpen,
  Loader2,
  Pencil,
  Save,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useWorkspaceStore,
  WorkspaceTab,
  ProjectAsset,
  getClipsWithAssets,
} from "@/state/workspaceStore"
import { useLibraryStore, type LibraryAsset } from "@/state/libraryStore"
import { useUIStore } from "@/state/uiStore"
import { useAuth } from "@/contexts/AuthContext"
import { getAssetDisplayUrl } from "@/services/localStorage"
import type { PanDirection } from "@/remotion/components"

// Library page types for non-workspace contexts
export type LibraryPageType = "dashboard" | "platforms" | "projects" | "assets" | "foundations"

// Control Panel tab types - just Notes and Assets now
type ControlPanelTab = "notes" | "assets"

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

// ============================================
// CLIP PROPERTIES - For Editor tab
// ============================================

function ClipPropertiesContent() {
  const { project, selectedClipId, trimClip, setClipVolume, setClipAnimation } = useWorkspaceStore()

  if (!project) return null

  const clips = getClipsWithAssets(project.timeline.clips, project.assets)
  const selectedClip = clips.find((c) => c.id === selectedClipId)

  const isDisabled = !selectedClip
  const isVideo = selectedClip?.asset?.type === "video"
  const isImage = selectedClip?.asset?.type === "image"

  // Current values
  const currentDuration = selectedClip?.duration || 5
  const currentVolume = selectedClip?.volume ?? 1
  const currentPan = selectedClip?.animation?.pan || "zoom-in"

  const handleDurationChange = (duration: number) => {
    if (selectedClipId) {
      trimClip(selectedClipId, undefined, duration)
    }
  }

  const handleVolumeChange = (volume: number) => {
    if (selectedClipId) {
      setClipVolume(selectedClipId, volume)
    }
  }

  const handlePanChange = (pan: PanDirection) => {
    if (selectedClipId) {
      setClipAnimation(selectedClipId, { pan })
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-100 mb-1">Clip Properties</h3>
        <p className="text-xs text-zinc-500">
          {selectedClip ? selectedClip.asset?.name || "Untitled Clip" : "Select a clip to edit"}
        </p>
      </div>

      {/* Duration slider */}
      <div className={cn("space-y-4", isDisabled && "opacity-50")}>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-zinc-400">Duration</label>
            <span className="text-xs text-sky-400 font-mono">{currentDuration.toFixed(1)}s</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="30"
            step="0.5"
            value={currentDuration}
            onChange={(e) => handleDurationChange(Number(e.target.value))}
            disabled={isDisabled}
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-500 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-xs text-zinc-600 mt-1">
            <span>0.5s</span>
            <span>30s</span>
          </div>
        </div>

        {/* Volume slider (for video clips) */}
        {isVideo && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-zinc-400">Volume</label>
              <span className="text-xs text-sky-400 font-mono">{Math.round(currentVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={currentVolume * 100}
              onChange={(e) => handleVolumeChange(Number(e.target.value) / 100)}
              disabled={isDisabled}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-500 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>Mute</span>
              <span>100%</span>
            </div>
          </div>
        )}
      </div>

      {/* Pan controls for images */}
      {isImage && (
        <div className={cn("space-y-3", isDisabled && "opacity-50")}>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Pan / Zoom Effect</label>
            <div className="grid grid-cols-2 gap-1.5">
              {PAN_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handlePanChange(option.value)}
                  disabled={isDisabled}
                  className={cn(
                    "px-2 py-1.5 text-[11px] rounded border transition-all text-left disabled:cursor-not-allowed",
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
          <p className="text-[10px] text-zinc-600">
            {PAN_OPTIONS.find((o) => o.value === currentPan)?.description}
          </p>
        </div>
      )}

      {/* No clip selected message */}
      {!selectedClip && (
        <div className="text-center py-4 text-zinc-500">
          <SlidersHorizontal className="w-6 h-6 mx-auto mb-2 opacity-50" />
          <p className="text-xs">Click a clip on the timeline to edit its properties</p>
        </div>
      )}
    </div>
  )
}

// ============================================
// GENERIC PROPERTIES - For non-Editor tabs
// ============================================

interface GenericPropertiesProps {
  activeTab: WorkspaceTab
}

const TAB_INFO: Record<WorkspaceTab, { icon: React.ElementType; title: string; description: string }> = {
  platform: { icon: FolderOpen, title: "Platform", description: "Platform settings and configuration" },
  brief: { icon: FileText, title: "Project Brief", description: "Define your project goals and audience" },
  script: { icon: ScrollText, title: "Script", description: "Write and organize your script" },
  moodboard: { icon: Palette, title: "Mood Board", description: "Collect visual inspiration" },
  storyboard: { icon: BookOpen, title: "Storyboard", description: "Plan your visual narrative" },
  editor: { icon: Film, title: "Editor", description: "Edit your timeline" },
  assets: { icon: Layers, title: "Assets", description: "Manage your media assets" },
  export: { icon: Download, title: "Export", description: "Configure export settings" },
}

function GenericPropertiesContent({ activeTab }: GenericPropertiesProps) {
  const info = TAB_INFO[activeTab] || TAB_INFO.editor
  const Icon = info.icon

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-100 mb-1">Properties</h3>
        <p className="text-xs text-zinc-500">{info.title}</p>
      </div>

      <div className="text-center py-6 text-zinc-500">
        <Icon className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-xs">{info.description}</p>
      </div>
    </div>
  )
}

// ============================================
// PROPERTIES TAB - Context-aware
// ============================================

function PropertiesContent() {
  // Single persistent Properties panel for all Workspace tabs
  // Based on Editor/Clip properties - consistent across the project
  return <ClipPropertiesContent />
}

// ============================================
// NOTES TAB - List and Edit views (Notes + Scripts)
// ============================================

type PanelItemType = 'note' | 'script'

interface PanelItem {
  id: string
  type: PanelItemType
  content: string
  created_at: string
  sort_order: number
  project_name?: string // For scripts, to show which project
}

interface ItemCardProps {
  item: PanelItem
  onEdit: (id: string, type: PanelItemType) => void
  onDelete?: (id: string) => void // Optional - scripts can't be deleted from here
}

function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  // Get first 5 lines as excerpt
  const lines = item.content.split("\n").slice(0, 5)
  // Pad to 5 lines if needed
  while (lines.length < 5) {
    lines.push("")
  }
  const excerpt = lines.join("\n")

  const isScript = item.type === 'script'

  return (
    <div className={cn(
      "p-2.5 border rounded-lg",
      isScript
        ? "bg-amber-900/20 border-amber-700/30"
        : "bg-zinc-800/50 border-zinc-700/50"
    )}>
      {/* Header: type + date on left, edit/trash on right */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded",
            isScript
              ? "bg-amber-500/20 text-amber-400"
              : "bg-sky-500/20 text-sky-400"
          )}>
            {isScript ? 'Script' : 'Note'}
          </span>
          <span className="text-[10px] text-zinc-500">{formatDate(item.created_at)}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(item.id, item.type)}
            className="p-1 text-zinc-500 hover:text-sky-400 transition-colors"
            title={isScript ? "View script" : "Edit note"}
          >
            <Pencil className="w-3 h-3" />
          </button>
          {onDelete && !isScript && (
            <button
              onClick={() => onDelete(item.id)}
              className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
              title="Delete note"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      {/* Fixed height excerpt - 5 lines */}
      <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-[1.4]" style={{ height: "84px" }}>
        {excerpt}
      </p>
    </div>
  )
}

// Edit view for adding or editing a note/script
interface NoteEditViewProps {
  note: { id: string; content: string } | null // null = new note
  onSave: (content: string) => void
  onDelete: () => void
  onBack: () => void
  isScript?: boolean
}

function NoteEditView({ note, onSave, onDelete, onBack, isScript = false }: NoteEditViewProps) {
  const [content, setContent] = useState(note?.content || "")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea (no limit)
  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "auto"
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [])

  useEffect(() => {
    resizeTextarea()
  }, [content, resizeTextarea])

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSave = () => {
    if (!content.trim()) return
    onSave(content.trim())
  }

  return (
    <div className="space-y-3">
      {/* Header: back on left, type badge + save/delete on right */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          {isScript && (
            <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
              Script
            </span>
          )}
          {note && !isScript && (
            <button
              onClick={onDelete}
              className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
              title="Delete note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!content.trim()}
            className="flex items-center gap-1 px-2.5 py-1 bg-sky-500 hover:bg-sky-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Save className="w-3 h-3" />
            Save
          </button>
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={isScript ? "Write your script..." : "Write your note..."}
        className={cn(
          "w-full px-3 py-2.5 border rounded-lg text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none resize-none",
          isScript
            ? "bg-amber-900/20 border-amber-700/30 focus:border-amber-500"
            : "bg-zinc-800/50 border-zinc-700 focus:border-sky-500"
        )}
        style={{ minHeight: "200px" }}
      />
    </div>
  )
}

function NotesContent() {
  const { editorNotes, allScripts, loadNotesAndScripts, addEditorNote, updateEditorNote, deleteEditorNote, updateScriptById } = useWorkspaceStore()
  const { user } = useAuth()
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null)
  const [isAddingNote, setIsAddingNote] = useState(false)

  // Load notes and scripts from database on mount
  useEffect(() => {
    if (user?.id) {
      loadNotesAndScripts(user.id)
    }
  }, [user?.id, loadNotesAndScripts])

  // Combine notes and scripts into panel items
  const panelItems: PanelItem[] = [
    ...editorNotes.map(n => ({
      id: n.id,
      type: 'note' as PanelItemType,
      content: n.content,
      created_at: n.created_at,
      sort_order: n.sort_order,
    })),
    ...allScripts.map(s => ({
      id: s.id,
      type: 'script' as PanelItemType,
      content: s.content,
      created_at: s.created_at,
      sort_order: s.sort_order,
    })),
  ].sort((a, b) => a.sort_order - b.sort_order)

  const editingNote = editingNoteId ? editorNotes.find(n => n.id === editingNoteId) : null
  const editingScript = editingScriptId ? allScripts.find(s => s.id === editingScriptId) : null

  const handleSaveNew = (content: string) => {
    if (!user?.id) return
    addEditorNote(content, user.id)
    setIsAddingNote(false)
  }

  const handleSaveNoteEdit = (content: string) => {
    if (!editingNoteId) return
    updateEditorNote(editingNoteId, content)
    setEditingNoteId(null)
  }

  const handleDeleteNote = () => {
    if (!editingNoteId) return
    deleteEditorNote(editingNoteId)
    setEditingNoteId(null)
  }

  const handleSaveScriptEdit = (content: string) => {
    if (!editingScriptId) return
    updateScriptById(editingScriptId, content)
    setEditingScriptId(null)
  }

  const handleEditItem = (id: string, type: PanelItemType) => {
    if (type === 'note') {
      setEditingNoteId(id)
    } else {
      setEditingScriptId(id)
    }
  }

  // Edit view for new note
  if (isAddingNote) {
    return (
      <NoteEditView
        note={null}
        onSave={handleSaveNew}
        onDelete={() => {}}
        onBack={() => setIsAddingNote(false)}
      />
    )
  }

  // Edit view for existing note
  if (editingNote) {
    return (
      <NoteEditView
        note={editingNote}
        onSave={handleSaveNoteEdit}
        onDelete={handleDeleteNote}
        onBack={() => setEditingNoteId(null)}
      />
    )
  }

  // Edit view for script
  if (editingScript) {
    return (
      <NoteEditView
        note={editingScript}
        onSave={handleSaveScriptEdit}
        onDelete={() => setEditingScriptId(null)}
        onBack={() => setEditingScriptId(null)}
        isScript
      />
    )
  }

  // List view
  return (
    <div className="space-y-3">
      {/* Add Note Button */}
      <button
        onClick={() => setIsAddingNote(true)}
        className="w-full px-2.5 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Note
      </button>

      {/* Combined Notes + Scripts List */}
      {panelItems.length > 0 && (
        <div className="space-y-2">
          {panelItems.map((item) => (
            <ItemCard
              key={`${item.type}-${item.id}`}
              item={item}
              onEdit={handleEditItem}
              onDelete={item.type === 'note' ? deleteEditorNote : undefined}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {panelItems.length === 0 && (
        <div className="text-center py-6 text-zinc-500">
          <StickyNote className="w-6 h-6 mx-auto mb-2 opacity-50" />
          <p className="text-xs">No notes or scripts yet</p>
          <p className="text-[10px] mt-1">Click "Add Note" to get started</p>
        </div>
      )}
    </div>
  )
}

// ============================================
// ASSETS TAB - Grouped by Type with Collapsible Sections
// ============================================

// Asset type sections in display order
type AssetTypeSection = "video" | "image" | "audio"

const ASSET_SECTIONS: { type: AssetTypeSection; label: string; icon: React.ElementType; emptyText: string }[] = [
  { type: "video", label: "Videos", icon: Film, emptyText: "No videos yet" },
  { type: "image", label: "Images", icon: Image, emptyText: "No images yet" },
  { type: "audio", label: "Audio", icon: Music, emptyText: "No audio yet" },
]

interface AssetThumbnailCardProps {
  asset: LibraryAsset
  onDragStart: (e: React.DragEvent, asset: LibraryAsset) => void
  onClick?: () => void
}

function AssetThumbnailCard({ asset, onDragStart, onClick }: AssetThumbnailCardProps) {
  const [thumbnailError, setThumbnailError] = useState(false)
  const [videoDuration, setVideoDuration] = useState<number | null>(asset.duration || null)
  const isVideo = asset.type === "video"
  const isAudio = asset.type === "audio"
  // Convert LibraryAsset fields to match getAssetDisplayUrl expected format
  const displayUrl = getAssetDisplayUrl({
    url: asset.url,
    local_path: asset.localPath,
    storage_type: asset.storageType,
  })

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`
  }

  const handleVideoMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget
    if (video.duration && !isNaN(video.duration) && isFinite(video.duration)) {
      setVideoDuration(video.duration)
    }
  }

  const renderThumbnail = () => {
    if (thumbnailError || !displayUrl) {
      // Fallback icon
      const Icon = isVideo ? Film : isAudio ? Music : Image
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
          <Icon className="w-6 h-6 text-zinc-600" />
        </div>
      )
    }

    if (isAudio) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-purple-600/30">
          <Music className="w-6 h-6 text-purple-400" />
        </div>
      )
    }

    if (isVideo) {
      return (
        <>
          <video
            src={displayUrl}
            className="absolute inset-0 w-full h-full object-cover"
            preload="metadata"
            muted
            playsInline
            onLoadedMetadata={handleVideoMetadata}
            onError={() => setThumbnailError(true)}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
              <Play className="w-3 h-3 text-white fill-white ml-0.5" />
            </div>
          </div>
        </>
      )
    }

    // Image
    return (
      <img
        src={displayUrl}
        alt={asset.name}
        className="absolute inset-0 w-full h-full object-cover"
        onError={() => setThumbnailError(true)}
      />
    )
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, asset)}
      onClick={onClick}
      className="group bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-all"
    >
      {/* Thumbnail - 16:9 aspect ratio */}
      <div className="relative w-full aspect-video bg-zinc-900">
        {renderThumbnail()}
      </div>

      {/* Info */}
      <div className="p-2">
        <p className="text-[11px] font-medium text-zinc-200 truncate group-hover:text-sky-400 transition-colors">
          {asset.name}
        </p>
        {(isVideo ? videoDuration : asset.duration) && (
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {formatDuration(isVideo ? videoDuration! : asset.duration!)}
          </p>
        )}
      </div>
    </div>
  )
}

interface AssetSectionProps {
  type: AssetTypeSection
  label: string
  icon: React.ElementType
  emptyText: string
  assets: LibraryAsset[]
  onDragStart: (e: React.DragEvent, asset: LibraryAsset) => void
  defaultExpanded?: boolean
}

function AssetSection({ type, label, icon: Icon, emptyText, assets, onDragStart, defaultExpanded = true }: AssetSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border-b border-zinc-800 last:border-b-0">
      {/* Section Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-1 py-2 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-200">{label}</span>
          <span className="text-[10px] text-zinc-500">({assets.length})</span>
        </div>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-zinc-500 transition-transform",
            !isExpanded && "-rotate-90"
          )}
        />
      </button>

      {/* Section Content - Collapsible */}
      {isExpanded && (
        <div className="pb-3 px-1">
          {assets.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {assets.map((asset) => (
                <AssetThumbnailCard
                  key={asset.id}
                  asset={asset}
                  onDragStart={onDragStart}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-zinc-500">
              <Icon className="w-5 h-5 mx-auto mb-1.5 opacity-40" />
              <p className="text-[10px]">{emptyText}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AssetsContent() {
  const { user } = useAuth()
  const { assets: libraryAssets, isLoading, loadAssets } = useLibraryStore()

  // Load library assets on mount
  useEffect(() => {
    if (user?.id && libraryAssets.length === 0) {
      console.log("[AssetsContent] Loading library assets for user:", user.id)
      loadAssets(user.id)
    }
  }, [user?.id, libraryAssets.length, loadAssets])

  // Debug logging
  useEffect(() => {
    if (libraryAssets.length > 0) {
      const videoCount = libraryAssets.filter(a => a.type === "video").length
      const imageCount = libraryAssets.filter(a => a.type === "image").length
      const audioCount = libraryAssets.filter(a => a.type === "audio").length
      console.log(`[AssetsContent] Loaded ${libraryAssets.length} assets: ${videoCount} videos, ${imageCount} images, ${audioCount} audio`)
    }
  }, [libraryAssets])

  // Group assets by type
  const assetsByType: Record<AssetTypeSection, LibraryAsset[]> = {
    video: libraryAssets.filter((a) => a.type === "video"),
    image: libraryAssets.filter((a) => a.type === "image"),
    audio: libraryAssets.filter((a) => a.type === "audio"),
  }

  // Sort assets within each type by createdAt (newest first) to match Assets page
  Object.keys(assetsByType).forEach((type) => {
    assetsByType[type as AssetTypeSection].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  })

  const handleDragStart = (e: React.DragEvent, asset: LibraryAsset) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: "asset",
        assetId: asset.id,
        assetType: asset.type,
        duration: asset.duration || 5,
      })
    )
    e.dataTransfer.effectAllowed = "copy"
  }

  const totalAssets = libraryAssets.length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-2">
        <p className="text-[10px] text-zinc-500">Drag to timeline</p>
        <span className="text-[10px] text-zinc-500">{totalAssets} total</span>
      </div>

      {/* Asset Sections by Type */}
      {ASSET_SECTIONS.map((section) => (
        <AssetSection
          key={section.type}
          type={section.type}
          label={section.label}
          icon={section.icon}
          emptyText={section.emptyText}
          assets={assetsByType[section.type]}
          onDragStart={handleDragStart}
        />
      ))}

      {/* Global empty state if no assets at all */}
      {totalAssets === 0 && (
        <div className="text-center py-6 text-zinc-500">
          <Layers className="w-6 h-6 mx-auto mb-2 opacity-40" />
          <p className="text-xs">No assets yet</p>
          <p className="text-[10px] mt-1">Add assets from the Library</p>
        </div>
      )}
    </div>
  )
}

// ============================================
// CONTROL PANEL TABS - Notes & Assets only
// ============================================

const CONTROL_PANEL_TABS: { id: ControlPanelTab; label: string; icon: React.ElementType }[] = [
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "assets", label: "Assets", icon: Layers },
]

// Library page configurations for non-workspace contexts
const LIBRARY_CONFIG: Record<
  LibraryPageType,
  { title: string; subtitle: string }
> = {
  dashboard: { title: "Control Panel", subtitle: "Dashboard" },
  platforms: { title: "Control Panel", subtitle: "Platforms" },
  projects: { title: "Control Panel", subtitle: "Projects" },
  assets: { title: "Control Panel", subtitle: "Assets" },
  foundations: { title: "Control Panel", subtitle: "Foundations" },
}

// Workspace tab subtitles
const WORKSPACE_SUBTITLES: Partial<Record<WorkspaceTab, string>> = {
  platform: "Platform",
  brief: "Brief",
  script: "Script",
  moodboard: "Mood Board",
  storyboard: "Storyboard",
  editor: "Editor",
  assets: "Assets",
  export: "Export",
}

interface InspectorPanelProps {
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  // Optional: for library pages (non-workspace context)
  libraryPage?: LibraryPageType
}

export function InspectorPanel({
  isCollapsed = false,
  onToggleCollapse,
  libraryPage,
}: InspectorPanelProps) {
  const { activeTab, controlPanelTab, setControlPanelTab } = useWorkspaceStore()
  const { setInspectorCollapsed } = useUIStore()
  const [showProperties, setShowProperties] = useState(false)

  // Subtitle is always "Project Tools"
  const subtitle = "Project Tools"

  // Render control panel tab content
  const renderControlPanelTabContent = () => {
    switch (controlPanelTab) {
      case "notes":
        return <NotesContent />
      case "assets":
        return <AssetsContent />
      default:
        return <NotesContent />
    }
  }

  // Always render full width (w-80) - parent container handles clipping during animation
  // ml-auto keeps content anchored to the right edge
  return (
    <div className="w-80 h-full bg-zinc-900 border-l border-zinc-800 flex flex-col ml-auto relative">
      {/* Panel Header */}
      <div className={`border-b border-zinc-800 ${isCollapsed ? "py-3 flex justify-center" : "h-[72px] px-4 flex items-center"}`}>
        {isCollapsed ? (
          // Collapsed: just the gear button, clickable to expand
          <button
            onClick={onToggleCollapse}
            className="w-11 h-11 rounded-lg bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all"
            title="Open Control Panel"
          >
            <Settings className="w-5 h-5 text-white" />
          </button>
        ) : (
          // Expanded: full header with arrow, text, and gear
          <div className="flex-1 flex items-center justify-between">
            {/* Close button - just closes the panel */}
            <button
              onClick={() => setInspectorCollapsed(true)}
              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Close panel"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Text (left-aligned) */}
            <div className="flex-1 ml-3">
              <h3 className="text-sm font-semibold text-zinc-100">Control Panel</h3>
              <p className="text-xs text-zinc-500">{subtitle}</p>
            </div>

            {/* Gear - toggles properties panel (only works when in a project) */}
            <button
              onClick={() => {
                // Only toggle properties when in a project (no libraryPage prop)
                if (!libraryPage) {
                  setShowProperties(!showProperties)
                }
              }}
              className="w-11 h-11 rounded-lg bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20"
              title={showProperties ? "Hide Properties" : "Show Properties"}
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Panel Content - hidden when collapsed */}
      {!isCollapsed && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Toggle - Bold Buttons */}
          <div className="p-2 border-b border-zinc-800">
            <div className="flex gap-2">
              {CONTROL_PANEL_TABS.map((tab) => {
                const Icon = tab.icon
                const isActive = controlPanelTab === tab.id
                const isAssets = tab.id === "assets"
                return (
                  <button
                    key={tab.id}
                    onClick={() => setControlPanelTab(tab.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all",
                      isActive
                        ? isAssets
                          ? "bg-gradient-to-br from-orange-400/20 via-orange-500/20 to-amber-600/20 text-orange-400 shadow-inner"
                          : "bg-gradient-to-br from-sky-400/20 via-sky-500/20 to-blue-600/20 text-sky-400 shadow-inner"
                        : isAssets
                          ? "bg-zinc-800/50 text-zinc-400 hover:text-orange-400"
                          : "bg-zinc-800/50 text-zinc-400 hover:text-sky-400"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {renderControlPanelTabContent()}
          </div>
        </div>
      )}

      {/* Secret Properties Panel - slides out from right */}
      {!isCollapsed && showProperties && (
        <div className="absolute inset-0 bg-zinc-900 flex flex-col">
          {/* Properties Header */}
          <div className="h-[72px] px-4 flex items-center border-b border-zinc-800">
            <button
              onClick={() => setInspectorCollapsed(true)}
              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Close panel"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="flex-1 ml-3">
              <h3 className="text-sm font-semibold text-zinc-100">Properties</h3>
              <p className="text-xs text-zinc-500">{subtitle}</p>
            </div>
            <button
              onClick={() => setShowProperties(false)}
              className="w-11 h-11 rounded-lg bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20"
              title="Hide Properties"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Properties Content */}
          <div className="flex-1 overflow-y-auto p-3 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <PropertiesContent />
          </div>
        </div>
      )}
    </div>
  )
}
