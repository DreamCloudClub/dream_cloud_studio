import { FolderOpen, Image, Palette } from "lucide-react"

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

function ItemCard({ item, onClick }: { item: ContentItem; onClick?: () => void }) {
  const typeIcons = {
    image: "🖼",
    video: "🎬",
    audio: "🔊",
  }

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-[calc(40vw-2rem)] sm:w-[calc(30vw-2rem)] md:w-[calc(22vw-2rem)] lg:w-40 xl:w-44 group focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-lg"
    >
      <div className="aspect-video rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden relative group-hover:border-zinc-600 transition-colors">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            {item.type ? typeIcons[item.type] : "▶"}
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
      </div>
      <div className="mt-2 text-left">
        <p className="text-sm font-medium text-zinc-200 truncate">{item.name}</p>
        <p className="text-xs text-zinc-500">{item.updatedAt}</p>
      </div>
    </button>
  )
}

export function ContentRow({ title, type, items = [], onItemClick }: ContentRowProps) {
  const hasItems = items.length > 0

  return (
    <div className="py-4 sm:py-6 md:py-8">
      <div className="mb-4 md:mb-6">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">{title}</h2>
      </div>

      {hasItems ? (
        <div className="flex gap-3 sm:gap-4 md:gap-5 lg:gap-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => onItemClick?.(item.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState type={type} />
      )}
    </div>
  )
}
