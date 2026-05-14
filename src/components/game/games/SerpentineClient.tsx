'use client'

import { MinigameShell } from '@/components/game/MinigameShell'
import { SerpentineGame } from '@/components/game/games/SerpentineGame'

export function SerpentineClient() {
  return (
    <MinigameShell gameType="SERPENTINE" label="Serpentine">
      {(props) => <SerpentineGame {...props} />}
    </MinigameShell>
  )
}
