import { useState } from "react"
import { Video, Layers, ChevronLeft, ChevronRight, Sparkles, Cloud, Clapperboard, Wand2, Download, MessageSquare } from "lucide-react"

interface CreateNewHeroProps {
  onNewProject?: () => void
  onNewAsset?: () => void
  onStartWithBubble?: () => void
}

// Instruction cards for the carousel
const instructionCards = [
  {
    id: 1,
    icon: MessageSquare,
    title: "Describe Your Vision",
    description: "Type or speak what you want to create. Be as detailed or as simple as you like.",
  },
  {
    id: 2,
    icon: Sparkles,
    title: "Choose Your Path",
    description: "Start a full Project for video production, or create a standalone Asset like an image or audio.",
  },
  {
    id: 3,
    icon: Wand2,
    title: "AI-Guided Creation",
    description: "Our production assistant, Bubble AI will ask clarifying questions and help refine your ideas.",
  },
  {
    id: 4,
    icon: Clapperboard,
    title: "Generate & Iterate",
    description: "Create images, videos, and audio with AI. Regenerate until it's perfect.",
  },
  {
    id: 5,
    icon: Video,
    title: "Assemble & Edit",
    description: "Claude Code assembles your raw edit. Refine and polish in the workspace.",
  },
  {
    id: 6,
    icon: Download,
    title: "Export Finished Project",
    description: "Render your final video and export in your preferred format and resolution.",
  },
]

export function CreateNewHero({ onNewProject, onNewAsset, onStartWithBubble }: CreateNewHeroProps) {
  const [carouselIndex, setCarouselIndex] = useState(0)

  const canGoLeft = carouselIndex > 0
  const canGoRight = carouselIndex < instructionCards.length - 1

  const handlePrev = () => {
    if (canGoLeft) setCarouselIndex(carouselIndex - 1)
  }

  const handleNext = () => {
    if (canGoRight) setCarouselIndex(carouselIndex + 1)
  }

  return (
    <div className="py-6 sm:py-8 md:py-10 lg:py-12">
      <div className="w-full max-w-[90%] md:max-w-[80%] lg:max-w-3xl mx-auto space-y-6 md:space-y-8">

        {/* Instruction Carousel */}
        <div className="relative">
          {/* Left Arrow */}
          <button
            onClick={handlePrev}
            disabled={!canGoLeft}
            className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-2 z-10 transition-opacity ${
              canGoLeft ? "opacity-100 hover:opacity-80" : "opacity-30 cursor-not-allowed"
            }`}
          >
            <ChevronLeft className="h-6 w-6 text-zinc-400" />
          </button>

          {/* Cards Container */}
          <div className="overflow-hidden px-[1px]">
            <div
              className="flex gap-4 transition-transform duration-300 ease-out"
              style={{ transform: `translateX(calc(-${carouselIndex} * (75% + 1rem)))` }}
            >
              {instructionCards.map((card, idx) => {
                const Icon = card.icon
                const isActive = idx === carouselIndex
                const isNext = idx === carouselIndex + 1

                // Active card bright, next card dimmer, rest very dim
                const opacityClass = isActive
                  ? "border-zinc-500 bg-zinc-900/80"
                  : isNext
                    ? "border-zinc-700 bg-zinc-900/50 opacity-60"
                    : "border-zinc-800 bg-zinc-900/30 opacity-30"

                return (
                  <div
                    key={card.id}
                    className={`w-[75%] flex-shrink-0 ${opacityClass} border rounded-xl p-5 sm:p-6 md:p-7 transition-all duration-300 flex flex-col min-h-[160px] sm:min-h-[180px] md:min-h-[200px]`}
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-zinc-800 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-sky-400" />
                    </div>
                    <h4 className="text-sm sm:text-base md:text-lg font-semibold text-zinc-100 mb-2">
                      {card.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-zinc-400 line-clamp-3 mt-auto">
                      {card.description}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Fade overlay on right edge */}
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-zinc-950 to-transparent pointer-events-none" />
          </div>

          {/* Right Arrow */}
          <button
            onClick={handleNext}
            disabled={!canGoRight}
            className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-2 z-10 transition-opacity ${
              canGoRight ? "opacity-100 hover:opacity-80" : "opacity-30 cursor-not-allowed"
            }`}
          >
            <ChevronRight className="h-6 w-6 text-zinc-400" />
          </button>

          {/* Dot indicators */}
          <div className="flex justify-center gap-1.5 mt-4">
            {instructionCards.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCarouselIndex(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  idx === carouselIndex
                    ? "bg-sky-400 w-4"
                    : "bg-zinc-700 hover:bg-zinc-600"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Start with Bubble Card - Soft white with glowing border */}
        <button
          onClick={onStartWithBubble}
          className="group relative w-full overflow-hidden rounded-xl p-6 sm:p-8 bg-zinc-200 hover:bg-zinc-100 ring-4 ring-sky-500 shadow-xl shadow-sky-500/20 hover:shadow-sky-500/30 transition-all hover:scale-[1.01] text-left"
        >
          <div className="relative z-10 flex items-center gap-5 sm:gap-6">
            {/* Glowing blue cloud icon */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-sky-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-sky-500/50">
              <Cloud className="h-8 w-8 sm:h-9 sm:w-9 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 mb-1">Start with Bubble</h3>
              <p className="text-sm sm:text-base text-zinc-600">
                Your AI production assistant. Describe what you want to create.
              </p>
            </div>
          </div>
        </button>

        {/* Workflow Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {/* New Project Card - Sky Blue */}
          <button
            onClick={onNewProject}
            className="group relative overflow-hidden rounded-xl p-6 sm:p-8 bg-gradient-to-br from-sky-500 via-sky-600 to-blue-700 hover:from-sky-400 hover:via-sky-500 hover:to-blue-600 shadow-lg shadow-sky-900/20 hover:shadow-sky-900/30 transition-all hover:scale-[1.02] text-left"
          >
            <div className="relative z-10">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 flex items-center justify-center mb-4">
                <Video className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">New Project</h3>
              <p className="text-sm sm:text-base text-white/80">
                Full video production with brief, storyboard, scenes, and timeline.
              </p>
            </div>
            {/* Decorative gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* New Asset Card - Dark Orange */}
          <button
            onClick={onNewAsset}
            className="group relative overflow-hidden rounded-xl p-6 sm:p-8 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-700 hover:from-orange-400 hover:via-orange-500 hover:to-amber-600 shadow-lg shadow-orange-900/20 hover:shadow-orange-900/30 transition-all hover:scale-[1.02] text-left"
          >
            <div className="relative z-10">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 flex items-center justify-center mb-4">
                <Layers className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">New Asset</h3>
              <p className="text-sm sm:text-base text-white/80">
                Create a standalone image, video, audio, or platform.
              </p>
            </div>
            {/* Decorative gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </div>
    </div>
  )
}
