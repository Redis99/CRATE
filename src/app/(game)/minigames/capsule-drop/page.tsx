import { CapsuleDropClient } from '@/components/game/games/CapsuleDropClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Capsule Drop — Inside the Crate',
}

export default function CapsuleDropPage() {
  return (
    <div className="p-6">
      <CapsuleDropClient />
    </div>
  )
}
