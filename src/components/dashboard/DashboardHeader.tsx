import { Mic, Settings, LogOut, BarChart3, Palette, FolderOpen, Image } from "lucide-react"
import studioLogo from "@/assets/images/studio_logo.png"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DashboardHeaderProps {
  userName?: string
  userEmail?: string
  userAvatar?: string | null
}

export function DashboardHeader({
  userName = "Jane Smith",
  userEmail = "jane@company.com",
  userAvatar = null
}: DashboardHeaderProps) {
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="border-b border-zinc-800 px-4 sm:px-6 lg:px-8 xl:px-10 py-3 md:py-4 flex items-center justify-between bg-zinc-950">
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
        <img
          src={studioLogo}
          alt="Dream Cloud Studio"
          className="w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-lg object-contain flex-shrink-0"
        />
        <h1 className="text-base sm:text-lg md:text-xl font-semibold text-zinc-100 truncate">Dream Cloud Studio</h1>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-100">
          <Mic className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-100">
          <Settings className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-1">
              <Avatar className="h-8 w-8">
                {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                <AvatarFallback className="bg-zinc-700 text-zinc-200 text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs leading-none text-zinc-400">{userEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <BarChart3 className="mr-2 h-4 w-4" />
              Usage & Billing
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Palette className="mr-2 h-4 w-4" />
              Manage Foundations
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FolderOpen className="mr-2 h-4 w-4" />
              All Projects
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Image className="mr-2 h-4 w-4" />
              All Assets
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-400 focus:text-red-400">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
