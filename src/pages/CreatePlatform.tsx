import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import { LibraryLayout } from "@/components/library"
import { useAuth } from "@/contexts/AuthContext"
import { createPlatform } from "@/services/platforms"

export function CreatePlatform() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!user || !name.trim()) return

    setIsSaving(true)
    setError(null)

    try {
      const platform = await createPlatform({
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
      })
      navigate(`/platform/${platform.id}`)
    } catch (err) {
      console.error("Error creating platform:", err)
      setError("Failed to create platform. Please try again.")
      setIsSaving(false)
    }
  }

  return (
    <LibraryLayout>
      <div className="max-w-2xl mx-auto px-6 lg:px-8 py-6 lg:py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/library/platforms")}
            className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Create Platform</h1>
            <p className="text-zinc-400 mt-1">
              Create a new platform to organize your projects
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6 p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Platform Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Western Future, Q1 Campaign..."
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this platform about?"
              rows={4}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500 transition-colors resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => navigate("/library/platforms")}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 font-medium text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="px-6 py-3 bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Create Platform
              </>
            )}
          </button>
        </div>
      </div>
    </LibraryLayout>
  )
}
