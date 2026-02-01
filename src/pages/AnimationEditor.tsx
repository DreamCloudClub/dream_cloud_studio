import { useState, useEffect, useMemo } from "react"
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom"
import { ChevronLeft, Save, Loader2, Sparkles, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { LibraryLayout } from "@/components/library"
import { useAssetWizardStore } from "@/state/assetWizardStore"
import { useUIStore } from "@/state/uiStore"
import { useAuth } from "@/contexts/AuthContext"
import { HeaderActions } from "@/components/shared"
import { BubblePanel } from "@/components/create"
import { InspectorPanel, WorkspaceNav } from "@/components/workspace"
import { DashboardNav } from "@/components/dashboard"
import studioLogo from "@/assets/images/studio_logo.png"
import { getAsset, createAsset, updateAsset } from "@/services/assets"
import { Player } from "@remotion/player"
import { AnimationComposition } from "@/remotion/AnimationComposition"
import type { AnimationConfig } from "@/remotion/AnimationComposition"
import type { Asset } from "@/types/database"

export function AnimationEditor() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get("projectId")
  const isNew = !id || id === "new"

  const { user, profile, signOut } = useAuth()
  const { isBubbleCollapsed, toggleBubbleCollapsed, isInspectorCollapsed, toggleInspectorCollapsed } = useUIStore()

  const { animationConfig, setAnimationConfig } = useAssetWizardStore()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [existingAsset, setExistingAsset] = useState<Asset | null>(null)

  // Load existing animation if editing
  useEffect(() => {
    async function loadAnimation() {
      if (isNew || !id) {
        setAnimationConfig(null)
        return
      }

      try {
        setIsLoading(true)
        const asset = await getAsset(id)
        if (asset) {
          setExistingAsset(asset)
          setName(asset.name)
          setDescription(asset.user_description || "")

          // Load animation config from generation_settings
          const settings = asset.generation_settings as Record<string, unknown> | null
          if (settings?.animationConfig) {
            setAnimationConfig(settings.animationConfig as AnimationConfig)
          }
        }
      } catch (error) {
        console.error("Error loading animation:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAnimation()
  }, [id, isNew, setAnimationConfig])

  // Clear animation config on unmount
  useEffect(() => {
    return () => {
      setAnimationConfig(null)
    }
  }, [setAnimationConfig])

  // Build composition props for the player
  const compositionProps = useMemo(() => {
    if (!animationConfig) return null

    return {
      segments: [
        {
          id: "preview",
          type: "animation" as const,
          config: animationConfig,
        },
      ],
      backgroundColor: animationConfig.background?.color || "#000000",
    }
  }, [animationConfig])

  const handleSave = async () => {
    if (!user || !name.trim()) return

    try {
      setIsSaving(true)

      const assetData = {
        user_id: user.id,
        name: name.trim(),
        type: "video" as const,
        user_description: description.trim() || null,
        duration: animationConfig?.duration || null,
        generation_settings: {
          animationConfig,
          generatedBy: "remotion",
        },
      }

      if (existingAsset) {
        await updateAsset(existingAsset.id, assetData)
      } else {
        await createAsset(assetData)
      }

      // Navigate back to appropriate location
      if (projectId) {
        navigate(`/project/${projectId}?tab=assets`)
      } else {
        navigate("/animations")
      }
    } catch (error) {
      console.error("Error saving animation:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const canSave = name.trim().length > 0

  const handleBack = () => {
    if (projectId) {
      navigate(`/project/${projectId}?tab=assets`)
    } else {
      navigate("/animations")
    }
  }

  // Content component shared between layouts
  const editorContent = (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="h-[72px] border-b border-zinc-800 flex-shrink-0">
        <div className="h-full px-6 lg:px-8 flex items-center">
          <div className="w-24">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
          </div>

          <h1 className="flex-1 text-center text-xl font-semibold text-zinc-100">
            {isNew ? "Create Animation" : "Edit Animation"}
          </h1>

          <div className="w-24 flex justify-end">
            <button
              onClick={handleSave}
              disabled={!canSave || isSaving}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all",
                canSave && !isSaving
                  ? "bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 text-white hover:opacity-90"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              )}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 py-8 space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Animation"
                className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this animation is for..."
                rows={2}
                className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            {/* Animation Preview */}
            <div className="aspect-video relative bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800">
              {compositionProps ? (
                <Player
                  component={AnimationComposition}
                  inputProps={compositionProps}
                  durationInFrames={Math.round((animationConfig?.duration || 4) * 30)}
                  fps={30}
                  compositionWidth={1920}
                  compositionHeight={1080}
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                  controls
                  autoPlay={false}
                  loop
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-zinc-500">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium text-zinc-400">No animation yet</p>
                    <p className="text-sm mt-2 max-w-sm mx-auto">
                      Use the chat panel on the left to describe your animation
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-zinc-800/50 rounded-lg text-zinc-400">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-sm">
                        Try: "Create a fade-in title that says Welcome"
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Animation Info */}
            {animationConfig && (
              <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-300">Animation Details</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {animationConfig.duration}s duration •{" "}
                      {animationConfig.layers.length} layer
                      {animationConfig.layers.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Layers</p>
                    <div className="flex flex-wrap gap-1 mt-1 justify-end">
                      {animationConfig.layers.map((layer, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-zinc-700/50 rounded text-xs text-zinc-400"
                        >
                          {layer.type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  );

  // Loading state
  if (isLoading) {
    if (projectId) {
      return (
        <div className="h-screen bg-zinc-950 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )
    }
    return (
      <LibraryLayout libraryPage="assets">
        <div className="h-full flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </LibraryLayout>
    )
  }

  // Workspace layout (inside a project)
  if (projectId) {
    return (
      <div className="h-screen bg-zinc-950 flex flex-col">
        {/* Primary Header */}
        <header className="h-14 border-b border-zinc-800 px-4 sm:px-6 flex items-center justify-between bg-zinc-950 flex-shrink-0">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
            <img
              src={studioLogo}
              alt="Dream Cloud Studio"
              className="w-8 h-8 rounded-lg object-contain flex-shrink-0"
            />
            <h1 className="text-base sm:text-lg font-semibold text-zinc-100 truncate">Dream Cloud Studio</h1>
          </Link>

          <HeaderActions
            userName={profile?.full_name || user?.email?.split("@")[0] || "User"}
            userEmail={user?.email || ""}
            userAvatar={profile?.avatar_url}
            onSignOut={signOut}
          />
        </header>

        {/* Main Content with Panels */}
        <div className="flex-1 flex overflow-hidden">
          {/* Bubble Panel (Left Sidebar) */}
          <div
            className={`${
              isBubbleCollapsed ? "w-16" : "w-80"
            } flex-shrink-0 hidden md:flex transition-all duration-300`}
          >
            <BubblePanel
              isCollapsed={isBubbleCollapsed}
              onToggleCollapse={toggleBubbleCollapsed}
            />
          </div>

          {/* Editor Content */}
          <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
            {editorContent}
          </main>

          {/* Inspector Panel (Right Sidebar) */}
          <div
            className={`${
              isInspectorCollapsed ? "w-16" : "w-80"
            } flex-shrink-0 hidden md:flex transition-all duration-300 overflow-hidden`}
          >
            <InspectorPanel
              isCollapsed={isInspectorCollapsed}
              onToggleCollapse={toggleInspectorCollapsed}
              libraryPage="dashboard"
            />
          </div>
        </div>

        <WorkspaceNav activeTabOverride="assets" projectId={projectId} />
      </div>
    )
  }

  // Library layout (standalone)
  return (
    <LibraryLayout libraryPage="assets">
      {editorContent}
    </LibraryLayout>
  )
}
