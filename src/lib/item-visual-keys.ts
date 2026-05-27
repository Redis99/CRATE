/**
 * Constantes de lookup para ItemVisual.
 * Cada categoria tem um conjunto fixo de chaves válidas.
 * O admin usa essas chaves ao cadastrar visuais no painel.
 */

// ─── Categorias ────────────────────────────────────────────────────────────────

export type VisualCategory =
  | 'robot'
  | 'equipment'
  | 'baseUpgrade'
  | 'part'
  | 'consumable'
  | 'lootbox'

// ─── Chaves por categoria ──────────────────────────────────────────────────────

/** Coleções de robôs — campo Robot.collection */
export const ROBOT_COLLECTION_KEYS = [
  'Sentinel — Standard Series',   // COMMON
  'Crawler — Base Line',           // COMMON
  'Ranger — Industrial Series',    // UNCOMMON
  'Sentinel — Advanced Series',    // UNCOMMON
  'Titan — Volcanic Series',       // RARE
  'Plasma — Rare Line',            // RARE
  'Titan — Quantum Series',        // EPIC
  'Nova — Elite Line',             // EPIC
  'Singularity — Genesis Series',  // LEGENDARY
] as const

/** EffectTypes de equipamentos */
export const EQUIPMENT_EFFECT_KEYS = [
  'HASH_POWER_FLAT',
  'HASH_POWER_PCT',
  'DURABILITY_LOSS_PCT',
  'GLOBAL_EFFICIENCY_PCT',
  'UPTIME_HOURS',
  'POWER_DRAW_FLAT',
  'POWER_DRAW_PCT',
] as const

/** PartCategories (usado quando key = categoria, não nome de peça) */
export const PART_CATEGORY_KEYS = [
  'ENERGY',
  'MINING',
  'MAINTENANCE',
  'TERRAIN',
  'AI_SOFTWARE',
  'SPECIAL',
] as const

/** Nomes individuais de peças (lookup mais específico — sobrepõe categoria) */
export const PART_TYPE_KEYS = [
  // ENERGY
  'Plasma Cell', 'Energy Core', 'Power Module', 'Fusion Battery', 'Charge Crystal',
  // MINING
  'Drill Bit', 'Excavation Head', 'Mining Core', 'Extraction Tool', 'Rock Breaker',
  // MAINTENANCE
  'Repair Module', 'Self-Repair Kit', 'Diagnostic Unit', 'Servo Pack', 'Lubricant Core',
  // TERRAIN
  'Terrain Scanner', 'Surface Adapter', 'Ground Module', 'Traction Unit', 'Geo Sensor',
  // AI_SOFTWARE
  'AI Chip', 'Navigation Module', 'Decision Matrix', 'Logic Core', 'Pathfinder Unit',
  // SPECIAL
  'Rare Component', 'Void Crystal', 'Genesis Fragment', 'Anomaly Shard', 'Unknown Ore',
] as const

/** Consumíveis: formato "REPAIR_KIT_{value}" */
export const CONSUMABLE_KEYS = [
  'REPAIR_KIT_5',
  'REPAIR_KIT_10',
  'REPAIR_KIT_25',
  'REPAIR_KIT_50',
  'REPAIR_KIT_100',
] as const

/** LootboxTypes */
export const LOOTBOX_KEYS = [
  'PARTS_CRATE',
  'SUPPLY_CRATE',
  'ROBOT_CRATE_COMMON',
  'ROBOT_CRATE_UNCOMMON',
  'ROBOT_CRATE_RARE',
  'ROBOT_CRATE_EPIC',
  'EQUIPMENT_CRATE_COMMON',
  'EQUIPMENT_CRATE_UNCOMMON',
  'EQUIPMENT_CRATE_RARE',
  'EQUIPMENT_CRATE_EPIC',
  'BASE_UPGRADE_CRATE_COMMON',
  'BASE_UPGRADE_CRATE_UNCOMMON',
  'BASE_UPGRADE_CRATE_RARE',
  'BASE_UPGRADE_CRATE_EPIC',
] as const

/** Mapa de category → lista de chaves válidas */
export const VISUAL_KEYS_BY_CATEGORY: Record<VisualCategory, readonly string[]> = {
  robot:       ROBOT_COLLECTION_KEYS,
  equipment:   EQUIPMENT_EFFECT_KEYS,
  baseUpgrade: EQUIPMENT_EFFECT_KEYS,  // mesmos effectTypes
  part:        [...PART_CATEGORY_KEYS, ...PART_TYPE_KEYS],
  consumable:  CONSUMABLE_KEYS,
  lootbox:     LOOTBOX_KEYS,
}

// ─── Tipos de ItemVisual ───────────────────────────────────────────────────────

export interface ItemVisualData {
  id:              string
  category:        VisualCategory
  key:             string
  rarity:          string | null
  label:           string | null
  imageUrl:        string | null
  spriteIdleUrl:   string | null
  spriteActiveUrl: string | null
  spriteLowUrl:    string | null
  frameWidth:      number
  frameHeight:     number
  frameCount:      number
  fps:             number
}

// ─── Lookup helper ─────────────────────────────────────────────────────────────

/**
 * Resolve o visual mais específico para um item.
 * Prioridade: (category + key + rarity) > (category + key + null)
 */
export function resolveVisual(
  visuals: ItemVisualData[],
  category: VisualCategory,
  key: string,
  rarity?: string | null,
): ItemVisualData | null {
  const forCategory = visuals.filter((v) => v.category === category && v.key === key)
  if (!forCategory.length) return null

  // 1. Procura match exato com raridade
  if (rarity) {
    const exact = forCategory.find((v) => v.rarity === rarity)
    if (exact) return exact
  }
  // 2. Fallback para entry sem raridade (null)
  return forCategory.find((v) => v.rarity === null) ?? null
}

/**
 * Monta a chave de consumível a partir de tipo + valor.
 * Ex: ('REPAIR_KIT', 25) → 'REPAIR_KIT_25'
 */
export function consumableKey(type: string, value: number): string {
  return `${type}_${value}`
}

/**
 * Monta a chave de lookup para um robô.
 * Prioridade: templateId (robô específico da loja) > collection.
 * Se o admin criar um visual com key = templateId, ele sobrepõe a collection.
 */
export function robotKey(collection: string, templateId?: string | null): string {
  return templateId ?? collection
}
