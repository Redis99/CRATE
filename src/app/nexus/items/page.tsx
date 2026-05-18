'use client'

import { useEffect, useState, useCallback } from 'react'

interface ItemTemplate {
  id: string
  name: string
  description: string
  price: number
  rarity: string
  active: boolean
  metadata: {
    specific: boolean
    collection: string | null
    effectType: string | null
    effectValue: number | null
    effectType2: string | null
    effectValue2: number | null
  }
}

const RARITIES = ['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY']
const EFFECT_TYPES = [
  'HASH_POWER_FLAT','HASH_POWER_PCT','DURABILITY_LOSS_PCT',
  'GLOBAL_EFFICIENCY_PCT','UPTIME_HOURS','POWER_DRAW_FLAT','POWER_DRAW_PCT',
]
const RARITY_COLOR: Record<string, string> = {
  COMMON: 'text-gray-400', UNCOMMON: 'text-green-400',
  RARE: 'text-blue-400', EPIC: 'text-purple-400', LEGENDARY: 'text-yellow-400',
}
const EMPTY_TPL = {
  name: '', customId: '', collection: '', rarity: 'COMMON',
  effectType: '', effectValue: 0, effectType2: '', effectValue2: 0,
  price: 0, active: false, description: '',
}

type ItemTab = 'equipment' | 'base-upgrade'

