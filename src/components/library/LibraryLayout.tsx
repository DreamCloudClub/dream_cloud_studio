import { useState } from "react"
import { DashboardHeader, DashboardNav } from "@/components/dashboard"
import { BubblePanel } from "@/components/create"
import { InspectorPanel, LibraryPageType } from "@/components/workspace"
import { useUIStore } from "@/state/uiStore"
import { useAuth } from "@/contexts/AuthContext"

interface LibraryLayoutProps {
  children: React.ReactNode
  libraryPage?: LibraryPageType
}

export function LibraryLayout({ children, libraryPage }: LibraryLayoutProps) {
  const { isBubbleCollapsed, toggleBubbleCollapsed } = useUIStore()
  const { user, profile, signOut } = useAuth()
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false)

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      <DashboardHeader
        userName={profile?.full_name || user?.email?.split("@")[0] || "User"}
        userEmail={user?.email || ""}
        userAvatar={profile?.avatar_url}
        onSignOut={signOut}
      />

      {/* Main Content with Bubble Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Bubble Panel (Left Sidebar) */}
        <div
          className={`${
            isBubbleCollapsed ? "w-16" : "w-80"
          } flex-shrink-0 hidden md:flex transition-all duration-300`}
        >
          <BubblePanel
            isCollapsed={isBubbleCollapsed}
            onToggleCollapse={toggleBubbleCollapsed}
          />
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>

        {/* Inspector Panel (Right Sidebar) */}
        <div
          className={`${
            isInspectorCollapsed ? "w-16" : "w-80"
          } flex-shrink-0 hidden md:flex transition-all duration-300 overflow-hidden`}
        >
          <InspectorPanel
            isCollapsed={isInspectorCollapsed}
            onToggleCollapse={() => setIsInspectorCollapsed(!isInspectorCollapsed)}
            libraryPage={libraryPage}
          />
        </div>
      </div>

      <DashboardNav />
    </div>
  )
}
