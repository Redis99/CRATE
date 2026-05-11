import { MinigamesLobby } from '@/components/game/MinigamesLobby'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Minigames — Inside the Crate',
}

export default function MinigamesPage() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Minigames</h2>
        <p className="text-gray-500 text-sm mt-1">
          Win games to earn temporary ER boosts and item drops. Harder difficulty = bigger rewards.
        </p>
      </div>
      <MinigamesLobby />
    </div>
  )
}
