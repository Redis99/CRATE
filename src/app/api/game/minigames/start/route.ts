import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GAME_CONFIGS, getCooldownMs, getDifficultyLevel, getWinTarget } from '@/lib/minigame-config'
import type { GameType } from '@/lib/minigame-config'

const VALID_GAMES: GameType[] = ['SPACE_DRIFT', 'BLOCK_FALL', 'SERPENTINE', 'ORBITAL_JUMP', 'SPACE_FROG']

function shouldReset(lastResetAt: Date): boolean {
  return Date.now() - lastResetAt.getTime() >= 24 * 60 * 60 * 1000
}

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { gameType } = await req.json() as { gameType: GameType }
  if (!VALID_GAMES.includes(gameType)) {
    return NextResponse.json({ error: 'Invalid game type.' }, { status: 400 })
  }

  const now    = new Date()
  const cfg    = GAME_CONFIGS[gameType]
  const status = await prisma.minigameStatus.findUnique({
    where: { userId_gameType: { userId: user.id, gameType } },
  })

  // Verifica cooldown
  if (status?.nextPlayableAt && status.nextPlayableAt > now) {
    const remainingMs = status.nextPlayableAt.getTime() - now.getTime()
    return NextResponse.json({
      error: 'Cooldown active.',
      cooldownMs: remainingMs,
      nextPlayableAt: status.nextPlayableAt.toISOString(),
    }, { status: 429 })
  }

  // Lê contadores diários (reseta se necessário)
  const needsReset       = !status || shouldReset(status.lastResetAt)
  const gamesPlayedToday = needsReset ? 0 : status.gamesPlayedToday
  const dailyWins        = needsReset ? 0 : status.dailyWins
  const totalGamesPlayed = status?.totalGamesPlayed ?? 0

  const difficulty = getDifficultyLevel(dailyWins)
  const winTarget  = getWinTarget(cfg.winTarget, difficulty)

  // Registra início (sem cooldown ainda — aplicado no /complete)
  return NextResponse.json({
    startedAt:  now.toISOString(),
    gameType,
    difficulty,
    winTarget,
    winLabel:    cfg.winLabel,
    timeLimitSec: cfg.timeLimitSec,
    gamesPlayedToday,
  })
}
