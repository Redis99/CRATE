export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

export const RARITY_LABEL: Record<Rarity, string> = {
  COMMON:    'Common',
  UNCOMMON:  'Uncommon',
  RARE:      'Rare',
  EPIC:      'Epic',
  LEGENDARY: 'Legendary',
}

/** Cores de texto + borda — para cards e badges com borda */
export const RARITY_BORDER_COLOR: Record<Rarity, string> = {
  COMMON:    'text-gray-400 border-gray-700/50',
  UNCOMMON:  'text-green-400 border-green-700/40',
  RARE:      'text-blue-400 border-blue-700/40',
  EPIC:      'text-purple-400 border-purple-700/40',
  LEGENDARY: 'text-yellow-400 border-yellow-700/40',
}

/** Cor de texto + borda + fundo — para cards com fundo colorido */
export const RARITY_CARD_COLOR: Record<Rarity, string> = {
  COMMON:    'text-gray-400 border-gray-700 bg-gray-400/5',
  UNCOMMON:  'text-green-400 border-green-700/50 bg-green-400/5',
  RARE:      'text-blue-400 border-blue-700/50 bg-blue-400/5',
  EPIC:      'text-purple-400 border-purple-700/50 bg-purple-400/5',
  LEGENDARY: 'text-yellow-400 border-yellow-700/50 bg-yellow-400/5',
}

/** Apenas cor de texto — para uso inline */
export const RARITY_TEXT_COLOR: Record<Rarity, string> = {
  COMMON:    'text-gray-400',
  UNCOMMON:  'text-green-400',
  RARE:      'text-blue-400',
  EPIC:      'text-purple-400',
  LEGENDARY: 'text-yellow-400',
}

// ─── Categorias de equipamento ────────────────────────────────────────────────

export type EquipmentCategory = 'ER' | 'PD' | 'Efficiency' | 'Uptime'

export const EFFECT_CATEGORY: Record<string, EquipmentCategory> = {
  HASH_POWER_FLAT:       'ER',
  HASH_POWER_PCT:        'ER',
  POWER_DRAW_FLAT:       'PD',
  POWER_DRAW_PCT:        'PD',
  GLOBAL_EFFICIENCY_PCT: 'Efficiency',
  DURABILITY_LOSS_PCT:   'PD',   // também reduz consumo de energia
  UPTIME_HOURS:          'Uptime',
}

export const CATEGORY_STYLE: Record<EquipmentCategory, string> = {
  ER:         'text-orange-400 bg-orange-400/10 border-orange-400/20',
  PD:         'text-teal-400 bg-teal-400/10 border-teal-400/20',
  Efficiency: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  Uptime:     'text-blue-400 bg-blue-400/10 border-blue-400/20',
}

/** Badge background — para tags de raridade */
export const RARITY_BADGE_COLOR: Record<Rarity, string> = {
  COMMON:    'text-gray-400 bg-gray-400/10',
  UNCOMMON:  'text-green-400 bg-green-400/10',
  RARE:      'text-blue-400 bg-blue-400/10',
  EPIC:      'text-purple-400 bg-purple-400/10',
  LEGENDARY: 'text-yellow-400 bg-yellow-400/10',
}
