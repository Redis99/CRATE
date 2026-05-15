import { OrbitalJumpClient } from '@/components/game/games/OrbitalJumpClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Orbital Jump — Inside the Crate',
}

export default function OrbitalJumpPage() {
  return (
    <div className="p-6">
      <OrbitalJumpClient />
    </div>
  )
}
