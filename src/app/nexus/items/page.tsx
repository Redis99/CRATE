'use client'

import { useEffect, useState } from 'react'

interface GameItem {
  id: string
  category: string
  name: string
  description: string
  price: number
  rarity: string
  active: boolean
  metadata: {
    specific: boolean
    effectType:   string | null
    effectValue:  number | null
    effectType2:  string | null
    effectValue2: number | null
  }
}

const RARITIES    = ['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY']
const EFFECT_TYPES = [
  'HASH_POWER_FLAT','HASH_POWER_PCT',
  'DURABILITY_LOSS_PCT','GLOBAL_EFFICIENCY_PCT',
  'UPTIME_HOURS','POWER_DRAW_FLAT','POWER_DRAW_PCT',
]
const RARITY_COLOR: Record<string, string> = {
  COMMON:    'text-gray-400', UNCOMMON: 'text-green-400',
  RARE:      'text-blue-400', EPIC:     'text-purple-400',
  LEGENDARY: 'text-yellow-400',
}
const EMPTY = {
  name: '', rarity: 'COMMON', effectType: '', effectValue: 0,
  effectType2: '', effectValue2: 0, price: 0, active: false, description: '',
}

type Tab = 'equipment-specific' | 'base-upgrade-specific'

export default function ItemsAdminPage() {
  const [tab, setTab]         = useState<Tab>('equipment-specific')
  const [items, setItems]     = useState<GameItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<typeof EMPTY & { id?: string } | null>(null)
  const [isNew, setIsNew]     = useState(false)
  const [msg, setMsg]         = useState('')

  // Airdrop modal
  const [airdropId, setAirdropId]     = useState<string | null>(null)
  const [airdropUser, setAirdropUser] = useState('')
  const [airdropMsg, setAirdropMsg]   = useState('')

  async function load(category: Tab) {
    setLoading(true)
    const r = await fetch(`/api/admin/items?category=${category}`)
    setItems(await r.json())
    setLoading(false)
  }
  useEffect(() => { load(tab) }, [tab])

  function openNew() { setEditing({ ...EMPTY }); setIsNew(true) }
  function openEdit(i: GameItem) {
    setEditing({
      id: i.id,
      name: i.name, rarity: i.rarity,
      effectType:   i.metadata.effectType  ?? '',
      effectValue:  i.metadata.effectValue ?? 0,
      effectType2:  i.metadata.effectType2 ?? '',
      effectValue2: i.metadata.effectValue2 ?? 0,
      price: i.price, active: i.active, description: i.description,
    })
    setIsNew(false)
  }

  async function save() {
    if (!editing) return
    setMsg('Saving…')
    const body = {
      ...editing,
      category: tab,
      effectType:  editing.effectType  || null,
      effectType2: editing.effectType2 || null,
      effectValue2: editing.effectType2 ? editing.effectValue2 : null,
    }
    const r = await fetch('/api/admin/items', {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (r.ok) { setMsg('Saved!'); setEditing(null); load(tab) }
    else { const e = await r.json(); setMsg(`Error: ${e.error}`) }
  }

  async function del(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return
    await fetch('/api/admin/items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setMsg('Deleted')
    load(tab)
  }

  async function toggleActive(i: GameItem) {
    await fetch('/api/admin/items', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: i.id, name: i.name, rarity: i.rarity,
        effectType:   i.metadata.effectType,
        effectValue:  i.metadata.effectValue,
        effectType2:  i.metadata.effectType2,
        effectValue2: i.metadata.effectValue2,
        price: i.price, active: !i.active, description: i.description,
      }),
    })
    load(tab)
  }

  async function sendAirdrop() {
    if (!airdropId || !airdropUser.trim()) { setAirdropMsg('Enter a user ID'); return }
    setAirdropMsg('Sending…')
    const r = await fetch('/api/admin/items/airdrop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: airdropUser, itemId: airdropId }),
    })
    const data = await r.json()
    if (r.ok) setAirdropMsg(`✓ ${data.name} sent!`)
    else setAirdropMsg(`Error: ${data.error}`)
  }

  const tabLabel = tab === 'equipment-specific' ? 'Equipment' : 'Base Upgrade'

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-purple-300 font-mono">Items</h1>
        <button onClick={openNew}
          className="px-3 py-1.5 text-xs bg-purple-800/60 border border-purple-600 text-purple-200 rounded hover:bg-purple-700/60">
          + New {tabLabel}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['equipment-specific', 'base-upgrade-specific'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-xs rounded border transition-colors ${
              tab === t
                ? 'bg-purple-800/60 border-purple-600 text-purple-200'
                : 'border-gray-700 text-gray-400 hover:border-gray-500'
            }`}>
            {t === 'equipment-specific' ? 'Equipments' : 'Base Upgrades'}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        Itens com stats exatos. Ativos aparecem na loja. Inativos disponíveis apenas via Airdrop.
      </p>

      {msg && <p className="text-xs text-yellow-400 font-mono">{msg}</p>}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg p-5 w-full max-w-lg my-4 space-y-3">
            <h2 className="text-sm font-bold text-purple-300">
              {isNew ? `New ${tabLabel}` : `Edit ${tabLabel}`}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <input value={editing.name}
                  onChange={e => setEditing(p => ({ ...p!, name: e.target.value }))}
                  className="w-full input-admin" placeholder="e.g. Extraction Booster" />
              </Field>
              <Field label="Rarity">
                <select value={editing.rarity}
                  onChange={e => setEditing(p => ({ ...p!, rarity: e.target.value }))}
                  className="w-full input-admin">
                  {RARITIES.map(r => <option key={r}>{r}</option>)}
                </select>
              </Field>
            </div>

            {/* Primary effect */}
            <p className="text-xs text-gray-500 pt-1">Primary Effect</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Effect Type">
                <select value={editing.effectType}
                  onChange={e => setEditing(p => ({ ...p!, effectType: e.target.value }))}
                  className="w-full input-admin">
                  <option value="">— Select —</option>
                  {EFFECT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Effect Value">
                <input type="number" step="0.1" value={editing.effectValue}
                  onChange={e => setEditing(p => ({ ...p!, effectValue: parseFloat(e.target.value) }))}
                  className="w-full input-admin" />
              </Field>
            </div>

            {/* Secondary effect */}
            <p className="text-xs text-gray-500">Secondary Effect (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Effect Type 2">
                <select value={editing.effectType2}
                  onChange={e => setEditing(p => ({ ...p!, effectType2: e.target.value }))}
                  className="w-full input-admin">
                  <option value="">— None —</option>
                  {EFFECT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Effect Value 2">
                <input type="number" step="0.1" value={editing.effectValue2}
                  onChange={e => setEditing(p => ({ ...p!, effectValue2: parseFloat(e.target.value) }))}
                  className="w-full input-admin"
                  disabled={!editing.effectType2} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (CRATE)">
                <input type="number" min={0} step={0.001} value={editing.price}
                  onChange={e => setEditing(p => ({ ...p!, price: parseFloat(e.target.value) }))}
                  className="w-full input-admin" />
              </Field>
              <Field label="Active in shop">
                <select value={editing.active ? 'yes' : 'no'}
                  onChange={e => setEditing(p => ({ ...p!, active: e.target.value === 'yes' }))}
                  className="w-full input-admin">
                  <option value="no">No (airdrop only)</option>
                  <option value="yes">Yes (visible in shop)</option>
                </select>
              </Field>
            </div>

            <Field label="Description">
              <input value={editing.description}
                onChange={e => setEditing(p => ({ ...p!, description: e.target.value }))}
                className="w-full input-admin" placeholder="Optional shop description" />
            </Field>

            <div className="flex gap-2 pt-1">
              <button onClick={save}
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

      {/* Airdrop modal */}
      {airdropId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg p-5 w-80 space-y-3">
            <h2 className="text-sm font-bold text-purple-300">Airdrop {tabLabel}</h2>
            <p className="text-xs text-gray-400">{items.find(i => i.id === airdropId)?.name}</p>
            <Field label="Player User ID">
              <input value={airdropUser} onChange={e => setAirdropUser(e.target.value)}
                className="w-full input-admin font-mono" placeholder="UUID from Players page…" />
            </Field>
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
      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : items.length === 0 ? (
        <p className="text-gray-500 text-sm">No {tabLabel.toLowerCase()}s created yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map(i => (
            <div key={i.id}
              className={`bg-[#0d0d1a] border rounded-lg p-3 flex items-center gap-4 ${
                i.active ? 'border-purple-900/30' : 'border-gray-800/40 opacity-70'
              }`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-200">{i.name}</span>
                  <span className={`text-xs font-bold ${RARITY_COLOR[i.rarity] ?? 'text-gray-400'}`}>
                    {i.rarity}
                  </span>
                  {i.active
                    ? <span className="text-xs bg-green-900/30 text-green-400 px-1.5 rounded">In Shop</span>
                    : <span className="text-xs bg-gray-800 text-gray-500 px-1.5 rounded">Airdrop only</span>
                  }
                </div>
                <div className="flex gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                  {i.metadata.effectType && (
                    <span>{i.metadata.effectType}: <span className="text-gray-300">{i.metadata.effectValue}</span></span>
                  )}
                  {i.metadata.effectType2 && (
                    <span>{i.metadata.effectType2}: <span className="text-gray-300">{i.metadata.effectValue2}</span></span>
                  )}
                  <span className="text-purple-300">{i.price} CRATE</span>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => { setAirdropId(i.id); setAirdropUser(''); setAirdropMsg('') }}
                  className="px-2 py-1 text-xs border border-purple-700/40 text-purple-400 rounded hover:bg-purple-900/20">
                  Airdrop
                </button>
                <button onClick={() => toggleActive(i)}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    i.active
                      ? 'border-yellow-700/40 text-yellow-400 hover:bg-yellow-900/20'
                      : 'border-green-700/40 text-green-400 hover:bg-green-900/20'
                  }`}>
                  {i.active ? 'Remove from shop' : 'Add to shop'}
                </button>
                <button onClick={() => openEdit(i)}
                  className="px-2 py-1 text-xs border border-gray-700 text-gray-300 rounded hover:bg-gray-800">
                  Edit
                </button>
                <button onClick={() => del(i.id, i.name)}
                  className="px-2 py-1 text-xs border border-red-900 text-red-400 rounded hover:bg-red-900/20">
                  Delete
                </button>
              </div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}
