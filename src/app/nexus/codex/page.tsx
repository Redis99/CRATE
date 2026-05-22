'use client'

import { useEffect, useState } from 'react'

interface CodexCollection {
  id: string
  name: string
  description: string
  itemType: string
  totalRequired: number
  requiredItems: string[]       // nomes exatos dos itens necessários — [] = modo legado
  bonusPerItemErPct: number
  completionErPct: number
  completionPdPct: number
  completionSlots: number
  completionTitle: string | null
  active: boolean
  sortOrder: number
  totalRegistered: number
}

const ITEM_TYPES = ['ROBOT', 'EQUIPMENT', 'BASE_UPGRADE']

const EMPTY: Omit<CodexCollection, 'id' | 'totalRegistered'> = {
  name: '', description: '', itemType: 'ROBOT', totalRequired: 3,
  requiredItems: [],
  bonusPerItemErPct: 0, completionErPct: 0, completionPdPct: 0,
  completionSlots: 0, completionTitle: null,
  active: true, sortOrder: 0,
}

export default function CodexAdminPage() {
  const [collections, setCollections] = useState<CodexCollection[]>([])
  const [loading, setLoading]         = useState(true)
  const [editing, setEditing]         = useState<typeof EMPTY & { id?: string } | null>(null)
  const [isNew, setIsNew]             = useState(false)
  const [msg, setMsg]                 = useState('')

  // Available item names for autocomplete (loaded once)
  const [availableItems, setAvailableItems] = useState<{ name: string; type: string }[]>([])
  const [newItemInput, setNewItemInput]     = useState('')

  async function load() {
    setLoading(true)
    const r = await fetch('/api/admin/codex')
    const data = await r.json()
    // Parse requiredItems from JSON if needed
    setCollections(data.map((c: CodexCollection & { requiredItems: unknown }) => ({
      ...c,
      requiredItems: Array.isArray(c.requiredItems) ? c.requiredItems : [],
    })))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Load available item names for the required items dropdown
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/robots').then(r => r.json()),
      fetch('/api/admin/items?category=equipment-specific').then(r => r.json()),
      fetch('/api/admin/items?category=base-upgrade-specific').then(r => r.json()),
    ]).then(([robotsData, equipData, upgradeData]) => {
      const robots    = (robotsData.items ?? []).map((i: { metadata: { robotName: string } }) => ({ name: i.metadata.robotName, type: 'ROBOT' }))
      const equips    = (equipData.items ?? []).map((i: { name: string }) => ({ name: i.name, type: 'EQUIPMENT' }))
      const upgrades  = (upgradeData.items ?? []).map((i: { name: string }) => ({ name: i.name, type: 'BASE_UPGRADE' }))
      setAvailableItems([...robots, ...equips, ...upgrades])
    })
  }, [])

  function openNew() {
    setEditing({ ...EMPTY, requiredItems: [] })
    setNewItemInput('')
    setIsNew(true)
  }

  function openEdit(c: CodexCollection) {
    setEditing({ ...c, requiredItems: Array.isArray(c.requiredItems) ? c.requiredItems : [] })
    setNewItemInput('')
    setIsNew(false)
  }

  function addRequiredItem() {
    const name = newItemInput.trim()
    if (!name || !editing) return
    if (editing.requiredItems.includes(name)) return
    setEditing(p => {
      if (!p) return p
      const items = [...p.requiredItems, name]
      return { ...p, requiredItems: items, totalRequired: items.length }
    })
    setNewItemInput('')
  }

  function removeRequiredItem(name: string) {
    setEditing(p => {
      if (!p) return p
      const items = p.requiredItems.filter(i => i !== name)
      return { ...p, requiredItems: items, totalRequired: items.length > 0 ? items.length : p.totalRequired }
    })
  }

  async function save() {
    if (!editing) return
    setMsg('Saving…')
    const method = isNew ? 'POST' : 'PUT'
    // When requiredItems is not empty, totalRequired is derived from its length
    const payload = {
      ...editing,
      totalRequired: editing.requiredItems.length > 0 ? editing.requiredItems.length : editing.totalRequired,
    }
    const r = await fetch('/api/admin/codex', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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

  // Filter available items by current itemType for autocomplete
  const filteredSuggestions = editing
    ? availableItems
        .filter(i => i.type === editing.itemType && !editing.requiredItems.includes(i.name))
        .filter(i => !newItemInput || i.name.toLowerCase().includes(newItemInput.toLowerCase()))
    : []

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-purple-300 font-mono">Codex Collections</h1>
        <button onClick={openNew}
          className="px-3 py-1.5 text-xs bg-purple-800/60 border border-purple-600 text-purple-200 rounded hover:bg-purple-700/60">
          + New Collection
        </button>
      </div>

      <p className="text-xs text-blue-400/80 bg-blue-900/10 border border-blue-900/30 rounded px-3 py-2">
        <strong>requiredItems</strong> — lista os nomes exatos dos itens que o jogador precisa registrar.
        Quando preenchida, <code>totalRequired</code> é derivado automaticamente do tamanho da lista.
        Lista vazia = modo legado (aceita qualquer N itens da coleção).
      </p>

      {msg && <p className="text-xs text-yellow-400 font-mono">{msg}</p>}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg p-5 w-full max-w-xl my-4 space-y-3">
            <h2 className="text-sm font-bold text-purple-300">{isNew ? 'New Collection' : 'Edit Collection'}</h2>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Name (collection tag)">
                <input value={editing.name ?? ''} onChange={e => setEditing(p => ({ ...p!, name: e.target.value }))}
                  className="w-full input-admin font-mono" placeholder="e.g. Sentinel — Standard Series" />
              </Field>
              <Field label="Item Type">
                <select value={editing.itemType ?? 'ROBOT'} onChange={e => setEditing(p => ({ ...p!, itemType: e.target.value, requiredItems: [] }))}
                  className="w-full input-admin">
                  {ITEM_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Description">
              <textarea value={editing.description ?? ''} onChange={e => setEditing(p => ({ ...p!, description: e.target.value }))}
                rows={2} className="w-full input-admin" />
            </Field>

            {/* Required Items builder */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Required Items{' '}
                <span className="text-gray-600">
                  ({editing.requiredItems.length === 0 ? 'empty = legacy mode' : `${editing.requiredItems.length} items required`})
                </span>
              </label>

              {/* Current items */}
              {editing.requiredItems.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editing.requiredItems.map((name, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-900/40 border border-purple-700/40 text-purple-200">
                      {name}
                      <button onClick={() => removeRequiredItem(name)}
                        className="text-purple-400 hover:text-red-400 ml-0.5 transition-colors">×</button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add item input */}
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    value={newItemInput}
                    onChange={e => setNewItemInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addRequiredItem()}
                    placeholder={`Type or select a ${editing.itemType.toLowerCase()} name…`}
                    className="flex-1 input-admin"
                  />
                  <button onClick={addRequiredItem}
                    className="px-3 py-1 text-xs bg-purple-800/50 border border-purple-700 text-purple-200 rounded hover:bg-purple-700/50">
                    Add
                  </button>
                </div>
                {/* Autocomplete dropdown */}
                {newItemInput && filteredSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-0.5 bg-[#111122] border border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filteredSuggestions.slice(0, 8).map(s => (
                      <button key={s.name} type="button"
                        onClick={() => { setNewItemInput(s.name); }}
                        className="block w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-purple-900/30 hover:text-purple-200">
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-1">Press Enter or click Add. Names must match exactly what's stored in the item.</p>
            </div>

            {/* totalRequired only shown when requiredItems is empty */}
            {editing.requiredItems.length === 0 && (
              <div className="grid grid-cols-3 gap-3">
                <Field label="Total Required (legacy)">
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
            )}

            {editing.requiredItems.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
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
            )}

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
              <Field label="Outpost slots on completion">
                <input type="number" min={0} value={editing.completionSlots ?? 0}
                  onChange={e => setEditing(p => ({ ...p!, completionSlots: parseInt(e.target.value) }))}
                  className="w-full input-admin" />
              </Field>
              <Field label="Title on completion (optional)">
                <input value={editing.completionTitle ?? ''}
                  onChange={e => setEditing(p => ({ ...p!, completionTitle: e.target.value || null }))}
                  className="w-full input-admin" placeholder='e.g. "Void Hunter"' />
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

      {/* Collection list */}
      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : (
        <div className="space-y-2">
          {collections.map(c => {
            const hasSpecificItems = c.requiredItems.length > 0
            return (
              <div key={c.id}
                className={`bg-[#0d0d1a] border rounded-lg p-3 ${c.active ? 'border-purple-900/20' : 'border-gray-800/40 opacity-60'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-200 font-mono">{c.name}</span>
                      <span className="text-xs text-gray-500 bg-gray-800 px-1.5 rounded">{c.itemType}</span>
                      {!c.active && <span className="text-xs text-red-500">Inactive</span>}
                      {hasSpecificItems && (
                        <span className="text-xs text-blue-400 bg-blue-900/20 px-1.5 rounded">Specific items</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>

                    {/* Required items chips */}
                    {hasSpecificItems && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {c.requiredItems.map((item, i) => (
                          <span key={i} className="text-xs bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">
                            {item}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-4 mt-1.5 text-xs text-gray-600 flex-wrap">
                      <span>Required: <span className="text-gray-400">{c.totalRequired}</span></span>
                      <span>Registered: <span className={c.totalRegistered >= c.totalRequired ? 'text-green-400' : 'text-gray-400'}>{c.totalRegistered}</span></span>
                      {c.bonusPerItemErPct > 0 && <span>+{c.bonusPerItemErPct}% ER/item</span>}
                      {c.completionErPct > 0 && <span>+{c.completionErPct}% ER complete</span>}
                      {c.completionPdPct > 0 && <span>-{c.completionPdPct}% PD complete</span>}
                      {c.completionSlots > 0 && <span>+{c.completionSlots} slots complete</span>}
                      {c.completionTitle && <span>Title: "{c.completionTitle}"</span>}
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
            )
          })}
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
