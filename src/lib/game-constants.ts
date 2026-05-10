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

// ─── Tipos de equipamento por destino ────────────────────────────────────────
// Robot Equipment: afeta apenas o robô individual
// Base Upgrade:    afeta toda a frota simultaneamente

export const ROBOT_EQUIPMENT_EFFECTS = [
  'HASH_POWER_FLAT',
  'HASH_POWER_PCT',
  'POWER_DRAW_FLAT',
  'POWER_DRAW_PCT',
  'DURABILITY_LOSS_PCT',
] as const

export const BASE_UPGRADE_EFFECTS = [
  'GLOBAL_EFFICIENCY_PCT',
  'UPTIME_HOURS',
  'POWER_DRAW_FLAT',   // quando em base: reduz PD de toda a frota
  'POWER_DRAW_PCT',    // quando em base: reduz PD de toda a frota
] as const

export type RobotEffectType = typeof ROBOT_EQUIPMENT_EFFECTS[number]
export type BaseEffectType  = typeof BASE_UPGRADE_EFFECTS[number]

// ─── Mining ───────────────────────────────────────────────────────────────────

export const BLOCKS_PER_HOUR = 4
