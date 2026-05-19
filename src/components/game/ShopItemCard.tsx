'use client'

import { RarityBadge } from '@/components/ui/RarityBadge'
import { ActionButton } from '@/components/ui/ActionButton'
import { CategoryTag } from '@/components/game/CategoryTag'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { RARITY_BORDER_COLOR, type Rarity } from '@/lib/rarity'
import { effectLabel } from '@/lib/effect-label'
import type { ShopItem } from '@/lib/shop-items'

// Ranges de atributos para itens gerados aleatoriamente
const ER_RANGE: Record<string, string> = {
  COMMON: '8–12', UNCOMMON: '25–35', RARE: '70–90', EPIC: '180–220',
}
const PD_RANGE: Record<string, string> = {
  COMMON: '0.8–1.2', UNCOMMON: '2.5–3.5', RARE: '7–9', EPIC: '18–22',
}
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
  quantity: number
  maxQty: number
  onQtyChange: (itemId: string, qty: number) => void
  onBuy: (itemId: string, qty: number) => void
}

export function ShopItemCard({
  item, outpostSlots, balance, buying,
  quantity, maxQty, onQtyChange, onBuy,
}: ShopItemCardProps) {
  const qty        = Math.max(1, Math.min(quantity, maxQty))
  const totalPrice = Math.round(item.price * qty * 100) / 100

  const rarity      = item.rarity as Rarity | undefined
  const borderColor = rarity ? RARITY_BORDER_COLOR[rarity] : 'border-gray-700/50'
  const canAfford   = balance >= totalPrice
  const isLocked    = item.category === 'outpostSlots' && item.slotRequires !== undefined && (outpostSlots ?? 0) < item.slotRequires
  const isOwned     = item.category === 'outpostSlots' && (outpostSlots ?? 0) >= (item.slotNumber ?? 0)
  const isCapped    = item.isCapped

  const disabled = buying || !canAfford || isLocked || isOwned || isCapped

  // ── Sub-descrição por tipo ──────────────────────────────────────────────
  function renderStats() {
    const isRobotCategory    = item.category === 'robots'
    const isEffectCategory   = item.category === 'equipment' || item.category === 'baseUpgrades'

    // ── Item específico com atributos fixos (criado pelo admin) ──────────
    if (item.specific) {
      if (isRobotCategory && item.hashPower != null && item.energyRate != null) {
        const maxDur = item.durability ?? 100
        return (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs mt-1">
            <span className="text-orange-400">ER {item.hashPower}</span>
            <span className="text-teal-400">PD {item.energyRate}/hr</span>
            <span className="text-green-400">Energy {maxDur}%</span>
          </div>
        )
      }
      if (isEffectCategory && item.effectType && item.effectValue != null) {
        return (
          <div className="flex flex-col gap-0.5 mt-1">
            <span className="text-blue-400 text-xs">{effectLabel(item.effectType, item.effectValue)}</span>
            {item.effectType2 && item.effectValue2 != null && (
              <span className="text-purple-400 text-xs">{effectLabel(item.effectType2, item.effectValue2)}</span>
            )}
          </div>
        )
      }
      // Specific sem stats mapeados — não exibe nada além da descrição
      return null
    }

    // ── Item gerado aleatoriamente — exibe ranges por raridade ───────────
    if (item.generateType === 'robot' && rarity) {
      return (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs mt-1">
          <span className="text-orange-400">ER {ER_RANGE[rarity]}</span>
          <span className="text-teal-400">PD {PD_RANGE[rarity]}/hr</span>
          <span className="text-green-400">Energy 100%</span>
        </div>
      )
    }
    if ((item.generateType === 'equipment' || item.generateType === 'baseUpgrade') && rarity) {
      return <p className="text-gray-600 text-xs mt-1">Effect range: {EFFECT_RANGE[rarity]}</p>
    }

    // ── Outros tipos ─────────────────────────────────────────────────────
    if (item.batteryValue) {
      return <p className="text-teal-400/70 text-xs mt-1">+{item.batteryValue} energy</p>
    }
    if (item.category === 'inventory' && item.currentSlots !== undefined) {
      const next = (item.currentSlots ?? 0) + (item.inventoryAdd ?? 0) * qty
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
    if (isOwned)    return 'Already owned'
    if (isLocked)   return `Unlock slot ${item.slotRequires} first`
    if (isCapped)   return 'Max capacity'
    if (!canAfford) return 'Insufficient balance'
    if (qty > 1)    return `Buy ×${qty} — ${totalPrice} CRATE`
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

      {/* Name + description + stats */}
      <div className="flex-1">
        <p className="text-white text-sm font-semibold">{item.name}</p>
        <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{item.description}</p>
        {renderStats()}
      </div>

      {/* Seletor de quantidade — aparece quando o item pode ser comprado em mais de 1 unidade */}
      {maxQty > 1 && !isOwned && !isLocked && !isCapped && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500">Qty</span>
          <QuantityStepper
            value={qty}
            min={1}
            max={maxQty}
            onChange={(v) => onQtyChange(item.id, v)}
          />
        </div>
      )}

      {/* Botão de compra */}
      <ActionButton
        variant={isOwned || isCapped ? 'ghost' : 'outline'}
        size="sm"
        fullWidth
        disabled={disabled}
        loading={buying}
        loadingText="Buying..."
        onClick={() => onBuy(item.id, qty)}
      >
        {buttonLabel()}
      </ActionButton>
    </div>
  )
}
