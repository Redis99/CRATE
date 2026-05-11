'use client'

import { MinigameShell } from '@/components/game/MinigameShell'
import { SpaceDriftGame } from '@/components/game/games/SpaceDriftGame'

export function SpaceDriftClient() {
  return (
    <MinigameShell gameType="SPACE_DRIFT" label="Space Drift">
      {(props) => <SpaceDriftGame {...props} />}
    </MinigameShell>
  )
}
