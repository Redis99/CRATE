'use client'

import { ActionButton } from '@/components/ui/ActionButton'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConsumableCardData {
  id:             string
  consumableType: string
  value:          number
  quantity:       number
}

interface ConsumableCardProps {
  item:        ConsumableCardData
  onUse?:      (item: ConsumableCardData) => void
  onDestroy?:  (id: string) => void
  selectMode?: boolean
  selected?:   boolean
  onToggle?:   (id: string) => void
  // Admin
  onEdit?:     (item: ConsumableCardData) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function typeLabel(type: string, value: number): string {
  if (type === 'REPAIR_KIT') return `Battery +${value} energy`
  if (type === 'BOOST_TEMP') return `Temp Boost +${value}%`
  return type
}

function typeIcon(type: string): string {
  if (type === 'REPAIR_KIT') return '🔋'
  return '⚡'
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConsumableCard({ item, onUse, onDestroy, selectMode, selected, onToggle, onEdit }: ConsumableCardProps) {
  return (
    <div className="border border-gray-700/50 rounded-xl p-3 bg-[#0d0d15]">
      {/* Header */}
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-1.5">
          {selectMode && onToggle && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(item.id) }}
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
          <span className="text-gray-400 text-xs">{typeIcon(item.consumableType)}</span>
        </div>
        <span className="text-white text-sm font-bold">×{item.quantity}</span>
      </div>

      {/* Label */}
      <p className="text-white text-xs font-medium flex-1">{typeLabel(item.consumableType, item.value)}</p>

      {/* Actions — mt-auto empurra para o fundo */}
      <div className="mt-auto flex flex-col gap-1.5">
      {item.consumableType === 'REPAIR_KIT' && onUse && (
        <ActionButton variant="outline" size="sm" fullWidth onClick={() => onUse(item)}>
          Use
        </ActionButton>
      )}

      {/* Destroy / Edit row */}
      <div className="flex items-center justify-between">
        {onEdit && (
          <button onClick={() => onEdit(item)} className="text-xs text-gray-600 hover:text-indigo-400 transition-colors">
            Edit
          </button>
        )}
        {onDestroy && !selectMode && (
          <button
            onClick={() => onDestroy(item.id)}
            className="ml-auto text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
          >
            Destroy
          </button>
        )}
      </div>
      </div>
    </div>
  )
}
