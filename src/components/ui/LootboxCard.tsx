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

/** Formata o lootboxType para label legível */
function crateLabel(t: string): string {
  if (t === 'PARTS_CRATE')  return 'Parts Crate'
  if (t === 'SUPPLY_CRATE') return 'Supply Crate'
  // ROBOT_CRATE_COMMON → "Robot Crate — Common"
  // BASE_UPGRADE_CRATE_EPIC → "Base Upgrade Crate — Epic"
  const m = t.match(/^(.+)_CRATE_(.+)$/)
  if (m) {
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
    const type   = m[1].split('_').map(cap).join(' ')
    const rarity = cap(m[2])
    return `${type} Crate — ${rarity}`
  }
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Cor da raridade para o badge */
const RARITY_COLOR: Record<string, string> = {
  COMMON:   'text-gray-400',
  UNCOMMON: 'text-green-400',
  RARE:     'text-blue-400',
  EPIC:     'text-purple-400',
}

function crateRarity(t: string): string | null {
  const m = t.match(/_(COMMON|UNCOMMON|RARE|EPIC|LEGENDARY)$/)
  return m ? m[1] : null
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
          <span className={`text-xs font-medium ${RARITY_COLOR[crateRarity(item.lootboxType) ?? ''] ?? 'text-purple-400'}`}>
            {crateLabel(item.lootboxType)}
          </span>
        </div>
        <span className="text-white text-sm font-bold">×{item.quantity}</span>
      </div>

      {/* Source */}
      <p className="text-gray-600 text-xs flex-1">{SOURCE_LABEL[item.source] ?? item.source}</p>

      {/* Qty selector + open button — mt-auto empurra para o fundo */}
      <div className="mt-auto flex flex-col gap-1.5">
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
    </div>
  )
}
