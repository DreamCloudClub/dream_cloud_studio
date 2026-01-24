import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ArrowUpRight } from "lucide-react"

interface UsageData {
  images: { used: number; limit: number }
  videos: { used: number; limit: number }
  storage: { used: number; limit: number; unit: string }
}

interface UsageBarProps {
  usage: UsageData
  plan: string
  onUpgrade?: () => void
}

function UsageItem({
  label,
  used,
  limit,
  unit = "",
}: {
  label: string
  used: number
  limit: number
  unit?: string
}) {
  const percentage = limit > 0 ? (used / limit) * 100 : 0
  const isNearLimit = percentage >= 80
  const displayUsed = unit ? `${used}` : used.toString()
  const displayLimit = unit ? `${limit} ${unit}` : limit.toString()

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-zinc-400">{label}</span>
        <span className={`text-xs font-medium ${isNearLimit ? "text-amber-400" : "text-zinc-300"}`}>
          {displayUsed}/{displayLimit}
        </span>
      </div>
      <Progress
        value={percentage}
        className={`h-1.5 ${isNearLimit ? "[&>div]:bg-amber-500" : "[&>div]:bg-sky-500"}`}
      />
    </div>
  )
}

export function UsageBar({ usage, plan, onUpgrade }: UsageBarProps) {
  return (
    <div className="border-t border-zinc-800 bg-zinc-900/50 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 md:py-5">
      <div className="w-full max-w-[95%] xl:max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
            Usage This Month
          </h3>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-medium text-zinc-300 bg-zinc-800 px-2 py-1 rounded">
              {plan}
            </span>
            {onUpgrade && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onUpgrade}
                className="text-sky-400 hover:text-sky-300 text-xs h-7 px-2"
              >
                Upgrade
                <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 md:gap-8 lg:gap-10">
          <UsageItem
            label="Images"
            used={usage.images.used}
            limit={usage.images.limit}
          />
          <UsageItem
            label="Videos"
            used={usage.videos.used}
            limit={usage.videos.limit}
          />
          <UsageItem
            label="Storage"
            used={usage.storage.used}
            limit={usage.storage.limit}
            unit={usage.storage.unit}
          />
        </div>
      </div>
    </div>
  )
}
