/**
 * Constantes de mecânicas do jogo — fonte única de verdade.
 * Importar aqui em vez de redefinir em cada arquivo.
 */

// ─── Base Upgrade Slots ───────────────────────────────────────────────────────

export const BASE_SLOT_LABELS: Record<1 | 2, string> = {
  1: 'Mining Power',
  2: 'Energy Reduction',
}

// Tipos de efeito aceitos em cada slot de base
export const BASE_SLOT_EFFECTS: Record<1 | 2, string[]> = {
  1: ['GLOBAL_EFFICIENCY_PCT', 'HASH_POWER_FLAT', 'HASH_POWER_PCT'],
  2: ['UPTIME_HOURS', 'POWER_DRAW_FLAT', 'POWER_DRAW_PCT', 'DURABILITY_LOSS_PCT'],
}

// ─── Equipment / Robot limits ─────────────────────────────────────────────────

export const MAX_ROBOT_EQUIPMENT_SLOTS = 3
export const OUTPOST_MAX_SLOTS         = 6
export const PARTS_CRATE_WEEKLY_LIMIT  = 5

// ─── Mining ───────────────────────────────────────────────────────────────────

export const BLOCKS_PER_HOUR = 4
