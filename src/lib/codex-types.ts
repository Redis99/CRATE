/**
 * Tipos e constantes compartilhadas do Codex.
 * Importável em client e server components.
 */

export type CodexItemType = 'ROBOT' | 'EQUIPMENT' | 'BASE_UPGRADE'

/** Item de required items — formato do álbum de figurinhas */
export interface CodexRequiredItem {
  name:      string
  itemType:  CodexItemType
  /** true quando convertido de string[] legado — aceita qualquer itemType no filtro */
  isLegacy?: boolean
}

/**
 * Normaliza o campo requiredItems vindo do banco.
 * - string[] (legado): converte para ROBOT mas marca isLegacy=true → filtro aceita qualquer tipo
 * - { name, itemType }[]: usa o tipo exato especificado pelo admin
 */
export function normalizeRequiredItems(raw: unknown): CodexRequiredItem[] {
  if (!Array.isArray(raw)) return []
  return (raw as unknown[]).flatMap((item) => {
    if (typeof item === 'string') {
      return [{ name: item, itemType: 'ROBOT' as CodexItemType, isLegacy: true }]
    }
    if (item && typeof item === 'object' && 'name' in item) {
      const i = item as { name: string; itemType?: string }
      return [{ name: i.name, itemType: (i.itemType ?? 'ROBOT') as CodexItemType }]
    }
    return []
  })
}

/** Emoji por tipo de item */
export const CODEX_ITEM_EMOJI: Record<CodexItemType, string> = {
  ROBOT:        '🤖',
  EQUIPMENT:    '⚙️',
  BASE_UPGRADE: '🏗️',
}

/** Label legível por tipo */
export const CODEX_ITEM_LABEL: Record<CodexItemType, string> = {
  ROBOT:        'Robot',
  EQUIPMENT:    'Equipment',
  BASE_UPGRADE: 'Base Upgrade',
}

/** Label plural por tipo */
export const CODEX_ITEM_LABEL_PLURAL: Record<CodexItemType, string> = {
  ROBOT:        'robots',
  EQUIPMENT:    'equipment',
  BASE_UPGRADE: 'base upgrades',
}
