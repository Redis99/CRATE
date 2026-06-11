/**
 * Tipos de crafting compartilhados entre UI e API.
 * As receitas em si vivem no banco (CraftingRecipe + CraftingIngredient),
 * gerenciadas pelo painel admin — seed inicial em /api/admin/seed-crafting.
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
