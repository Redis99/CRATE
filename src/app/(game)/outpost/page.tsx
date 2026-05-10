import { OutpostManager } from '@/components/game/OutpostManager'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Outpost — Inside the Crate',
}

export default function OutpostPage() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Outpost</h2>
        <p className="text-gray-500 text-sm mt-1">Deploy robots to mine and earn rewards</p>
      </div>
      <OutpostManager />
    </div>
  )
}
