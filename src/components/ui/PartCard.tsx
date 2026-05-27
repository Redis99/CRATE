'use client'

import { RARITY_BORDER_COLOR, RARITY_LABEL, type Rarity } from '@/lib/rarity'
import { ItemSprite } from '@/components/ui/ItemSprite'
import type { ItemVisualData } from '@/lib/item-visual-keys'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PartCardData {
  id:       string
  partType: string
  category: string
  rarity:   Rarity
  quantity: number
}

interface PartCardProps {
  part:         PartCardData
  visual?:      ItemVisualData | null  // opcional
  // Inventory actions (optional — admin panel won't need these)
  onDestroy?:   (id: string) => void
  selectMode?:  boolean
  selected?:    boolean
  onToggle?:    (id: string) => void
  // Admin actions (optional)
  onEdit?:      (part: PartCardData) => void
}

// ─── Rarity color helpers ─────────────────────────────────────────────────────

const RARITY_TEXT: Record<string, string> = {
  COMMON:    'text-gray-400',
  UNCOMMON:  'text-green-400',
  RARE:      'text-blue-400',
  EPIC:      'text-purple-400',
  LEGENDARY: 'text-yellow-400',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PartCard({ part, visual, onDestroy, selectMode, selected, onToggle, onEdit }: PartCardProps) {
  const borderClass = RARITY_BORDER_COLOR[part.rarity] ?? 'border-gray-700/50'
  const textClass   = RARITY_TEXT[part.rarity]        ?? 'text-gray-400'

  return (
    <div className={`border rounded-xl p-3 bg-[#0d0d15] ${borderClass}`}>
      {/* Ícone do item — centralizado quando presente */}
      {visual?.imageUrl && (
        <div className="flex justify-center mb-2">
          <ItemSprite visual={visual} size={48} alt={part.partType} />
        </div>
      )}

      {/* Header: rarity label + checkbox + quantity */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {selectMode && onToggle && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(part.id) }}
              className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                selected ? 'bg-blue-500 border-blue-500' : 'border-gray-600 bg-transparent hover:border-blue-400'
              }`}
            >
              {selected && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          )}
          <span className={`text-xs font-medium ${textClass}`}>
            {RARITY_LABEL[part.rarity as Rarity]}
          </span>
        </div>
        <span className="text-white text-sm font-bold">×{part.quantity}</span>
      </div>

      {/* Name + category */}
      <p className="text-white text-xs font-medium truncate mt-1">{part.partType}</p>
      <p className="text-gray-600 text-xs">{part.category}</p>

      {/* Actions */}
      <div className="mt-2 flex items-center justify-between">
        {onEdit && (
          <button
            onClick={() => onEdit(part)}
            className="text-xs text-gray-600 hover:text-indigo-400 transition-colors"
          >
            Edit
          </button>
        )}
        {onDestroy && !selectMode && (
          <button
            onClick={() => onDestroy(part.id)}
            className="ml-auto text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
          >
            Destroy
          </button>
        )}
      </div>
    </div>
  )
}
