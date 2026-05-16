import { MissionsManager } from '@/components/game/MissionsManager'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Missions — Inside the Crate',
}

export default function MissionsPage() {
  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Missions</h2>
        <p className="text-gray-500 text-sm mt-1">Complete objectives to earn permanent rewards. Progress is tracked automatically as you play.</p>
      </div>
      <MissionsManager />
    </div>
  )
}
