import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, User, Mail, Camera } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { HeaderActions } from "@/components/shared"

export function Profile() {
  const navigate = useNavigate()
  const { user, profile, updateProfile, signOut } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name || "")
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState("")

  const initials = (profile?.full_name || user?.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const handleSave = async () => {
    setIsSaving(true)
    setMessage("")
    try {
      await updateProfile({ full_name: fullName })
      setMessage("Profile updated successfully")
    } catch (error) {
      setMessage("Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-900/50 px-4 sm:px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-zinc-100">Profile</h1>
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
        {/* Avatar Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-4">Profile Photo</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-20 w-20">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={fullName} />}
                <AvatarFallback className="bg-zinc-700 text-zinc-200 text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 p-1.5 rounded-full bg-sky-500 hover:bg-sky-400 text-white transition-colors">
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <p className="text-zinc-300 font-medium">{profile?.full_name || "No name set"}</p>
              <p className="text-zinc-500 text-sm">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-4">Account Information</h2>

          <div className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <User className="w-4 h-4 text-zinc-500" />
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
                placeholder="Enter your name"
              />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Mail className="w-4 h-4 text-zinc-500" />
                Email
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full px-4 py-3 bg-zinc-800/30 border border-zinc-700 rounded-xl text-zinc-500 cursor-not-allowed"
              />
              <p className="text-xs text-zinc-500">Email cannot be changed</p>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-zinc-700 text-white rounded-lg transition-colors"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            {message && (
              <p className={`text-sm ${message.includes("success") ? "text-green-400" : "text-red-400"}`}>
                {message}
              </p>
            )}
          </div>
        </div>

        {/* Subscription Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-4">Subscription</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-200 font-medium capitalize">{profile?.subscription_tier || "Trial"} Plan</p>
              <p className="text-zinc-500 text-sm">Manage your subscription and billing</p>
            </div>
            <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors">
              Manage
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
