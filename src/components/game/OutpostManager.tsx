'use client'

import { useState, useEffect, useCallback } from 'react'
import { ERIcon } from '@/components/ui/ERIcon'

type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

interface Robot {
  id: string
  name: string
  collection: string
  rarity: Rarity
  hashPower: number
  durability: number
  isActive: boolean
  outpostSlot: number | null
}

interface OutpostData {
  outpostSlots: number
  robots: Robot[]
}

const RARITY_COLORS: Record<Rarity, string> = {
  COMMON: 'text-gray-400 border-gray-700 bg-gray-400/5',
  UNCOMMON: 'text-green-400 border-green-700/50 bg-green-400/5',
  RARE: 'text-blue-400 border-blue-700/50 bg-blue-400/5',
  EPIC: 'text-purple-400 border-purple-700/50 bg-purple-400/5',
  LEGENDARY: 'text-yellow-400 border-yellow-700/50 bg-yellow-400/5',
}

const RARITY_LABEL: Record<Rarity, string> = {
  COMMON: 'Common',
  UNCOMMON: 'Uncommon',
  RARE: 'Rare',
  EPIC: 'Epic',
  LEGENDARY: 'Legendary',
}

function effectiveER(robot: Robot): number {
  if (robot.durability === 0) return 0
  if (robot.durability <= 20) return robot.hashPower * 0.4
  if (robot.durability <= 50) return robot.hashPower * 0.8
  return robot.hashPower
}

