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

// ─── Cooldown híbrido ─────────────────────────────────────────────────────────
// Contador GLOBAL cresce com qualquer jogo jogado → valor do cooldown sobe
// Cooldown aplicado APENAS ao último jogo jogado → outros jogos permanecem livres
// Resultado: rotação estratégica entre jogos sem bloqueio simultâneo

// Redução regressiva: -10 jogos/hora sem jogar NENHUM jogo (global)
const COOLDOWN_DECAY_RATE = 10

export function getEffectiveGlobalGames(
  globalGamesPlayedToday: number,
  globalLastPlayedAt:     Date | null,
  now:                    Date,
): number {
  if (!globalLastPlayedAt || globalGamesPlayedToday === 0) return globalGamesPlayedToday
  const hoursInactive = (now.getTime() - globalLastPlayedAt.getTime()) / 3_600_000
  const reduction     = Math.floor(hoursInactive * COOLDOWN_DECAY_RATE)
  return Math.max(0, globalGamesPlayedToday - reduction)
}

// Alias mantido para compatibilidade (usado na rota GET para dificuldade per-game)
export function getEffectiveGamesPlayed(
  gamesPlayedToday: number,
  lastPlayedAt:     Date | null,
  now:              Date,
): number {
  return getEffectiveGlobalGames(gamesPlayedToday, lastPlayedAt, now)
}

// Cooldown em ms baseado no contador global efetivo
export function getCooldownMs(effectiveGlobalGames: number): number {
  if (effectiveGlobalGames >= 100)
    return (1.5 * 100 + 10 * (effectiveGlobalGames - 100)) * 1000
  return effectiveGlobalGames * 1500  // 0ms no 1º jogo total, +1.5s por jogo
}

// Reset diário do contador global (24h)
export function shouldResetGlobal(lastResetAt: Date): boolean {
  return Date.now() - lastResetAt.getTime() >= 24 * 60 * 60 * 1000
}

// ─── Configuração por jogo ────────────────────────────────────────────────────

export interface ControlHint {
  input:  string   // ex: "← → ↑ ↓" ou "Swipe"
  action: string   // ex: "Move"
}

export interface GameControls {
  keyboard: ControlHint[]
  mobile:   ControlHint[]
}

export interface GameConfig {
  label:           string
  description:     string
  timeLimitSec:    number
  dropChance:      number
  winTarget:       number
  winLabel:        string
  dropPool:        DropEntry[]
  slug:            string
  available:       boolean
  controls:        GameControls
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
    timeLimitSec: 60,
    dropChance:   0.15,
    winTarget:    10,
    winLabel:     'ships destroyed',
    slug:         'space-drift',
    available:    true,
    controls: {
      keyboard: [
        { input: '← / A  →  / D', action: 'Move ship' },
        { input: 'Space / ↑ / W',  action: 'Shoot' },
      ],
      mobile: [
        { input: 'Hold & drag', action: 'Move ship' },
        { input: 'Auto-fires',  action: 'While holding' },
      ],
    },
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
    label:        'Capsule Drop',
    description:  'Match 4+ colors to score points or eliminate viruses. First condition wins.',
    timeLimitSec: 120,
    dropChance:   0.18,
    winTarget:    40,     // pontos alvo no nível 1 (alternativa: eliminar todas as viroses)
    winLabel:     'pts',
    slug:         'block-fall',
    available:    true,
    winTargetsByDiff: { 1: 40, 2: 60, 3: 80, 4: 100 },
    controls: {
      keyboard: [
        { input: '← / →', action: 'Move capsule' },
        { input: '↑ / X', action: 'Rotate' },
        { input: '↓',     action: 'Soft drop' },
        { input: 'Space', action: 'Hard drop' },
      ],
      mobile: [
        { input: 'Tap',        action: 'Rotate' },
        { input: 'Swipe ← →', action: 'Move capsule' },
        { input: 'Swipe ↓',   action: 'Hard drop' },
      ],
    },
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
    timeLimitSec: 60,
    dropChance:   0.12,
    winTarget:    5,
    winLabel:     'fruits',
    slug:         'serpentine',
    available:    true,
    controls: {
      keyboard: [
        { input: '← → ↑ ↓', action: 'Change direction' },
        { input: 'WASD',     action: 'Change direction' },
      ],
      mobile: [
        { input: 'Swipe ← → ↑ ↓', action: 'Change direction' },
      ],
    },
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
    timeLimitSec: 60,
    dropChance:   0.10,
    winTarget:    5,
    winLabel:     'obstacles',
    slug:         'orbital-jump',
    available:    true,
    controls: {
      keyboard: [
        { input: 'Space / ↑', action: 'Jump / Flap' },
      ],
      mobile: [
        { input: 'Tap anywhere', action: 'Jump / Flap' },
      ],
    },
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
    timeLimitSec: 60,
    dropChance:   0.20,
    winTarget:    1,
    winLabel:     'crossings',
    slug:         'space-frog',
    available:    false,
    controls: {
      keyboard: [
        { input: '← → ↑ ↓', action: 'Move' },
        { input: 'WASD',     action: 'Move' },
      ],
      mobile: [
        { input: 'Swipe ← → ↑ ↓', action: 'Move' },
      ],
    },
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
