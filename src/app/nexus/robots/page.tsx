'use client'

import { useEffect, useState, useCallback } from 'react'

interface RobotTemplate {
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
    durability?: number
  }
}

const RARITIES = ['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY']
const RARITY_COLOR: Record<string, string> = {
  COMMON: 'text-gray-400', UNCOMMON: 'text-green-400',
  RARE: 'text-blue-400', EPIC: 'text-purple-400', LEGENDARY: 'text-yellow-400',
}
const EMPTY = {
  name: '', customId: '', collection: '', rarity: 'COMMON',
  hashPower: 10, energyRate: 1, durability: 100,
  price: 0, active: false, description: '',
}

export default function RobotsAdminPage() {
  const [robots, setRobots]           = useState<RobotTemplate[]>([])
  const [collections, setCollections] = useState<string[]>([])
  const [loading, setLoading]         = useState(true)
  const [msg, setMsg]                 = useState('')
  const [editing, setEditing]         = useState<typeof EMPTY & { id?: string } | null>(null)
  const [isNew, setIsNew]             = useState(false)
  const [airdropId, setAirdropId]     = useState<string | null>(null)
  const [airdropUser, setAirdropUser] = useState('')
  const [airdropMsg, setAirdropMsg]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/robots')
    const data = await res.json()
    setRobots(data.items ?? [])
    setCollections(data.collections ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch('/api/admin/codex').then(r => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((d: any[]) => setCollections(d.map((c: any) => c.name)))
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() { setEditing({ ...EMPTY }); setIsNew(true) }
  function openEdit(t: RobotTemplate) {
    setEditing({
      id: t.id, customId: '', name: t.metadata.robotName, collection: t.metadata.robotCollection,
      rarity: t.rarity, hashPower: t.metadata.hashPower, energyRate: t.metadata.energyRate,
      durability: t.metadata.durability ?? 100,
      price: t.price, active: t.active, description: t.description,
    })
    setIsNew(false)
  }

  async function save() {
    if (!editing) return
    setMsg('Saving…')
    const r = await fetch('/api/admin/robots', {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    })
    if (r.ok) { setMsg('Saved!'); setEditing(null); load() }
    else { const e = await r.json(); setMsg(`Error: ${e.error}`) }
  }

  async function del(id: string, name: string) {
    if (!confirm(`Delete robot "${name}"?`)) return
    await fetch('/api/admin/robots', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setMsg('Deleted'); load()
  }

  async function toggleActive(t: RobotTemplate) {
    await fetch('/api/admin/robots', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: t.id, name: t.metadata.robotName, collection: t.metadata.robotCollection,
        rarity: t.rarity, hashPower: t.metadata.hashPower, energyRate: t.metadata.energyRate,
        durability: t.metadata.durability, price: t.price, active: !t.active, description: t.description,
      }),
    })
    load()
  }

  async function sendAirdrop() {
    if (!airdropId || !airdropUser.trim()) { setAirdropMsg('Enter a user ID'); return }
    setAirdropMsg('Sending…')
    const r = await fetch('/api/admin/robots/airdrop', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: airdropUser, robotItemId: airdropId }),
    })
    const d = await r.json()
    if (r.ok) setAirdropMsg(`✓ ${d.robot.name} sent!`)
    else setAirdropMsg(`Error: ${d.error}`)
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

      {msg && <p className="text-xs font-mono text-yellow-400">{msg}</p>}

      {/* Create / Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg p-5 w-full max-w-md my-4 space-y-3">
            <h2 className="text-sm font-bold text-purple-300">
              {isNew ? 'New Robot' : `Edit — ${editing.name}`}
            </h2>

            {/* ID */}
            {isNew ? (
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Custom ID <span className="text-gray-600">(optional)</span>
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-600 font-mono">robot-</span>
                  <input value={editing.customId} className="flex-1 ia font-mono"
                    placeholder="sentinel-mk-vii"
                    onChange={e => setEditing(p => ({ ...p!, customId: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} />
                </div>
                <p className="text-xs text-gray-600 mt-1 font-mono">
                  Final ID: <span className="text-gray-400">robot-{editing.customId || editing.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '…'}</span>
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-800 rounded px-3 py-1.5">
                <span className="text-xs text-gray-500">ID:</span>
                <span className="text-xs font-mono text-gray-300 flex-1">{editing.id}</span>
                <button onClick={() => navigator.clipboard.writeText(editing.id ?? '')}
                  className="text-xs text-gray-600 hover:text-purple-400">copy</button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Name</label>
                <input value={editing.name} className="w-full ia" placeholder="e.g. Sentinel Mk.VII"
                  onChange={e => setEditing(p => ({ ...p!, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Rarity</label>
                <select value={editing.rarity} className="w-full ia"
                  onChange={e => setEditing(p => ({ ...p!, rarity: e.target.value }))}>
                  {RARITIES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Collection tag</label>
              <select value={editing.collection} className="w-full ia"
                onChange={e => setEditing(p => ({ ...p!, collection: e.target.value }))}>
                <option value="">— No collection —</option>
                {/* Inclui o valor atual mesmo que não esteja na lista de Codex */}
                {editing.collection && !collections.includes(editing.collection) && (
                  <option value={editing.collection}>{editing.collection}</option>
                )}
                {collections.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {editing.collection && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-900/40 border border-purple-700/40 text-purple-300 mt-1.5">
                  🏷 {editing.collection}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">ER</label>
                <input type="number" step="0.1" value={editing.hashPower} className="w-full ia"
                  onChange={e => setEditing(p => ({ ...p!, hashPower: parseFloat(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">PD</label>
                <input type="number" step="0.1" value={editing.energyRate} className="w-full ia"
                  onChange={e => setEditing(p => ({ ...p!, energyRate: parseFloat(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Energia</label>
                <input type="number" step="1" min={0} value={editing.durability} className="w-full ia"
                  onChange={e => setEditing(p => ({ ...p!, durability: parseFloat(e.target.value) }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Price (CRATE)</label>
                <input type="number" step="0.001" min={0} value={editing.price} className="w-full ia"
                  onChange={e => setEditing(p => ({ ...p!, price: parseFloat(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Available in shop</label>
                <select value={editing.active ? 'yes' : 'no'} className="w-full ia"
                  onChange={e => setEditing(p => ({ ...p!, active: e.target.value === 'yes' }))}>
                  <option value="no">No (airdrop only)</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <input value={editing.description} className="w-full ia" placeholder="Optional shop description"
                onChange={e => setEditing(p => ({ ...p!, description: e.target.value }))} />
            </div>

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
            <h2 className="text-sm font-bold text-purple-300">Airdrop Robot</h2>
            <p className="text-xs text-gray-400">{robots.find(r => r.id === airdropId)?.metadata.robotName}</p>
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
                className="flex-1 px-3 py-1.5 text-xs bg-purple-800/60 border border-purple-600 text-purple-200 rounded">Send</button>
              <button onClick={() => { setAirdropId(null); setAirdropUser(''); setAirdropMsg('') }}
                className="flex-1 px-3 py-1.5 text-xs border border-gray-700 text-gray-400 rounded">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Robot list */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : robots.length === 0 ? (
        <p className="text-gray-500 text-sm">No robots yet. Click + New Robot to create one.</p>
      ) : (
        <div className="space-y-1.5">
          {robots.map(t => (
            <div key={t.id}
              className={`bg-[#0d0d1a] border rounded-lg p-3 flex items-center gap-4 ${
                t.active ? 'border-purple-900/30' : 'border-gray-800/40 opacity-70'
              }`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-200">{t.metadata.robotName}</span>
                  <span className={`text-xs font-bold ${RARITY_COLOR[t.rarity] ?? 'text-gray-400'}`}>{t.rarity}</span>
                  {t.active
                    ? <span className="text-xs bg-green-900/30 text-green-400 px-1.5 rounded">In Shop</span>
                    : <span className="text-xs bg-gray-800 text-gray-500 px-1.5 rounded">Airdrop only</span>}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {t.metadata.robotCollection && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-900/30 border border-purple-800/40 text-purple-300">
                      🏷 {t.metadata.robotCollection}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">ER {t.metadata.hashPower}</span>
                  <span className="text-xs text-gray-500">PD {t.metadata.energyRate}</span>
                  {t.metadata.durability != null && <span className="text-xs text-gray-500">Energia {t.metadata.durability}</span>}
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
                <button onClick={() => del(t.id, t.metadata.robotName)}
                  className="px-2 py-1 text-xs border border-red-900 text-red-400 rounded hover:bg-red-900/20">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        .ia { background:#111122;border:1px solid #2d2d50;border-radius:4px;padding:4px 8px;font-size:12px;color:#d1d5db;outline:none; }
        .ia:focus { border-color:#7c3aed; }
      `}</style>
    </div>
  )
}
