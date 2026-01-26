import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Database, Trash2, RefreshCw, Check, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { seedAllData, clearUserData, clearAndReseed } from "@/services/seedData"
import { HeaderActions } from "@/components/shared"

type Status = "idle" | "loading" | "success" | "error"

export function DevTools() {
  const navigate = useNavigate()
  const { user, profile, signOut, isAuthenticated } = useAuth()
  const [seedStatus, setSeedStatus] = useState<Status>("idle")
  const [clearStatus, setClearStatus] = useState<Status>("idle")
  const [reseedStatus, setReseedStatus] = useState<Status>("idle")
  const [message, setMessage] = useState("")

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-zinc-100 mb-2">Authentication Required</h1>
          <p className="text-zinc-400 mb-4">You must be logged in to use Dev Tools.</p>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-400"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  const handleSeed = async () => {
    setSeedStatus("loading")
    setMessage("")
    try {
      const result = await seedAllData(user.id)
      setSeedStatus("success")
      setMessage(`Seeded: ${result.platforms} platforms, ${result.projects} projects, ${result.assets} assets`)
    } catch (error) {
      setSeedStatus("error")
      setMessage(error instanceof Error ? error.message : "Failed to seed data")
    }
  }

  const handleClear = async () => {
    if (!confirm("Are you sure you want to delete ALL your data? This cannot be undone.")) {
      return
    }
    setClearStatus("loading")
    setMessage("")
    try {
      await clearUserData(user.id)
      setClearStatus("success")
      setMessage("All data cleared successfully")
    } catch (error) {
      setClearStatus("error")
      setMessage(error instanceof Error ? error.message : "Failed to clear data")
    }
  }

  const handleReseed = async () => {
    if (!confirm("This will DELETE all existing data and replace with fresh seed data. Continue?")) {
      return
    }
    setReseedStatus("loading")
    setMessage("")
    try {
      const result = await clearAndReseed(user.id)
      setReseedStatus("success")
      setMessage(`Reseeded: ${result.platforms} platforms, ${result.projects} projects, ${result.assets} assets`)
    } catch (error) {
      setReseedStatus("error")
      setMessage(error instanceof Error ? error.message : "Failed to reseed data")
    }
  }

  const getButtonContent = (status: Status, defaultText: string) => {
    switch (status) {
      case "loading":
        return <RefreshCw className="w-4 h-4 animate-spin" />
      case "success":
        return <Check className="w-4 h-4" />
      case "error":
        return <AlertCircle className="w-4 h-4" />
      default:
        return defaultText
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-900/50 px-4 sm:px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-zinc-100">Dev Tools</h1>
        </div>
        <HeaderActions
          userName={profile?.full_name || user?.email?.split("@")[0] || "User"}
          userEmail={user?.email || ""}
          userAvatar={profile?.avatar_url}
          onSignOut={signOut}
        />
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* User Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-4">Current User</h2>
          <div className="space-y-2">
            <p className="text-zinc-200">
              <span className="text-zinc-500">Email:</span> {user.email}
            </p>
            <p className="text-zinc-200">
              <span className="text-zinc-500">User ID:</span>{" "}
              <code className="text-xs bg-zinc-800 px-2 py-1 rounded">{user.id}</code>
            </p>
          </div>
        </div>

        {/* Database Actions */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-4">Database Actions</h2>

          <div className="space-y-4">
            {/* Seed Data */}
            <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
              <div>
                <h3 className="font-medium text-zinc-200">Seed Database</h3>
                <p className="text-sm text-zinc-500">Add fake projects, assets, and platforms to your account</p>
              </div>
              <button
                onClick={handleSeed}
                disabled={seedStatus === "loading"}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-zinc-700 text-white rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                {getButtonContent(seedStatus, "Seed")}
              </button>
            </div>

            {/* Clear Data */}
            <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
              <div>
                <h3 className="font-medium text-zinc-200">Clear All Data</h3>
                <p className="text-sm text-zinc-500">Delete all projects, assets, and platforms from your account</p>
              </div>
              <button
                onClick={handleClear}
                disabled={clearStatus === "loading"}
                className="px-4 py-2 bg-red-500 hover:bg-red-400 disabled:bg-zinc-700 text-white rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {getButtonContent(clearStatus, "Clear")}
              </button>
            </div>

            {/* Reseed Data */}
            <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
              <div>
                <h3 className="font-medium text-zinc-200">Clear & Reseed</h3>
                <p className="text-sm text-zinc-500">Delete everything and start fresh with new seed data</p>
              </div>
              <button
                onClick={handleReseed}
                disabled={reseedStatus === "loading"}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 text-white rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {getButtonContent(reseedStatus, "Reseed")}
              </button>
            </div>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`mt-4 p-4 rounded-lg ${
              seedStatus === "error" || clearStatus === "error" || reseedStatus === "error"
                ? "bg-red-500/20 text-red-300"
                : "bg-green-500/20 text-green-300"
            }`}>
              {message}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-4">Seed Data Includes</h2>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li>- 4 Platforms (Foundations): Corporate Clean, Playful Social, Tech Minimal, Warm Natural</li>
            <li>- 6 Projects: Product Launch, Brand Story, Tutorial, Social Ad, Testimonial, Event Reel</li>
            <li>- 20 Assets: Scenes, Stages, Characters, Weather, Props, Effects, Audio</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
