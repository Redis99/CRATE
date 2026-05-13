'use client'

import { MinigameShell } from '@/components/game/MinigameShell'
import { BlockFallGame } from '@/components/game/games/BlockFallGame'

export function BlockFallClient() {
  return (
    <MinigameShell gameType="BLOCK_FALL" label="Block Fall">
      {(props) => <BlockFallGame {...props} />}
    </MinigameShell>
  )
}
