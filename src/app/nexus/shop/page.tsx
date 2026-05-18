'use client'

import { useEffect, useState } from 'react'

interface ShopItem {
  id: string
  category: string
  name: string
  description: string
  price: number
  rarity: string | null
  active: boolean
  sortOrder: number
}

const CATEGORIES = ['ALL','robot','equipment','base-upgrade','outpost-slot','repair-kit','inventory-expansion','cosmetic']

export default function ShopAdminPage() {
  const [items, setItems]       = useState<ShopItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('ALL')
  const [editing, setEditing]   = useState<Record<string, Partial<ShopItem>>>({})
  const [msg, setMsg]           = useState('')

  async function load() {
    setLoading(true)
    const r = await fetch('/api/admin/shop')
    setItems(await r.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save(id: string) {
    const data = editing[id]
    if (!data) return
    setMsg('Saving…')
    const r = await fetch('/api/admin/shop', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    })
    if (r.ok) {
      setMsg('Saved')
      setEditing(p => { const n = { ...p }; delete n[id]; return n })
      load()
    } else {
      setMsg('Error saving')
    }
  }

  async function toggleActive(item: ShopItem) {
    await fetch('/api/admin/shop', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, active: !item.active }),
    })
    load()
  }

  const visible = filter === 'ALL' ? items : items.filter(i => i.category === filter)

  const grouped = visible.reduce<Record<string, ShopItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-purple-300 font-mono">Shop Items</h1>
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c}
              onClick={() => setFilter(c)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                filter === c
                  ? 'bg-purple-800/60 border-purple-600 text-purple-200'
                  : 'bg-transparent border-gray-700 text-gray-500 hover:border-gray-500'
              }`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {msg && <p className="text-xs text-yellow-400 font-mono">{msg}</p>}

      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{cat}</h2>
              <div className="space-y-1.5">
                {catItems.map(item => {
                  const ed = editing[item.id]
                  const isEditing = !!ed
                  return (
                    <div key={item.id}
                      className={`bg-[#0d0d1a] border rounded-lg p-3 flex items-center gap-4 ${
                        item.active ? 'border-purple-900/20' : 'border-gray-800/50 opacity-60'
                      }`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-200">{item.name}</span>
                          {item.rarity && <RarityBadge rarity={item.rarity} />}
                          {!item.active && <span className="text-xs text-red-500">Inactive</span>}
                        </div>
                        <p className="text-xs text-gray-600 truncate">{item.description}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {isEditing ? (
                          <>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">Price:</span>
                              <input
                                type="number"
                                value={ed.price ?? item.price}
                                onChange={e => setEditing(p => ({ ...p, [item.id]: { ...p[item.id], price: parseFloat(e.target.value) } }))}
                                className="input-admin w-24"
                                step="0.001"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">Sort:</span>
                              <input
                                type="number"
                                value={ed.sortOrder ?? item.sortOrder}
                                onChange={e => setEditing(p => ({ ...p, [item.id]: { ...p[item.id], sortOrder: parseInt(e.target.value) } }))}
                                className="input-admin w-16"
                              />
                            </div>
                            <button onClick={() => save(item.id)}
                              className="px-2 py-1 text-xs bg-green-900/40 border border-green-700/40 text-green-300 rounded">
                              Save
                            </button>
                            <button onClick={() => setEditing(p => { const n = { ...p }; delete n[item.id]; return n })}
                              className="px-2 py-1 text-xs border border-gray-700 text-gray-400 rounded">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-bold text-purple-300">{item.price.toFixed(4)} CRATE</span>
                            <button onClick={() => setEditing(p => ({ ...p, [item.id]: {} }))}
                              className="px-2 py-1 text-xs border border-gray-700 text-gray-300 rounded hover:bg-gray-800">
                              Edit
                            </button>
                            <button onClick={() => toggleActive(item)}
                              className={`px-2 py-1 text-xs rounded border transition-colors ${
                                item.active
                                  ? 'border-yellow-700/40 text-yellow-400 hover:bg-yellow-900/20'
                                  : 'border-green-700/40 text-green-400 hover:bg-green-900/20'
                              }`}>
                              {item.active ? 'Disable' : 'Enable'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        .input-admin {
          background: #111122;
          border: 1px solid #2d2d50;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 12px;
          color: #d1d5db;
          outline: none;
        }
        .input-admin:focus { border-color: #7c3aed; }
      `}</style>
    </div>
  )
}

function RarityBadge({ rarity }: { rarity: string }) {
  const colors: Record<string, string> = {
    COMMON: 'text-gray-400',
    UNCOMMON: 'text-green-400',
    RARE: 'text-blue-400',
    EPIC: 'text-purple-400',
    LEGENDARY: 'text-yellow-400',
  }
  return <span className={`text-xs ${colors[rarity] ?? 'text-gray-400'}`}>{rarity}</span>
}
