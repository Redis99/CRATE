'use client'

import { useState, useEffect } from 'react'
import { RarityBadge } from '@/components/ui/RarityBadge'
import { CategoryTag } from '@/components/game/CategoryTag'
import { effectLabel } from '@/lib/effect-label'
import type { RobotCardData } from '@/components/game/RobotCard'
import type { Rarity } from '@/lib/rarity'

const MAX_SLOTS = 3

interface InventoryEquipment {
  id: string
  name: string
  rarity: Rarity
  effectType: string
  effectValue: number
  effectType2?: string | null
  effectValue2?: number | null
  robot?: unknown  // presente se já instalado em outro robô
}

interface Props {
  robot: RobotCardData
  isOpen: boolean
  onClose: () => void
  onRefresh: () => void
}

export function EquipmentModal({ robot, isOpen, onClose, onRefresh }: Props) {
  const [inventory, setInventory] = useState<InventoryEquipment[]>([])
  const [loading, setLoading]     = useState(false)
  const [actionId, setActionId]   = useState<string | null>(null)
  const [error, setError]         = useState('')

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError('')
    fetch('/api/game/inventory')
      .then((r) => r.json())
      .then((data) => setInventory(data.equipments ?? []))
      .finally(() => setLoading(false))
  }, [isOpen])

  const equippedItems = robot.equipments?.map((e) => e.equipment) ?? []
  const freeSlots     = MAX_SLOTS - equippedItems.length
  const isActive      = !!robot.isActive

  // Equipamentos não instalados em nenhum robô
  const available = inventory.filter((e) => !e.robot)

  async function handleEquip(equipmentId: string) {
    setActionId(equipmentId); setError('')
    const res  = await fetch('/api/game/equipment/equip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipmentId, robotId: robot.id }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error); setActionId(null); return }
    onRefresh()
    onClose()
  }

  async function handleUnequip(equipmentId: string) {
    setActionId(equipmentId); setError('')
    const res  = await fetch('/api/game/equipment/unequip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipmentId }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error); setActionId(null); return }
    onRefresh()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[#0d0d15] border border-gray-800/60 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-800/60 shrink-0">
          <div>
            <h2 className="text-white font-semibold">{robot.name}</h2>
            <p className="text-gray-500 text-xs mt-0.5">
              Equipment · {equippedItems.length}/{MAX_SLOTS} slots used
            </p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 text-lg leading-none mt-0.5">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {isActive && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2.5 flex items-start gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className="text-amber-400 shrink-0 mt-0.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <p className="text-amber-400 text-xs">
                Recall this robot from the Outpost before equipping or removing items.
              </p>
            </div>
          )}

          {/* ── Instalados ── */}
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Installed</p>
            {equippedItems.length === 0 ? (
              <p className="text-gray-700 text-xs italic">No equipment installed.</p>
            ) : (
              <div className="space-y-1.5">
                {equippedItems.map((eq) => (
                  <div key={eq.id} className="flex items-center gap-2 bg-[#111118] rounded-xl px-3 py-2.5">
                    <CategoryTag effectType={eq.effectType} />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-200 text-xs font-medium truncate">{eq.name}</p>
                      <p className="text-gray-500 text-xs">
                        {effectLabel(eq.effectType, eq.effectValue)}
                        {eq.effectType2 && eq.effectValue2 != null
                          ? ` · ${effectLabel(eq.effectType2, eq.effectValue2)}`
                          : ''}
                      </p>
                    </div>
                    <RarityBadge rarity={eq.rarity} />
                    {!isActive && (
                      <button
                        onClick={() => handleUnequip(eq.id)}
                        disabled={!!actionId}
                        className="ml-1 text-xs text-red-500/60 hover:text-red-400 border border-red-900/40 hover:border-red-500/40 rounded-lg px-2 py-0.5 transition-colors disabled:opacity-40"
                      >
                        {actionId === eq.id ? '...' : 'Remove'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Disponíveis no inventário ── */}
          {!isActive && (
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
                Available in inventory
                {freeSlots === 0 && <span className="text-red-400/60 ml-2 normal-case">(remove an item first)</span>}
              </p>
              {loading ? (
                <p className="text-gray-600 text-xs">Loading...</p>
              ) : available.length === 0 ? (
                <p className="text-gray-700 text-xs italic">No unequipped items in inventory.</p>
              ) : (
                <div className="space-y-1.5">
                  {available.map((eq) => (
                    <div key={eq.id} className="flex items-center gap-2 bg-[#111118] rounded-xl px-3 py-2.5">
                      <CategoryTag effectType={eq.effectType} />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-200 text-xs font-medium truncate">{eq.name}</p>
                        <p className="text-gray-500 text-xs">
                          {effectLabel(eq.effectType, eq.effectValue)}
                          {eq.effectType2 && eq.effectValue2 != null
                            ? ` · ${effectLabel(eq.effectType2, eq.effectValue2)}`
                            : ''}
                        </p>
                      </div>
                      <RarityBadge rarity={eq.rarity} />
                      <button
                        onClick={() => handleEquip(eq.id)}
                        disabled={!!actionId || freeSlots === 0}
                        className="ml-1 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-800/60 hover:border-indigo-600/60 rounded-lg px-2 py-0.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {actionId === eq.id ? '...' : 'Equip'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
