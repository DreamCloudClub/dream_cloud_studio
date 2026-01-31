import { useWorkspaceStore } from "@/state/workspaceStore"
import { EditorLayout } from "./editor"

export function EditorPage() {
  const { project } = useWorkspaceStore()

  if (!project) return null

  const aspectRatio = project.brief?.aspectRatio || "16:9"

  return (
    <div className="h-full overflow-hidden">
      <EditorLayout aspectRatio={aspectRatio} />
    </div>
  )
}
