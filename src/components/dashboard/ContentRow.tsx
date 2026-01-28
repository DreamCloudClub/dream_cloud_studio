import { FolderOpen, Image, PenLine, Film, Volume2, Play } from "lucide-react"

export type ContentRowType = "projects" | "assets" | "foundations"

interface ContentItem {
  id: string
  name: string
  thumbnail?: string | null
  updatedAt: string
  type?: "image" | "video" | "audio"
  category?: string | null
  // Foundation-specific fields
  colorPalette?: string[]
  style?: string | null
  mood?: string | null
}

interface ContentRowProps {
  title: string
  type: ContentRowType
  items?: ContentItem[]
  onItemClick?: (id: string) => void
  isDraft?: boolean
}

function EmptyIcon({ type }: { type: ContentRowType }) {
  const iconClass = "h-12 w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 text-zinc-600"
  return <FolderOpen className={iconClass} />
}

function EmptyState({ type }: { type: ContentRowType }) {
  const messages = {
    projects: "No projects yet. Create your first video project to get started.",
    assets: "No assets yet. Generate images, videos, or audio to build your library.",
    foundations: "No foundations yet. Foundations help maintain consistent visual style across projects.",
  }

  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-10 md:py-12 px-4 sm:px-6 md:px-8 border border-dashed border-zinc-800 rounded-lg bg-zinc-900/30">
      <EmptyIcon type={type} />
      <p className="text-sm md:text-base text-zinc-500 mt-3 md:mt-4 text-center max-w-xs sm:max-w-sm md:max-w-md">{messages[type]}</p>
    </div>
  )
}

function ItemCard({ item, onClick, isDraft, isFoundation }: { item: ContentItem; onClick?: () => void; isDraft?: boolean; isFoundation?: boolean }) {
  const TypeIcon = item.type === 'video' ? Film : item.type === 'audio' ? Volume2 : FolderOpen
  const hasColorPalette = isFoundation && item.colorPalette && item.colorPalette.length > 0

  return (
    <button
      onClick={onClick}
      className={`w-full group focus:outline-none text-left bg-zinc-900 rounded-xl overflow-hidden transition-colors ${
        isDraft
          ? "border-2 border-dashed border-orange-500/50 hover:border-orange-400/70"
          : "border border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <div className="aspect-square bg-zinc-800 relative">
        {item.thumbnail && item.type === 'video' ? (
          <>
            <video
              src={item.thumbnail}
              className="w-full h-full object-cover"
              preload="metadata"
              muted
              playsInline
            />
            {/* Play icon overlay for videos */}
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center pointer-events-none">
              <Play className="w-3 h-3 text-white fill-white" />
            </div>
          </>
        ) : item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : hasColorPalette ? (
          <div className="w-full h-full flex flex-col">
            {/* Color palette display */}
            <div className="flex-1 grid grid-cols-2 gap-0.5 p-2">
              {item.colorPalette!.slice(0, 4).map((color, i) => (
                <div
                  key={i}
                  className="rounded-md"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            {/* Style/mood tags */}
            {(item.style || item.mood) && (
              <div className="px-2 pb-2 flex flex-wrap gap-1">
                {item.style && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-zinc-700/50 text-zinc-400 rounded capitalize">
                    {item.style}
                  </span>
                )}
                {item.mood && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-zinc-700/50 text-zinc-400 rounded capitalize">
                    {item.mood}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isDraft ? (
              <PenLine className="w-8 h-8 text-orange-500/70" />
            ) : (
              <TypeIcon className="w-8 h-8 text-zinc-700" />
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        {isDraft && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-orange-500/90 text-white text-[10px] font-medium rounded">
            Draft
          </div>
        )}
      </div>
      <div className="p-3">
        <p className={`text-sm font-medium truncate ${isDraft ? "text-orange-200 group-hover:text-orange-300" : "text-zinc-200 group-hover:text-sky-400"} transition-colors`}>{item.name}</p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {item.type ? (
            <>
              <span className="capitalize">{item.type}</span>
              {item.category && <> · <span className="capitalize">{item.category.replace('_', ' ')}</span></>}
            </>
          ) : (
            item.updatedAt
          )}
        </p>
      </div>
    </button>
  )
}

export function ContentRow({ title, type, items = [], onItemClick, isDraft }: ContentRowProps) {
  const hasItems = items.length > 0
  // Max 12 items (4 per row, 3 rows)
  const displayItems = items.slice(0, 12)
  const isFoundation = type === 'foundations'

  return (
    <div className="py-4 sm:py-6 md:py-8">
      <div className="mb-4 md:mb-6">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">{title}</h2>
      </div>

      {hasItems ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {displayItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => onItemClick?.(item.id)}
              isDraft={isDraft}
              isFoundation={isFoundation}
            />
          ))}
        </div>
      ) : (
        <EmptyState type={type} />
      )}

      {/* Foundation info - always show under foundations section */}
      {isFoundation && (
        <div className="mt-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
          <p className="text-xs text-zinc-500">
            <span className="text-zinc-400 font-medium">Foundations</span> are visual style guides that help maintain consistency across your projects. They include color palettes, typography choices, mood settings, and tone of voice.
          </p>
        </div>
      )}
    </div>
  )
}
