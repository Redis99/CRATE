'use client'

import { useEffect, useState, useCallback } from 'react'

type ItemType = 'robot' | 'equipment' | 'base-upgrade' | 'part' | 'consumable'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyGroup = Record<string, any>

const TABS: { key: ItemType; label: string }[] = [
  { key: 'robot',        label: 'Robots' },
  { key: 'equipment',    label: 'Equipments' },
  { key: 'base-upgrade', label: 'Base Upgrades' },
  { key: 'part',         label: 'Parts' },
  { key: 'consumable',   label: 'Consumables' },
]

const RARITIES = ['ALL','COMMON','UNCOMMON','RARE','EPIC','LEGENDARY']
const EFFECT_TYPES = [
  'HASH_POWER_FLAT','HASH_POWER_PCT','DURABILITY_LOSS_PCT',
  'GLOBAL_EFFICIENCY_PCT','UPTIME_HOURS','POWER_DRAW_FLAT','POWER_DRAW_PCT',
]
const RARITY_COLOR: Record<string, string> = {
  COMMON: 'text-gray-400', UNCOMMON: 'text-green-400',
  RARE: 'text-blue-400', EPIC: 'text-purple-400', LEGENDARY: 'text-yellow-400',
}

export default function InventoryAdminPage() {
  const [tab, setTab]             = useState<ItemType>('robot')
  const [groups, setGroups]       = useState<AnyGroup[]>([])
  const [collections, setCollections] = useState<string[]>([])
  const [loading, setLoading]     = useState(true)
  const [rarity, setRarity]       = useState('ALL')
  const [editing, setEditing]     = useState<AnyGroup | null>(null)
  const [editData, setEditData]   = useState<AnyGroup>({})
  const [msg, setMsg]             = useState('')
  const [deleting, setDeleting]   = useState<AnyGroup | null>(null)
  const [delConfirm, setDelConfirm] = useState('')

  const load = useCallback(async (t: ItemType, r: string) => {
    setLoading(true)
    const params = new URLSearchParams({ type: t, rarity: r })
    const res = await fetch(`/api/admin/inventory?${params}`)
    setGroups(await res.json())
    setLoading(false)
  }, [])

  // Load collections for the dropdown
  useEffect(() => {
    fetch('/api/admin/codex')
      .then(r => r.json())
      .then((data: AnyGroup[]) => setCollections(data.map((c: AnyGroup) => c.name)))
  }, [])

  useEffect(() => { load(tab, rarity) }, [tab, rarity, load])

  function startEdit(g: AnyGroup) {
    setEditing(g)
    if (tab === 'robot') {
      setEditData({
        name:       g.name,
        collection: g.collection ?? '',
        rarity:     g.rarity,
        hashPower:  g.hashPower,
        energyRate: g.energyRate,
        durability: 100,  // bulk reset to 100 when editing
      })
    } else if (tab === 'equipment' || tab === 'base-upgrade') {
      setEditData({
        name:       g.name,
        collection: g.collection ?? '',
        rarity:       g.rarity,
        effectType:   g.effectType,
        effectValue:  g.effectValue,
        effectType2:  g.effectType2  ?? '',
        effectValue2: g.effectValue2 ?? 0,
      })
    }
  }

  async function saveEdit() {
    if (!editing) return
    setMsg(`Saving — will update all ${editing.ownerCount} instance(s)…`)

    const body: AnyGroup = {
      type: tab,
      name: editing.name,
      rarity: editing.rarity,
      data: {
        ...editData,
        effectType2:  editData.effectType2  || null,
        effectValue2: editData.effectType2  ? Number(editData.effectValue2) : null,
      },
    }
    if (tab === 'equipment' || tab === 'base-upgrade') {
      body.effectType = editing.effectType  // identify the group
    }

    const r = await fetch('/api/admin/inventory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const result = await r.json()
    if (r.ok) {
      setMsg(`✓ Updated ${result.updated} item(s)`)
      setEditing(null)
      load(tab, rarity)
    } else {
      setMsg(`Error: ${result.error}`)
    }
  }

  async function deleteAll() {
    if (!deleting || delConfirm !== deleting.name) return
    setMsg(`Deleting ${deleting.ownerCount} robot(s)…`)
    const r = await fetch('/api/admin/inventory', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'robot',
        name: deleting.name,
        rarity: deleting.rarity,
        confirm: delConfirm,
      }),
    })
    const result = await r.json()
    if (r.ok) {
      setMsg(`✓ Deleted ${result.deleted} robot(s) permanently`)
      setDeleting(null)
      setDelConfirm('')
      load(tab, rarity)
    } else {
      setMsg(`Error: ${result.error}`)
    }
  }

  const canEdit = tab === 'robot' || tab === 'equipment' || tab === 'base-upgrade'

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-purple-300 font-mono">All Items</h1>
      <p className="text-xs text-gray-500">
        Itens agrupados por tipo. Editar um grupo atualiza <strong className="text-yellow-400">todos</strong> os itens com aquele nome em todos os jogadores.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setMsg('') }}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${
              tab === t.key
                ? 'bg-purple-800/60 border-purple-600 text-purple-200'
                : 'border-gray-700 text-gray-400 hover:border-gray-500'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Rarity filter */}
      {(tab === 'robot' || tab === 'equipment' || tab === 'base-upgrade' || tab === 'part') && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Rarity:</span>
          <div className="flex gap-1">
            {RARITIES.map(r => (
              <button key={r} onClick={() => setRarity(r)}
                className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                  rarity === r
                    ? 'bg-purple-800/60 border-purple-600 text-purple-200'
                    : 'border-gray-800 text-gray-500 hover:border-gray-600'
                }`}>
                {r}
              </button>
            ))}
          </div>
          {groups.length > 0 && (
            <span className="text-xs text-gray-600 ml-2">{groups.length} unique type(s)</span>
          )}
        </div>
      )}

      {msg && <p className="text-xs font-mono text-yellow-400">{msg}</p>}

      {/* Bulk-edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg p-5 w-full max-w-md my-4 space-y-3">
            <div>
              <h2 className="text-sm font-bold text-purple-300">Edit — {editing.name}</h2>
              <p className="text-xs text-yellow-400/80 mt-1">
                ⚠ This will update <strong>{editing.ownerCount}</strong> item(s) across all players.
              </p>
            </div>

            {tab === 'robot' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <EField label="Name">
                    <input value={editData.name ?? ''}
                      onChange={e => setEditData(p => ({ ...p, name: e.target.value }))}
                      className="w-full input-admin" />
                  </EField>
                  <EField label="Rarity">
                    <select value={editData.rarity ?? ''}
                      onChange={e => setEditData(p => ({ ...p, rarity: e.target.value }))}
                      className="w-full input-admin">
                      {['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY'].map(r => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </EField>
                </div>

                {/* Collection — dropdown real do banco */}
                <EField label="Collection tag">
                  <select value={editData.collection ?? ''}
                    onChange={e => setEditData(p => ({ ...p, collection: e.target.value }))}
                    className="w-full input-admin">
                    <option value="">— No collection —</option>
                    {collections.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {editData.collection && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-900/40 border border-purple-700/40 text-purple-300 mt-1.5">
                      🏷 {editData.collection}
                    </span>
                  )}
                </EField>

                <div className="grid grid-cols-2 gap-3">
                  <EField label="Extraction Rate (ER)">
                    <input type="number" step="0.1" value={editData.hashPower ?? 0}
                      onChange={e => setEditData(p => ({ ...p, hashPower: parseFloat(e.target.value) }))}
                      className="w-full input-admin" />
                  </EField>
                  <EField label="Power Draw (PD)">
                    <input type="number" step="0.1" value={editData.energyRate ?? 0}
                      onChange={e => setEditData(p => ({ ...p, energyRate: parseFloat(e.target.value) }))}
                      className="w-full input-admin" />
                  </EField>
                  <EField label="Durability (Energia)">
                    <input type="number" step="1" min={0} value={editData.durability ?? 100}
                      onChange={e => setEditData(p => ({ ...p, durability: parseFloat(e.target.value) }))}
                      className="w-full input-admin" />
                  </EField>
                </div>
              </>
            )}

            {(tab === 'equipment' || tab === 'base-upgrade') && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <EField label="Name">
                    <input value={editData.name ?? ''}
                      onChange={e => setEditData(p => ({ ...p, name: e.target.value }))}
                      className="w-full input-admin" />
                  </EField>
                  <EField label="Rarity">
                    <select value={editData.rarity ?? ''}
                      onChange={e => setEditData(p => ({ ...p, rarity: e.target.value }))}
                      className="w-full input-admin">
                      {['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY'].map(r => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </EField>
                </div>
                <EField label="Collection tag (optional)">
                  <select value={editData.collection ?? ''}
                    onChange={e => setEditData(p => ({ ...p, collection: e.target.value }))}
                    className="w-full input-admin">
                    <option value="">— No collection —</option>
                    {collections.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {editData.collection && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-900/40 border border-purple-700/40 text-purple-300 mt-1.5">
                      🏷 {editData.collection}
                    </span>
                  )}
                </EField>
                <div className="grid grid-cols-2 gap-3">
                  <EField label="Effect Type">
                    <select value={editData.effectType ?? ''}
                      onChange={e => setEditData(p => ({ ...p, effectType: e.target.value }))}
                      className="w-full input-admin">
                      {EFFECT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </EField>
                  <EField label="Effect Value">
                    <input type="number" step="0.1" value={editData.effectValue ?? 0}
                      onChange={e => setEditData(p => ({ ...p, effectValue: parseFloat(e.target.value) }))}
                      className="w-full input-admin" />
                  </EField>
                  <EField label="Effect Type 2">
                    <select value={editData.effectType2 ?? ''}
                      onChange={e => setEditData(p => ({ ...p, effectType2: e.target.value }))}
                      className="w-full input-admin">
                      <option value="">— None —</option>
                      {EFFECT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </EField>
                  <EField label="Effect Value 2">
                    <input type="number" step="0.1" value={editData.effectValue2 ?? 0}
                      disabled={!editData.effectType2}
                      onChange={e => setEditData(p => ({ ...p, effectValue2: parseFloat(e.target.value) }))}
                      className="w-full input-admin" />
                  </EField>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={saveEdit}
                className="px-4 py-1.5 text-sm bg-purple-800/60 border border-purple-600 text-purple-200 rounded hover:bg-purple-700/60">
                Save all
              </button>
              <button onClick={() => setEditing(null)}
                className="px-4 py-1.5 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleting && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d1a] border border-red-800/60 rounded-lg p-5 w-full max-w-md space-y-4">
            <h2 className="text-sm font-bold text-red-400">⚠ Permanent Delete</h2>
            <p className="text-xs text-gray-300">
              This will <strong className="text-red-400">permanently remove</strong> all{' '}
              <strong>{deleting.ownerCount}</strong> instance(s) of{' '}
              <strong className="text-gray-200">{deleting.name}</strong> ({deleting.rarity})
              from every player&apos;s inventory. This cannot be undone.
            </p>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Type <span className="text-red-400 font-mono">{deleting.name}</span> to confirm:
              </label>
              <input
                value={delConfirm}
                onChange={e => setDelConfirm(e.target.value)}
                className="w-full input-admin border-red-900/60"
                placeholder={deleting.name}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={deleteAll}
                disabled={delConfirm !== deleting.name}
                className="flex-1 px-3 py-2 text-sm bg-red-900/50 border border-red-700 text-red-300 rounded hover:bg-red-900/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                Delete permanently
              </button>
              <button
                onClick={() => { setDeleting(null); setDelConfirm('') }}
                className="flex-1 px-3 py-2 text-sm border border-gray-700 text-gray-400 rounded hover:bg-gray-800">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grouped list */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-gray-500 text-sm">No items found.</p>
      ) : (
        <div className="space-y-1.5">
          {groups.map((g, i) => (
            <div key={i}
              className="bg-[#0d0d1a] border border-purple-900/20 rounded-lg p-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">

                {tab === 'robot' && (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-200">{g.name}</span>
                      <span className={`text-xs font-bold ${RARITY_COLOR[g.rarity] ?? 'text-gray-400'}`}>
                        {g.rarity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {g.collection
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-900/30 border border-purple-800/40 text-purple-300">
                            🏷 {g.collection}
                          </span>
                        : <span className="text-xs text-gray-700 italic">No collection</span>
                      }
                      <span className="text-xs text-gray-500">ER {g.hashPower}</span>
                      <span className="text-xs text-gray-500">PD {g.energyRate}</span>
                      <span className="text-xs text-gray-500">Energia {g.durability}</span>
                    </div>
                  </>
                )}

                {(tab === 'equipment' || tab === 'base-upgrade') && (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-200">{g.name}</span>
                      <span className={`text-xs font-bold ${RARITY_COLOR[g.rarity] ?? 'text-gray-400'}`}>
                        {g.rarity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {g.collection
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-900/30 border border-purple-800/40 text-purple-300">🏷 {g.collection}</span>
                        : null
                      }
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                      <span>{g.effectType}: <span className="text-gray-300">{g.effectValue}</span></span>
                      {g.effectType2 && (
                        <span>{g.effectType2}: <span className="text-gray-300">{g.effectValue2}</span></span>
                      )}
                    </div>
                  </>
                )}

                {tab === 'part' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-200">{g.partType}</span>
                    <span className={`text-xs font-bold ${RARITY_COLOR[g.rarity] ?? 'text-gray-400'}`}>{g.rarity}</span>
                    <span className="text-xs text-gray-500">{g.category}</span>
                    <span className="text-xs text-gray-600">Total qty: {g.totalQty}</span>
                  </div>
                )}

                {tab === 'consumable' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-200">{g.consumableType}</span>
                    <span className="text-xs text-gray-400">{g.value}%</span>
                    <span className="text-xs text-gray-600">Total qty: {g.totalQty}</span>
                  </div>
                )}
              </div>

              {/* Owner count badge */}
              <div className="shrink-0 text-center">
                <div className="text-lg font-bold text-purple-300">{g.ownerCount}</div>
                <div className="text-xs text-gray-600">in game</div>
              </div>

              {canEdit && (
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => startEdit(g)}
                    className="px-3 py-1.5 text-xs border border-gray-700 text-gray-300 rounded hover:bg-gray-800 transition-colors">
                    Edit all
                  </button>
                  {tab === 'robot' && (
                    <button onClick={() => { setDeleting(g); setDelConfirm('') }}
                      className="px-3 py-1.5 text-xs border border-red-900/60 text-red-400 rounded hover:bg-red-900/20 transition-colors">
                      Delete all
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
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
