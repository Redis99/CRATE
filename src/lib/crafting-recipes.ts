/**
 * Receitas de crafting com itens ESPECÍFICOS.
 * Inputs: partTypes exatos definidos pelo admin.
 * Output: item com atributos fixos definidos pelo admin — sem RNG.
 *
 * No mainnet, estas receitas virão do banco de dados (painel admin).
 */

export type Rarity    = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
export type EffectType = 'HASH_POWER_FLAT' | 'HASH_POWER_PCT' | 'POWER_DRAW_FLAT' |
                         'POWER_DRAW_PCT' | 'DURABILITY_LOSS_PCT' | 'GLOBAL_EFFICIENCY_PCT' | 'UPTIME_HOURS'
export type OutputType = 'equipment' | 'baseUpgrade' | 'robot'

export interface CraftingIngredient {
  partType: string   // nome exato da peça necessária
  rarity:   Rarity   // raridade (para exibição do badge)
  quantity: number
}

export interface CraftingOutput {
  type:    OutputType
  name:    string
  rarity:  Rarity
  // Equipment / Base Upgrade
  effectType?:  EffectType
  effectValue?: number
  effectType2?: EffectType
  effectValue2?: number
  // Robot
  collection?:  string
  hashPower?:   number   // ER
  energyRate?:  number   // PD
}

export interface CraftingRecipe {
  id:          string
  name:        string
  description: string
  ingredients: CraftingIngredient[]
  output:      CraftingOutput
  // Para desativar temporariamente ou remover após um evento
  active?:     boolean
}

// ─── Receitas (criadas/editadas via painel admin no mainnet) ──────────────────

export const ALL_RECIPES: CraftingRecipe[] = [
  {
    id:          'craft-extraction-booster',
    name:        'Extraction Booster',
    description: 'Combines precision mining components with AI optimization for a significant ER boost.',
    ingredients: [
      { partType: 'Mining Core',  rarity: 'UNCOMMON', quantity: 3 },
      { partType: 'AI Chip',      rarity: 'UNCOMMON', quantity: 2 },
    ],
    output: {
      type: 'equipment', name: 'Extraction Booster',
      rarity: 'RARE', effectType: 'HASH_POWER_FLAT', effectValue: 18,
    },
  },
  {
    id:          'craft-energy-regulator',
    name:        'Energy Regulator',
    description: 'Engineered from maintenance and energy parts to reduce robot power draw.',
    ingredients: [
      { partType: 'Energy Core',   rarity: 'COMMON',   quantity: 4 },
      { partType: 'Servo Pack',    rarity: 'UNCOMMON', quantity: 2 },
    ],
    output: {
      type: 'equipment', name: 'Energy Regulator',
      rarity: 'UNCOMMON', effectType: 'POWER_DRAW_PCT', effectValue: 12,
    },
  },
  {
    id:          'craft-void-excavator',
    name:        'Void Excavator',
    description: 'A rare dual-purpose module fusing void materials with mining cores. Boosts ER and reduces PD simultaneously.',
    ingredients: [
      { partType: 'Void Crystal',  rarity: 'RARE',     quantity: 2 },
      { partType: 'Mining Core',   rarity: 'RARE',     quantity: 2 },
      { partType: 'Charge Crystal',rarity: 'UNCOMMON', quantity: 1 },
    ],
    output: {
      type: 'equipment', name: 'Void Excavator',
      rarity: 'EPIC', effectType: 'HASH_POWER_PCT', effectValue: 22,
      effectType2: 'POWER_DRAW_PCT', effectValue2: 15,
    },
  },
  {
    id:          'craft-prototype-unit',
    name:        'Prototype Unit',
    description: 'Assemble a custom robot from rare components. A balanced unit with guaranteed stats.',
    ingredients: [
      { partType: 'Genesis Fragment', rarity: 'RARE',     quantity: 3 },
      { partType: 'Logic Core',       rarity: 'RARE',     quantity: 2 },
      { partType: 'Power Module',     rarity: 'UNCOMMON', quantity: 3 },
    ],
    output: {
      type:       'robot',
      name:       'Prototype Unit Mk.I',
      rarity:     'RARE',
      collection: 'Prototype — Crafted Series',
      hashPower:  85,
      energyRate: 8.5,
    },
  },
  {
    id:          'craft-grid-optimizer',
    name:        'Grid Optimizer',
    description: 'A base-level upgrade that boosts the efficiency of your entire robot fleet.',
    ingredients: [
      { partType: 'Terrain Scanner', rarity: 'RARE',     quantity: 2 },
      { partType: 'Logic Core',      rarity: 'UNCOMMON', quantity: 2 },
    ],
    output: {
      type: 'baseUpgrade', name: 'Grid Optimizer',
      rarity: 'RARE', effectType: 'GLOBAL_EFFICIENCY_PCT', effectValue: 10,
    },
  },
]

export function getRecipe(id: string): CraftingRecipe | undefined {
  return ALL_RECIPES.filter((r) => r.active !== false).find((r) => r.id === id)
}

export function getActiveRecipes(): CraftingRecipe[] {
  return ALL_RECIPES.filter((r) => r.active !== false)
}
