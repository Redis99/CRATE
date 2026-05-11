import { MarketManager } from '@/components/game/MarketManager'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Market — Inside the Crate',
}

export default function MarketPage() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">P2P Market</h2>
        <p className="text-gray-500 text-sm mt-1">
          Buy and sell robots, equipment and upgrades · 5% fee on sales
        </p>
      </div>
      <MarketManager />
    </div>
  )
}
