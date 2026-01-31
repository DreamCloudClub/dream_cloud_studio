import { Separator } from "react-resizable-panels"
import { cn } from "@/lib/utils"

interface ResizeHandleProps {
  className?: string
  id?: string
}

export function ResizeHandle({ className, id }: ResizeHandleProps) {
  return (
    <Separator
      id={id}
      className={cn(
        "relative flex items-center justify-center",
        "h-2 bg-zinc-800 hover:bg-zinc-700 transition-colors",
        "group cursor-row-resize",
        className
      )}
    >
      {/* Visual indicator */}
      <div className="absolute inset-x-0 flex justify-center">
        <div className="w-12 h-1 rounded-full bg-zinc-600 group-hover:bg-zinc-500 transition-colors" />
      </div>
    </Separator>
  )
}
