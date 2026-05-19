'use client'

import { RarityBadge } from '@/components/ui/RarityBadge'
import { DurabilityBar } from '@/components/ui/DurabilityBar'
import { CategoryTag } from '@/components/game/CategoryTag'
import { effectiveERWithEquipment, effectivePDWithEquipment, effectiveER, durabilityPct } from '@/lib/game-math'
import type { Rarity } from '@/lib/rarity'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RobotEquipmentData {
  equipmentId: string
  equipment: {
    id: string
    name: string
    rarity: Rarity
    effectType: string
    effectValue: number
    effectType2?: string | null
    effectValue2?: number | null
  }
}

export interface RobotCardData {
  id: string
  name: string
  collection: string
  rarity: Rarity
  hashPower: number
  energyRate: number
  durability: number
  maxDurability?: number | null  // valor base do template (null = fallback 100)
  isActive?: boolean
  outpostSlot?: number | null
  equipments?: RobotEquipmentData[]
}

// ─── Variantes de exibição ────────────────────────────────────────────────────

// 'full'    → inventário — todos os stats + slots de equipamento
// 'outpost' → slot do Outpost — stats + ER efetivo (considera durabilidade)
// 'mini'    → dashboard — compacto, sem equipamentos

export type RobotCardVariant = 'full' | 'outpost' | 'mini'

interface RobotCardProps {
  robot: RobotCardData
  variant?: RobotCardVariant
  slotNumber?: number
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
  actions?: React.ReactNode
  onUnequip?: (equipmentId: string) => void
}

const MAX_EQUIPMENT_SLOTS = 3

