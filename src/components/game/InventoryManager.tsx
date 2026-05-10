'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DropResultType } from '@/lib/lootbox'
import { LootboxDropModal } from '@/components/game/LootboxDropModal'
import { RarityBadge } from '@/components/ui/RarityBadge'
import { DurabilityBar } from '@/components/ui/DurabilityBar'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { RARITY_BORDER_COLOR, RARITY_LABEL, type Rarity } from '@/lib/rarity'
import { BASE_SLOT_LABELS, BASE_SLOT_EFFECTS } from '@/lib/game-constants'
import { CategoryTag } from '@/components/game/CategoryTag'
import { RobotCard } from '@/components/game/RobotCard'
import type { RobotCardData } from '@/components/game/RobotCard'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'robots' | 'equipments' | 'baseUpgrades' | 'parts' | 'consumables' | 'lootboxes'
type ItemType = 'robot' | 'equipment' | 'baseUpgrade' | 'part' | 'consumable' | 'lootbox'

type Robot = RobotCardData & { equipments: NonNullable<RobotCardData['equipments']> }
interface Equipment    { id: string; name: string; rarity: Rarity; effectType: string; effectValue: number; effectType2?: string | null; effectValue2?: number | null; isPermanent: boolean; robot?: { robot: { name: string } } | null }
interface BaseUpgrade  { id: string; name: string; rarity: Rarity; effectType: string; effectValue: number; isApplied: boolean; appliedSlot: number | null }
interface Part         { id: string; partType: string; category: string; rarity: Rarity; quantity: number }
interface Consumable   { id: string; consumableType: string; value: number; quantity: number }
interface Lootbox      { id: string; lootboxType: string; quantity: number; source: string }

interface RobotForAction {
  id: string; name: string; rarity: string; hashPower: number; durability: number
  isActive: boolean; _count: { equipments: number }
}

