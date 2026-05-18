'use client'

import { useEffect, useState, useCallback } from 'react'

type ItemType = 'robot' | 'equipment' | 'base-upgrade' | 'part' | 'consumable'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyItem = Record<string, any>

interface PageData {
  items: AnyItem[]
  total: number
  pages: number
}

const TABS: { key: ItemType; label: string }[] = [
  { key: 'robot',        label: 'Robots' },
  { key: 'equipment',    label: 'Equipments' },
  { key: 'base-upgrade', label: 'Base Upgrades' },
  { key: 'part',         label: 'Parts' },
  { key: 'consumable',   label: 'Consumables' },
]

const RARITIES = ['ALL','COMMON','UNCOMMON','RARE','EPIC','LEGENDARY']

const RARITY_COLOR: Record<string, string> = {
  COMMON: 'text-gray-400', UNCOMMON: 'text-green-400',
  RARE: 'text-blue-400', EPIC: 'text-purple-400', LEGENDARY: 'text-yellow-400',
}

const EFFECT_TYPES = [
  'HASH_POWER_FLAT','HASH_POWER_PCT','DURABILITY_LOSS_PCT',
  'GLOBAL_EFFICIENCY_PCT','UPTIME_HOURS','POWER_DRAW_FLAT','POWER_DRAW_PCT',
]

