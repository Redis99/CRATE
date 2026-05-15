import { SpaceBotClient } from '@/components/game/games/SpaceBotClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Space Bot — Inside the Crate',
}

export default function SpaceBotPage() {
  return (
    <div className="p-6">
      <SpaceBotClient />
    </div>
  )
}