interface InventoryData {
  slotsRobots: number; slotsEquipments: number; slotsBaseUpgrades: number
  slotsParts: number; slotsConsumables: number; slotsLootboxes: number
  robots: Robot[]; equipments: Equipment[]; baseUpgrades: BaseUpgrade[]
  parts: Part[]; consumables: Consumable[]; lootboxes: Lootbox[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EFFECT_LABEL: Record<string, string> = {
  HASH_POWER_FLAT:       'ER +',
  HASH_POWER_PCT:        'ER +',
  DURABILITY_LOSS_PCT:   'Durability loss -',
  GLOBAL_EFFICIENCY_PCT: 'Efficiency +',
  UPTIME_HOURS:          'Uptime +',
  POWER_DRAW_FLAT:       'PD -',
  POWER_DRAW_PCT:        'PD -',
}


const SLOT_LABELS  = BASE_SLOT_LABELS  as Record<number, string>
const SLOT_EFFECTS = BASE_SLOT_EFFECTS as Record<number, string[]>

const TABS: { key: Tab; label: string; slotKey: keyof InventoryData }[] = [
  { key: 'robots',       label: 'Robots',        slotKey: 'slotsRobots' },
  { key: 'equipments',   label: 'Equipments',    slotKey: 'slotsEquipments' },
  { key: 'baseUpgrades', label: 'Base Upgrades', slotKey: 'slotsBaseUpgrades' },
  { key: 'parts',        label: 'Parts',         slotKey: 'slotsParts' },
  { key: 'consumables',  label: 'Consumables',   slotKey: 'slotsConsumables' },
  { key: 'lootboxes',    label: 'Lootboxes',     slotKey: 'slotsLootboxes' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SlotBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? (used / total) * 100 : 0
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-blue-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-800 rounded-full h-1">
        <div className={`${color} h-1 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-gray-500 text-xs tabular-nums">{used}/{total}</span>
    </div>
  )
}

function EmptyTab({ message }: { message: string }) {
  return <div className="text-center py-16"><p className="text-gray-600 text-sm">{message}</p></div>
}

// ─── Destroy Button ───────────────────────────────────────────────────────────

function DestroyButton({ itemId, itemType, isLegendary, onDestroy }: {
  itemId: string; itemType: ItemType; isLegendary: boolean
  onDestroy: (id: string, type: ItemType) => void
}) {
  const [step, setStep]   = useState<'idle' | 'confirm' | 'typing'>('idle')
  const [typed, setTyped] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    if (isLegendary && typed !== 'CONFIRM') return
    setLoading(true)
    await onDestroy(itemId, itemType)
    setLoading(false); setStep('idle')
  }

  if (step === 'idle') return (
    <button onClick={() => setStep(isLegendary ? 'typing' : 'confirm')}
      className="text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10">
      Destroy
    </button>
  )
  if (step === 'confirm') return (
    <div className="flex gap-1.5 items-center">
      <span className="text-xs text-red-400">Sure?</span>
      <button onClick={handleConfirm} disabled={loading} className="text-xs text-red-400 hover:text-red-300 font-medium">{loading ? '...' : 'Yes'}</button>
      <button onClick={() => setStep('idle')} className="text-xs text-gray-600 hover:text-gray-400">No</button>
    </div>
  )
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-yellow-400">Type <span className="font-mono font-bold">CONFIRM</span>:</p>
      <div className="flex gap-1.5">
        <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="CONFIRM"
          className="flex-1 bg-[#0d0d15] border border-red-500/40 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none" />
        <button onClick={handleConfirm} disabled={typed !== 'CONFIRM' || loading}
          className="text-xs px-2 py-1 rounded bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 text-white">
          {loading ? '...' : 'Destroy'}
        </button>
        <button onClick={() => { setStep('idle'); setTyped('') }} className="text-xs text-gray-600">Cancel</button>
      </div>
    </div>
  )
}

// ─── Robot Action Modal (Repair / Equip) ──────────────────────────────────────

function RobotActionModal({ mode, title, description, consumableValue, onClose, onSelect }: {
  mode: 'repair' | 'equip'
  title: string; description: string
  consumableValue?: number
  onClose: () => void
  onSelect: (robotId: string) => Promise<void>
}) {
  const [robots, setRobots]   = useState<RobotForAction[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]       = useState<string | null>(null)
  const [error, setError]     = useState('')

  useEffect(() => {
    fetch('/api/game/robots').then((r) => r.json()).then((d) => { setRobots(d); setLoading(false) })
  }, [])

  // Filtra robôs elegíveis
  const eligible = robots.filter((r) => {
    if (mode === 'repair') return r.durability < 100
    if (mode === 'equip')  return !r.isActive && r._count.equipments < 3
    return true
  })

  async function handleSelect(robotId: string) {
    setBusy(robotId); setError('')
    try { await onSelect(robotId); onClose() }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setBusy(null) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#111118] border border-gray-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <p className="text-gray-500 text-xs mb-4">{description}</p>

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        <div className="overflow-y-auto flex-1 space-y-2">
          {loading ? (
            <p className="text-gray-600 text-sm text-center py-4">Loading robots...</p>
          ) : eligible.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-4">
              {mode === 'repair' ? 'All robots are at full durability.' : 'No robots available. Recall robots from Outpost first (max 3 equipment each).'}
            </p>
          ) : eligible.map((r) => {
            const afterRepair = consumableValue ? Math.min(100, r.durability + consumableValue) : null
            return (
              <button key={r.id} onClick={() => handleSelect(r.id)} disabled={busy === r.id}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-700/50 bg-[#0d0d15] hover:border-blue-500/50 hover:bg-blue-500/5 transition-all disabled:opacity-50 text-left">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-sm font-medium truncate">{r.name}</span>
                    <RarityBadge rarity={r.rarity as Rarity} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{r.hashPower} ER</span>
                    {mode === 'equip' && <span>{r._count.equipments}/3 slots</span>}
                    {mode === 'repair' && <span>{r.durability.toFixed(1)} → <span className="text-green-400">{afterRepair?.toFixed(1)}{afterRepair === 100 ? ' (full)' : ''}</span></span>}
                  </div>
                  {mode === 'repair' && <DurabilityBar value={r.durability} height="sm" />}
                </div>
                <span className="text-blue-400 text-xs shrink-0">{busy === r.id ? '...' : 'Select →'}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Base Upgrade Slot Modal ──────────────────────────────────────────────────

function BaseUpgradeSlotModal({ upgrade, appliedUpgrades, onClose, onApply }: {
  upgrade: BaseUpgrade
  appliedUpgrades: BaseUpgrade[]
  onClose: () => void
  onApply: (slot: number) => Promise<void>
}) {
  const [busy, setBusy]   = useState<number | null>(null)
  const [error, setError] = useState('')

  async function handleApply(slot: number) {
    setBusy(slot); setError('')
    try { await onApply(slot); onClose() }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setBusy(null) }
  }

  const compatibleSlots = [1, 2].filter((s) => SLOT_EFFECTS[s].includes(upgrade.effectType))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#111118] border border-gray-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-semibold">Apply Base Upgrade</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="bg-[#0d0d15] rounded-lg p-3 mb-4">
          <p className="text-white text-sm font-medium">{upgrade.name}</p>
          <p className="text-gray-500 text-xs">{EFFECT_LABEL[upgrade.effectType]}{upgrade.effectValue}{upgrade.effectType.includes('PCT') ? '%' : ''}</p>
        </div>

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        <p className="text-gray-500 text-xs mb-3">Select a compatible slot:</p>
        <div className="space-y-2">
          {[1, 2].map((slot) => {
            const occupied  = appliedUpgrades.find((u) => u.appliedSlot === slot)
            const compatible = compatibleSlots.includes(slot)
            return (
              <button key={slot} onClick={() => handleApply(slot)}
                disabled={!!occupied || !compatible || busy === slot}
                className={`w-full p-3 rounded-xl border text-left transition-all ${
                  !compatible ? 'border-gray-800 opacity-40 cursor-not-allowed' :
                  occupied    ? 'border-yellow-700/30 bg-yellow-500/5 cursor-not-allowed' :
                                'border-gray-700 hover:border-blue-500/50 hover:bg-blue-500/5'
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Slot {slot} — {SLOT_LABELS[slot as 1 | 2]}</p>
                    {occupied
                      ? <p className="text-yellow-400 text-xs mt-0.5">Occupied: {occupied.name}</p>
                      : compatible
                      ? <p className="text-gray-600 text-xs mt-0.5">Empty — compatible</p>
                      : <p className="text-gray-700 text-xs mt-0.5">Not compatible with this effect</p>
                    }
                  </div>
                  {!occupied && compatible && (
                    <span className="text-blue-400 text-xs">{busy === slot ? '...' : 'Apply →'}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Tab Contents ─────────────────────────────────────────────────────────────

// Props de seleção compartilhadas por todos os tabs
interface SelectProps {
  selectMode: boolean
  selected: Set<string>
  onToggleSelect: (id: string) => void
}

function SelectCheckbox({ id, selected, onToggle }: { id: string; selected: Set<string>; onToggle: (id: string) => void }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onToggle(id) }}
      className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
        selected.has(id) ? 'bg-blue-500 border-blue-500' : 'border-gray-600 bg-transparent hover:border-blue-400'
      }`}>
      {selected.has(id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
    </button>
  )
}

function RobotsTab({ robots, onDestroy, onUnequip, selectMode, selected, onToggleSelect }: {
  robots: Robot[]
  onDestroy: (id: string, type: ItemType) => void
  onUnequip: (equipmentId: string) => void
} & SelectProps) {
  if (!robots.length) return <EmptyTab message="No robots in inventory. Open lootboxes or visit the Shop." />

  return (
    <div className="grid grid-cols-2 gap-3">
      {robots.map((r) => (
        <div key={r.id} className={`border rounded-xl p-4 bg-[#0d0d15] ${RARITY_BORDER_COLOR[r.rarity]}`}>
          <RobotCard
            robot={r}
            variant="full"
            selectMode={selectMode}
            selected={selected?.has(r.id)}
            onToggleSelect={onToggleSelect}
            onUnequip={onUnequip}
            actions={
              !selectMode
                ? <DestroyButton itemId={r.id} itemType="robot" isLegendary={r.rarity === 'LEGENDARY'} onDestroy={onDestroy} />
                : undefined
            }
          />
        </div>
      ))}
    </div>
  )
}

function EquipmentsTab({ items, onDestroy, onEquip, selectMode, selected, onToggleSelect }: {
  items: Equipment[]
  onDestroy: (id: string, type: ItemType) => void
  onEquip: (item: Equipment) => void
} & SelectProps) {
  if (!items.length) return <EmptyTab message="No equipment in inventory." />
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((e) => {
        const equippedOn = e.robot?.robot?.name ?? null
        return (
          <div key={e.id} className={`border rounded-xl p-4 bg-[#0d0d15] transition-opacity ${RARITY_BORDER_COLOR[e.rarity]} ${equippedOn ? 'opacity-70' : ''}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {selectMode && !equippedOn && <SelectCheckbox id={e.id} selected={selected} onToggle={onToggleSelect} />}
                <RarityBadge rarity={e.rarity} />
              </div>
              {!selectMode && !equippedOn && (
                <DestroyButton itemId={e.id} itemType="equipment" isLegendary={e.rarity === 'LEGENDARY'} onDestroy={onDestroy} />
              )}
            </div>
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <CategoryTag effectType={e.effectType} />
              {e.effectType2 && <CategoryTag effectType={e.effectType2} />}
              {equippedOn && (
                <span className="text-xs px-1.5 py-0.5 rounded border border-blue-500/30 text-blue-400 bg-blue-500/10">
                  Equipped
                </span>
              )}
            </div>
            <p className="text-white text-sm font-semibold truncate">{e.name}</p>
            {equippedOn && (
              <p className="text-blue-400/60 text-xs truncate mt-0.5">on {equippedOn}</p>
            )}
            <div className="text-gray-500 text-xs mt-0.5 mb-3 space-y-0.5">
              <p>{EFFECT_LABEL[e.effectType] ?? e.effectType}{e.effectValue}{e.effectType.includes('PCT') ? '%' : ''}{e.isPermanent ? '' : ' (temporary)'}</p>
              {e.effectType2 && e.effectValue2 && (
                <p>{EFFECT_LABEL[e.effectType2] ?? e.effectType2}{e.effectValue2}{e.effectType2.includes('PCT') ? '%' : ''}</p>
              )}
            </div>
            {!equippedOn && (
              <button onClick={() => onEquip(e)}
                className="w-full py-1.5 rounded-lg border border-blue-600/40 text-blue-400 hover:bg-blue-500/10 text-xs transition-colors">
                Equip to Robot
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function BaseUpgradesTab({ items, onDestroy, onApply, onRemove, selectMode, selected, onToggleSelect }: {
  items: BaseUpgrade[]
  onDestroy: (id: string, type: ItemType) => void
  onApply: (item: BaseUpgrade) => void
  onRemove: (id: string) => void
} & SelectProps) {
  if (!items.length) return <EmptyTab message="No base upgrades in inventory." />

  // Mostra os 2 slots no topo
  const slot1 = items.find((b) => b.appliedSlot === 1)
  const slot2 = items.find((b) => b.appliedSlot === 2)

  return (
    <div className="space-y-4">
      {/* Active Slots */}
      <div className="grid grid-cols-2 gap-3">
        {([{ slot: 1, label: 'Slot 1 — Mining Power', active: slot1 },
          { slot: 2, label: 'Slot 2 — Energy Reduction', active: slot2 }] as const).map(({ slot, label, active }) => (
          <div key={slot} className={`border rounded-xl p-3 ${active ? 'border-green-700/40 bg-green-500/5' : 'border-gray-800/60 bg-[#0d0d15]'}`}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            {active ? (
              <>
                <p className="text-white text-sm font-medium truncate">{active.name}</p>
                <p className="text-gray-500 text-xs">{EFFECT_LABEL[active.effectType]}{active.effectValue}{active.effectType.includes('PCT') ? '%' : ''}</p>
                <button onClick={() => onRemove(active.id)}
                  className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors">
                  Remove
                </button>
              </>
            ) : (
              <p className="text-gray-700 text-xs">Empty</p>
            )}
          </div>
        ))}
      </div>

      {/* Inventory */}
      <div className="grid grid-cols-2 gap-3">
        {items.filter((b) => !b.isApplied).map((b) => {
          const compatible = [1, 2].some((s) => SLOT_EFFECTS[s].includes(b.effectType))
          return (
            <div key={b.id} className={`border rounded-xl p-4 bg-[#0d0d15] ${RARITY_BORDER_COLOR[b.rarity]}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {selectMode && <SelectCheckbox id={b.id} selected={selected} onToggle={onToggleSelect} />}
                  <RarityBadge rarity={b.rarity} />
                </div>
                {!selectMode && <DestroyButton itemId={b.id} itemType="baseUpgrade" isLegendary={b.rarity === 'LEGENDARY'} onDestroy={onDestroy} />}
              </div>
              <div className="flex items-center gap-2 mt-2 mb-1">
                <CategoryTag effectType={b.effectType} />
              </div>
              <p className="text-white text-sm font-semibold truncate">{b.name}</p>
              <p className="text-gray-500 text-xs mt-0.5 mb-3">
                {EFFECT_LABEL[b.effectType]}{b.effectValue}{b.effectType.includes('PCT') ? '%' : ''}
              </p>
              {compatible && (
                <button onClick={() => onApply(b)}
                  className="w-full py-1.5 rounded-lg border border-green-600/40 text-green-400 hover:bg-green-500/10 text-xs transition-colors">
                  Apply to Base
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PartsTab({ items, onDestroy, selectMode, selected, onToggleSelect }: { items: Part[]; onDestroy: (id: string, type: ItemType) => void } & SelectProps) {
  if (!items.length) return <EmptyTab message="No crafting parts in inventory. Open Parts Crates to get parts." />
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((p) => (
        <div key={p.id} className={`border rounded-xl p-3 bg-[#0d0d15] ${RARITY_BORDER_COLOR[p.rarity]}`}>
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-1.5">
              {selectMode && <SelectCheckbox id={p.id} selected={selected} onToggle={onToggleSelect} />}
              <span className={`text-xs font-medium ${RARITY_BORDER_COLOR[p.rarity].split(' ')[0]}`}>{RARITY_LABEL[p.rarity as Rarity]}</span>
            </div>
            <span className="text-white text-sm font-bold">×{p.quantity}</span>
          </div>
          <p className="text-white text-xs font-medium truncate mt-1">{p.partType}</p>
          <p className="text-gray-600 text-xs">{p.category}</p>
          <div className="mt-2 flex justify-end">
            <DestroyButton itemId={p.id} itemType="part" isLegendary={p.rarity === 'LEGENDARY'} onDestroy={onDestroy} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ConsumablesTab({ items, onDestroy, onUse, selectMode, selected, onToggleSelect }: {
  items: Consumable[]
  onDestroy: (id: string, type: ItemType) => void
  onUse: (item: Consumable) => void
} & SelectProps) {
  if (!items.length) return <EmptyTab message="No consumables in inventory." />
  const typeLabel = (type: string, value: number) => {
    if (type === 'REPAIR_KIT') return `Battery +${value} energy`
    if (type === 'BOOST_TEMP') return `Temp Boost +${value}%`
    return type
  }
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((c) => (
        <div key={c.id} className="border border-gray-700/50 rounded-xl p-3 bg-[#0d0d15]">
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-1.5">
              {selectMode && <SelectCheckbox id={c.id} selected={selected} onToggle={onToggleSelect} />}
              <span className="text-gray-400 text-xs">{c.consumableType === 'REPAIR_KIT' ? '🔋' : '⚡'}</span>
            </div>
            <span className="text-white text-sm font-bold">×{c.quantity}</span>
          </div>
          <p className="text-white text-xs font-medium mb-3">{typeLabel(c.consumableType, c.value)}</p>
          {c.consumableType === 'REPAIR_KIT' && (
            <button onClick={() => onUse(c)}
              className="w-full py-1.5 rounded-lg border border-blue-600/40 text-blue-400 hover:bg-blue-500/10 text-xs transition-colors mb-1.5">
              Use
            </button>
          )}
          <div className="flex justify-end">
            <DestroyButton itemId={c.id} itemType="consumable" isLegendary={false} onDestroy={onDestroy} />
          </div>
        </div>
      ))}
    </div>
  )
}

function LootboxesTab({ items, onDestroy, onOpen, opening, selectMode, selected, onToggleSelect }: {
  items: Lootbox[]; onDestroy: (id: string, type: ItemType) => void
  onOpen: (lootboxType: string, qty: number) => void; opening: boolean
} & SelectProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  if (!items.length) return <EmptyTab message="No lootboxes in inventory. Purchase them in the Shop." />

  const sourceLabel: Record<string, string> = {
    purchased: 'Purchased', ranking: 'Ranking reward',
    mission: 'Mission reward', weekly_drop: 'Weekly Drop',
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((lb) => {
        const qty = quantities[lb.id] ?? 1
        return (
          <div key={lb.id} className="border border-purple-700/30 rounded-xl p-3 bg-[#0d0d15]">
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-1.5">
                {selectMode && <SelectCheckbox id={lb.id} selected={selected} onToggle={onToggleSelect} />}
                <span className="text-purple-400 text-xs font-medium">
                  {lb.lootboxType === 'PARTS_CRATE' ? 'Parts Crate' : 'Supply Crate'}
                </span>
              </div>
              <span className="text-white text-sm font-bold">×{lb.quantity}</span>
            </div>
            <p className="text-gray-600 text-xs mb-3">{sourceLabel[lb.source] ?? lb.source}</p>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-xs">Qty</span>
              <QuantityStepper value={qty} min={1} max={Math.min(10, lb.quantity)}
                onChange={(v) => setQuantities((prev) => ({ ...prev, [lb.id]: v }))} />
            </div>
            <button onClick={() => onOpen(lb.lootboxType, qty)} disabled={opening}
              className="w-full py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-medium transition-colors mb-1.5">
              {opening ? 'Opening...' : `Open ${qty}×`}
            </button>
            <div className="flex justify-end">
              <DestroyButton itemId={lb.id} itemType="lootbox" isLegendary={false} onDestroy={onDestroy} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InventoryManager() {
  const [data, setData]           = useState<InventoryData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('robots')
  const [error, setError]         = useState('')
  const [drops, setDrops]               = useState<DropResultType[] | null>(null)
  const [stoppedEarly, setStoppedEarly] = useState(false)
  const [opening, setOpening]           = useState(false)
  const [success, setSuccess]           = useState('')
  const [search, setSearch]             = useState('')
  const [rarityFilter, setRarityFilter] = useState<Rarity | 'ALL'>('ALL')
  const [selectMode, setSelectMode]     = useState(false)
  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm]   = useState(false)

  // Modais de ação
  const [repairTarget,  setRepairTarget]  = useState<Consumable | null>(null)
  const [equipTarget,   setEquipTarget]   = useState<Equipment | null>(null)
  const [applyTarget,   setApplyTarget]   = useState<BaseUpgrade | null>(null)

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/game/inventory')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDestroy(itemId: string, itemType: ItemType) {
    setError(''); setSuccess('')
    const res = await fetch('/api/game/inventory/destroy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, itemType }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed to destroy item.'); return }
    await fetchData()
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleBulkDestroy() {
    if (selected.size === 0) return
    setError(''); setSuccess('')
    const typeMap: Record<Tab, ItemType> = {
      robots: 'robot', equipments: 'equipment', baseUpgrades: 'baseUpgrade',
      parts: 'part', consumables: 'consumable', lootboxes: 'lootbox',
    }
    const type = typeMap[activeTab]
    let destroyed = 0
    const errors: string[] = []

    for (const id of selected) {
      const res  = await fetch('/api/game/inventory/destroy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: id, itemType: type }),
      })
      if (res.ok) {
        destroyed++
      } else {
        const json = await res.json()
        errors.push(json.error ?? 'Failed to destroy item.')
      }
    }

    if (errors.length > 0) setError(errors[0])
    if (destroyed > 0)     setSuccess(`${destroyed} item(s) destroyed.`)

    setSelected(new Set())
    setSelectMode(false)
    setBulkConfirm(false)
    await fetchData()
  }

  async function handleOpen(lootboxType: string, quantity: number) {
    setOpening(true); setError(''); setSuccess('')
    const res = await fetch('/api/game/lootbox/open', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lootboxType, quantity }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed to open lootbox.'); setOpening(false); return }
    if (json.drops?.length > 0) {
      setDrops(json.drops)
      setStoppedEarly(json.stoppedEarly ?? false)
    } else {
      // Abertura bloqueada por inventário cheio — nenhum item recebido
      setError('Could not open: inventory is full. Destroy or use some items first.')
    }
    await fetchData(); setOpening(false)
  }

  async function handleUnequip(equipmentId: string) {
    if (!confirm('Remove this equipment from the robot?')) return
    setError(''); setSuccess('')
    const res = await fetch('/api/game/equipment/unequip', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipmentId }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed to unequip.'); return }
    setSuccess('Equipment removed successfully.')
    await fetchData()
  }

  async function handleRepair(robotId: string) {
    if (!repairTarget) return
    const res = await fetch('/api/game/robot/repair', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consumableId: repairTarget.id, robotId }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Failed to repair.')
    await fetchData()
  }

  async function handleEquip(robotId: string) {
    if (!equipTarget) return
    const res = await fetch('/api/game/equipment/equip', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipmentId: equipTarget.id, robotId }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Failed to equip.')
    setSuccess(`"${equipTarget.name}" equipped successfully.`)
    await fetchData()
  }

  async function handleApply(slot: number) {
    if (!applyTarget) return
    const res = await fetch('/api/game/base-upgrade/apply', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upgradeId: applyTarget.id, slot }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Failed to apply.')
    await fetchData()
  }

  async function handleRemoveUpgrade(upgradeId: string) {
    setError('')
    const res = await fetch('/api/game/base-upgrade/remove', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upgradeId }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed to remove upgrade.'); return }
    await fetchData()
  }

  if (loading) return <div className="text-gray-500 text-sm py-8">Loading inventory...</div>
  if (!data)   return <div className="text-red-400 text-sm py-8">Failed to load inventory.</div>

  const counts: Record<Tab, number> = {
    robots: data.robots.length, equipments: data.equipments.length,
    baseUpgrades: data.baseUpgrades.length, parts: data.parts.length,
    consumables: data.consumables.length, lootboxes: data.lootboxes.length,
  }
  const slots: Record<Tab, number> = {
    robots: data.slotsRobots, equipments: data.slotsEquipments,
    baseUpgrades: data.slotsBaseUpgrades, parts: data.slotsParts,
    consumables: data.slotsConsumables, lootboxes: data.slotsLootboxes,
  }

  return (
    <div>
      {drops && <LootboxDropModal drops={drops} stoppedEarly={stoppedEarly} onClose={() => { setDrops(null); setStoppedEarly(false) }} />}

      {repairTarget && (
        <RobotActionModal mode="repair" title="Use Battery"
          description={`Select which robot to recharge with this battery (+${repairTarget.value} energy).`}
          consumableValue={repairTarget.value}
          onClose={() => setRepairTarget(null)} onSelect={handleRepair} />
      )}

      {equipTarget && (
        <RobotActionModal mode="equip" title="Equip Item"
          description={`Select a robot to equip "${equipTarget.name}" on. Robot must be recalled from Outpost (max 3 equipment).`}
          onClose={() => setEquipTarget(null)} onSelect={handleEquip} />
      )}

      {applyTarget && data && (
        <BaseUpgradeSlotModal upgrade={applyTarget}
          appliedUpgrades={data.baseUpgrades.filter((b) => b.isApplied)}
          onClose={() => setApplyTarget(null)} onApply={handleApply} />
      )}

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => setError('')} className="text-red-400/60 hover:text-red-400 text-xs ml-3">✕</button>
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-green-400 text-sm">{success}</p>
          <button onClick={() => setSuccess('')} className="text-green-400/60 hover:text-green-400 text-xs ml-3">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-1 bg-[#0d0d15] rounded-xl p-1 flex-wrap">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => { setActiveTab(key); setSearch(''); setRarityFilter('ALL'); setSelected(new Set()) }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === key ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-gray-500 hover:text-gray-300'
            }`}>
            {label}
            {counts[key] > 0 && (
              <span className={`text-xs px-1 rounded ${activeTab === key ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-700 text-gray-400'}`}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mb-3 mt-2"><SlotBar used={counts[activeTab]} total={slots[activeTab]} /></div>

      {/* Rarity filter chips */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {(['ALL', 'COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'] as const).map((r) => {
          const colors: Record<string, string> = {
            ALL:       'text-gray-400 border-gray-700',
            COMMON:    'text-gray-400 border-gray-700',
            UNCOMMON:  'text-green-400 border-green-700/50',
            RARE:      'text-blue-400 border-blue-700/50',
            EPIC:      'text-purple-400 border-purple-700/50',
            LEGENDARY: 'text-yellow-400 border-yellow-700/50',
          }
          const isActive = rarityFilter === r
          return (
            <button key={r} onClick={() => { setRarityFilter(r); setSelected(new Set()) }}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${colors[r]} ${
                isActive ? 'bg-current/10 opacity-100' : 'opacity-50 hover:opacity-80'
              }`}>
              {r === 'ALL' ? 'All Rarities' : r.charAt(0) + r.slice(1).toLowerCase()}
            </button>
          )
        })}
      </div>

      {/* Search + Select controls */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text" placeholder="Search items..." value={search}
            onChange={(e) => { setSearch(e.target.value); setSelected(new Set()) }}
            className="w-full bg-[#0d0d15] border border-gray-800 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600 transition-colors"
          />
        </div>
        <button
          onClick={() => { setSelectMode((v) => !v); setSelected(new Set()); setBulkConfirm(false) }}
          className={`px-3 py-2 rounded-lg border text-xs transition-colors ${selectMode ? 'border-blue-500/60 text-blue-400 bg-blue-500/10' : 'border-gray-700 text-gray-500 hover:text-gray-300'}`}
        >
          {selectMode ? 'Cancel' : 'Select'}
        </button>
      </div>

      {/* Bulk destroy bar */}
      {selectMode && selected.size > 0 && (
        <div className="mb-4 bg-[#111118] border border-red-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
          {bulkConfirm ? (
            <>
              <p className="text-red-400 text-sm">Destroy {selected.size} item(s)? This cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={handleBulkDestroy} className="text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors">Confirm</button>
                <button onClick={() => setBulkConfirm(false)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 transition-colors">Cancel</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-400 text-sm">{selected.size} item(s) selected</p>
              <button onClick={() => setBulkConfirm(true)}
                className="text-xs px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors">
                Destroy Selected
              </button>
            </>
          )}
        </div>
      )}

      {(() => {
        const q  = search.toLowerCase()
        const rf = rarityFilter === 'ALL' ? null : rarityFilter

        const filterRarity = <T extends { rarity?: Rarity }>(items: T[]) =>
          rf ? items.filter((i) => i.rarity === rf) : items

        const robots       = filterRarity(data.robots.filter((r) => !q || r.name.toLowerCase().includes(q) || r.collection.toLowerCase().includes(q)))
        const equipments   = filterRarity(data.equipments.filter((e) => !q || e.name.toLowerCase().includes(q)))
        const baseUpgrades = filterRarity(data.baseUpgrades.filter((b) => !q || b.name.toLowerCase().includes(q)))
        const parts        = filterRarity(data.parts.filter((p) => !q || p.partType.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)))
        const consumables  = data.consumables.filter((c) => !q || c.consumableType.toLowerCase().includes(q)) // consumables sem raridade
        const lootboxes    = data.lootboxes.filter((l) => !q || l.lootboxType.toLowerCase().includes(q))      // lootboxes sem raridade

        const selProps = { selectMode, selected, onToggleSelect: toggleSelect }

        if (activeTab === 'robots')       return <RobotsTab       robots={robots}       onDestroy={handleDestroy} onUnequip={handleUnequip} {...selProps} />
        if (activeTab === 'equipments')   return <EquipmentsTab   items={equipments}    onDestroy={handleDestroy} onEquip={setEquipTarget}   {...selProps} />
        if (activeTab === 'baseUpgrades') return <BaseUpgradesTab items={baseUpgrades}  onDestroy={handleDestroy} onApply={setApplyTarget} onRemove={handleRemoveUpgrade} {...selProps} />
        if (activeTab === 'parts')        return <PartsTab        items={parts}         onDestroy={handleDestroy} {...selProps} />
        if (activeTab === 'consumables')  return <ConsumablesTab  items={consumables}   onDestroy={handleDestroy} onUse={setRepairTarget} {...selProps} />
        if (activeTab === 'lootboxes')    return <LootboxesTab    items={lootboxes}     onDestroy={handleDestroy} onOpen={handleOpen} opening={opening} {...selProps} />
      })()}
    </div>
  )
}
