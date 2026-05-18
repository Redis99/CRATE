'use client'

import { useEffect, useState } from 'react'

interface Mission {
  id: string
  title: string
  description: string
  category: string
  target: number
  isSeasonal: boolean
  expiresAt: string | null
  rewardType: string
  rewardData: Record<string, unknown>
  _count: { userMissions: number }
}

const CATEGORIES = [
  'FIRST_STEPS','MINING','LOOTBOX','CRAFTING','MARKET',
  'MINIGAMES','CODEX','RANKING','SEASONAL',
]
const REWARD_TYPES = [
  'LOOTBOX','ROBOT','EQUIPMENT','REPAIR_KIT',
  'INVENTORY_EXPANSION','COSMETIC','TITLE','OUTPOST_SLOT',
]
const EMPTY: Omit<Mission, 'id' | '_count'> = {
  title: '', description: '', category: 'FIRST_STEPS', target: 1,
  isSeasonal: false, expiresAt: null,
  rewardType: 'LOOTBOX', rewardData: {},
}

export default function MissionsAdminPage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('ALL')
  const [editing, setEditing]   = useState<Partial<Mission> | null>(null)
  const [isNew, setIsNew]       = useState(false)
  const [msg, setMsg]           = useState('')
  const [rewardRaw, setRewardRaw] = useState('{}')

  async function load() {
    setLoading(true)
    const r = await fetch('/api/admin/missions')
    setMissions(await r.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openNew() {
    setEditing({ ...EMPTY })
    setRewardRaw('{}')
    setIsNew(true)
  }

  function openEdit(m: Mission) {
    setEditing({ ...m })
    setRewardRaw(JSON.stringify(m.rewardData, null, 2))
    setIsNew(false)
  }

  async function save() {
    if (!editing) return
    let rewardData: Record<string, unknown>
    try { rewardData = JSON.parse(rewardRaw) }
    catch { setMsg('Invalid rewardData JSON'); return }
    setMsg('Saving…')
    const method = isNew ? 'POST' : 'PUT'
    const r = await fetch('/api/admin/missions', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editing, rewardData }),
    })
    if (r.ok) { setMsg('Saved!'); setEditing(null); load() }
    else { const e = await r.json(); setMsg(`Error: ${e.error}`) }
  }

  async function del(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This will also remove player progress.`)) return
    const r = await fetch('/api/admin/missions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (r.ok) { setMsg('Deleted'); load() }
  }

  const visible = filter === 'ALL' ? missions : missions.filter(m => m.category === filter)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-purple-300 font-mono">Missions</h1>
        <button onClick={openNew}
          className="px-3 py-1.5 text-xs bg-purple-800/60 border border-purple-600 text-purple-200 rounded hover:bg-purple-700/60">
          + New Mission
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 flex-wrap">
        {['ALL', ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-2.5 py-1 text-xs rounded border transition-colors ${
              filter === c
                ? 'bg-purple-800/60 border-purple-600 text-purple-200'
                : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-600'
            }`}>
            {c}
          </button>
        ))}
      </div>

      {msg && <p className="text-xs text-yellow-400 font-mono">{msg}</p>}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg p-5 w-full max-w-xl my-4 space-y-3">
            <h2 className="text-sm font-bold text-purple-300">{isNew ? 'New Mission' : 'Edit Mission'}</h2>

            <Field label="Title">
              <input value={editing.title ?? ''} onChange={e => setEditing(p => ({ ...p!, title: e.target.value }))}
                className="w-full input-admin" />
            </Field>
            <Field label="Description">
              <textarea value={editing.description ?? ''} onChange={e => setEditing(p => ({ ...p!, description: e.target.value }))}
                rows={2} className="w-full input-admin" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select value={editing.category ?? 'FIRST_STEPS'} onChange={e => setEditing(p => ({ ...p!, category: e.target.value }))}
                  className="w-full input-admin">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Target (quantity)">
                <input type="number" min={1} value={editing.target ?? 1}
                  onChange={e => setEditing(p => ({ ...p!, target: parseInt(e.target.value) }))}
                  className="w-full input-admin" />
              </Field>
              <Field label="Reward Type">
                <select value={editing.rewardType ?? 'LOOTBOX'} onChange={e => setEditing(p => ({ ...p!, rewardType: e.target.value }))}
                  className="w-full input-admin">
                  {REWARD_TYPES.map(r => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Seasonal">
                <select value={editing.isSeasonal ? 'yes' : 'no'}
                  onChange={e => setEditing(p => ({ ...p!, isSeasonal: e.target.value === 'yes' }))}
                  className="w-full input-admin">
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>
            </div>

            <Field label="Expires At (leave blank = permanent)">
              <input type="datetime-local" value={editing.expiresAt?.slice(0, 16) ?? ''}
                onChange={e => setEditing(p => ({ ...p!, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                className="w-full input-admin" />
            </Field>

            <Field label="Reward Data (JSON)">
              <textarea value={rewardRaw} onChange={e => setRewardRaw(e.target.value)}
                rows={4} className="w-full input-admin font-mono text-xs" />
              <p className="text-xs text-gray-600 mt-1">
                Examples: {`{ "lootboxType": "PARTS_CRATE", "quantity": 1 }`} · {`{ "rarity": "RARE" }`} · {`{ "percent": 25 }`} · {`{ "slots": 1 }`}
              </p>
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

      {/* List */}
      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : (
        <div className="space-y-2">
          {visible.map(m => (
            <div key={m.id} className="bg-[#0d0d1a] border border-purple-900/20 rounded-lg p-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-200">{m.title}</span>
                  <span className="text-xs text-purple-400 bg-purple-900/20 px-1.5 rounded">{m.category}</span>
                  {m.isSeasonal && <span className="text-xs text-yellow-400 bg-yellow-900/20 px-1.5 rounded">Seasonal</span>}
                  {m.expiresAt && new Date(m.expiresAt) < new Date() &&
                    <span className="text-xs text-red-400 bg-red-900/20 px-1.5 rounded">Expired</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{m.description}</p>
                <div className="flex gap-3 mt-1 text-xs text-gray-600">
                  <span>Target: {m.target}</span>
                  <span>Reward: {m.rewardType}</span>
                  <span>{m._count.userMissions} players started</span>
                  {m.expiresAt && <span>Expires: {new Date(m.expiresAt).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => openEdit(m)}
                  className="px-2 py-1 text-xs border border-gray-700 text-gray-300 rounded hover:bg-gray-800">
                  Edit
                </button>
                <button onClick={() => del(m.id, m.title)}
                  className="px-2 py-1 text-xs border border-red-900 text-red-400 rounded hover:bg-red-900/20">
                  Delete
                </button>
              </div>
            </div>
          ))}
          {visible.length === 0 && <p className="text-gray-500 text-sm">No missions in this category.</p>}
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
