import { SerpentineClient } from '@/components/game/games/SerpentineClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Serpentine — Inside the Crate',
}

export default function SerpentinePage() {
  return (
    <div className="p-6">
      <SerpentineClient />
    </div>
  )
}
