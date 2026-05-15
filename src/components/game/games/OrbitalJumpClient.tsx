'use client'

import { MinigameShell } from '@/components/game/MinigameShell'
import { OrbitalJumpGame } from '@/components/game/games/OrbitalJumpGame'

export function OrbitalJumpClient() {
  return (
    <MinigameShell gameType="ORBITAL_JUMP" label="Orbital Jump">
      {(props) => <OrbitalJumpGame {...props} />}
    </MinigameShell>
  )
}
