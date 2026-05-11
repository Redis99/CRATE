'use client'

import { RarityBadge } from '@/components/ui/RarityBadge'
import { ActionButton } from '@/components/ui/ActionButton'
import { CategoryTag } from '@/components/game/CategoryTag'
import { RARITY_BORDER_COLOR, type Rarity } from '@/lib/rarity'
import type { ShopItem } from '@/lib/shop-items'

// ER e PD ranges por raridade — para exibir no card de robô
const ER_RANGE: Record<string, string> = {
  COMMON: '8–12', UNCOMMON: '25–35', RARE: '70–90', EPIC: '180–220',
}
const PD_RANGE: Record<string, string> = {
  COMMON: '0.8–1.2', UNCOMMON: '2.5–3.5', RARE: '7–9', EPIC: '18–22',
}

// Efeitos por raridade (para exibir no card de equipment/base upgrade)
const EFFECT_RANGE: Record<string, string> = {
  COMMON: '+2–5', UNCOMMON: '+5–12', RARE: '+12–22', EPIC: '+22–42',
}

interface ShopItemCardProps {
  item: ShopItem & {
    currentSlots?: number
    maxSlots?: number
    isCapped?: boolean
  }
  outpostSlots?: number
  balance: number
  buying: boolean
  onBuy: (itemId: string) => void
}

export function ShopItemCard({ item, outpostSlots, balance, buying, onBuy }: ShopItemCardProps) {
  const rarity     = item.rarity as Rarity | undefined
  const borderColor = rarity ? RARITY_BORDER_COLOR[rarity] : 'border-gray-700/50'
  const canAfford  = balance >= item.price
  const isLocked   = item.category === 'outpostSlots' && item.slotRequires !== undefined && (outpostSlots ?? 0) < item.slotRequires
  const isOwned    = item.category === 'outpostSlots' && (outpostSlots ?? 0) >= (item.slotNumber ?? 0)
  const isCapped   = item.isCapped

  const disabled = buying || !canAfford || isLocked || isOwned || isCapped

  // ── Sub-descrição por tipo ──────────────────────────────────────────────
  function renderStats() {
    if (item.generateType === 'robot' && rarity) {
      return (
        <div className="flex gap-3 text-xs mt-1">
          <span className="text-orange-400">ER {ER_RANGE[rarity]}</span>
          <span className="text-teal-400">PD {PD_RANGE[rarity]}/hr</span>
        </div>
      )
    }
    if ((item.generateType === 'equipment' || item.generateType === 'baseUpgrade') && rarity) {
      return <p className="text-gray-600 text-xs mt-1">Effect range: {EFFECT_RANGE[rarity]}</p>
    }
    if (item.category === 'batteries') {
      return <p className="text-teal-400/70 text-xs mt-1">+{item.batteryValue} energy</p>
    }
    if (item.category === 'inventory' && item.currentSlots !== undefined) {
      const next = (item.currentSlots ?? 0) + (item.inventoryAdd ?? 0)
      return (
        <p className="text-gray-600 text-xs mt-1">
          {item.currentSlots} → {next} slots
          {isCapped && <span className="text-red-400/70 ml-1">(max reached)</span>}
        </p>
      )
    }
    return null
  }

  // ── Label do botão ──────────────────────────────────────────────────────
  function buttonLabel() {
    if (isOwned)   return 'Already owned'
    if (isLocked)  return `Unlock slot ${item.slotRequires} first`
    if (isCapped)  return 'Max capacity'
    if (!canAfford) return 'Insufficient balance'
    return `Buy — ${item.price} CRATE`
  }

  return (
    <div className={`border rounded-xl p-4 bg-[#0d0d15] flex flex-col gap-3 ${borderColor}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {rarity && <RarityBadge rarity={rarity} />}
          {item.generateType === 'equipment'   && <CategoryTag effectType="HASH_POWER_FLAT" />}
          {item.generateType === 'baseUpgrade' && <CategoryTag effectType="GLOBAL_EFFICIENCY_PCT" />}
        </div>
        <span className="text-white font-bold font-mono text-sm shrink-0">
          {item.price > 0 ? `${item.price} CRATE` : '—'}
        </span>
      </div>

      {/* Name + description */}
      <div>
        <p className="text-white text-sm font-semibold">{item.name}</p>
        <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{item.description}</p>
        {renderStats()}
      </div>

      {/* Buy button */}
      <ActionButton
        variant={isOwned || isCapped ? 'ghost' : 'outline'}
        size="sm"
        fullWidth
        disabled={disabled}
        loading={buying}
        loadingText="Buying..."
        onClick={() => onBuy(item.id)}
      >
        {buttonLabel()}
      </ActionButton>
    </div>
  )
}
