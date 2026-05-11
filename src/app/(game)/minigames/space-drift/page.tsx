import { MinigameShell } from '@/components/game/MinigameShell'
import { SpaceDriftGame } from '@/components/game/games/SpaceDriftGame'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Space Drift — Inside the Crate',
}

export default function SpaceDriftPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <MinigameShell gameType="SPACE_DRIFT" label="Space Drift">
        {(props) => <SpaceDriftGame {...props} />}
      </MinigameShell>
    </div>
  )
}
