'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CodexEntry {
  id:           string
  itemName:     string
  rarity:       string
  registeredAt: string
}

interface AvailableRobot {
  id:         string
  name:        string
  collection:  string
  rarity:      string
  hashPower:   number
}

interface Collection {
  id:                string
  name:              string
  description:       string
  itemType:          string
  totalRequired:     number
  bonusPerItemErPct: number
  completionErPct:   number
  completionPdPct:   number
  completionSlots:   number
  registeredCount:   number
  registeredItems:   CodexEntry[]
  availableRobots:   AvailableRobot[]
  isComplete:        boolean
}

interface TotalBonuses {
  erPct: number
  pdPct: number
}

interface CodexData {
  collections:  Collection[]
  totalBonuses: TotalBonuses
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RARITY_COLORS: Record<string, string> = {
  COMMON:    'text-gray-300',
  UNCOMMON:  'text-green-400',
  RARE:      'text-blue-400',
  EPIC:      'text-purple-400',
  LEGENDARY: 'text-yellow-400',
}

const RARITY_BORDER: Record<string, string> = {
  COMMON:    'border-gray-600/40',
  UNCOMMON:  'border-green-500/30',
  RARE:      'border-blue-500/30',
  EPIC:      'border-purple-500/30',
  LEGENDARY: 'border-yellow-500/40',
}

function ProgressBar({ current, total, complete }: { current: number; total: number; complete: boolean }) {
  const pct = Math.min((current / total) * 100, 100)
  return (
    <div className="w-full bg-gray-800/60 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${complete ? 'bg-yellow-400' : 'bg-blue-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── Register Modal ───────────────────────────────────────────────────────────

function RegisterModal({
  collection,
  onClose,
  onSuccess,
}: {
  collection: Collection
  onClose: () => void
  onSuccess: () => void
}) {
  const [selected, setSelected]       = useState<AvailableRobot | null>(null)
  const [confirming, setConfirming]   = useState(false)
  const [registering, setRegistering] = useState(false)
  const [error, setError]             = useState('')

  async function handleRegister() {
    if (!selected) return
    setRegistering(true)
    setError('')
    const res = await fetch('/api/game/codex/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ robotId: selected.id }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to register')
      setRegistering(false)
      return
    }
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0e0e18] border border-gray-700/50 rounded-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-white font-bold text-lg">Register to Codex</h3>
              <p className="text-gray-500 text-sm mt-0.5">{collection.name}</p>
            </div>
            <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Warning */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5">
            <p className="text-red-400 text-xs font-medium">
              ⚠ This action is permanent and cannot be undone. The robot will be permanently removed from your inventory.
            </p>
          </div>

          {/* Robot list */}
          {collection.availableRobots.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              No robots from this collection in your inventory.
            </p>
          ) : (
            <div className="space-y-2 mb-5">
              {collection.availableRobots.map((robot) => (
                <button
                  key={robot.id}
                  onClick={() => { setSelected(robot); setConfirming(false) }}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    selected?.id === robot.id
                      ? 'border-blue-500/60 bg-blue-500/10'
                      : `${RARITY_BORDER[robot.rarity] ?? 'border-gray-700/40'} bg-gray-900/40 hover:bg-gray-800/40`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-medium">{robot.name}</span>
                    <span className={`text-xs ${RARITY_COLORS[robot.rarity] ?? 'text-gray-400'}`}>
                      {robot.rarity}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">{robot.hashPower} ER base</p>
                </button>
              ))}
            </div>
          )}

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          {selected && !confirming && (
            <button
              onClick={() => setConfirming(true)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              Register {selected.name}
            </button>
          )}

          {selected && confirming && (
            <div className="space-y-2">
              <p className="text-gray-400 text-xs text-center">
                Are you absolutely sure? <span className="text-white font-medium">{selected.name}</span> will be gone from your inventory forever.
              </p>
              <button
                onClick={handleRegister}
                disabled={registering}
                className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                {registering ? 'Registering...' : 'Yes, Register Permanently'}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="w-full border border-gray-700/50 text-gray-400 hover:text-gray-300 text-sm py-2 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Collection Card ──────────────────────────────────────────────────────────

function CollectionCard({
  collection,
  onRegister,
}: {
  collection: Collection
  onRegister: (col: Collection) => void
}) {
  const canRegister = collection.availableRobots.length > 0 && !collection.isComplete

  return (
    <div className={`bg-[#111118] border rounded-2xl p-5 flex flex-col gap-4 ${
      collection.isComplete ? 'border-yellow-500/30' : 'border-gray-800/60'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-white font-semibold text-sm truncate">{collection.name}</h3>
            {collection.isComplete && (
              <span className="shrink-0 text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full px-2 py-0.5 font-medium">
                COMPLETE
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs line-clamp-2">{collection.description}</p>
        </div>

        {/* Progress counter */}
        <div className="shrink-0 text-right">
          <p className={`text-lg font-bold tabular-nums ${collection.isComplete ? 'text-yellow-400' : 'text-white'}`}>
            {collection.registeredCount}
            <span className="text-gray-600 text-sm font-normal">/{collection.totalRequired}</span>
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <ProgressBar
        current={collection.registeredCount}
        total={collection.totalRequired}
        complete={collection.isComplete}
      />

      {/* Bonuses */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {collection.bonusPerItemErPct > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
            <p className="text-gray-500 mb-0.5">Per robot</p>
            <p className="text-blue-400 font-semibold">+{collection.bonusPerItemErPct}% ER</p>
          </div>
        )}
        {(collection.completionErPct > 0 || collection.completionPdPct > 0 || collection.completionSlots > 0) && (
          <div className={`rounded-lg px-3 py-2 border ${
            collection.isComplete
              ? 'bg-yellow-500/10 border-yellow-500/20'
              : 'bg-gray-800/40 border-gray-700/30'
          }`}>
            <p className={`mb-0.5 ${collection.isComplete ? 'text-yellow-600' : 'text-gray-500'}`}>
              On complete
            </p>
            <div className={`font-semibold space-y-0.5 ${collection.isComplete ? 'text-yellow-400' : 'text-gray-400'}`}>
              {collection.completionErPct  > 0 && <p>+{collection.completionErPct}% ER</p>}
              {collection.completionPdPct  > 0 && <p>-{collection.completionPdPct}% PD</p>}
              {collection.completionSlots  > 0 && <p>+{collection.completionSlots} slot{collection.completionSlots > 1 ? 's' : ''}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Registered items */}
      {collection.registeredItems.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-gray-600 text-xs font-medium">Registered</p>
          <div className="flex flex-wrap gap-1.5">
            {collection.registeredItems.map((item) => (
              <span
                key={item.id}
                className={`text-xs px-2.5 py-1 rounded-lg bg-gray-900/60 border ${RARITY_BORDER[item.rarity] ?? 'border-gray-700/40'} ${RARITY_COLORS[item.rarity] ?? 'text-gray-300'}`}
              >
                {item.itemName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action button */}
      {canRegister ? (
        <button
          onClick={() => onRegister(collection)}
          className="mt-auto w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          Register Robot ({collection.availableRobots.length} available)
        </button>
      ) : collection.isComplete ? (
        <div className="mt-auto flex items-center justify-center gap-2 text-yellow-400 text-sm py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          Collection complete
        </div>
      ) : (
        <div className="mt-auto text-gray-600 text-xs text-center py-2">
          Obtain more robots from this collection to register
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CodexManager() {
  const [data, setData]           = useState<CodexData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState<'collections' | 'trophies'>('collections')
  const [modal, setModal]         = useState<Collection | null>(null)

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/game/codex')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return <p className="text-gray-500 text-sm">Failed to load Codex data.</p>
  }

  const totalEntries = data.collections.reduce((s, c) => s + c.registeredCount, 0)
  const completeCount = data.collections.filter((c) => c.isComplete).length

  return (
    <div className="space-y-6">
      {/* Bonus summary */}
      {(data.totalBonuses.erPct > 0 || data.totalBonuses.pdPct > 0) && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl px-5 py-4 flex flex-wrap gap-4 items-center">
          <div>
            <p className="text-yellow-600 text-xs font-medium mb-0.5">Active Codex Bonuses</p>
            <div className="flex gap-4">
              {data.totalBonuses.erPct > 0 && (
                <p className="text-yellow-400 font-bold text-lg">+{data.totalBonuses.erPct}% ER</p>
              )}
              {data.totalBonuses.pdPct > 0 && (
                <p className="text-blue-400 font-bold text-lg">-{data.totalBonuses.pdPct}% PD</p>
              )}
            </div>
          </div>
          <div className="ml-auto text-right">
            <p className="text-gray-600 text-xs">{totalEntries} robots registered · {completeCount} collection{completeCount !== 1 ? 's' : ''} complete</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900/60 border border-gray-800/60 rounded-xl p-1 w-fit">
        {(['collections', 'trophies'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === tab
                ? 'bg-[#1a1a2e] text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'trophies' ? `Trophies (${totalEntries})` : 'Collections'}
          </button>
        ))}
      </div>

      {/* Collections tab */}
      {activeTab === 'collections' && (
        <>
          {data.collections.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <p className="text-4xl mb-3">🏆</p>
              <p className="text-sm">No collections available yet.</p>
              <p className="text-xs mt-1">Check back after the admin configures Codex collections.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {data.collections.map((col) => (
                <CollectionCard key={col.id} collection={col} onRegister={setModal} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Trophies tab */}
      {activeTab === 'trophies' && (
        <>
          {totalEntries === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <p className="text-4xl mb-3">🤖</p>
              <p className="text-sm">No robots registered yet.</p>
              <p className="text-xs mt-1">Register robots from your inventory to earn permanent bonuses.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {data.collections
                .filter((c) => c.registeredItems.length > 0)
                .map((col) => (
                  <div key={col.id}>
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-gray-300 font-medium text-sm">{col.name}</h3>
                      {col.isComplete && (
                        <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full px-2 py-0.5">
                          COMPLETE
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {col.registeredItems.map((item) => (
                        <div
                          key={item.id}
                          className={`bg-[#111118] border ${RARITY_BORDER[item.rarity] ?? 'border-gray-800/60'} rounded-xl p-3`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 rounded-lg bg-gray-800/80 flex items-center justify-center text-sm">
                              🤖
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs font-medium truncate">{item.itemName}</p>
                              <p className={`text-[10px] ${RARITY_COLORS[item.rarity] ?? 'text-gray-500'}`}>
                                {item.rarity}
                              </p>
                            </div>
                          </div>
                          <p className="text-gray-600 text-[10px]">
                            {new Date(item.registeredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {/* Register modal */}
      {modal && (
        <RegisterModal
          collection={modal}
          onClose={() => setModal(null)}
          onSuccess={() => { fetchData() }}
        />
      )}
    </div>
  )
}