export default function ItemsAdminPage() {
  const [itemTab, setItemTab]         = useState<ItemTab>('equipment')
  const [items, setItems]             = useState<ItemTemplate[]>([])
  const [collections, setCollections] = useState<string[]>([])
  const [loading, setLoading]         = useState(true)
  const [msg, setMsg]                 = useState('')
  const [rarityFilter, setRarityFilter] = useState('ALL')
  const [search, setSearch]             = useState('')
  const [editTpl, setEditTpl]         = useState<typeof EMPTY_TPL & { id?: string } | null>(null)
  const [isTplNew, setIsTplNew]       = useState(false)
  const [airdropId, setAirdropId]     = useState<string | null>(null)
  const [airdropUser, setAirdropUser] = useState('')
  const [airdropMsg, setAirdropMsg]   = useState('')

  const load = useCallback(async (tab: ItemTab) => {
    setLoading(true)
    const category = tab === 'equipment' ? 'equipment-specific' : 'base-upgrade-specific'
    const res = await fetch(`/api/admin/items?category=${category}`)
    const data = await res.json()
    setItems(data.items ?? [])
    setCollections(data.collections ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch('/api/admin/codex').then(r => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((d: any[]) => setCollections(d.map((c: any) => c.name)))
  }, [])

  useEffect(() => { load(itemTab) }, [itemTab, load])

  function openNew() { setEditTpl({ ...EMPTY_TPL }); setIsTplNew(true) }
  function openEdit(t: ItemTemplate) {
    setEditTpl({
      id: t.id, customId: '', name: t.name, collection: t.metadata.collection ?? '',
      rarity: t.rarity,
      effectType:   t.metadata.effectType  ?? '',
      effectValue:  t.metadata.effectValue ?? 0,
      effectType2:  t.metadata.effectType2 ?? '',
      effectValue2: t.metadata.effectValue2 ?? 0,
      price: t.price, active: t.active, description: t.description,
    })
    setIsTplNew(false)
  }

  async function save() {
    if (!editTpl) return
    setMsg('Saving…')
    const category = itemTab === 'equipment' ? 'equipment-specific' : 'base-upgrade-specific'
    const r = await fetch('/api/admin/items', {
      method: isTplNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...editTpl, category,
        effectType:  editTpl.effectType  || null,
        effectType2: editTpl.effectType2 || null,
        effectValue2: editTpl.effectType2 ? editTpl.effectValue2 : null,
      }),
    })
    if (r.ok) { setMsg('Saved!'); setEditTpl(null); load(itemTab) }
    else { const e = await r.json(); setMsg(`Error: ${e.error}`) }
  }

  async function del(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return
    await fetch('/api/admin/items', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setMsg('Deleted'); load(itemTab)
  }

  async function toggleActive(t: ItemTemplate) {
    await fetch('/api/admin/items', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: t.id, name: t.name, collection: t.metadata.collection,
        rarity: t.rarity, effectType: t.metadata.effectType, effectValue: t.metadata.effectValue,
        effectType2: t.metadata.effectType2, effectValue2: t.metadata.effectValue2,
        price: t.price, active: !t.active, description: t.description,
      }),
    })
    load(itemTab)
  }

  async function sendAirdrop() {
    if (!airdropId || !airdropUser.trim()) { setAirdropMsg('Enter a user ID'); return }
    setAirdropMsg('Sending…')
    const r = await fetch('/api/admin/items/airdrop', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: airdropUser, itemId: airdropId }),
    })
    const d = await r.json()
    if (r.ok) setAirdropMsg(`✓ ${d.name} sent!`)
    else setAirdropMsg(`Error: ${d.error}`)
  }

  const typeLabel = itemTab === 'equipment' ? 'Equipment' : 'Base Upgrade'
  const prefix    = itemTab === 'equipment' ? 'equip' : 'upgrade'

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-purple-300 font-mono">Equip & Upgrades</h1>
        <button onClick={openNew}
          className="px-3 py-1.5 text-xs bg-purple-800/60 border border-purple-600 text-purple-200 rounded hover:bg-purple-700/60">
          + New {typeLabel}
        </button>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['equipment', 'base-upgrade'] as ItemTab[]).map(t => (
          <button key={t} onClick={() => { setItemTab(t); setMsg('') }}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${
              itemTab === t ? 'bg-purple-800/60 border-purple-600 text-purple-200' : 'border-gray-700 text-gray-400 hover:border-gray-500'
            }`}>
            {t === 'equipment' ? 'Equipments' : 'Base Upgrades'}
          </button>
        ))}
      </div>

      {/* Rarity filter */}
      <div className="flex gap-1 flex-wrap">
        {['ALL','COMMON','UNCOMMON','RARE','EPIC','LEGENDARY'].map(r => (
          <button key={r} onClick={() => setRarityFilter(r)}
            className={`px-2.5 py-1 text-xs rounded border transition-colors ${
              rarityFilter === r
                ? 'bg-purple-800/60 border-purple-600 text-purple-200'
                : 'border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
            }`}>
            {r}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name…"
        className="w-full max-w-sm px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded text-gray-200 placeholder-gray-600 outline-none focus:border-purple-700"
      />

      {msg && <p className="text-xs font-mono text-yellow-400">{msg}</p>}

      {/* Edit / Create modal */}
      {editTpl && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg p-5 w-full max-w-md my-4 space-y-3">
            <h2 className="text-sm font-bold text-purple-300">
              {isTplNew ? `New ${typeLabel}` : `Edit — ${editTpl.name}`}
            </h2>

            {/* ID */}
            {isTplNew ? (
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Custom ID <span className="text-gray-600">(optional)</span>
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-600 font-mono">{prefix}-</span>
                  <input value={editTpl.customId} className="flex-1 ia font-mono"
                    placeholder="mining-drill-plus"
                    onChange={e => setEditTpl(p => ({ ...p!, customId: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} />
                </div>
                <p className="text-xs text-gray-600 mt-1 font-mono">
                  Final ID: <span className="text-gray-400">{prefix}-{editTpl.customId || editTpl.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '…'}</span>
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-800 rounded px-3 py-1.5">
                <span className="text-xs text-gray-500">ID:</span>
                <span className="text-xs font-mono text-gray-300 flex-1">{editTpl.id}</span>
                <button onClick={() => navigator.clipboard.writeText(editTpl.id ?? '')}
                  className="text-xs text-gray-600 hover:text-purple-400">copy</button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Name</label>
                <input value={editTpl.name} className="w-full ia" placeholder="e.g. Mining Drill+"
                  onChange={e => setEditTpl(p => ({ ...p!, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Rarity</label>
                <select value={editTpl.rarity} className="w-full ia"
                  onChange={e => setEditTpl(p => ({ ...p!, rarity: e.target.value }))}>
                  {RARITIES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Collection tag</label>
              <select value={editTpl.collection} className="w-full ia"
                onChange={e => setEditTpl(p => ({ ...p!, collection: e.target.value }))}>
                <option value="">— No collection —</option>
                {editTpl.collection && !collections.includes(editTpl.collection) && (
                  <option value={editTpl.collection}>{editTpl.collection}</option>
                )}
                {collections.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {editTpl.collection && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-900/40 border border-purple-700/40 text-purple-300 mt-1.5">
                  🏷 {editTpl.collection}
                </span>
              )}
            </div>

            <p className="text-xs text-gray-500">Primary Effect</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Effect Type</label>
                <select value={editTpl.effectType} className="w-full ia"
                  onChange={e => setEditTpl(p => ({ ...p!, effectType: e.target.value }))}>
                  <option value="">— Select —</option>
                  {EFFECT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Effect Value</label>
                <input type="number" step="0.1" value={editTpl.effectValue} className="w-full ia"
                  onChange={e => setEditTpl(p => ({ ...p!, effectValue: parseFloat(e.target.value) }))} />
              </div>
            </div>

            <p className="text-xs text-gray-500">Secondary Effect (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Effect Type 2</label>
                <select value={editTpl.effectType2} className="w-full ia"
                  onChange={e => setEditTpl(p => ({ ...p!, effectType2: e.target.value }))}>
                  <option value="">— None —</option>
                  {EFFECT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Effect Value 2</label>
                <input type="number" step="0.1" value={editTpl.effectValue2} className="w-full ia"
                  disabled={!editTpl.effectType2}
                  onChange={e => setEditTpl(p => ({ ...p!, effectValue2: parseFloat(e.target.value) }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Price (CRATE)</label>
                <input type="number" step="0.001" min={0} value={editTpl.price} className="w-full ia"
                  onChange={e => setEditTpl(p => ({ ...p!, price: parseFloat(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Available in shop</label>
                <select value={editTpl.active ? 'yes' : 'no'} className="w-full ia"
                  onChange={e => setEditTpl(p => ({ ...p!, active: e.target.value === 'yes' }))}>
                  <option value="no">No (airdrop only)</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={save}
                className="px-4 py-1.5 text-sm bg-purple-800/60 border border-purple-600 text-purple-200 rounded hover:bg-purple-700/60">
                Save
              </button>
              <button onClick={() => setEditTpl(null)}
                className="px-4 py-1.5 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Airdrop modal */}
      {airdropId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg p-5 w-80 space-y-3">
            <h2 className="text-sm font-bold text-purple-300">Airdrop {typeLabel}</h2>
            <p className="text-xs text-gray-400">{items.find(i => i.id === airdropId)?.name}</p>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Player User ID</label>
              <input value={airdropUser} onChange={e => setAirdropUser(e.target.value)}
                className="w-full ia font-mono" placeholder="UUID from Players page…" />
            </div>
            {airdropMsg && (
              <p className={`text-xs font-mono ${airdropMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                {airdropMsg}
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={sendAirdrop}
                className="flex-1 px-3 py-1.5 text-xs bg-purple-800/60 border border-purple-600 text-purple-200 rounded">
                Send
              </button>
              <button onClick={() => { setAirdropId(null); setAirdropUser(''); setAirdropMsg('') }}
                className="flex-1 px-3 py-1.5 text-xs border border-gray-700 text-gray-400 rounded">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item list */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (() => {
        const filtered = items.filter(t =>
          (rarityFilter === 'ALL' || t.rarity === rarityFilter) &&
          (!search || t.name.toLowerCase().includes(search.toLowerCase()))
        )
        if (filtered.length === 0) return (
          <p className="text-gray-500 text-sm">
            {items.length === 0 ? `No ${typeLabel.toLowerCase()}s yet. Click + New to create one.` : 'No items match the current filters.'}
          </p>
        )
        return (
        <div className="space-y-1.5">
          {filtered.map(t => (
            <div key={t.id}
              className={`bg-[#0d0d1a] border rounded-lg p-3 flex items-center gap-4 ${
                t.active ? 'border-purple-900/30' : 'border-gray-800/40 opacity-70'
              }`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-200">{t.name}</span>
                  <span className={`text-xs font-bold ${RARITY_COLOR[t.rarity] ?? 'text-gray-400'}`}>{t.rarity}</span>
                  {t.active
                    ? <span className="text-xs bg-green-900/30 text-green-400 px-1.5 rounded">In Shop</span>
                    : <span className="text-xs bg-gray-800 text-gray-500 px-1.5 rounded">Airdrop only</span>}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {t.metadata.collection && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-900/30 border border-purple-800/40 text-purple-300">
                      🏷 {t.metadata.collection}
                    </span>
                  )}
                  {t.metadata.effectType && (
                    <span className="text-xs text-gray-500">{t.metadata.effectType}: <span className="text-gray-300">{t.metadata.effectValue}</span></span>
                  )}
                  {t.metadata.effectType2 && (
                    <span className="text-xs text-gray-500">{t.metadata.effectType2}: <span className="text-gray-300">{t.metadata.effectValue2}</span></span>
                  )}
                  <span className="text-xs text-purple-300">{t.price} CRATE</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-gray-700 font-mono">{t.id}</span>
                  <button onClick={() => navigator.clipboard.writeText(t.id)}
                    className="text-xs text-gray-700 hover:text-purple-400 transition-colors">copy</button>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => { setAirdropId(t.id); setAirdropUser(''); setAirdropMsg('') }}
                  className="px-2 py-1 text-xs border border-purple-700/40 text-purple-400 rounded hover:bg-purple-900/20">
                  Airdrop
                </button>
                <button onClick={() => toggleActive(t)}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    t.active
                      ? 'border-yellow-700/40 text-yellow-400 hover:bg-yellow-900/20'
                      : 'border-green-700/40 text-green-400 hover:bg-green-900/20'
                  }`}>
                  {t.active ? 'Remove from shop' : 'Add to shop'}
                </button>
                <button onClick={() => openEdit(t)}
                  className="px-2 py-1 text-xs border border-gray-700 text-gray-300 rounded hover:bg-gray-800">
                  Edit
                </button>
                <button onClick={() => del(t.id, t.name)}
                  className="px-2 py-1 text-xs border border-red-900 text-red-400 rounded hover:bg-red-900/20">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        )
      })()}

      <style jsx global>{`
        .ia { background:#111122;border:1px solid #2d2d50;border-radius:4px;padding:4px 8px;font-size:12px;color:#d1d5db;outline:none; }
        .ia:focus { border-color:#7c3aed; }
        .ia:disabled { opacity:.4;cursor:not-allowed; }
      `}</style>
    </div>
  )
}
