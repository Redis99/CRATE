/**
 * Configuração central dos minigames.
 * Boost e dificuldade serão ajustáveis via painel admin no mainnet.
 */

export type GameType = 'SPACE_DRIFT' | 'BLOCK_FALL' | 'SERPENTINE' | 'ORBITAL_JUMP' | 'SPACE_FROG'
export type DropType = 'part' | 'consumable'
export type PartRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC'

// ─── Boost de ER ──────────────────────────────────────────────────────────────

export const ER_BOOST_BASE = 5 // +5 ER flat por vitória (nível 1)

// Multiplicadores por dificuldade
export const DIFFICULTY_BOOST_MULT: Record<number, number> = {
  1: 1.00,  // +5.0 ER
  2: 1.30,  // +6.5 ER
  3: 1.70,  // +8.5 ER
  4: 2.20,  // +11.0 ER
}

// Duração do boost baseada no streak de vitórias (reseta após 24h sem vencer)
export function getBoostDurationHours(streakWins: number): number {
  if (streakWins >= 100) return 168
  if (streakWins >= 80)  return 140
  if (streakWins >= 60)  return 112
  if (streakWins >= 40)  return 84
  if (streakWins >= 20)  return 56
  return 24
}

// ─── Dificuldade por vitórias no dia ─────────────────────────────────────────

export function getDifficultyLevel(dailyWins: number): number {
  if (dailyWins >= 9) return 4
  if (dailyWins >= 6) return 3
  if (dailyWins >= 3) return 2
  return 1
}

// dailyWins mínimo para cada nível (threshold de entrada)
const DIFFICULTY_THRESHOLDS: Record<number, number> = { 1: 0, 2: 3, 3: 6, 4: 9 }

// Redução de dificuldade por inatividade: -1 nível a cada 8h sem jogar
// Retorna dailyWins efetivo levando em conta a inatividade
export function getEffectiveDailyWins(
  dailyWins: number,
  lastPlayedAt: Date | null,
  now: Date,
): number {
  if (!lastPlayedAt) return dailyWins
  const hoursInactive   = (now.getTime() - lastPlayedAt.getTime()) / 3_600_000
  const levelsToReduce  = Math.floor(hoursInactive / 8)
  if (levelsToReduce <= 0) return dailyWins

  const currentLevel = getDifficultyLevel(dailyWins)
  const newLevel     = Math.max(1, currentLevel - levelsToReduce)
  return DIFFICULTY_THRESHOLDS[newLevel]
}

// Score mínimo por nível de dificuldade (multiplicadores do CONTEXT.md)
export function getWinTarget(
  baseTarget: number,
  difficulty: number,
  winTargetsByDiff?: Record<number, number>,
): number {
  if (winTargetsByDiff?.[difficulty] != null) return winTargetsByDiff[difficulty]
  const mult: Record<number, number> = { 1: 1.0, 2: 1.3, 3: 1.7, 4: 2.2 }
  return Math.round(baseTarget * (mult[difficulty] ?? 1))
}

// ─── Cooldown global ──────────────────────────────────────────────────────────

// Redução regressiva: -10 jogos por hora de inatividade
// Incentiva retornos periódicos ao longo do dia (mais sessões = mais exposição a anúncios)
const COOLDOWN_DECAY_RATE = 10 // jogos/hora

export function getEffectiveGamesPlayed(
  globalGamesPlayedToday: number,
  globalLastPlayedAt: Date | null,
  now: Date,
): number {
  if (!globalLastPlayedAt || globalGamesPlayedToday === 0) return globalGamesPlayedToday
  const hoursInactive = (now.getTime() - globalLastPlayedAt.getTime()) / 3_600_000
  const reduction     = Math.floor(hoursInactive * COOLDOWN_DECAY_RATE)
  return Math.max(0, globalGamesPlayedToday - reduction)
}

// Retorna cooldown em ms baseado nos jogos globais efetivos
export function getCooldownMs(effectiveGamesPlayed: number): number {
  if (effectiveGamesPlayed >= 100)
    return (1.5 * 100 + 10 * (effectiveGamesPlayed - 100)) * 1000
  return effectiveGamesPlayed * 1500 // +1500ms por jogo (0 na 1ª partida)
}

// Verifica se o contador global deve resetar (janela de 24h)
export function shouldResetGlobal(lastResetAt: Date): boolean {
  return Date.now() - lastResetAt.getTime() >= 24 * 60 * 60 * 1000
}

// ─── Configuração por jogo ────────────────────────────────────────────────────

export interface GameConfig {
  label:           string
  description:     string
  reference:       string       // jogo clássico de referência
  timeLimitSec:    number       // tempo limite em segundos
  dropChance:      number       // probabilidade de drop (0–1)
  winTarget:       number       // score/objetivo base para vitória no nível 1
  winLabel:        string       // como o objetivo é descrito na UI
  dropPool:        DropEntry[]  // pool de itens possíveis
  slug:            string       // rota: /minigames/[slug]
  // Alvos exatos por dificuldade (substitui o cálculo genérico quando presente)
  winTargetsByDiff?: Record<number, number>
}

export interface DropEntry {
  dropType:  DropType
  rarity?:   PartRarity       // para partes
  kitValue?: number           // para kits (5 | 25 | 50 | 75 | 100)
  weight:    number           // peso relativo (soma dos pesos = 100)
  maxKitValue?: number        // kit máximo permitido para este jogo
}

