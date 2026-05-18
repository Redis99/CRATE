'use client'

import { useEffect, useState, useCallback } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyGroup = Record<string, any>
type ItemType = 'part' | 'consumable'

const RARITIES = ['ALL','COMMON','UNCOMMON','RARE','EPIC','LEGENDARY']
const RARITY_COLOR: Record<string, string> = {
  COMMON: 'text-gray-400', UNCOMMON: 'text-green-400',
  RARE: 'text-blue-400', EPIC: 'text-purple-400', LEGENDARY: 'text-yellow-400',
}

export default function PartsConsumablesPage() {
  const [tab, setTab]       = useState<ItemType>('part')
  const [groups, setGroups] = useState<AnyGroup[]>([])
  const [rarity, setRarity] = useState('ALL')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (t: ItemType, r: string) => {
    setLoading(true)
    const p = new URLSearchParams({ type: t, rarity: r })
    const res = await fetch(`/api/admin/inventory?${p}`)
    setGroups(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load(tab, rarity) }, [tab, rarity, load])

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-purple-300 font-mono">Parts & Consumables</h1>
      <p className="text-xs text-gray-500">Overview of crafting parts and consumables across all players.</p>

      {/* Type tabs */}
      <div className="flex gap-2">
        {(['part', 'consumable'] as ItemType[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${
              tab === t ? 'bg-purple-800/60 border-purple-600 text-purple-200' : 'border-gray-700 text-gray-400 hover:border-gray-500'
            }`}>
            {t === 'part' ? 'Parts' : 'Consumables'}
          </button>
        ))}
      </div>

      {/* Rarity filter (parts only) */}
      {tab === 'part' && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Rarity:</span>
          {RARITIES.map(r => (
            <button key={r} onClick={() => setRarity(r)}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                rarity === r ? 'bg-purple-800/60 border-purple-600 text-purple-200' : 'border-gray-800 text-gray-500 hover:border-gray-600'
              }`}>
              {r}
            </button>
          ))}
        </div>
      )}

      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : groups.length === 0 ? (
        <p className="text-gray-500 text-sm">No items found.</p>
      ) : (
        <div className="space-y-1.5">
          {groups.map((g, i) => (
            <div key={i} className="bg-[#0d0d1a] border border-purple-900/20 rounded-lg p-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                {tab === 'part' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-200">{g.partType}</span>
                    <span className={`text-xs font-bold ${RARITY_COLOR[g.rarity]}`}>{g.rarity}</span>
                    <span className="text-xs text-gray-500">{g.category}</span>
                  </div>
                )}
                {tab === 'consumable' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-200">{g.consumableType}</span>
                    <span className="text-xs text-gray-400">{g.value}%</span>
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-bold text-purple-300">{g.ownerCount} <span className="text-xs text-gray-600 font-normal">owners</span></div>
                <div className="text-sm text-gray-400">{g.totalQty} <span className="text-xs text-gray-600">total qty</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
