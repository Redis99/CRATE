'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type StandingEntry = {
  position: number
  userId:   string
  username: string
  erTotal:  number
  isMe:     boolean
}

type SnapshotEntry = {
  userId:   string
  username: string
  position: number
  erTotal:  number
  rewarded: boolean
}

type RankingData = {
  weekStart:    string
  currentWeek:  StandingEntry[]
  myPosition:   number | null
  lastSnapshot: { weekStart: string; entries: SnapshotEntry[] } | null
}

// ─── Reward table constants ───────────────────────────────────────────────────

const POSITION_REWARDS: Record<number, string> = {
  1:  '3× Supply Crate + 2× Parts Crate',
  2:  '2× Supply Crate + 2× Parts Crate',
  3:  '2× Supply Crate + 1× Parts Crate',
  4:  '1× Supply Crate + 1× Parts Crate',
  5:  '1× Supply Crate + 1× Parts Crate',
  6:  '1× Parts Crate',
  7:  '1× Parts Crate',
  8:  '1× Parts Crate',
  9:  '1× Parts Crate',
  10: '1× Parts Crate',
}

function positionRewardLabel(pos: number): string {
  return POSITION_REWARDS[pos] ?? 'Participation Badge'
}

function medalColor(pos: number): string {
  if (pos === 1) return 'text-yellow-400'
  if (pos === 2) return 'text-slate-300'
  if (pos === 3) return 'text-amber-600'
  return 'text-gray-500'
}

function positionLabel(pos: number): string {
  if (pos === 1) return '🥇'
  if (pos === 2) return '🥈'
  if (pos === 3) return '🥉'
  return `#${pos}`
}

function formatER(er: number): string {
  if (er >= 1_000_000) return `${(er / 1_000_000).toFixed(2)}M`
  if (er >= 1_000)     return `${(er / 1_000).toFixed(1)}k`
  return er.toFixed(1)
}

function formatWeekStart(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

type Tab = 'current' | 'last' | 'rewards'

// ─── Component ───────────────────────────────────────────────────────────────

export function RankingManager() {
  const [data,    setData]    = useState<RankingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<Tab>('current')

  const fetchRanking = useCallback(async () => {
    try {
      const res = await fetch('/api/game/ranking')
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRanking() }, [fetchRanking])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        Loading rankings…
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-red-400">
        Failed to load rankings.
      </div>
    )
  }

  const weekLabel = formatWeekStart(data.weekStart)

  return (
    <div className="space-y-6">

      {/* My position banner */}
      {data.myPosition ? (
        <div className="flex items-center gap-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-6 py-4">
          <span className={`text-2xl font-bold ${medalColor(data.myPosition)}`}>
            {positionLabel(data.myPosition)}
          </span>
          <div>
            <p className="text-sm text-gray-400">Your current position</p>
            <p className="text-white font-semibold">
              {positionRewardLabel(data.myPosition)}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-6 py-4 text-gray-400 text-sm">
          You have no ER contribution this week yet. Deploy robots to join the Mining Race!
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-800 p-1">
        {([
          ['current', `This Week (${weekLabel})`],
          ['last',    'Last Week'],
          ['rewards', 'Reward Table'],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === id
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Current week leaderboard */}
      {tab === 'current' && (
        <div className="space-y-1">
          {data.currentWeek.length === 0 ? (
            <p className="text-center py-12 text-gray-500">
              No miners yet this week — be the first!
            </p>
          ) : (
            data.currentWeek.map((entry) => (
              <StandingRow key={entry.userId} entry={entry} />
            ))
          )}
          {data.currentWeek.length === 100 && (
            <p className="text-center text-xs text-gray-600 pt-2">Showing top 100 players</p>
          )}
        </div>
      )}

      {/* Last week snapshot */}
      {tab === 'last' && (
        <div className="space-y-1">
          {!data.lastSnapshot ? (
            <p className="text-center py-12 text-gray-500">
              No previous week results yet.
            </p>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-3">
                Week of {formatWeekStart(data.lastSnapshot.weekStart)}
              </p>
              {(data.lastSnapshot.entries as SnapshotEntry[]).map((entry) => (
                <SnapshotRow key={entry.userId} entry={entry} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Reward table */}
      {tab === 'rewards' && <RewardTable />}
    </div>
  )
}

// ─── Standing row ─────────────────────────────────────────────────────────────

function StandingRow({ entry }: { entry: StandingEntry }) {
  const isTop10 = entry.position <= 10
  return (
    <div
      className={`flex items-center gap-4 rounded-lg px-4 py-3 transition-colors ${
        entry.isMe
          ? 'border border-blue-500/40 bg-blue-500/10'
          : isTop10
          ? 'bg-gray-800/60 hover:bg-gray-800'
          : 'bg-gray-900/40 hover:bg-gray-900/60'
      }`}
    >
      <span className={`w-10 text-center font-bold ${medalColor(entry.position)}`}>
        {positionLabel(entry.position)}
      </span>
      <span className={`flex-1 font-medium ${entry.isMe ? 'text-blue-300' : 'text-white'}`}>
        {entry.username}
        {entry.isMe && <span className="ml-2 text-xs text-blue-400">(you)</span>}
      </span>
      <span className="text-sm text-gray-300 tabular-nums">
        {formatER(entry.erTotal)} ER
      </span>
      <span className="text-xs text-gray-500 w-40 text-right hidden sm:block">
        {positionRewardLabel(entry.position)}
      </span>
    </div>
  )
}

// ─── Snapshot row ─────────────────────────────────────────────────────────────

function SnapshotRow({ entry }: { entry: SnapshotEntry }) {
  return (
    <div className="flex items-center gap-4 rounded-lg px-4 py-3 bg-gray-800/40">
      <span className={`w-10 text-center font-bold ${medalColor(entry.position)}`}>
        {positionLabel(entry.position)}
      </span>
      <span className="flex-1 font-medium text-white">{entry.username}</span>
      <span className="text-sm text-gray-300 tabular-nums">
        {formatER(entry.erTotal)} ER
      </span>
      <span className={`text-xs w-24 text-right ${entry.rewarded ? 'text-green-400' : 'text-gray-500'}`}>
        {entry.rewarded ? '✓ Rewarded' : 'Badge only'}
      </span>
    </div>
  )
}

// ─── Reward table ─────────────────────────────────────────────────────────────

function RewardTable() {
  const rows = [
    { pos: '1st',    reward: '3× Supply Crate + 2× Parts Crate' },
    { pos: '2nd',    reward: '2× Supply Crate + 2× Parts Crate' },
    { pos: '3rd',    reward: '2× Supply Crate + 1× Parts Crate' },
    { pos: '4th–5th',  reward: '1× Supply Crate + 1× Parts Crate' },
    { pos: '6th–10th', reward: '1× Parts Crate' },
    { pos: '11th+',    reward: 'Participation Badge' },
  ]

  return (
    <div className="rounded-lg border border-gray-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-800 text-gray-400 text-left">
            <th className="px-4 py-3 font-medium">Position</th>
            <th className="px-4 py-3 font-medium">Reward</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.pos}
              className={`border-t border-gray-700/50 ${i % 2 === 0 ? 'bg-gray-900/30' : ''}`}
            >
              <td className="px-4 py-3 font-semibold text-gray-200">{row.pos}</td>
              <td className="px-4 py-3 text-gray-300">{row.reward}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-3 bg-gray-800/50 text-xs text-gray-500">
        Crates from ranking do <strong className="text-gray-400">not</strong> count toward the weekly Parts Crate purchase limit. Rewards are delivered automatically every Monday.
      </div>
    </div>
  )
}
