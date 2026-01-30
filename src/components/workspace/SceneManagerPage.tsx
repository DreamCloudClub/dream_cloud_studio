import { Film } from "lucide-react"

export function SceneManagerPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900/50 p-8">
      <div className="text-center max-w-md">
        <Film className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-zinc-300 mb-2">
          Scene Manager
        </h2>
        <p className="text-zinc-500 mb-4">
          The scene manager has been replaced with the new timeline editor.
          Use the Editor tab to arrange and manage your clips on the timeline.
        </p>
        <p className="text-zinc-600 text-sm">
          Drag assets from the Control Panel to the timeline to add them to your video.
        </p>
      </div>
    </div>
  )
}
