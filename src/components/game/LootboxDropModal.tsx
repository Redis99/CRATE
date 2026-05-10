'use client'

import type { DropResultType } from '@/lib/lootbox'

// ─── Helpers (exportados para uso em outros componentes se necessário) ─────────

const RARITY_STYLES: Record<string, string> = {
  COMMON:    'text-gray-300 border-gray-600',
  UNCOMMON:  'text-green-400 border-green-600',
  RARE:      'text-blue-400 border-blue-600',
  EPIC:      'text-purple-400 border-purple-600',
  LEGENDARY: 'text-yellow-400 border-yellow-500',
}

export function dropIcon(drop: DropResultType): string {
  switch (drop.kind) {
    case 'robot':       return '🤖'
    case 'equipment':   return '⚙️'
    case 'baseUpgrade': return '🏗️'
    case 'part':        return '🔩'
    case 'consumable':  return '🔧'
  }
}

export function dropLabel(drop: DropResultType): string {
  switch (drop.kind) {
    case 'robot':       return drop.name
    case 'equipment':   return drop.name
    case 'baseUpgrade': return drop.name
    case 'part':        return `${drop.partType} ×${drop.quantity}`
    case 'consumable':  return `Repair Kit +${drop.value}% ×${drop.quantity}`
  }
}

export function dropSubLabel(drop: DropResultType): string {
  switch (drop.kind) {
    case 'robot':       return `${drop.rarity} Robot • ${drop.hashPower} ER base`
    case 'equipment':   return `${drop.rarity} Equipment • +${drop.effectValue} ${drop.effectType.replace(/_/g, ' ')}`
    case 'baseUpgrade': return `${drop.rarity} Base Upgrade • +${drop.effectValue} ${drop.effectType.replace(/_/g, ' ')}`
    case 'part':        return `${drop.rarity} • ${drop.category}`
    case 'consumable':  return 'Consumable'
  }
}

export function dropRarity(drop: DropResultType): string {
  return 'rarity' in drop ? drop.rarity : 'COMMON'
}

// ─── Modal compartilhado ──────────────────────────────────────────────────────

interface LootboxDropModalProps {
  drops: DropResultType[]
  stoppedEarly?: boolean
  onClose: () => void
}

export function LootboxDropModal({ drops, stoppedEarly, onClose }: LootboxDropModalProps) {
  const single = drops.length === 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#111118] border border-gray-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">
            {single ? 'You received' : `You received ${drops.length} items`}
          </h3>
          {stoppedEarly && (
            <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded">
              Inventory full — stopped early
            </span>
          )}
        </div>

        <div className="overflow-y-auto flex-1 space-y-2 pr-1">
          {drops.map((drop, i) => {
            const rarity = dropRarity(drop)
            const style  = RARITY_STYLES[rarity] ?? RARITY_STYLES.COMMON
            return (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${style}`}>
                <span className="text-2xl">{dropIcon(drop)}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${style.split(' ')[0]}`}>
                    {dropLabel(drop)}
                  </p>
                  <p className="text-gray-500 text-xs">{dropSubLabel(drop)}</p>
                </div>
                {'rarity' in drop && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full border shrink-0 ${style}`}>
                    {drop.rarity}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
        >
          Collect
        </button>
      </div>
    </div>
  )
}
