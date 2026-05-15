'use client'

import { useState } from 'react'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { ActionButton } from '@/components/ui/ActionButton'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LootboxCardData {
  id:          string
  lootboxType: string
  quantity:    number
  source:      string
}

interface LootboxCardProps {
  item:        LootboxCardData
  onOpen?:     (lootboxType: string, qty: number) => void
  opening?:    boolean
  onDestroy?:  (id: string) => void
  selectMode?: boolean
  selected?:   boolean
  onToggle?:   (id: string) => void
  // Admin
  onEdit?:     (item: LootboxCardData) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SOURCE_LABEL: Record<string, string> = {
  purchased:   'Purchased',
  ranking:     'Ranking reward',
  mission:     'Mission reward',
  weekly_drop: 'Weekly Drop',
}

const TYPE_LABEL: Record<string, string> = {
  PARTS_CRATE:  'Parts Crate',
  SUPPLY_CRATE: 'Supply Crate',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LootboxCard({ item, onOpen, opening, onDestroy, selectMode, selected, onToggle, onEdit }: LootboxCardProps) {
  const [qty, setQty] = useState(1)

  return (
    <div className="border border-purple-700/30 rounded-xl p-3 bg-[#0d0d15]">
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
          <span className="text-purple-400 text-xs font-medium">
            {TYPE_LABEL[item.lootboxType] ?? item.lootboxType}
          </span>
        </div>
        <span className="text-white text-sm font-bold">×{item.quantity}</span>
      </div>

      {/* Source */}
      <p className="text-gray-600 text-xs mb-3">{SOURCE_LABEL[item.source] ?? item.source}</p>

      {/* Qty selector + open button */}
      {onOpen && (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-xs">Qty</span>
            <QuantityStepper value={qty} min={1} max={Math.min(10, item.quantity)} onChange={setQty} />
          </div>
          <ActionButton
            variant="purple"
            size="sm"
            fullWidth
            onClick={() => onOpen(item.lootboxType, qty)}
            loading={opening}
            loadingText="Opening..."
            className="mb-1.5"
          >
            {`Open ${qty}×`}
          </ActionButton>
        </>
      )}

      {/* Actions row */}
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
  )
}
