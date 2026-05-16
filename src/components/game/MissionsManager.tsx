'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type MissionData = {
  id:          string
  title:       string
  description: string
  category:    string
  target:      number
  rewardType:  string
  rewardData:  Record<string, unknown>
  progress:    number
  completed:   boolean
  completedAt: string | null
  claimed:     boolean
  claimedAt:   string | null
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  FIRST_STEPS: 'First Steps',
  MINING:      'Mining',
  LOOTBOX:     'Lootboxes',
  CRAFTING:    'Crafting',
  MARKET:      'Market',
  MINIGAMES:   'Minigames',
  CODEX:       'Codex',
  RANKING:     'Ranking',
  SEASONAL:    'Seasonal',
}

const CATEGORY_ICONS: Record<string, string> = {
  FIRST_STEPS: '🚀',
  MINING:      '⛏️',
  LOOTBOX:     '📦',
  CRAFTING:    '🔧',
  MARKET:      '🏪',
  MINIGAMES:   '🎮',
  CODEX:       '📖',
  RANKING:     '🏆',
  SEASONAL:    '🌟',
}

function rewardLabel(type: string, data: Record<string, unknown>): string {
  switch (type) {
    case 'LOOTBOX': {
      const qty  = (data.quantity as number) ?? 1
      const name = data.lootboxType === 'SUPPLY_CRATE' ? 'Supply Crate' : 'Parts Crate'
      return qty > 1 ? `${qty}× ${name}` : name
    }
    case 'ROBOT':     return `${data.rarity as string} Robot`
    case 'EQUIPMENT': return `${data.rarity as string} Equipment`
    case 'REPAIR_KIT': return `Repair Kit +${data.percent as number}%`
    case 'INVENTORY_EXPANSION': return `+${data.slots as number} ${data.tab as string} Slots`
    case 'OUTPOST_SLOT': return `+${data.slots as number} Outpost Slot`
    case 'TITLE':     return `Title: "${data.title as string}"`
    case 'COSMETIC':  return `Cosmetic: ${data.name as string}`
    default:          return type
  }
}

const RARITY_COLORS: Record<string, string> = {
  COMMON:    'text-gray-300',
  UNCOMMON:  'text-green-400',
  RARE:      'text-blue-400',
  EPIC:      'text-purple-400',
  LEGENDARY: 'text-yellow-400',
}

function rewardColor(type: string, data: Record<string, unknown>): string {
  if (type === 'ROBOT' || type === 'EQUIPMENT') {
    return RARITY_COLORS[data.rarity as string] ?? 'text-gray-300'
  }
  if (type === 'LOOTBOX' && data.lootboxType === 'SUPPLY_CRATE') return 'text-purple-400'
  if (type === 'OUTPOST_SLOT') return 'text-yellow-400'
  if (type === 'TITLE')        return 'text-yellow-400'
  return 'text-green-400'
}

// ─── MissionCard ─────────────────────────────────────────────────────────────