function DurabilityBar({ value }: { value: number }) {
  const color = value > 50 ? 'bg-green-500' : value > 20 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="w-full bg-gray-800 rounded-full h-1.5">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${value}%` }} />
    </div>
  )
}

function RarityBadge({ rarity }: { rarity: Rarity }) {
  const color = {
    COMMON: 'text-gray-400 bg-gray-400/10',
    UNCOMMON: 'text-green-400 bg-green-400/10',
    RARE: 'text-blue-400 bg-blue-400/10',
    EPIC: 'text-purple-400 bg-purple-400/10',
    LEGENDARY: 'text-yellow-400 bg-yellow-400/10',
  }[rarity]
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      {RARITY_LABEL[rarity]}
    </span>
  )
}

export function OutpostManager() {
  const [data, setData] = useState<OutpostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/game/outpost')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDeploy(robot: Robot, slot: number) {
    setActionLoading(robot.id)
    setError('')
    const res = await fetch('/api/game/outpost/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robotId: robot.id, slot }),
    })
    const json = await res.json()
    if (!res.ok) setError(json.error)
    else { setSelectedRobot(null); await fetchData() }
    setActionLoading(null)
  }

  async function handleRecall(robot: Robot) {
    setActionLoading(robot.id)
    setError('')
    const res = await fetch('/api/game/outpost/recall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robotId: robot.id }),
    })
    const json = await res.json()
    if (!res.ok) setError(json.error)
    else await fetchData()
    setActionLoading(null)
  }

  if (loading) {
    return <div className="p-8 text-gray-500 text-sm">Loading outpost...</div>
  }

  if (!data) {
    return <div className="p-8 text-red-400 text-sm">Failed to load outpost data.</div>
  }

  const deployedRobots = data.robots.filter((r) => r.isActive)
  const inventoryRobots = data.robots.filter((r) => !r.isActive)
  const totalER = deployedRobots.reduce((sum, r) => sum + effectiveER(r), 0)
  const slots = Array.from({ length: data.outpostSlots }, (_, i) => i + 1)

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Deploy hint */}
      {selectedRobot && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-blue-300 text-sm">
            Select an empty slot to deploy <span className="font-semibold text-white">{selectedRobot.name}</span>
          </p>
          <button
            onClick={() => setSelectedRobot(null)}
            className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Active Robots</p>
          <p className="text-white text-xl font-bold">{deployedRobots.length} <span className="text-gray-600 text-sm font-normal">/ {data.outpostSlots}</span></p>
        </div>
        <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Extraction Rate</p>
          <div className="flex items-center gap-2">
            <p className="text-white text-xl font-bold font-mono">{totalER.toFixed(1)} <span className="text-gray-600 text-sm font-normal">ER</span></p>
            <ERIcon size={16} className="text-green-400" />
          </div>
        </div>
        <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">In Inventory</p>
          <p className="text-white text-xl font-bold">{inventoryRobots.length} <span className="text-gray-600 text-sm font-normal">robot{inventoryRobots.length !== 1 ? 's' : ''}</span></p>
        </div>
      </div>

      {/* Outpost Slots */}
      <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-4">Outpost Slots</h3>
        <div className="grid grid-cols-3 gap-3">
          {slots.map((slot) => {
            const robot = deployedRobots.find((r) => r.outpostSlot === slot)
            const isClickable = selectedRobot && !robot
            return (
              <div
                key={slot}
                onClick={() => isClickable && handleDeploy(selectedRobot, slot)}
                className={`border rounded-xl p-4 transition-all ${
                  robot
                    ? `${RARITY_COLORS[robot.rarity]} border`
                    : isClickable
                    ? 'border-blue-500/60 bg-blue-500/10 cursor-pointer hover:border-blue-400 hover:bg-blue-500/20'
                    : 'border-gray-800/60 bg-[#0d0d15]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-xs">Slot {slot}</span>
                  {robot && <RarityBadge rarity={robot.rarity} />}
                </div>

                {robot ? (
                  <div>
                    <p className="text-white text-sm font-semibold truncate">{robot.name}</p>
                    <p className="text-gray-500 text-xs truncate mb-2">{robot.collection}</p>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500">{effectiveER(robot).toFixed(1)} ER effective</span>
                      <span className={robot.durability > 50 ? 'text-green-400' : robot.durability > 20 ? 'text-yellow-400' : 'text-red-400'}>
                        {robot.durability}%
                      </span>
                    </div>
                    <DurabilityBar value={robot.durability} />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRecall(robot) }}
                      disabled={actionLoading === robot.id}
                      className="mt-3 w-full text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === robot.id ? 'Recalling...' : 'Recall'}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 gap-1">
                    {isClickable ? (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
                          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                        <span className="text-blue-400 text-xs">Deploy here</span>
                      </>
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-700">
                          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
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
          Robot Inventory
          <span className="text-gray-600 font-normal ml-2">({inventoryRobots.length})</span>
        </h3>

        {inventoryRobots.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-600 text-sm">No robots in inventory.</p>
            <p className="text-gray-700 text-xs mt-1">Open lootboxes or visit the shop to get robots.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {inventoryRobots.map((robot) => {
              const isBroken = robot.durability === 0
              const isSelected = selectedRobot?.id === robot.id
              const outpostFull = deployedRobots.length >= data.outpostSlots
              return (
                <div
                  key={robot.id}
                  className={`border rounded-xl p-4 transition-all ${
                    isSelected
                      ? 'border-blue-500/60 bg-blue-500/10'
                      : isBroken
                      ? 'border-red-900/40 bg-red-900/5 opacity-60'
                      : `${RARITY_COLORS[robot.rarity]} border`
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <RarityBadge rarity={robot.rarity} />
                    {isBroken && (
                      <span className="text-red-400 text-xs">Broken</span>
                    )}
                  </div>
                  <p className="text-white text-sm font-semibold truncate">{robot.name}</p>
                  <p className="text-gray-500 text-xs truncate mb-2">{robot.collection}</p>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500">{robot.hashPower} ER base</span>
                    <span className={robot.durability > 50 ? 'text-green-400' : robot.durability > 20 ? 'text-yellow-400' : 'text-red-400'}>
                      {robot.durability}%
                    </span>
                  </div>
                  <DurabilityBar value={robot.durability} />
                  <button
                    onClick={() => {
                      if (isSelected) { setSelectedRobot(null); return }
                      setSelectedRobot(robot)
                      setError('')
                    }}
                    disabled={isBroken || outpostFull || actionLoading === robot.id}
                    className={`mt-3 w-full text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'border-blue-500/60 text-blue-300 bg-blue-500/10'
                        : 'border-gray-700 text-gray-300 hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/5'
                    }`}
                  >
                    {isBroken
                      ? 'Needs Repair'
                      : outpostFull && !isSelected
                      ? 'Outpost Full'
                      : isSelected
                      ? '✓ Selected'
                      : 'Deploy'}
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
