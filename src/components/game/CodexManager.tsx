'use client'

import { useState, useEffect, useCallback } from 'react'
import { CodexCollectionCard } from '@/components/game/CodexCollectionCard'
import { RARITY_TEXT_COLOR } from '@/lib/rarity'

const RARITY_BORDER: Record<string, string> = {
  COMMON:    'border-gray-600/40',
  UNCOMMON:  'border-green-500/30',
  RARE:      'border-blue-500/30',
  EPIC:      'border-purple-500/30',
  LEGENDARY: 'border-yellow-500/40',
}
import { CODEX_ITEM_EMOJI, CODEX_ITEM_LABEL } from '@/lib/codex-types'
import type { CodexCollectionData, CodexAvailableItem, CodexCollectionEntry } from '@/components/game/CodexCollectionCard'
import type { CodexItemType } from '@/lib/codex-types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TotalBonuses { erPct: number; pdPct: number }
interface CodexData { collections: CodexCollectionData[]; totalBonuses: TotalBonuses }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rarityTextClass(r: string)   { return (RARITY_TEXT_COLOR as Record<string, string>)[r] ?? 'text-gray-400' }
function rarityBorderClass(r: string) { return RARITY_BORDER[r] ?? 'border-gray-700/40' }

// ─── Register Modal ───────────────────────────────────────────────────────────

function RegisterModal({
  collection,
  onClose,
  onSuccess,
}: {
  collection: CodexCollectionData
  onClose:    () => void
  onSuccess:  () => void
}) {
  const [selected, setSelected]       = useState<CodexAvailableItem | null>(null)
  const [confirming, setConfirming]   = useState(false)
  const [registering, setRegistering] = useState(false)
  const [error, setError]             = useState('')

  const available = collection.availableItems ?? []

  // Agrupa por tipo para exibição organizada
  const byType = available.reduce<Record<string, CodexAvailableItem[]>>((acc, item) => {
    if (!acc[item.itemType]) acc[item.itemType] = []
    acc[item.itemType].push(item)
    return acc
  }, {})

  async function handleRegister() {
    if (!selected) return
    setRegistering(true)
    setError('')
    const res = await fetch('/api/game/codex/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ itemId: selected.id, itemType: selected.itemType }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed to register'); setRegistering(false); return }
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0e0e18] border border-gray-700/50 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="p-6 flex flex-col gap-4 overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-white font-bold text-lg">Register to Codex</h3>
              <p className="text-gray-500 text-sm mt-0.5">{collection.name}</p>
            </div>
            <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Warning */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <p className="text-red-400 text-xs font-medium">
              ⚠ This action is permanent and cannot be undone. The item will be permanently removed from your inventory.
            </p>
          </div>

          {/* Item list — agrupado por tipo */}
          {available.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No eligible items in your inventory.</p>
          ) : (
            <div className="space-y-4">
              {(Object.keys(byType) as CodexItemType[]).map((type) => (
                <div key={type}>
                  <p className="text-gray-600 text-xs font-medium mb-1.5">
                    {CODEX_ITEM_EMOJI[type]} {CODEX_ITEM_LABEL[type]}
                  </p>
                  <div className="space-y-1.5">
                    {byType[type].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { setSelected(item); setConfirming(false) }}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                          selected?.id === item.id
                            ? 'border-blue-500/60 bg-blue-500/10'
                            : `${rarityBorderClass(item.rarity)} bg-gray-900/40 hover:bg-gray-800/40`
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium">{item.name}</span>
                          <span className={`text-xs ${rarityTextClass(item.rarity)}`}>{item.rarity}</span>
                        </div>
                        <p className="text-gray-500 text-xs mt-0.5">{item.stat}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* Actions */}
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
                Are you absolutely sure?{' '}
                <span className="text-white font-medium">{selected.name}</span>{' '}
                will be gone from your inventory forever.
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

// ─── Trophy card — genérico por tipo ─────────────────────────────────────────

function TrophyCard({ item }: { item: CodexCollectionEntry }) {
  return (
    <div className={`bg-[#111118] border ${rarityBorderClass(item.rarity)} rounded-xl p-3`}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg bg-gray-800/80 flex items-center justify-center text-sm">
          {CODEX_ITEM_EMOJI[item.itemType] ?? '🏆'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-medium truncate">{item.itemName}</p>
          <p className={`text-[10px] ${rarityTextClass(item.rarity)}`}>{item.rarity}</p>
        </div>
      </div>
      <p className="text-gray-600 text-[10px]">
        {CODEX_ITEM_LABEL[item.itemType]} ·{' '}
        {new Date(item.registeredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CodexManager() {
  const [data, setData]           = useState<CodexData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState<'collections' | 'trophies'>('collections')
  const [modal, setModal]         = useState<CodexCollectionData | null>(null)

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

  if (!data) return <p className="text-gray-500 text-sm">Failed to load Codex data.</p>

  const totalEntries  = data.collections.reduce((s, c) => s + (c.registeredCount ?? 0), 0)
  const completeCount = data.collections.filter((c) => c.isComplete).length

  return (
    <div className="space-y-6">
      {/* Bonus summary */}
      {(data.totalBonuses.erPct > 0 || data.totalBonuses.pdPct > 0) && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl px-5 py-4 flex flex-wrap gap-4 items-center">
          <div>
            <p className="text-yellow-600 text-xs font-medium mb-0.5">Active Codex Bonuses</p>
            <div className="flex gap-4">
              {data.totalBonuses.erPct > 0 && <p className="text-yellow-400 font-bold text-lg">+{data.totalBonuses.erPct}% ER</p>}
              {data.totalBonuses.pdPct > 0 && <p className="text-blue-400 font-bold text-lg">-{data.totalBonuses.pdPct}% PD</p>}
            </div>
          </div>
          <div className="ml-auto text-right">
            <p className="text-gray-600 text-xs">
              {totalEntries} item{totalEntries !== 1 ? 's' : ''} registered · {completeCount} collection{completeCount !== 1 ? 's' : ''} complete
            </p>
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
              activeTab === tab ? 'bg-[#1a1a2e] text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'trophies' ? `Trophies (${totalEntries})` : 'Collections'}
          </button>
        ))}
      </div>

      {/* Collections tab */}
      {activeTab === 'collections' && (
        data.collections.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <p className="text-4xl mb-3">🏆</p>
            <p className="text-sm">No collections available yet.</p>
            <p className="text-xs mt-1">Check back after the admin configures Codex collections.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.collections.map((col) => (
              <CodexCollectionCard key={col.id} collection={col} onRegister={setModal} />
            ))}
          </div>
        )
      )}

      {/* Trophies tab */}
      {activeTab === 'trophies' && (
        totalEntries === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <p className="text-4xl mb-3">🏆</p>
            <p className="text-sm">No items registered yet.</p>
            <p className="text-xs mt-1">Register items from your inventory to earn permanent bonuses.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {data.collections
              .filter((c) => (c.registeredItems?.length ?? 0) > 0)
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
                    {col.registeredItems!.map((item) => (
                      <TrophyCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )
      )}

      {/* Register modal */}
      {modal && (
        <RegisterModal collection={modal} onClose={() => setModal(null)} onSuccess={fetchData} />
      )}
    </div>
  )
}
