import { Upload, X, Image, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useFoundationWizardStore,
  MOOD_OPTIONS,
} from "@/state/foundationWizardStore"

export function MoodStep() {
  const {
    mood,
    moodImages,
    setMood,
    addMoodImage,
    removeMoodImage,
  } = useFoundationWizardStore()

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file)
      addMoodImage({
        id: crypto.randomUUID(),
        url,
        name: file.name,
      })
    })

    // Reset input
    e.target.value = ""
  }

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-8 pt-10 pb-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">
          Set the mood
        </h2>
        <p className="text-zinc-400">
          Define the emotional feel and add reference images
        </p>
      </div>

      {/* Mood Selection */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-zinc-300 mb-3">
          Overall Mood
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {MOOD_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setMood(mood === option.id ? null : option.id)}
              className={cn(
                "relative p-4 rounded-xl border-2 text-left transition-all",
                mood === option.id
                  ? "border-sky-500 bg-sky-500/10"
                  : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
              )}
            >
              {mood === option.id && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <h3 className="font-medium text-zinc-100 mb-1">{option.label}</h3>
              <p className="text-xs text-zinc-500">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Mood Board Images */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-3">
          Reference Images
          <span className="text-zinc-500 font-normal ml-2">(optional)</span>
        </label>
        <p className="text-sm text-zinc-500 mb-4">
          Upload images that capture the visual feel you're going for
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Uploaded Images */}
          {moodImages.map((image) => (
            <div
              key={image.id}
              className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800 group"
            >
              <img
                src={image.url}
                alt={image.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => removeMoodImage(image.id)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}

          {/* Upload Button */}
          {moodImages.length < 8 && (
            <label className="aspect-square rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-500 flex flex-col items-center justify-center cursor-pointer transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-6 h-6 text-zinc-500 mb-2" />
              <span className="text-xs text-zinc-500">Upload</span>
            </label>
          )}

          {/* Empty Placeholders */}
          {moodImages.length === 0 && (
            <>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-center"
                >
                  <Image className="w-8 h-8 text-zinc-700" />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
