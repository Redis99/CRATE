'use client'

import { useEffect, useState } from 'react'

interface RobotItem {
  id: string
  name: string
  description: string
  price: number
  rarity: string
  active: boolean
  metadata: {
    specific: boolean
    robotName: string
    robotCollection: string
    hashPower: number
    energyRate: number
  }
}

const RARITIES = ['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY']

const RARITY_COLOR: Record<string, string> = {
  COMMON:    'text-gray-400',
  UNCOMMON:  'text-green-400',
  RARE:      'text-blue-400',
  EPIC:      'text-purple-400',
  LEGENDARY: 'text-yellow-400',
}

const EMPTY = {
  name: '', collection: '', rarity: 'COMMON',
  hashPower: 10, energyRate: 1,
  price: 0, active: false, description: '',
}

export default function RobotsAdminPage() {
  const [robots, setRobots]           = useState<RobotItem[]>([])
  const [collections, setCollections] = useState<string[]>([])
  const [loading, setLoading]         = useState(true)
  const [editing, setEditing]         = useState<typeof EMPTY & { id?: string } | null>(null)
  const [isNew, setIsNew]             = useState(false)
  const [msg, setMsg]                 = useState('')

  // Airdrop modal
  const [airdropRobotId, setAirdropRobotId] = useState<string | null>(null)
  const [airdropUser, setAirdropUser]       = useState('')
  const [airdropMsg, setAirdropMsg]         = useState('')

  async function load() {
    setLoading(true)
    const r = await fetch('/api/admin/robots')
    const data = await r.json()
    setRobots(data.items ?? [])
    setCollections(data.collections ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openNew() {
    setEditing({ ...EMPTY })
    setIsNew(true)
  }
  function openEdit(r: RobotItem) {
    setEditing({
      id: r.id,
      name: r.metadata.robotName,
      collection: r.metadata.robotCollection,
      rarity: r.rarity,
      hashPower: r.metadata.hashPower,
      energyRate: r.metadata.energyRate,
      price: r.price,
      active: r.active,
      description: r.description,
    })
    setIsNew(false)
  }

  async function save() {
    if (!editing) return
    setMsg('Saving…')
    const method = isNew ? 'POST' : 'PUT'
    const r = await fetch('/api/admin/robots', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    })
    if (r.ok) { setMsg('Saved!'); setEditing(null); load() }
    else { const e = await r.json(); setMsg(`Error: ${e.error}`) }
  }

  async function del(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return
    await fetch('/api/admin/robots', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setMsg('Deleted')
    load()
  }

  async function toggleActive(r: RobotItem) {
    await fetch('/api/admin/robots', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: r.id, name: r.metadata.robotName,
        collection: r.metadata.robotCollection,
        rarity: r.rarity, hashPower: r.metadata.hashPower,
        energyRate: r.metadata.energyRate,
        price: r.price, active: !r.active, description: r.description,
      }),
    })
    load()
  }

  async function sendAirdrop() {
    if (!airdropRobotId || !airdropUser.trim()) { setAirdropMsg('Enter a user ID'); return }
    setAirdropMsg('Sending…')
    const r = await fetch('/api/admin/robots/airdrop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: airdropUser, robotItemId: airdropRobotId }),
    })
    const data = await r.json()
    if (r.ok) { setAirdropMsg(`✓ ${data.robot.name} sent!`); }
    else setAirdropMsg(`Error: ${data.error}`)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-purple-300 font-mono">Robots</h1>
        <button onClick={openNew}
          className="px-3 py-1.5 text-xs bg-purple-800/60 border border-purple-600 text-purple-200 rounded hover:bg-purple-700/60">
          + New Robot
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Robôs com stats exatos. Ativos aparecem na loja como itens compráveis.
        Inativos podem ser usados apenas via Airdrop.
      </p>

      {msg && <p className="text-xs text-yellow-400 font-mono">{msg}</p>}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg p-5 w-full max-w-lg my-4 space-y-3">
            <h2 className="text-sm font-bold text-purple-300">{isNew ? 'New Robot' : 'Edit Robot'}</h2>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <input value={editing.name}
                  onChange={e => setEditing(p => ({ ...p!, name: e.target.value }))}
                  className="w-full input-admin" placeholder="e.g. Sentinel Mk.VII" />
              </Field>
              <Field label="Rarity">
                <select value={editing.rarity}
                  onChange={e => setEditing(p => ({ ...p!, rarity: e.target.value }))}
                  className="w-full input-admin">
                  {RARITIES.map(r => <option key={r}>{r}</option>)}
                </select>
              </Field>
            </div>

            {/* Collection — dropdown real populado do banco */}
            <Field label="Collection tag (optional)">
              <select
                value={editing.collection}
                onChange={e => setEditing(p => ({ ...p!, collection: e.target.value }))}
                className="w-full input-admin">
                <option value="">— No collection —</option>
                {collections.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {editing.collection && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-900/40 border border-purple-700/40 text-purple-300 mt-1.5">
                  🏷 {editing.collection}
                </span>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Extraction Rate (ER)">
                <input type="number" min={1} value={editing.hashPower}
                  onChange={e => setEditing(p => ({ ...p!, hashPower: parseFloat(e.target.value) }))}
                  className="w-full input-admin" />
              </Field>
              <Field label="Power Draw (PD)">
                <input type="number" min={0.1} step={0.1} value={editing.energyRate}
                  onChange={e => setEditing(p => ({ ...p!, energyRate: parseFloat(e.target.value) }))}
                  className="w-full input-admin" />
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
                className="w-full input-admin" placeholder="Optional description in shop" />
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
      {airdropRobotId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg p-5 w-80 space-y-3">
            <h2 className="text-sm font-bold text-purple-300">Airdrop Robot</h2>
            <p className="text-xs text-gray-400">
              {robots.find(r => r.id === airdropRobotId)?.name}
            </p>
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
              <button onClick={() => { setAirdropRobotId(null); setAirdropUser(''); setAirdropMsg('') }}
                className="flex-1 px-3 py-1.5 text-xs border border-gray-700 text-gray-400 rounded">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Robot list */}
      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : robots.length === 0 ? (
        <p className="text-gray-500 text-sm">No robots created yet. Click + New Robot to create one.</p>
      ) : (
        <div className="space-y-2">
          {robots.map(r => (
            <div key={r.id}
              className={`bg-[#0d0d1a] border rounded-lg p-3 flex items-center gap-4 ${
                r.active ? 'border-purple-900/30' : 'border-gray-800/40 opacity-70'
              }`}>
              <div className="flex-1 min-w-0">
                {/* Linha 1: nome + raridade + status */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-200">{r.metadata.robotName}</span>
                  <span className={`text-xs font-bold ${RARITY_COLOR[r.rarity] ?? 'text-gray-400'}`}>
                    {r.rarity}
                  </span>
                  {r.active
                    ? <span className="text-xs bg-green-900/30 text-green-400 px-1.5 rounded">In Shop</span>
                    : <span className="text-xs bg-gray-800 text-gray-500 px-1.5 rounded">Airdrop only</span>
                  }
                </div>
                {/* Linha 2: collection tag separada */}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {r.metadata.robotCollection
                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-900/30 border border-purple-800/40 text-purple-300">
                        🏷 {r.metadata.robotCollection}
                      </span>
                    : <span className="text-xs text-gray-700 italic">No collection</span>
                  }
                  <span className="text-xs text-gray-600">ER {r.metadata.hashPower}</span>
                  <span className="text-xs text-gray-600">PD {r.metadata.energyRate}</span>
                  <span className="text-xs text-purple-300">{r.price} CRATE</span>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => { setAirdropRobotId(r.id); setAirdropUser(''); setAirdropMsg('') }}
                  className="px-2 py-1 text-xs border border-purple-700/40 text-purple-400 rounded hover:bg-purple-900/20">
                  Airdrop
                </button>
                <button onClick={() => toggleActive(r)}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    r.active
                      ? 'border-yellow-700/40 text-yellow-400 hover:bg-yellow-900/20'
                      : 'border-green-700/40 text-green-400 hover:bg-green-900/20'
                  }`}>
                  {r.active ? 'Remove from shop' : 'Add to shop'}
                </button>
                <button onClick={() => openEdit(r)}
                  className="px-2 py-1 text-xs border border-gray-700 text-gray-300 rounded hover:bg-gray-800">
                  Edit
                </button>
                <button onClick={() => del(r.id, r.metadata.robotName)}
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
