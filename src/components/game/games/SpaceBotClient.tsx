'use client'

import { MinigameShell } from '@/components/game/MinigameShell'
import { SpaceBotGame } from '@/components/game/games/SpaceBotGame'

export function SpaceBotClient() {
  return (
    <MinigameShell gameType="SPACE_FROG" label="Space Bot">
      {(props) => <SpaceBotGame {...props} />}
    </MinigameShell>
  )
}
