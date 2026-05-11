import { SpaceDriftClient } from '@/components/game/games/SpaceDriftClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Space Drift — Inside the Crate',
}

export default function SpaceDriftPage() {
  return (
    <div className="p-6">
      <SpaceDriftClient />
    </div>
  )
}
