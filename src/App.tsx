import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { Dashboard } from "@/pages/Dashboard"
import { CreateAssetWizard } from "@/pages/CreateAssetWizard"
import { CreateFoundationWizard } from "@/pages/CreateFoundationWizard"
import { FoundationDetail } from "@/pages/FoundationDetail"
import { Workspace } from "@/pages/Workspace"
import { LibraryAssetsPage, LibraryProjectsPage, LibraryFoundationsPage, LibraryPlatformsPage } from "@/pages/library"
import { PlatformDetail } from "@/pages/PlatformDetail"
import { PlatformEdit } from "@/pages/PlatformEdit"
import { CreatePlatform } from "@/pages/CreatePlatform"
import { CreatorPage } from "@/pages/CreatorPage"
import { AnimationLibrary } from "@/pages/AnimationLibrary"
import { AnimationEditor } from "@/pages/AnimationEditor"
import { DevTools } from "@/pages/DevTools"
import { Profile } from "@/pages/Profile"
import Login from "@/pages/Login"
import SignUp from "@/pages/SignUp"
import AuthCallback from "@/pages/AuthCallback"
import { Loader2 } from "lucide-react"

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Public route wrapper (redirects to dashboard if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/create/asset" element={<ProtectedRoute><CreateAssetWizard /></ProtectedRoute>} />
      <Route path="/create/foundation" element={<ProtectedRoute><CreateFoundationWizard /></ProtectedRoute>} />
      <Route path="/create/platform" element={<ProtectedRoute><CreatePlatform /></ProtectedRoute>} />
      <Route path="/create/:type/:subMode" element={<ProtectedRoute><CreatorPage /></ProtectedRoute>} />
      <Route path="/create/:type" element={<ProtectedRoute><CreatorPage /></ProtectedRoute>} />

      {/* Animation routes */}
      <Route path="/animations" element={<ProtectedRoute><AnimationLibrary /></ProtectedRoute>} />
      <Route path="/animations/new" element={<ProtectedRoute><AnimationEditor /></ProtectedRoute>} />
      <Route path="/animations/:id" element={<ProtectedRoute><AnimationEditor /></ProtectedRoute>} />
      <Route path="/project/:projectId" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
      <Route path="/foundation/:foundationId" element={<ProtectedRoute><FoundationDetail /></ProtectedRoute>} />

      {/* Library routes */}
      <Route path="/library" element={<Navigate to="/library/platforms" replace />} />
      <Route path="/library/platforms" element={<ProtectedRoute><LibraryPlatformsPage /></ProtectedRoute>} />
      <Route path="/library/projects" element={<ProtectedRoute><LibraryProjectsPage /></ProtectedRoute>} />
      <Route path="/library/assets" element={<ProtectedRoute><LibraryAssetsPage /></ProtectedRoute>} />
      <Route path="/library/foundations" element={<ProtectedRoute><LibraryFoundationsPage /></ProtectedRoute>} />

      {/* Platform routes */}
      <Route path="/platform/:platformId" element={<ProtectedRoute><PlatformDetail /></ProtectedRoute>} />
      <Route path="/platform/:platformId/edit" element={<ProtectedRoute><PlatformEdit /></ProtectedRoute>} />

      {/* User routes */}
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/dev" element={<ProtectedRoute><DevTools /></ProtectedRoute>} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
