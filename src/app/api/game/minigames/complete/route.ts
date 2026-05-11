import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  GAME_CONFIGS, getCooldownMs, getDifficultyLevel, getWinTarget,
  ER_BOOST_BASE, DIFFICULTY_BOOST_MULT, PART_NAMES, KIT_LABELS,
} from '@/lib/minigame-config'
import type { GameType, DropEntry } from '@/lib/minigame-config'

const VALID_GAMES: GameType[] = ['SPACE_DRIFT', 'BLOCK_FALL', 'SERPENTINE', 'ORBITAL_JUMP', 'SPACE_FROG']
const MIN_GAME_SECONDS = 10  // tempo mínimo aceitável para completar um jogo (anti-cheat básico)

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

  const { gameType, won, score, startedAt } = await req.json() as {
    gameType:  GameType
    won:       boolean
    score:     number
    startedAt: string  // ISO — registrado pelo cliente no início
  }

  if (!VALID_GAMES.includes(gameType)) {
    return NextResponse.json({ error: 'Invalid game type.' }, { status: 400 })
  }
  if (typeof won !== 'boolean' || typeof score !== 'number' || !startedAt) {
    return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })
  }

  // Anti-cheat básico: tempo mínimo de partida
  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000
  if (elapsed < MIN_GAME_SECONDS) {
    return NextResponse.json({ error: 'Game completed too fast.' }, { status: 400 })
  }

  const now    = new Date()
  const cfg    = GAME_CONFIGS[gameType]
  const status = await prisma.minigameStatus.findUnique({
    where: { userId_gameType: { userId: user.id, gameType } },
  })

  // Reseta contadores se janela de 24h passou
  const needsReset       = !status || shouldReset(status.lastResetAt)
  const gamesPlayedToday = needsReset ? 0 : status.gamesPlayedToday
  const dailyWins        = needsReset ? 0 : status.dailyWins
  const totalGamesPlayed = status?.totalGamesPlayed ?? 0

  const difficulty       = getDifficultyLevel(dailyWins)
  const winTarget        = getWinTarget(cfg.winTarget, difficulty)

  // Valida vitória: score deve atingir o alvo
  const actualWon = won && score >= winTarget

  // Calcula cooldown para esta partida (baseado nos jogos JÁ jogados hoje)
  const cooldownMs      = getCooldownMs(gamesPlayedToday)
  const nextPlayableAt  = new Date(now.getTime() + cooldownMs)

  // Novos contadores
  const newGamesPlayed = gamesPlayedToday + 1
  const newDailyWins   = actualWon ? dailyWins + 1 : dailyWins
  const newTotal       = totalGamesPlayed + 1

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
    // Upsert MinigameStatus
    await tx.minigameStatus.upsert({
      where:  { userId_gameType: { userId: user.id, gameType } },
      create: {
        userId: user.id, gameType,
        gamesPlayedToday: newGamesPlayed,
        totalGamesPlayed: newTotal,
        dailyWins:        newDailyWins,
        nextPlayableAt,
        lastResetAt:      now,
      },
      update: {
        gamesPlayedToday: needsReset ? newGamesPlayed : { increment: 1 },
        totalGamesPlayed: { increment: 1 },
        dailyWins:        needsReset
          ? newDailyWins
          : actualWon ? { increment: 1 } : dailyWins,
        nextPlayableAt,
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
        startedAt:   new Date(startedAt),
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
