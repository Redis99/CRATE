'use client'

import { useState, useEffect, useCallback } from 'react'
import { ERIcon } from '@/components/ui/ERIcon'
import { RarityBadge } from '@/components/ui/RarityBadge'
import { RARITY_CARD_COLOR, sortByRarity } from '@/lib/rarity'
import { calculateFleetER, calculateFleetPD } from '@/lib/game-math'
import { ERWidget, PDWidget } from '@/components/game/FleetStatsWidget'
import { RobotCard } from '@/components/game/RobotCard'
import { EquipmentCard, EmptyEquipmentSlot } from '@/components/game/EquipmentCard'
import type { RobotCardData } from '@/components/game/RobotCard'
import type { EquipmentCardData } from '@/components/game/EquipmentCard'
import { BASE_SLOT_LABELS } from '@/lib/game-constants'
import { ActionButton } from '@/components/ui/ActionButton'

interface BaseUpgradeSlot extends EquipmentCardData {
  appliedSlot: number | null
}

interface OutpostData {
  outpostSlots: number
  robots: RobotCardData[]
  baseUpgrades: BaseUpgradeSlot[]
}

export function OutpostManager() {
  const [data, setData]               = useState<OutpostData | null>(null)
  const [loading, setLoading]         = useState(true)
  const [selectedRobot, setSelectedRobot] = useState<RobotCardData | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError]             = useState('')

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/game/outpost')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDeploy(robot: RobotCardData, slot: number) {
    setActionLoading(robot.id); setError('')
    const res  = await fetch('/api/game/outpost/deploy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robotId: robot.id, slot }),
    })
    const json = await res.json()
    if (!res.ok) setError(json.error)
    else { setSelectedRobot(null); await fetchData() }
    setActionLoading(null)
  }

  async function handleRecall(robot: RobotCardData) {
    setActionLoading(robot.id); setError('')
    const res  = await fetch('/api/game/outpost/recall', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robotId: robot.id }),
    })
    const json = await res.json()
    if (!res.ok) setError(json.error)
    else await fetchData()
    setActionLoading(null)
  }

  if (loading) return <div className="p-8 text-gray-500 text-sm">Loading outpost...</div>
  if (!data)   return <div className="p-8 text-red-400 text-sm">Failed to load outpost data.</div>

  const deployedRobots  = sortByRarity(data.robots.filter((r) => r.isActive))
  const inventoryRobots = sortByRarity(data.robots.filter((r) => !r.isActive))

  const robotsForCalc = deployedRobots.map((r) => ({
    hashPower:  r.hashPower,
    energyRate: r.energyRate ?? 1,
    durability: r.durability,
    equipments: r.equipments?.map((e) => e.equipment) ?? [],
  }))

  const erBreakdown = calculateFleetER(robotsForCalc, data.baseUpgrades)
  const pdBreakdown = calculateFleetPD(robotsForCalc)

  const slots = Array.from({ length: data.outpostSlots }, (_, i) => i + 1)

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {selectedRobot && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-indigo-300 text-sm">
            Select an empty slot to deploy <span className="font-semibold text-white">{selectedRobot.name}</span>
          </p>
          <button onClick={() => setSelectedRobot(null)} className="text-gray-500 hover:text-gray-300 text-xs">Cancel</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Active Robots</p>
          <p className="text-white text-xl font-bold">
            {deployedRobots.length} <span className="text-gray-600 text-sm font-normal">/ {data.outpostSlots}</span>
          </p>
          <p className="text-gray-600 text-xs mt-1">Outpost slots</p>
        </div>
        <ERWidget er={erBreakdown} />
        <PDWidget pd={pdBreakdown} />
      </div>

      {/* Base Upgrades */}
      <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-3">Base Configuration</h3>
        <div className="grid grid-cols-2 gap-3">
          {([1, 2] as const).map((slot) => {
            const upgrade = data.baseUpgrades.find((u) => u.appliedSlot === slot)
            return upgrade ? (
              <EquipmentCard
                key={slot}
                item={upgrade}
                variant="base"
                slot={slot}
                slotLabel={BASE_SLOT_LABELS[slot]}
              />
            ) : (
              <EmptyEquipmentSlot
                key={slot}
                slot={slot}
                slotLabel={BASE_SLOT_LABELS[slot]}
                variant="base"
              />
            )
          })}
        </div>
      </div>

      {/* Outpost Slots */}
      <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-4">Outpost Slots</h3>
        <div className="grid grid-cols-3 gap-3">
          {slots.map((slot) => {
            const robot      = deployedRobots.find((r) => r.outpostSlot === slot)
            const isClickable = selectedRobot && !robot
            return (
              <div key={slot}
                onClick={() => isClickable && handleDeploy(selectedRobot, slot)}
                className={`border rounded-xl p-4 transition-all ${
                  robot
                    ? `${RARITY_CARD_COLOR[robot.rarity]} border`
                    : isClickable
                    ? 'border-blue-500/60 bg-blue-500/10 cursor-pointer hover:border-blue-400'
                    : 'border-gray-800/60 bg-[#0d0d15]'
                }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-xs">Slot {slot}</span>
                  {robot && <RarityBadge rarity={robot.rarity} />}
                </div>

                {robot ? (
                  <RobotCard
                    robot={robot}
                    variant="outpost"
                    slotNumber={slot}
                    actions={
                      <ActionButton
                        variant="danger"
                        size="sm"
                        fullWidth
                        onClick={(e) => { e.stopPropagation(); handleRecall(robot) }}
                        disabled={actionLoading === robot.id}
                        loading={actionLoading === robot.id}
                        loadingText="Recalling..."
                      >
                        Recall
                      </ActionButton>
                    }
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 gap-1">
                    {isClickable ? (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                        </svg>
                        <span className="text-blue-400 text-xs">Deploy here</span>
                      </>
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-700">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                        </svg>
                        <span className="text-gray-700 text-xs">Empty</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Robot Inventory */}
      <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-4">
          Robot Inventory <span className="text-gray-600 font-normal">({inventoryRobots.length})</span>
        </h3>

        {inventoryRobots.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-600 text-sm">No robots in inventory.</p>
            <p className="text-gray-700 text-xs mt-1">Open lootboxes or visit the shop to get robots.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {inventoryRobots.map((robot) => {
              const isEmpty    = robot.durability === 0
              const isSelected = selectedRobot?.id === robot.id
              const outpostFull = deployedRobots.length >= data.outpostSlots
              return (
                <div key={robot.id}
                  className={`border rounded-xl p-3 transition-all ${
                    isSelected   ? 'border-blue-500/60 bg-blue-500/10'
                    : isEmpty    ? 'border-red-900/40 bg-red-900/5 opacity-60'
                    : `${RARITY_CARD_COLOR[robot.rarity]} border`
                  }`}>
                  <RobotCard robot={robot} variant="mini" />
                  <button
                    onClick={() => {
                      if (isSelected) { setSelectedRobot(null); return }
                      setSelectedRobot(robot); setError('')
                    }}
                    disabled={isEmpty || outpostFull || actionLoading === robot.id}
                    className={`mt-2 w-full text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'border-indigo-500/60 text-indigo-300 bg-indigo-500/10'
                        : 'border-gray-700 text-gray-300 hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/5'
                    }`}
                  >
                    {isEmpty ? 'No Energy' : outpostFull && !isSelected ? 'Outpost Full' : isSelected ? '✓ Selected' : 'Deploy'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
