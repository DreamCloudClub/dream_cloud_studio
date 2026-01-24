import { Plus, Edit3, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkspaceStore, StoryboardCard } from "@/state/workspaceStore"

interface CardThumbnailProps {
  card: StoryboardCard
  displayNumber: number
  isSelected: boolean
  onClick: () => void
}

function CardThumbnail({ card, displayNumber, isSelected, onClick }: CardThumbnailProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden border-2 transition-all relative",
        isSelected
          ? "border-sky-500 ring-2 ring-sky-500/30"
          : "border-zinc-700 hover:border-zinc-500"
      )}
    >
      {/* Thumbnail background */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900">
        {card.thumbnailUrl ? (
          <img
            src={card.thumbnailUrl}
            alt={card.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-zinc-700">
              {displayNumber}
            </span>
          </div>
        )}
      </div>

      {/* Title overlay */}
      <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-[10px] text-white truncate font-medium">
          {card.title}
        </p>
      </div>
    </button>
  )
}

interface FullCardProps {
  card: StoryboardCard
  displayNumber: number
}

function FullCard({ card, displayNumber }: FullCardProps) {
  const { removeStoryboardCard } = useWorkspaceStore()

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm">
            {displayNumber}
          </span>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">{card.title}</h2>
            <p className="text-sm text-zinc-500">{card.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors">
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => removeStoryboardCard(card.id)}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-red-500/20 flex items-center justify-center text-zinc-400 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Card Content - LLM Generated */}
      <div className="p-6">
        <div className="prose prose-invert prose-sm max-w-none">
          {card.content.split("\n\n").map((paragraph, index) => {
            // Check if it's a "Key elements:" section
            if (paragraph.startsWith("Key elements:")) {
              const lines = paragraph.split("\n")
              return (
                <div key={index} className="mt-4">
                  <h4 className="text-sm font-medium text-sky-400 mb-2">
                    {lines[0]}
                  </h4>
                  <ul className="space-y-1">
                    {lines.slice(1).map((line, i) => (
                      <li
                        key={i}
                        className="text-zinc-400 text-sm flex items-start gap-2"
                      >
                        <span className="text-sky-500 mt-1">•</span>
                        <span>{line.replace(/^- /, "")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            }
            return (
              <p key={index} className="text-zinc-300 leading-relaxed">
                {paragraph}
              </p>
            )
          })}
        </div>
      </div>

      {/* Visual Reference (placeholder) */}
      <div className="p-6 pt-0">
        <div className="border border-dashed border-zinc-700 rounded-xl p-8 text-center">
          <p className="text-zinc-500 text-sm mb-2">Visual Reference</p>
          <button className="text-sky-400 hover:text-sky-300 text-sm inline-flex items-center gap-1">
            <Plus className="w-3 h-3" />
            Generate or upload image
          </button>
        </div>
      </div>
    </div>
  )
}

export function StoryboardPage() {
  const {
    project,
    selectedStoryboardCardId,
    setSelectedStoryboardCard,
    addStoryboardCard,
  } = useWorkspaceStore()

  if (!project) return null

  const { storyboardCards } = project

  // Sort cards by order and create a lookup for display numbers
  const sortedCards = [...storyboardCards].sort((a, b) => a.order - b.order)
  const selectedCardIndex = sortedCards.findIndex(
    (c) => c.id === selectedStoryboardCardId
  )
  const selectedCard = selectedCardIndex >= 0 ? sortedCards[selectedCardIndex] : null

  const handleAddCard = () => {
    const newCard: StoryboardCard = {
      id: crypto.randomUUID(),
      title: `Card ${storyboardCards.length + 1}`,
      description: "New storyboard card",
      content: "Describe what happens in this part of the story...\n\nKey elements:\n- Add visual elements here\n- Describe the mood and pacing\n- Note any key dialogue or action",
      order: storyboardCards.length,
    }
    addStoryboardCard(newCard)
    setSelectedStoryboardCard(newCard.id)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Main Content - Full Card View */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {selectedCard ? (
            <FullCard card={selectedCard} displayNumber={selectedCardIndex + 1} />
          ) : (
            <div className="text-center py-20">
              <p className="text-zinc-500 mb-4">
                Select a storyboard card below or create a new one
              </p>
              <button
                onClick={handleAddCard}
                className="px-6 py-3 bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create First Card
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Timeline - Thumbnails */}
      <div className="border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-4">
        <div className="overflow-x-auto pb-2">
          <div className="flex items-center justify-center gap-3 min-w-min">
            {sortedCards.map((card, index) => (
              <CardThumbnail
                key={card.id}
                card={card}
                displayNumber={index + 1}
                isSelected={card.id === selectedStoryboardCardId}
                onClick={() => setSelectedStoryboardCard(card.id)}
              />
            ))}

            {/* Add New Card Button */}
            <button
              onClick={handleAddCard}
              className="flex-shrink-0 w-32 h-20 rounded-lg border-2 border-dashed border-zinc-700 hover:border-sky-500/50 flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-sky-400 transition-all hover:bg-sky-500/5"
            >
              <Plus className="w-5 h-5" />
              <span className="text-xs">Add Card</span>
            </button>
          </div>
        </div>

        {/* Timeline info */}
        <div className="text-center mt-3 text-xs text-zinc-500">
          <span>{storyboardCards.length} card{storyboardCards.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  )
}
