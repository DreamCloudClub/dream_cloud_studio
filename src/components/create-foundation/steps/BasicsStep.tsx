import { useFoundationWizardStore } from "@/state/foundationWizardStore"

export function BasicsStep() {
  const { name, description, setName, setDescription } = useFoundationWizardStore()

  return (
    <div className="max-w-xl mx-auto px-6 lg:px-8 pt-10 pb-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">
          Name your foundation
        </h2>
        <p className="text-zinc-400">
          Give it a memorable name that describes the visual style
        </p>
      </div>

      <div className="space-y-6">
        {/* Name Input */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Foundation Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Corporate Clean, Summer Vibes, Tech Dark"
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Description Input */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Description
            <span className="text-zinc-500 font-normal ml-2">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the visual style and when to use this foundation..."
            rows={3}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500 resize-none"
          />
        </div>
      </div>
    </div>
  )
}
