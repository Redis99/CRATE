import { CodexManager } from '@/components/game/CodexManager'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Codex — Inside the Crate',
}

export default function CodexPage() {
  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Codex</h2>
        <p className="text-gray-500 text-sm mt-1">Register robots to earn permanent bonuses. Collections completed grant fleet-wide rewards.</p>
      </div>
      <CodexManager />
    </div>
  )
}
