import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  GAME_CONFIGS, getDifficultyLevel, getWinTarget,
  getEffectiveDailyWins,
} from '@/lib/minigame-config'
import type { GameType } from '@/lib/minigame-config'

const ALL_GAMES: GameType[] = ['SPACE_DRIFT', 'BLOCK_FALL', 'SERPENTINE', 'ORBITAL_JUMP', 'SPACE_FROG']

function shouldReset(lastResetAt: Date): boolean {
  return Date.now() - lastResetAt.getTime() >= 24 * 60 * 60 * 1000
}

export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()

  const [statuses, activeBoosts] = await Promise.all([
    prisma.minigameStatus.findMany({ where: { userId: user.id } }),
    prisma.minigameBoost.findMany({
      where:   { userId: user.id, expiresAt: { gt: now } },
      select:  { erFlat: true, expiresAt: true },
      orderBy: { expiresAt: 'asc' },
    }),
  ])

  const statusMap = new Map(statuses.map((s) => [s.gameType, s]))

  const games = ALL_GAMES.map((gameType) => {
    const cfg    = GAME_CONFIGS[gameType]
    const status = statusMap.get(gameType)

    const baseDailyWins      = status && !shouldReset(status.lastResetAt) ? status.dailyWins : 0
    const effectiveDailyWins = getEffectiveDailyWins(
      baseDailyWins, status?.lastPlayedAt ?? null, now,
    )
    const difficulty = getDifficultyLevel(effectiveDailyWins)
    const winTarget  = getWinTarget(cfg.winTarget, difficulty, cfg.winTargetsByDiff)

    // Cooldown per-game
    const nextPlayableAt = status?.nextPlayableAt ?? null
    const cooldownMs     = nextPlayableAt && nextPlayableAt > now
      ? nextPlayableAt.getTime() - now.getTime()
      : 0

    return {
      gameType,
      label:          cfg.label,
      description:    cfg.description,
      slug:           cfg.slug,
      timeLimitSec:   cfg.timeLimitSec,
      dropChance:     cfg.dropChance,
      available:      cfg.available,
      controls:       cfg.controls,
      difficulty,
      winTarget,
      winLabel:       cfg.winLabel,
      cooldownMs,
      nextPlayableAt: nextPlayableAt?.toISOString() ?? null,
    }
  })

  // Agrega entradas ativas: soma ER + primeira/última expiração
  const activeBoost = activeBoosts.length > 0
    ? {
        totalErFlat:     activeBoosts.reduce((s, b) => s + b.erFlat, 0),
        count:           activeBoosts.length,
        earliestExpiry:  activeBoosts[0].expiresAt.toISOString(),                          // já ordenado asc
        latestExpiry:    activeBoosts[activeBoosts.length - 1].expiresAt.toISOString(),
      }
    : null

  return NextResponse.json({ games, activeBoost })
}