function MissionCard({
  mission,
  onClaim,
  claiming,
}: {
  mission:  MissionData
  onClaim:  (id: string) => void
  claiming: string | null
}) {
  const pct         = Math.min(100, Math.floor((mission.progress / mission.target) * 100))
  const isClaiming  = claiming === mission.id
  const reward      = rewardLabel(mission.rewardType, mission.rewardData)
  const rewardClr   = rewardColor(mission.rewardType, mission.rewardData)

  return (
    <div className={`
      flex flex-col gap-2 p-4 rounded-lg border bg-gray-900
      ${mission.claimed  ? 'border-gray-700 opacity-60'
        : mission.completed ? 'border-yellow-500/60'
        : 'border-gray-700/60'}
    `}>
      {/* Title + status */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-white leading-tight">{mission.title}</p>
        {mission.claimed && (
          <span className="text-xs text-gray-500 shrink-0">Claimed</span>
        )}
        {!mission.claimed && mission.completed && (
          <span className="text-xs text-yellow-400 font-medium shrink-0 animate-pulse">Ready!</span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 leading-snug">{mission.description}</p>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{mission.progress.toLocaleString()} / {mission.target.toLocaleString()}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              mission.completed ? 'bg-yellow-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Reward + claim */}
      <div className="flex items-center justify-between mt-1">
        <span className={`text-xs font-medium ${rewardClr}`}>
          Reward: {reward}
        </span>
        {mission.completed && !mission.claimed && (
          <button
            onClick={() => onClaim(mission.id)}
            disabled={isClaiming}
            className="px-3 py-1 text-xs font-semibold rounded bg-yellow-500 hover:bg-yellow-400 text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isClaiming ? 'Claiming…' : 'Claim'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── MissionsManager ─────────────────────────────────────────────────────────

export function MissionsManager() {
  const [missions,    setMissions]   = useState<MissionData[]>([])
  const [loading,     setLoading]    = useState(true)
  const [activeTab,   setActiveTab]  = useState<string>('ALL')
  const [claiming,    setClaiming]   = useState<string | null>(null)
  const [claimMsg,    setClaimMsg]   = useState<{ text: string; ok: boolean } | null>(null)

  const fetchMissions = useCallback(async () => {
    const res = await fetch('/api/game/missions')
    if (res.ok) {
      const data = await res.json() as { missions: MissionData[] }
      setMissions(data.missions)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchMissions() }, [fetchMissions])

  const handleClaim = async (missionId: string) => {
    setClaiming(missionId)
    setClaimMsg(null)
    try {
      const res  = await fetch('/api/game/missions/claim', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ missionId }),
      })
      const data = await res.json() as { error?: string; rewardType?: string; rewardData?: Record<string, unknown> }
      if (!res.ok) {
        setClaimMsg({ text: data.error ?? 'Failed to claim reward.', ok: false })
      } else {
        const label = rewardLabel(data.rewardType!, data.rewardData!)
        setClaimMsg({ text: `Reward claimed: ${label}!`, ok: true })
        await fetchMissions()
      }
    } catch {
      setClaimMsg({ text: 'Network error.', ok: false })
    } finally {
      setClaiming(null)
    }
  }

  // Group by category
  const categories = ['ALL', ...Array.from(new Set(missions.map((m) => m.category)))]

  const filtered = activeTab === 'ALL'
    ? missions
    : missions.filter((m) => m.category === activeTab)

  const readyCnt  = missions.filter((m) => m.completed && !m.claimed).length
  const totalDone = missions.filter((m) => m.claimed).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
        Loading missions…
      </div>
    )
  }

  if (!missions.length) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
        No missions available yet. Check back soon!
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats bar */}
      <div className="flex gap-6 text-sm">
        <div>
          <span className="text-gray-500">Completed</span>
          <span className="ml-2 font-semibold text-white">{totalDone} / {missions.length}</span>
        </div>
        {readyCnt > 0 && (
          <div>
            <span className="text-yellow-400 font-semibold">{readyCnt} reward{readyCnt > 1 ? 's' : ''} ready to claim!</span>
          </div>
        )}
      </div>

      {/* Claim message */}
      {claimMsg && (
        <div className={`text-sm px-4 py-2 rounded border ${
          claimMsg.ok
            ? 'bg-green-900/30 border-green-700 text-green-400'
            : 'bg-red-900/30 border-red-700 text-red-400'
        }`}>
          {claimMsg.text}
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => {
          const count = cat === 'ALL'
            ? missions.filter((m) => m.completed && !m.claimed).length
            : missions.filter((m) => m.category === cat && m.completed && !m.claimed).length
          return (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors relative ${
                activeTab === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {cat === 'ALL' ? 'All' : `${CATEGORY_ICONS[cat] ?? ''} ${CATEGORY_LABELS[cat] ?? cat}`}
              {count > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-yellow-500 text-black">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Mission grid — grouped by category when showing ALL */}
      {activeTab === 'ALL' ? (
        <div className="flex flex-col gap-8">
          {Array.from(new Set(missions.map((m) => m.category))).map((cat) => {
            const catMissions = missions.filter((m) => m.category === cat)
            return (
              <div key={cat}>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {CATEGORY_ICONS[cat] ?? ''} {CATEGORY_LABELS[cat] ?? cat}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catMissions.map((m) => (
                    <MissionCard
                      key={m.id}
                      mission={m}
                      onClaim={handleClaim}
                      claiming={claiming}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((m) => (
            <MissionCard
              key={m.id}
              mission={m}
              onClaim={handleClaim}
              claiming={claiming}
            />
          ))}
        </div>
      )}
    </div>
  )
}