export default function InventoryAdminPage() {
  const [tab, setTab]           = useState<ItemType>('robot')
  const [data, setData]         = useState<PageData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(1)
  const [rarity, setRarity]     = useState('ALL')
  const [username, setUsername] = useState('')
  const [search, setSearch]     = useState('')  // temp input
  const [editing, setEditing]   = useState<{ id: string; fields: AnyItem } | null>(null)
  const [msg, setMsg]           = useState('')

  const load = useCallback(async (t: ItemType, r: string, u: string, p: number) => {
    setLoading(true)
    const params = new URLSearchParams({ type: t, rarity: r, username: u, page: String(p) })
    const res = await fetch(`/api/admin/inventory?${params}`)
    setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load(tab, rarity, username, page) }, [tab, rarity, page, load])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setUsername(search)
    setPage(1)
    load(tab, rarity, search, 1)
  }

  function startEdit(item: AnyItem) {
    // Pre-populate editable fields based on type
    const fields: AnyItem = {}
    if (tab === 'robot') {
      fields.name = item.name; fields.collection = item.collection
      fields.hashPower = item.hashPower; fields.energyRate = item.energyRate
      fields.durability = item.durability; fields.rarity = item.rarity
    } else if (tab === 'equipment' || tab === 'base-upgrade') {
      fields.name = item.name; fields.rarity = item.rarity
      fields.effectType = item.effectType; fields.effectValue = item.effectValue
      fields.effectType2 = item.effectType2 ?? ''; fields.effectValue2 = item.effectValue2 ?? 0
    } else if (tab === 'part') {
      fields.quantity = item.quantity
    } else if (tab === 'consumable') {
      fields.quantity = item.quantity
    }
    setEditing({ id: item.id, fields })
  }

  async function saveEdit() {
    if (!editing) return
    setMsg('Saving…')
    const body = {
      type: tab,
      id: editing.id,
      data: {
        ...editing.fields,
        effectType2: editing.fields.effectType2 || null,
        effectValue2: editing.fields.effectType2 ? Number(editing.fields.effectValue2) : null,
      },
    }
    const r = await fetch('/api/admin/inventory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (r.ok) {
      setMsg('Saved!')
      setEditing(null)
      load(tab, rarity, username, page)
    } else {
      const e = await r.json()
      setMsg(`Error: ${e.error}`)
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-purple-300 font-mono">Inventory Browser</h1>
      <p className="text-xs text-gray-500">Todos os itens no jogo. Edite campos individuais para balanceamento.</p>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setPage(1) }}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${
              tab === t.key
                ? 'bg-purple-800/60 border-purple-600 text-purple-200'
                : 'border-gray-700 text-gray-400 hover:border-gray-500'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {/* Rarity filter (not for parts/consumables) */}
        {(tab === 'robot' || tab === 'equipment' || tab === 'base-upgrade' || tab === 'part') && (
          <select value={rarity} onChange={e => { setRarity(e.target.value); setPage(1) }}
            className="input-admin">
            {RARITIES.map(r => <option key={r}>{r}</option>)}
          </select>
        )}
        {/* Username search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filter by username…"
            className="input-admin w-44" />
          <button type="submit"
            className="px-3 py-1 text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded hover:bg-gray-700">
            Filter
          </button>
          {username && (
            <button type="button" onClick={() => { setSearch(''); setUsername(''); setPage(1); load(tab, rarity, '', 1) }}
              className="text-xs text-gray-500 hover:text-gray-300 px-1">✕</button>
          )}
        </form>
        {data && (
          <span className="text-xs text-gray-600 ml-2">
            {data.total} items{username && ` for "${username}"`}
          </span>
        )}
      </div>

      {msg && <p className="text-xs text-yellow-400 font-mono">{msg}</p>}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg p-5 w-full max-w-md my-4 space-y-3">
            <h2 className="text-sm font-bold text-purple-300">Edit Item</h2>

            {tab === 'robot' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <EField label="Name">
                    <input value={editing.fields.name} className="w-full input-admin"
                      onChange={e => setEditing(p => ({ ...p!, fields: { ...p!.fields, name: e.target.value } }))} />
                  </EField>
                  <EField label="Collection">
                    <input value={editing.fields.collection} className="w-full input-admin"
                      onChange={e => setEditing(p => ({ ...p!, fields: { ...p!.fields, collection: e.target.value } }))} />
                  </EField>
                  <EField label="Rarity">
                    <select value={editing.fields.rarity} className="w-full input-admin"
                      onChange={e => setEditing(p => ({ ...p!, fields: { ...p!.fields, rarity: e.target.value } }))}>
                      {['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY'].map(r => <option key={r}>{r}</option>)}
                    </select>
                  </EField>
                  <EField label="ER (Hash Power)">
                    <input type="number" step="0.1" value={editing.fields.hashPower} className="w-full input-admin"
                      onChange={e => setEditing(p => ({ ...p!, fields: { ...p!.fields, hashPower: parseFloat(e.target.value) } }))} />
                  </EField>
                  <EField label="PD (Energy Rate)">
                    <input type="number" step="0.1" value={editing.fields.energyRate} className="w-full input-admin"
                      onChange={e => setEditing(p => ({ ...p!, fields: { ...p!.fields, energyRate: parseFloat(e.target.value) } }))} />
                  </EField>
                  <EField label="Durability (%)">
                    <input type="number" step="0.1" min={0} max={100} value={editing.fields.durability} className="w-full input-admin"
                      onChange={e => setEditing(p => ({ ...p!, fields: { ...p!.fields, durability: parseFloat(e.target.value) } }))} />
                  </EField>
                </div>
              </>
            )}

            {(tab === 'equipment' || tab === 'base-upgrade') && (
              <div className="grid grid-cols-2 gap-3">
                <EField label="Name">
                  <input value={editing.fields.name} className="w-full input-admin"
                    onChange={e => setEditing(p => ({ ...p!, fields: { ...p!.fields, name: e.target.value } }))} />
                </EField>
                <EField label="Rarity">
                  <select value={editing.fields.rarity} className="w-full input-admin"
                    onChange={e => setEditing(p => ({ ...p!, fields: { ...p!.fields, rarity: e.target.value } }))}>
                    {['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </EField>
                <EField label="Effect Type">
                  <select value={editing.fields.effectType} className="w-full input-admin"
                    onChange={e => setEditing(p => ({ ...p!, fields: { ...p!.fields, effectType: e.target.value } }))}>
                    {EFFECT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </EField>
                <EField label="Effect Value">
                  <input type="number" step="0.1" value={editing.fields.effectValue} className="w-full input-admin"
                    onChange={e => setEditing(p => ({ ...p!, fields: { ...p!.fields, effectValue: parseFloat(e.target.value) } }))} />
                </EField>
                <EField label="Effect Type 2">
                  <select value={editing.fields.effectType2 ?? ''} className="w-full input-admin"
                    onChange={e => setEditing(p => ({ ...p!, fields: { ...p!.fields, effectType2: e.target.value } }))}>
                    <option value="">— None —</option>
                    {EFFECT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </EField>
                <EField label="Effect Value 2">
                  <input type="number" step="0.1" value={editing.fields.effectValue2 ?? 0} className="w-full input-admin"
                    disabled={!editing.fields.effectType2}
                    onChange={e => setEditing(p => ({ ...p!, fields: { ...p!.fields, effectValue2: parseFloat(e.target.value) } }))} />
                </EField>
              </div>
            )}

            {(tab === 'part' || tab === 'consumable') && (
              <EField label="Quantity">
                <input type="number" min={0} value={editing.fields.quantity} className="w-full input-admin"
                  onChange={e => setEditing(p => ({ ...p!, fields: { ...p!.fields, quantity: parseInt(e.target.value) } }))} />
              </EField>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={saveEdit}
                className="px-4 py-1.5 text-sm bg-purple-800/60 border border-purple-600 text-purple-200 rounded hover:bg-purple-700/60">
                Save
              </button>
              <button onClick={() => setEditing(null)}
                className="px-4 py-1.5 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item table */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left pb-2 pr-3">Player</th>
                  {tab === 'robot' && <>
                    <th className="text-left pb-2 pr-3">Name</th>
                    <th className="text-left pb-2 pr-3">Collection</th>
                    <th className="text-left pb-2 pr-3">Rarity</th>
                    <th className="text-right pb-2 pr-3">ER</th>
                    <th className="text-right pb-2 pr-3">PD</th>
                    <th className="text-right pb-2 pr-3">Dur%</th>
                    <th className="text-left pb-2 pr-3">Status</th>
                  </>}
                  {(tab === 'equipment' || tab === 'base-upgrade') && <>
                    <th className="text-left pb-2 pr-3">Name</th>
                    <th className="text-left pb-2 pr-3">Rarity</th>
                    <th className="text-left pb-2 pr-3">Effect 1</th>
                    <th className="text-left pb-2 pr-3">Effect 2</th>
                    {tab === 'base-upgrade' && <th className="text-left pb-2 pr-3">Applied</th>}
                  </>}
                  {tab === 'part' && <>
                    <th className="text-left pb-2 pr-3">Type</th>
                    <th className="text-left pb-2 pr-3">Category</th>
                    <th className="text-left pb-2 pr-3">Rarity</th>
                    <th className="text-right pb-2 pr-3">Qty</th>
                  </>}
                  {tab === 'consumable' && <>
                    <th className="text-left pb-2 pr-3">Type</th>
                    <th className="text-right pb-2 pr-3">Value</th>
                    <th className="text-right pb-2 pr-3">Qty</th>
                  </>}
                  <th className="text-right pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((item: AnyItem) => (
                  <tr key={item.id} className="border-b border-gray-900 hover:bg-gray-900/20">
                    <td className="py-1.5 pr-3 text-gray-400">{item.user?.username}</td>

                    {tab === 'robot' && <>
                      <td className="py-1.5 pr-3 text-gray-200 font-medium">{item.name}</td>
                      <td className="py-1.5 pr-3 text-purple-400/80 text-xs">{item.collection || '—'}</td>
                      <td className="py-1.5 pr-3"><span className={RARITY_COLOR[item.rarity]}>{item.rarity}</span></td>
                      <td className="py-1.5 pr-3 text-right text-gray-200">{item.hashPower}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-400">{item.energyRate}</td>
                      <td className="py-1.5 pr-3 text-right">
                        <span className={item.durability > 50 ? 'text-green-400' : item.durability > 20 ? 'text-yellow-400' : 'text-red-400'}>
                          {item.durability.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 text-gray-500">
                        {item.inCodex ? '🏆 Codex' : item.isActive ? '⚡ Active' : 'Idle'}
                      </td>
                    </>}

                    {(tab === 'equipment' || tab === 'base-upgrade') && <>
                      <td className="py-1.5 pr-3 text-gray-200">{item.name}</td>
                      <td className="py-1.5 pr-3"><span className={RARITY_COLOR[item.rarity]}>{item.rarity}</span></td>
                      <td className="py-1.5 pr-3 text-gray-400">
                        {item.effectType}<br/>
                        <span className="text-gray-200">{item.effectValue}</span>
                      </td>
                      <td className="py-1.5 pr-3 text-gray-400">
                        {item.effectType2 ? <>{item.effectType2}<br/><span className="text-gray-200">{item.effectValue2}</span></> : '—'}
                      </td>
                      {tab === 'base-upgrade' && (
                        <td className="py-1.5 pr-3 text-gray-500">{item.isApplied ? '✓ Applied' : '—'}</td>
                      )}
                    </>}

                    {tab === 'part' && <>
                      <td className="py-1.5 pr-3 text-gray-200">{item.partType}</td>
                      <td className="py-1.5 pr-3 text-gray-500">{item.category}</td>
                      <td className="py-1.5 pr-3"><span className={RARITY_COLOR[item.rarity]}>{item.rarity}</span></td>
                      <td className="py-1.5 pr-3 text-right text-gray-200">{item.quantity}</td>
                    </>}

                    {tab === 'consumable' && <>
                      <td className="py-1.5 pr-3 text-gray-200">{item.consumableType}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-400">{item.value}%</td>
                      <td className="py-1.5 pr-3 text-right text-gray-200">{item.quantity}</td>
                    </>}

                    <td className="py-1.5 text-right">
                      <button onClick={() => startEdit(item)}
                        className="px-2 py-0.5 text-xs border border-gray-700 text-gray-300 rounded hover:bg-gray-800">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 text-xs border border-gray-700 text-gray-400 rounded disabled:opacity-30">
                ← Prev
              </button>
              <span className="text-xs text-gray-500">{page} / {data.pages}</span>
              <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-xs border border-gray-700 text-gray-400 rounded disabled:opacity-30">
                Next →
              </button>
            </div>
          )}
        </>
      )}

      <style jsx global>{`
        .input-admin {
          background: #111122; border: 1px solid #2d2d50;
          border-radius: 4px; padding: 4px 8px;
          font-size: 12px; color: #d1d5db; outline: none;
        }
        .input-admin:focus { border-color: #7c3aed; }
        .input-admin:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>
    </div>
  )
}

function EField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}
