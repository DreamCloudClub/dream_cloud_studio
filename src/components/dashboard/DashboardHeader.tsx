import { Link } from "react-router-dom"
import studioLogo from "@/assets/images/studio_logo.png"
import { HeaderActions } from "@/components/shared"

interface DashboardHeaderProps {
  userName?: string
  userEmail?: string
  userAvatar?: string | null
  onSignOut?: () => void
}

export function DashboardHeader({
  userName = "User",
  userEmail = "",
  userAvatar = null,
  onSignOut,
}: DashboardHeaderProps) {
  return (
    <header className="h-14 border-b border-zinc-800 px-4 sm:px-6 flex items-center justify-between bg-zinc-950 flex-shrink-0">
      <Link to="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
        <img
          src={studioLogo}
          alt="Dream Cloud Studio"
          className="w-8 h-8 rounded-lg object-contain flex-shrink-0"
        />
        <h1 className="text-base sm:text-lg font-semibold text-zinc-100 truncate">Dream Cloud Studio</h1>
      </Link>

      <HeaderActions
        userName={userName}
        userEmail={userEmail}
        userAvatar={userAvatar}
        onSignOut={onSignOut}
      />
    </header>
  )
}
