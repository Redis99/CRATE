'use client'

import { useState, useEffect } from 'react'
import { DurabilityBar } from '@/components/ui/DurabilityBar'
import { durabilityPct } from '@/lib/game-math'
import type { RobotCardData } from '@/components/game/RobotCard'

interface RepairKit {
  id: string
  consumableType: string
  value: number
  quantity: number
}

interface Props {
  robot: RobotCardData
  isOpen: boolean
  onClose: () => void
  onRefresh: () => void
}

export function RepairModal({ robot, isOpen, onClose, onRefresh }: Props) {
  const [kits, setKits]         = useState<RepairKit[]>([])
  const [loading, setLoading]   = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError]       = useState('')

  const maxDur  = robot.maxDurability ?? robot.durability
  const pct     = durabilityPct(robot.durability, maxDur)
  const isFull  = robot.durability >= maxDur
  const energyColor = pct > 50 ? 'text-green-400' : pct > 20 ? 'text-yellow-400' : 'text-red-400'

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError('')
    fetch('/api/game/inventory')
      .then((r) => r.json())
      .then((data) =>
        setKits(
          (data.consumables ?? [])
            .filter((c: RepairKit) => c.consumableType === 'REPAIR_KIT')
            .sort((a: RepairKit, b: RepairKit) => a.value - b.value)
        )
      )
      .finally(() => setLoading(false))
  }, [isOpen])

  async function handleRepair(kit: RepairKit) {
    setActionId(kit.id); setError('')
    const res  = await fetch('/api/game/robot/repair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consumableId: kit.id, robotId: robot.id, quantity: 1 }),
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

      <div className="relative bg-[#0d0d15] border border-gray-800/60 rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-800/60">
          <div>
            <h2 className="text-white font-semibold">{robot.name}</h2>
            <p className="text-gray-500 text-xs mt-0.5">Repair</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 text-lg leading-none mt-0.5">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Estado de energia atual */}
          <div className="bg-[#111118] rounded-xl p-3">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="text-gray-500">Energy</span>
              <span className={`${energyColor} font-mono`}>
                {robot.durability.toFixed(1)} / {maxDur}
                <span className="text-gray-600 ml-1">({pct.toFixed(0)}%)</span>
              </span>
            </div>
            <DurabilityBar value={robot.durability} max={maxDur} />
            {isFull && (
              <p className="text-green-400/70 text-xs mt-1.5">Robot is at full energy.</p>
            )}
          </div>

          {/* Kits disponíveis */}
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Repair Kits</p>
            {loading ? (
              <p className="text-gray-600 text-xs">Loading...</p>
            ) : kits.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-600 text-sm">No repair kits available.</p>
                <p className="text-gray-700 text-xs mt-1">Get them from lootboxes or the shop.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {kits.map((kit) => {
                  const after = Math.min(maxDur, robot.durability + kit.value)
                  const gain  = Math.max(0, after - robot.durability)
                  return (
                    <div key={kit.id} className="flex items-center justify-between bg-[#111118] rounded-xl px-3 py-2.5">
                      <div>
                        <p className="text-gray-200 text-xs font-medium">Repair Kit +{kit.value}</p>
                        <p className="text-gray-500 text-xs">
                          ×{kit.quantity} available
                          {gain > 0 ? (
                            <span className="text-green-400/80 ml-1">· +{gain.toFixed(1)} energy</span>
                          ) : (
                            <span className="text-gray-600 ml-1">· already full</span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRepair(kit)}
                        disabled={!!actionId || isFull}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {actionId === kit.id ? '...' : 'Use'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
