'use client'

import { MinigameShell } from '@/components/game/MinigameShell'
import { CapsuleDropGame } from '@/components/game/games/CapsuleDropGame'

export function CapsuleDropClient() {
  return (
    <MinigameShell gameType="BLOCK_FALL" label="Capsule Drop">
      {(props) => <CapsuleDropGame {...props} />}
    </MinigameShell>
  )
}