export function RobotCard({
  robot,
  variant = 'full',
  slotNumber,
  selectMode,
  selected,
  onToggleSelect,
  actions,
  onUnequip,
}: RobotCardProps) {
  const equips      = robot.equipments?.map((e) => e.equipment) ?? []
  const boostedER   = effectiveERWithEquipment(robot.hashPower, equips)
  const effectivePD = effectivePDWithEquipment(robot.energyRate, equips)
  // maxDurability vem do banco (individual por robô); fallback = durabilidade atual
  const maxDur      = robot.maxDurability ?? robot.durability

  // ER efetivo considera desgaste (usa maxDurability para calcular % corretamente)
  const actualER = variant === 'outpost'
    ? effectiveER(boostedER, robot.durability, maxDur)
    : boostedER

  const erBonus  = Math.round((boostedER - robot.hashPower) * 10) / 10
  const pdSaved  = Math.round((robot.energyRate - effectivePD) * 10) / 10

  // Horas restantes: durabilidade atual / desgaste por hora (PD)
  const hrsLeft  = effectivePD > 0 ? robot.durability / effectivePD : 0
  const hrsStr   = hrsLeft < 1
    ? `${(hrsLeft * 60).toFixed(0)}min`
    : `~${hrsLeft.toFixed(1)}h`

  // Cor baseada em % relativa ao máximo
  const pct = durabilityPct(robot.durability, maxDur)
  const energyColor = pct > 50 ? 'text-green-400' : pct > 20 ? 'text-yellow-400' : 'text-red-400'

  const usedSlots = robot.equipments?.length ?? 0
  const freeSlots = MAX_EQUIPMENT_SLOTS - usedSlots

  // ─── Mini (dashboard) ────────────────────────────────────────────────────
  if (variant === 'mini') {
    return (
      <div className="flex items-center justify-between bg-[#0d0d15] rounded-lg p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white text-sm font-medium truncate">{robot.name}</span>
            <RarityBadge rarity={robot.rarity} />
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-1">
            <span className="text-orange-400">{actualER.toFixed(1)} ER</span>
            <span className="text-teal-400">{effectivePD.toFixed(1)} PD/hr</span>
            {slotNumber && <span>Slot {slotNumber}</span>}
          </div>
          <DurabilityBar value={robot.durability} max={maxDur} height="sm" />
          <div className="flex justify-between text-xs mt-0.5">
            <span className="text-gray-600">Energy</span>
            <span className={energyColor}>{robot.durability.toFixed(1)} / {maxDur} · {hrsStr}</span>
          </div>
        </div>
      </div>
    )
  }

  // ─── Outpost slot ─────────────────────────────────────────────────────────
  if (variant === 'outpost') {
    return (
      <div>
        <p className="text-white text-sm font-semibold truncate">{robot.name}</p>
        <p className="text-gray-500 text-xs truncate mb-2">{robot.collection}</p>

        <div className="space-y-1 mb-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-orange-400 font-medium w-5">ER</span>
            <span className="text-white font-mono">{actualER.toFixed(1)}</span>
            {erBonus > 0 && <span className="text-orange-400/60 text-xs">(+{erBonus} equip)</span>}
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-teal-400 font-medium w-5">PD</span>
            <span className="text-white font-mono">{effectivePD.toFixed(1)}/hr</span>
            {pdSaved > 0 && <span className="text-teal-400/60 text-xs">(-{pdSaved})</span>}
          </div>
        </div>

        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">Energy</span>
          <span className={`${energyColor} font-mono`}>
            {robot.durability.toFixed(1)} / {maxDur}
            <span className="text-gray-600"> · {hrsStr}</span>
          </span>
        </div>
        <DurabilityBar value={robot.durability} max={maxDur} />

        {actions && <div className="mt-3">{actions}</div>}
      </div>
    )
  }

  // ─── Full (inventário) ────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          {selectMode && onToggleSelect && (
            <button onClick={(e) => { e.stopPropagation(); onToggleSelect(robot.id) }}
              className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                selected ? 'bg-blue-500 border-blue-500' : 'border-gray-600 hover:border-blue-400'
              }`}>
              {selected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
            </button>
          )}
          <RarityBadge rarity={robot.rarity} />
        </div>
        {!selectMode && actions && <div className="flex items-center">{actions}</div>}
      </div>

      <p className="text-white text-sm font-semibold mt-1 truncate">{robot.name}</p>
      <p className="text-gray-500 text-xs truncate">{robot.collection}</p>

      <div className="mt-2 mb-1 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-orange-400 font-medium w-5">ER</span>
          <span className="text-white font-mono">{boostedER.toFixed(1)}</span>
          {erBonus > 0 && <span className="text-orange-400/60">(+{erBonus} equip)</span>}
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-teal-400 font-medium w-5">PD</span>
          <span className="text-white font-mono">{effectivePD.toFixed(1)}/hr</span>
          {pdSaved > 0 && <span className="text-teal-400/60">(-{pdSaved} equip)</span>}
        </div>
        <div>
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-gray-600 text-xs">Energy</span>
            <div className="flex items-center gap-1">
              <span className={`text-xs font-mono ${energyColor}`}>{robot.durability.toFixed(1)}</span>
              <span className="text-gray-600 text-xs">/ {maxDur} · {hrsStr}</span>
            </div>
          </div>
          <DurabilityBar value={robot.durability} max={maxDur} height="sm" />
        </div>
      </div>

      {equips.length > 0 || onUnequip ? (
        <div className="mt-2 pt-2 border-t border-gray-800/60 flex-1">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-600">Equipment</span>
            <span className={freeSlots > 0 ? 'text-gray-500' : 'text-red-400/70'}>
              {usedSlots}/{MAX_EQUIPMENT_SLOTS}
            </span>
          </div>
          <div className="space-y-1">
            {robot.equipments?.map(({ equipment: eq }) => (
              <div key={eq.id} className="flex items-center gap-1 bg-[#111118] rounded-lg px-2 py-1">
                <CategoryTag effectType={eq.effectType} />
                {eq.effectType2 && <CategoryTag effectType={eq.effectType2} />}
                <span className="text-gray-300 text-xs flex-1 truncate">{eq.name}</span>
                <span className="text-gray-600 text-xs font-mono shrink-0">
                  {eq.effectValue}{eq.effectType.includes('PCT') ? '%' : ''}
                  {eq.effectType2 && eq.effectValue2 ? `/${eq.effectValue2}${eq.effectType2.includes('PCT') ? '%' : ''}` : ''}
                </span>
                {onUnequip && (
                  <button onClick={() => onUnequip(eq.id)}
                    className="text-gray-700 hover:text-red-400 transition-colors ml-0.5 shrink-0">×</button>
                )}
              </div>
            ))}
            {Array.from({ length: freeSlots }).map((_, i) => (
              <div key={i} className="px-2 py-1 rounded-lg border border-dashed border-gray-800/60">
                <span className="text-gray-700 text-xs">Empty slot</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {selectMode && actions && <div className="mt-2">{actions}</div>}
    </div>
  )
}