export const GAME_CONFIGS: Record<GameType, GameConfig> = {
  SPACE_DRIFT: {
    label:        'Space Drift',
    description:  'Destroy all enemy ships before time runs out.',
    reference:    'Space Invaders',
    timeLimitSec: 60,
    dropChance:   0.15,
    winTarget:    10,
    winLabel:     'ships destroyed',
    slug:         'space-drift',
    // Todas as naves devem ser destruídas — alvos exatos por nível
    // Lv1: 5×2=10 | Lv2: 7×2=14 | Lv3: 6×3=18 | Lv4: 8×3=24
    winTargetsByDiff: { 1: 10, 2: 14, 3: 18, 4: 24 },
    dropPool: [
      { dropType: 'part',       rarity: 'COMMON',   weight: 70 },
      { dropType: 'part',       rarity: 'UNCOMMON', weight: 20 },
      { dropType: 'consumable', kitValue: 5,         weight:  6, maxKitValue: 25 },
      { dropType: 'consumable', kitValue: 25,        weight:  2, maxKitValue: 25 },
      { dropType: 'part',       rarity: 'RARE',     weight:  2 },
    ],
  },

  BLOCK_FALL: {
    label:        'Block Fall',
    description:  'Clear lines to score points. Reach 50 to win.',
    reference:    'Tetris',
    timeLimitSec: 60,
    dropChance:   0.18,
    winTarget:    50,   // 50 pontos (10 por linha) = 5 linhas no nível 1
    winLabel:     'points',
    slug:         'block-fall',
    dropPool: [
      { dropType: 'part',       rarity: 'COMMON',   weight: 65 },
      { dropType: 'part',       rarity: 'UNCOMMON', weight: 20 },
      { dropType: 'consumable', kitValue: 5,         weight:  8, maxKitValue: 50 },
      { dropType: 'consumable', kitValue: 25,        weight:  4, maxKitValue: 50 },
      { dropType: 'part',       rarity: 'RARE',     weight:  3 },
    ],
  },

  SERPENTINE: {
    label:        'Serpentine',
    description:  'Eat 5 fruits without hitting walls or yourself.',
    reference:    'Snake',
    timeLimitSec: 60,
    dropChance:   0.12,
    winTarget:    5,    // 5 frutas = 5 pontos no nível 1
    winLabel:     'fruits',
    slug:         'serpentine',
    dropPool: [
      { dropType: 'part',       rarity: 'COMMON',   weight: 75 },
      { dropType: 'consumable', kitValue: 5,         weight: 10, maxKitValue: 25 },
      { dropType: 'consumable', kitValue: 25,        weight:  5, maxKitValue: 25 },
      { dropType: 'part',       rarity: 'UNCOMMON', weight: 10 },
    ],
  },

  ORBITAL_JUMP: {
    label:        'Orbital Jump',
    description:  'Navigate through 5 obstacles without crashing.',
    reference:    'Flappy Bird',
    timeLimitSec: 60,
    dropChance:   0.10,
    winTarget:    5,    // 5 obstáculos no nível 1
    winLabel:     'obstacles',
    slug:         'orbital-jump',
    dropPool: [
      { dropType: 'part',       rarity: 'COMMON',   weight: 60 },
      { dropType: 'part',       rarity: 'UNCOMMON', weight: 25 },
      { dropType: 'consumable', kitValue: 5,         weight:  7, maxKitValue: 25 },
      { dropType: 'consumable', kitValue: 25,        weight:  3, maxKitValue: 25 },
      { dropType: 'part',       rarity: 'EPIC',     weight:  5 },
    ],
  },

  SPACE_FROG: {
    label:        'Space Frog',
    description:  'Cross the void to the other side. Cross once to win.',
    reference:    'Frogger',
    timeLimitSec: 60,
    dropChance:   0.20,
    winTarget:    1,    // 1 travessia no nível 1
    winLabel:     'crossings',
    slug:         'space-frog',
    dropPool: [
      { dropType: 'part',       rarity: 'COMMON',   weight: 60 },
      { dropType: 'part',       rarity: 'UNCOMMON', weight: 20 },
      { dropType: 'consumable', kitValue: 5,         weight:  8, maxKitValue: 100 },
      { dropType: 'consumable', kitValue: 25,        weight:  4, maxKitValue: 100 },
      { dropType: 'consumable', kitValue: 50,        weight:  2, maxKitValue: 100 },
      { dropType: 'consumable', kitValue: 75,        weight:  1, maxKitValue: 100 },
      { dropType: 'part',       rarity: 'RARE',     weight:  4 },
      { dropType: 'part',       rarity: 'EPIC',     weight:  1 },
    ],
  },
}

// ─── Lookup ───────────────────────────────────────────────────────────────────

export function getGameConfig(gameType: GameType): GameConfig {
  return GAME_CONFIGS[gameType]
}

// Nomes das partes a sortear (partType genérico por raridade)
export const PART_NAMES: Record<PartRarity, string[]> = {
  COMMON:   ['Energy Core', 'Servo Pack', 'Circuit Board', 'Power Relay', 'Signal Node'],
  UNCOMMON: ['Mining Core', 'AI Chip', 'Charge Crystal', 'Thruster Pack', 'Sensor Array'],
  RARE:     ['Void Crystal', 'Logic Core', 'Genesis Fragment', 'Terrain Scanner', 'Quantum Cell'],
  EPIC:     ['Nexus Shard', 'Plasma Core', 'Singularity Chip', 'Warp Conduit'],
}

// Kit label para exibição
export const KIT_LABELS: Record<number, string> = {
  5:   'Basic Repair Kit',
  25:  'Standard Repair Kit',
  50:  'Advanced Repair Kit',
  75:  'Premium Repair Kit',
  100: 'Complete Repair Kit',
}
