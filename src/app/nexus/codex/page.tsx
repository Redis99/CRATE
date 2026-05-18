'use client'

import { useEffect, useState } from 'react'

interface CodexCollection {
  id: string
  name: string
  description: string
  itemType: string
  totalRequired: number
  bonusPerItemErPct: number
  completionErPct: number
  completionPdPct: number
  completionSlots: number
  active: boolean
  sortOrder: number
  totalRegistered: number
}

const ITEM_TYPES = ['ROBOT', 'EQUIPMENT', 'BASE_UPGRADE']
const EMPTY: Omit<CodexCollection, 'id' | 'totalRegistered'> = {
  name: '', description: '', itemType: 'ROBOT', totalRequired: 3,
  bonusPerItemErPct: 0, completionErPct: 0, completionPdPct: 0,
  completionSlots: 0, active: true, sortOrder: 0,
}

export default function CodexAdminPage() {
  const [collections, setCollections] = useState<CodexCollection[]>([])
  const [loading, setLoading]         = useState(true)
  const [editing, setEditing]         = useState<Partial<CodexCollection> | null>(null)
  const [isNew, setIsNew]             = useState(false)
  const [msg, setMsg]                 = useState('')

  async function load() {
    setLoading(true)
    const r = await fetch('/api/admin/codex')
    setCollections(await r.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openNew() { setEditing({ ...EMPTY }); setIsNew(true) }
  function openEdit(c: CodexCollection) { setEditing({ ...c }); setIsNew(false) }

  async function save() {
    if (!editing) return
    setMsg('Saving…')
    const method = isNew ? 'POST' : 'PUT'
    const r = await fetch('/api/admin/codex', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    })
    if (r.ok) { setMsg('Saved!'); setEditing(null); load() }
    else { const e = await r.json(); setMsg(`Error: ${e.error}`) }
  }

  async function toggleActive(c: CodexCollection) {
    await fetch('/api/admin/codex', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, active: !c.active }),
    })
    load()
  }

  async function del(id: string, name: string) {
    if (!confirm(`Delete collection "${name}"?`)) return
    const r = await fetch('/api/admin/codex', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (r.ok) { setMsg('Deleted'); load() }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-purple-300 font-mono">Codex Collections</h1>
        <button onClick={openNew}
          className="px-3 py-1.5 text-xs bg-purple-800/60 border border-purple-600 text-purple-200 rounded hover:bg-purple-700/60">
          + New Collection
        </button>
      </div>

      <p className="text-xs text-yellow-500/80 bg-yellow-900/10 border border-yellow-900/30 rounded px-3 py-2">
        ⚠ O campo <strong>Name</strong> deve ser <em>idêntico</em> ao valor de <code>Robot.collection</code> no banco — é o elo que conecta os robôs à coleção.
      </p>

      {msg && <p className="text-xs text-yellow-400 font-mono">{msg}</p>}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg p-5 w-full max-w-xl my-4 space-y-3">
            <h2 className="text-sm font-bold text-purple-300">{isNew ? 'New Collection' : 'Edit Collection'}</h2>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Name (= Robot.collection exact)">
                <input value={editing.name ?? ''} onChange={e => setEditing(p => ({ ...p!, name: e.target.value }))}
                  className="w-full input-admin font-mono" placeholder="e.g. Sentinel - Serie Artica" />
              </Field>
              <Field label="Item Type">
                <select value={editing.itemType ?? 'ROBOT'} onChange={e => setEditing(p => ({ ...p!, itemType: e.target.value }))}
                  className="w-full input-admin">
                  {ITEM_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Description">
              <textarea value={editing.description ?? ''} onChange={e => setEditing(p => ({ ...p!, description: e.target.value }))}
                rows={2} className="w-full input-admin" />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Total Required">
                <input type="number" min={1} value={editing.totalRequired ?? 3}
                  onChange={e => setEditing(p => ({ ...p!, totalRequired: parseInt(e.target.value) }))}
                  className="w-full input-admin" />
              </Field>
              <Field label="Sort Order">
                <input type="number" value={editing.sortOrder ?? 0}
                  onChange={e => setEditing(p => ({ ...p!, sortOrder: parseInt(e.target.value) }))}
                  className="w-full input-admin" />
              </Field>
              <Field label="Active">
                <select value={editing.active ? 'yes' : 'no'}
                  onChange={e => setEditing(p => ({ ...p!, active: e.target.value === 'yes' }))}
                  className="w-full input-admin">
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </Field>
            </div>

            <p className="text-xs text-gray-500 pt-1">Bonuses</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ER % per item registered">
                <input type="number" step="0.1" value={editing.bonusPerItemErPct ?? 0}
                  onChange={e => setEditing(p => ({ ...p!, bonusPerItemErPct: parseFloat(e.target.value) }))}
                  className="w-full input-admin" />
              </Field>
              <Field label="ER % on completion">
                <input type="number" step="0.1" value={editing.completionErPct ?? 0}
                  onChange={e => setEditing(p => ({ ...p!, completionErPct: parseFloat(e.target.value) }))}
                  className="w-full input-admin" />
              </Field>
              <Field label="PD % reduction on completion">
                <input type="number" step="0.1" value={editing.completionPdPct ?? 0}
                  onChange={e => setEditing(p => ({ ...p!, completionPdPct: parseFloat(e.target.value) }))}
                  className="w-full input-admin" />
              </Field>
              <Field label="Outpost slots granted on completion">
                <input type="number" min={0} value={editing.completionSlots ?? 0}
                  onChange={e => setEditing(p => ({ ...p!, completionSlots: parseInt(e.target.value) }))}
                  className="w-full input-admin" />
              </Field>
            </div>

            <div className="flex gap-2 pt-2">
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
          {collections.map(c => (
            <div key={c.id}
              className={`bg-[#0d0d1a] border rounded-lg p-3 ${c.active ? 'border-purple-900/20' : 'border-gray-800/40 opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-200 font-mono">{c.name}</span>
                    <span className="text-xs text-gray-500 bg-gray-800 px-1.5 rounded">{c.itemType}</span>
                    {!c.active && <span className="text-xs text-red-500">Inactive</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
                  <div className="flex gap-4 mt-1.5 text-xs text-gray-600 flex-wrap">
                    <span>Required: <span className="text-gray-400">{c.totalRequired}</span></span>
                    <span>Registered: <span className={c.totalRegistered >= c.totalRequired ? 'text-green-400' : 'text-gray-400'}>{c.totalRegistered}</span></span>
                    {c.bonusPerItemErPct > 0 && <span>+{c.bonusPerItemErPct}% ER/item</span>}
                    {c.completionErPct > 0 && <span>+{c.completionErPct}% ER complete</span>}
                    {c.completionPdPct > 0 && <span>-{c.completionPdPct}% PD complete</span>}
                    {c.completionSlots > 0 && <span>+{c.completionSlots} slots complete</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => toggleActive(c)}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      c.active
                        ? 'border-yellow-700/40 text-yellow-400 hover:bg-yellow-900/20'
                        : 'border-green-700/40 text-green-400 hover:bg-green-900/20'
                    }`}>
                    {c.active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => openEdit(c)}
                    className="px-2 py-1 text-xs border border-gray-700 text-gray-300 rounded hover:bg-gray-800">
                    Edit
                  </button>
                  <button onClick={() => del(c.id, c.name)}
                    className="px-2 py-1 text-xs border border-red-900 text-red-400 rounded hover:bg-red-900/20">
                    Delete
                  </button>
                </div>
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
