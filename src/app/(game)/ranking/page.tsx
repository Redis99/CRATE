import { RankingManager } from '@/components/game/RankingManager'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mining Race — Inside the Crate',
}

export default function RankingPage() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Mining Race</h2>
        <p className="text-gray-500 text-sm mt-1">
          Weekly competition based on total Extraction Rate contributed. Rewards are delivered every Monday and do not count toward the weekly lootbox limit.
        </p>
      </div>
      <RankingManager />
    </div>
  )
}
