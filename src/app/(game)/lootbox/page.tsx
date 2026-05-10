import { LootboxManager } from '@/components/game/LootboxManager'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lootboxes — Inside the Crate',
}

export default function LootboxPage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Lootboxes</h2>
        <p className="text-gray-500 text-sm mt-1">Buy and open crates to get robots, equipment and crafting parts</p>
      </div>
      <LootboxManager />
    </div>
  )
}
