import { FolderOpen, Image, Palette, PenLine } from "lucide-react"

export type ContentRowType = "projects" | "assets" | "foundations"

interface ContentItem {
  id: string
  name: string
  thumbnail?: string | null
  updatedAt: string
  type?: "image" | "video" | "audio"
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
  switch (type) {
    case "projects":
      return <FolderOpen className={iconClass} />
    case "assets":
      return <Image className={iconClass} />
    case "foundations":
      return <Palette className={iconClass} />
  }
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

function ItemCard({ item, onClick, isDraft }: { item: ContentItem; onClick?: () => void; isDraft?: boolean }) {
  const typeIcons = {
    image: "🖼",
    video: "🎬",
    audio: "🔊",
  }

  return (
    <button
      onClick={onClick}
      className="w-full group focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-lg text-left"
    >
      <div className={`aspect-video rounded-lg bg-zinc-800 overflow-hidden relative group-hover:border-zinc-600 transition-colors ${
        isDraft
          ? "border-2 border-dashed border-orange-500/50 group-hover:border-orange-400/70"
          : "border border-zinc-700"
      }`}>
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            {isDraft ? (
              <PenLine className="w-8 h-8 text-orange-500/70" />
            ) : (
              item.type ? typeIcons[item.type] : "▶"
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
      <div className="mt-2">
        <p className="text-sm font-medium text-zinc-200 truncate">{item.name}</p>
        <p className="text-xs text-zinc-500">{item.updatedAt}</p>
      </div>
    </button>
  )
}

export function ContentRow({ title, type, items = [], onItemClick, isDraft }: ContentRowProps) {
  const hasItems = items.length > 0
  // Max 12 items (4 per row, 3 rows)
  const displayItems = items.slice(0, 12)

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
            />
          ))}
        </div>
      ) : (
        <EmptyState type={type} />
      )}
    </div>
  )
}
