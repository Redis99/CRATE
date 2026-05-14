import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  GAME_CONFIGS, getCooldownMs, getDifficultyLevel, getWinTarget,
  getEffectiveDailyWins, getEffectiveGamesPlayed,
  ER_BOOST_BASE, DIFFICULTY_BOOST_MULT, PART_NAMES, KIT_LABELS,
} from '@/lib/minigame-config'
import type { GameType, DropEntry } from '@/lib/minigame-config'

const VALID_GAMES: GameType[] = ['SPACE_DRIFT', 'BLOCK_FALL', 'SERPENTINE', 'ORBITAL_JUMP', 'SPACE_FROG']
const MIN_GAME_SECONDS = 5   // tempo mínimo aceitável para completar um jogo (anti-cheat básico)

function shouldReset(lastResetAt: Date): boolean {
  return Date.now() - lastResetAt.getTime() >= 24 * 60 * 60 * 1000
}

// Sorteia um item do pool usando pesos
function rollDrop(pool: DropEntry[]): DropEntry {
  const total  = pool.reduce((s, e) => s + e.weight, 0)
  let   rand   = Math.random() * total
  for (const entry of pool) {
    rand -= entry.weight
    if (rand <= 0) return entry
  }
  return pool[pool.length - 1]
}

// Sorteia um partType aleatório para a raridade
function rollPartName(rarity: string): string {
  const PART_NAMES_MAP: Record<string, string[]> = {
    COMMON:   ['Energy Core', 'Servo Pack', 'Circuit Board', 'Power Relay', 'Signal Node'],
    UNCOMMON: ['Mining Core', 'AI Chip', 'Charge Crystal', 'Thruster Pack', 'Sensor Array'],
    RARE:     ['Void Crystal', 'Logic Core', 'Genesis Fragment', 'Terrain Scanner', 'Quantum Cell'],
    EPIC:     ['Nexus Shard', 'Plasma Core', 'Singularity Chip', 'Warp Conduit'],
  }
  const names = PART_NAMES_MAP[rarity] ?? PART_NAMES_MAP.COMMON
  return names[Math.floor(Math.random() * names.length)]
}

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { gameType, won, score, sessionToken } = await req.json() as {
    gameType:     GameType
    won:          boolean
    score:        number
    sessionToken: string  // gerado pelo servidor no /start
  }

  if (!VALID_GAMES.includes(gameType)) {
    return NextResponse.json({ error: 'Invalid game type.' }, { status: 400 })
  }
  if (typeof won !== 'boolean' || typeof score !== 'number' || !sessionToken) {
    return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })
  }

  const now = new Date()
  const cfg = GAME_CONFIGS[gameType]

  // Status per-game (dificuldade + cooldown por jogo)
  const [status] = await Promise.all([
    prisma.minigameStatus.findUnique({
      where: { userId_gameType: { userId: user.id, gameType } },
    }),
  ])

  // ── Valida token server-side e calcula elapsed com o startedAt do servidor ──
  if (!status?.pendingToken || status.pendingToken !== sessionToken) {
    return NextResponse.json({ error: 'Invalid or expired session token.' }, { status: 400 })
  }
  const serverStartedAt = status.pendingStartedAt ?? now
  const elapsed         = (now.getTime() - serverStartedAt.getTime()) / 1000
  if (elapsed < MIN_GAME_SECONDS) {
    return NextResponse.json({ error: 'Game completed too fast.' }, { status: 400 })
  }

  // ── Dificuldade (per-game) ────────────────────────────────────────────────
  const needsReset       = shouldReset(status.lastResetAt)
  const gamesPlayedToday = needsReset ? 0 : status.gamesPlayedToday
  const baseDailyWins    = needsReset ? 0 : status.dailyWins
  const totalGamesPlayed = status?.totalGamesPlayed ?? 0

  const dailyWins  = getEffectiveDailyWins(baseDailyWins, status?.lastPlayedAt ?? null, now)
  const difficulty = getDifficultyLevel(dailyWins)
  const winTarget  = getWinTarget(cfg.winTarget, difficulty, cfg.winTargetsByDiff)

  const actualWon   = won && score >= winTarget
  const newDailyWins   = actualWon ? dailyWins + 1 : dailyWins
  const newTotal       = totalGamesPlayed + 1
  const newGamesPlayed = gamesPlayedToday + 1

  // ── Cooldown per-game com redução regressiva ──────────────────────────────
  // Cada jogo tem seu próprio cooldown — jogador pode rodar entre os 5 jogos
  const effectiveGames = getEffectiveGamesPlayed(
    gamesPlayedToday, status?.lastPlayedAt ?? null, now,
  )
  const cooldownMs     = getCooldownMs(effectiveGames)
  const nextPlayableAt = new Date(now.getTime() + cooldownMs)

  // ── Recompensas (apenas na vitória) ──────────────────────────────────────

  let erBoost: number | null = null
  let pendingDrop: object | null = null

  if (actualWon) {
    // ER boost
    const boostMult = DIFFICULTY_BOOST_MULT[difficulty] ?? 1
    erBoost = parseFloat((ER_BOOST_BASE * boostMult).toFixed(2))

    // Item drop (probabilístico)
    if (Math.random() < cfg.dropChance) {
      const entry = rollDrop(cfg.dropPool)
      if (entry.dropType === 'part' && entry.rarity) {
        pendingDrop = {
          dropType: 'part',
          rarity:   entry.rarity,
          partType: rollPartName(entry.rarity),
        }
      } else if (entry.dropType === 'consumable' && entry.kitValue != null) {
        pendingDrop = {
          dropType: 'consumable',
          kitValue: entry.kitValue,
          label:    KIT_LABELS[entry.kitValue] ?? `Repair Kit +${entry.kitValue}`,
        }
      }
    }
  }

  // ── Persiste em transação ─────────────────────────────────────────────────

  const session = await prisma.$transaction(async (tx) => {
    // MinigameStatus — cooldown + dificuldade, ambos per-game
    await tx.minigameStatus.upsert({
      where:  { userId_gameType: { userId: user.id, gameType } },
      create: {
        userId: user.id, gameType,
        gamesPlayedToday: newGamesPlayed,
        totalGamesPlayed: newTotal,
        dailyWins:        newDailyWins,
        nextPlayableAt,
        lastResetAt:      now,
        lastPlayedAt:     now,
      },
      update: {
        gamesPlayedToday: needsReset ? newGamesPlayed : { increment: 1 },
        totalGamesPlayed: { increment: 1 },
        dailyWins: needsReset
          ? newDailyWins
          : actualWon
            ? (dailyWins < baseDailyWins ? dailyWins + 1 : { increment: 1 })
            : dailyWins,  // sem vitória: persiste o valor efetivo (com decay aplicado)
        nextPlayableAt,
        lastPlayedAt:     now,
        pendingToken:     null,
        pendingStartedAt: null,
        ...(needsReset && { lastResetAt: now }),
      },
    })

    // Cria sessão com recompensa pendente
    return tx.minigameSession.create({
      data: {
        userId: user.id,
        gameType,
        won:         actualWon,
        score,
        difficulty,
        startedAt:   serverStartedAt,
        erBoost,
        pendingDrop: pendingDrop ?? undefined,
        claimed:     false,
      },
    })
  })

  return NextResponse.json({
    won:         actualWon,
    score,
    winTarget,
    difficulty,
    cooldownMs,
    nextPlayableAt: nextPlayableAt.toISOString(),
    // Recompensas disponíveis para claim
    sessionId:   actualWon ? session.id : null,
    erBoost:     actualWon ? erBoost : null,
    drop:        actualWon ? pendingDrop : null,
  })
}
