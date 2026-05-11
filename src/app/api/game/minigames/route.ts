import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GAME_CONFIGS, getCooldownMs, getDifficultyLevel, getWinTarget } from '@/lib/minigame-config'
import type { GameType } from '@/lib/minigame-config'

const ALL_GAMES: GameType[] = ['SPACE_DRIFT', 'BLOCK_FALL', 'SERPENTINE', 'ORBITAL_JUMP', 'SPACE_FROG']

// Verifica se a contagem diária deve ser resetada (janela de 24h)
function shouldReset(lastResetAt: Date): boolean {
  return Date.now() - lastResetAt.getTime() >= 24 * 60 * 60 * 1000
}

export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()

  const [statuses, boost] = await Promise.all([
    prisma.minigameStatus.findMany({ where: { userId: user.id } }),
    prisma.minigameBoost.findFirst({ where: { userId: user.id } }),
  ])

  const statusMap = new Map(statuses.map((s) => [s.gameType, s]))

  const games = ALL_GAMES.map((gameType) => {
    const cfg    = GAME_CONFIGS[gameType]
    const status = statusMap.get(gameType)

    // Reset diário se necessário
    const gamesPlayedToday = status && !shouldReset(status.lastResetAt) ? status.gamesPlayedToday : 0
    const dailyWins        = status && !shouldReset(status.lastResetAt) ? status.dailyWins : 0
    const difficulty       = getDifficultyLevel(dailyWins)
    const winTarget        = getWinTarget(cfg.winTarget, difficulty)

    // Cooldown restante
    const nextPlayableAt = status?.nextPlayableAt ?? null
    const cooldownMs     = nextPlayableAt && nextPlayableAt > now
      ? nextPlayableAt.getTime() - now.getTime()
      : 0

    return {
      gameType,
      label:       cfg.label,
      description: cfg.description,
      reference:   cfg.reference,
      slug:        cfg.slug,
      timeLimitSec: cfg.timeLimitSec,
      dropChance:  cfg.dropChance,
      difficulty,
      winTarget,
      winLabel:    cfg.winLabel,
      cooldownMs,
      nextPlayableAt: nextPlayableAt?.toISOString() ?? null,
      gamesPlayedToday,
      dailyWins,
    }
  })

  // Boost ativo
  const activeBoost = boost && boost.expiresAt > now
    ? { erFlat: boost.erFlat, expiresAt: boost.expiresAt.toISOString(), totalWins: boost.totalWins }
    : null

  return NextResponse.json({ games, activeBoost })
}
