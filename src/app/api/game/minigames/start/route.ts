import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import {
  GAME_CONFIGS, getDifficultyLevel, getWinTarget, getEffectiveDailyWins,
} from '@/lib/minigame-config'
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

  const now = new Date()
  const cfg = GAME_CONFIGS[gameType]

  // Busca status per-game (cooldown + dificuldade)
  const status = await prisma.minigameStatus.findUnique({
    where: { userId_gameType: { userId: user.id, gameType } },
  })

  // Verifica cooldown PER-GAME
  if (status?.nextPlayableAt && status.nextPlayableAt > now) {
    const remainingMs = status.nextPlayableAt.getTime() - now.getTime()
    return NextResponse.json({
      error: 'Cooldown active.',
      cooldownMs: remainingMs,
      nextPlayableAt: status.nextPlayableAt.toISOString(),
    }, { status: 429 })
  }

  // Dificuldade per-game (sem alteração)
  const needsReset      = !status || shouldReset(status.lastResetAt)
  const baseDailyWins   = needsReset ? 0 : status.dailyWins
  const effectiveDailyWins = getEffectiveDailyWins(
    baseDailyWins, status?.lastPlayedAt ?? null, now,
  )

  const difficulty = getDifficultyLevel(effectiveDailyWins)
  const winTarget  = getWinTarget(cfg.winTarget, difficulty, cfg.winTargetsByDiff)

  // Gera token de sessão server-side — o /complete valida este token
  const pendingToken = randomUUID()
  await prisma.minigameStatus.upsert({
    where:  { userId_gameType: { userId: user.id, gameType } },
    create: {
      userId: user.id, gameType,
      pendingToken, pendingStartedAt: now,
    },
    update: { pendingToken, pendingStartedAt: now },
  })

  return NextResponse.json({
    sessionToken: pendingToken,
    gameType,
    difficulty,
    winTarget,
    winLabel:     cfg.winLabel,
    timeLimitSec: cfg.timeLimitSec,
    controls:     cfg.controls,
  })
}
