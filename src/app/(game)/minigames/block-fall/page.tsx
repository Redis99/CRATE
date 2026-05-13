import { BlockFallClient } from '@/components/game/games/BlockFallClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Block Fall — Inside the Crate',
}

export default function BlockFallPage() {
  return (
    <div className="p-6">
      <BlockFallClient />
    </div>
  )
}
