/**
 * Utilitário compartilhado para formatar labels de efeitos de equipamentos e base upgrades.
 * Usado em CraftingRecipeCard, MarketListingCard, EquipmentCard e qualquer outro widget.
 */

const EFFECT_PREFIX: Record<string, string> = {
  HASH_POWER_FLAT:       'ER +',
  HASH_POWER_PCT:        'ER +',
  POWER_DRAW_FLAT:       'PD -',
  POWER_DRAW_PCT:        'PD -',
  GLOBAL_EFFICIENCY_PCT: 'Efficiency +',
  DURABILITY_LOSS_PCT:   'Durability loss -',
  UPTIME_HOURS:          'Uptime +',
}

/** Retorna a string formatada de um efeito: ex "ER +18" ou "PD -12%" */
export function effectLabel(effectType: string, effectValue: number): string {
  const prefix = EFFECT_PREFIX[effectType] ?? ''
  const suffix = effectType.includes('PCT') ? '%' : effectType === 'UPTIME_HOURS' ? 'h' : ''
  return `${prefix}${effectValue}${suffix}`
}

/** Retorna apenas o prefixo descritivo sem o valor */
export const EFFECT_LABEL: Record<string, string> = {
  HASH_POWER_FLAT:       'ER +',
  HASH_POWER_PCT:        'ER +',
  POWER_DRAW_FLAT:       'PD -',
  POWER_DRAW_PCT:        'PD -',
  GLOBAL_EFFICIENCY_PCT: 'Efficiency +',
  DURABILITY_LOSS_PCT:   'Durability loss -',
  UPTIME_HOURS:          'Uptime +',
}
