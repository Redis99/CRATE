'use client'

import { useEffect, useState } from 'react'

interface CodexCollection {
  id: string
  name: string
  description: string
  totalRequired: number
  requiredItems: string[]
  bonusPerItemErPct: number
  completionErPct: number
  completionPdPct: number
  completionSlots: number
  completionTitle: string | null
  active: boolean
  sortOrder: number
  totalRegistered: number
}

interface AvailableItem {
  name: string
  type: 'ROBOT' | 'EQUIPMENT' | 'BASE_UPGRADE'
  rarity?: string
}

const EMPTY: Omit<CodexCollection, 'id' | 'totalRegistered'> = {
  name: '', description: '', totalRequired: 3,
  requiredItems: [],
  bonusPerItemErPct: 0, completionErPct: 0, completionPdPct: 0,
  completionSlots: 0, completionTitle: null,
  active: true, sortOrder: 0,
}

const RARITY_COLOR: Record<string, string> = {
  COMMON: 'text-gray-400', UNCOMMON: 'text-green-400',
  RARE: 'text-blue-400', EPIC: 'text-purple-400', LEGENDARY: 'text-yellow-400',
}

export default function CodexAdminPage() {
  const [collections, setCollections] = useState<CodexCollection[]>([])
  const [loading, setLoading]         = useState(true)
  const [editing, setEditing]         = useState<typeof EMPTY & { id?: string } | null>(null)
  const [isNew, setIsNew]             = useState(false)
  const [msg, setMsg]                 = useState('')

  // All items available for picker
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([])
  const [itemsLoading, setItemsLoading]     = useState(false)

  // Item picker popup state
  const [pickerOpen, setPickerOpen]         = useState(false)
  const [pickerType, setPickerType]         = useState<'ALL' | 'ROBOT' | 'EQUIPMENT' | 'BASE_UPGRADE'>('ALL')
  const [pickerSearch, setPickerSearch]     = useState('')

  async function load() {
    setLoading(true)
    const r = await fetch('/api/admin/codex')
    const data = await r.json()
    setCollections(data.map((c: CodexCollection & { requiredItems: unknown }) => ({
      ...c,
      requiredItems: Array.isArray(c.requiredItems) ? c.requiredItems : [],
    })))
    setLoading(false)
  }

  async function loadItems() {
    if (availableItems.length > 0) return  // already loaded
    setItemsLoading(true)
    const [robotsData, equipData, upgradeData] = await Promise.all([
      fetch('/api/admin/robots').then(r => r.json()),
      fetch('/api/admin/items?category=equipment-specific').then(r => r.json()),
      fetch('/api/admin/items?category=base-upgrade-specific').then(r => r.json()),
    ])
    const robots: AvailableItem[]  = (robotsData.items ?? []).map((i: { metadata: { robotName: string }; rarity: string }) => ({ name: i.metadata.robotName, type: 'ROBOT' as const, rarity: i.rarity }))
    const equips: AvailableItem[]  = (equipData.items ?? []).map((i: { name: string; rarity: string }) => ({ name: i.name, type: 'EQUIPMENT' as const, rarity: i.rarity }))
    const upgrades: AvailableItem[] = (upgradeData.items ?? []).map((i: { name: string; rarity: string }) => ({ name: i.name, type: 'BASE_UPGRADE' as const, rarity: i.rarity }))
    setAvailableItems([...robots, ...equips, ...upgrades])
    setItemsLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() { setEditing({ ...EMPTY, requiredItems: [] }); setIsNew(true) }
  function openEdit(c: CodexCollection) { setEditing({ ...c, requiredItems: Array.isArray(c.requiredItems) ? c.requiredItems : [] }); setIsNew(false) }

  function openPicker() {
    setPickerOpen(true)
    setPickerSearch('')
    setPickerType('ALL')
    loadItems()
  }

  function toggleItem(name: string) {
    if (!editing) return
    const has = editing.requiredItems.includes(name)
    const items = has
      ? editing.requiredItems.filter(i => i !== name)
      : [...editing.requiredItems, name]
    setEditing(p => p ? { ...p, requiredItems: items, totalRequired: items.length > 0 ? items.length : p.totalRequired } : p)
  }

  async function save() {
    if (!editing) return
    setMsg('Saving…')
    // Remover campos computados que não existem no banco (totalRegistered)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, totalRegistered, ...fields } = editing as typeof editing & { totalRegistered?: number }
    const payload = {
      ...fields,
      ...(isNew ? {} : { id }),          // include id only for PUT
      totalRequired: editing.requiredItems.length > 0 ? editing.requiredItems.length : editing.totalRequired,
    }
    const r = await fetch('/api/admin/codex', {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (r.ok) { setMsg('Saved!'); setEditing(null); load() }
    else { const e = await r.json(); setMsg(`Error: ${e.error}`) }
  }

  async function toggleActive(c: CodexCollection) {
    await fetch('/api/admin/codex', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, active: !c.active }),
    })
    load()
  }

  async function del(id: string, name: string) {
    if (!confirm(`Delete collection "${name}"?`)) return
    const r = await fetch('/api/admin/codex', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (r.ok) { setMsg('Deleted'); load() }
  }

  // Filtered items for picker
  const pickerItems = availableItems.filter(i => {
    const typeOk = pickerType === 'ALL' || i.type === pickerType
    const searchOk = !pickerSearch || i.name.toLowerCase().includes(pickerSearch.toLowerCase())
    return typeOk && searchOk
  })

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
        Coleções são mistas — podem exigir robôs, equipamentos e melhorias de base ao mesmo tempo.
        <strong className="ml-1">requiredItems</strong> vazio = modo legado (aceita qualquer N itens da coleção).
      </p>

      {msg && <p className="text-xs text-yellow-400 font-mono">{msg}</p>}

      {/* ── Edit modal ───────────────────────────────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg p-5 w-full max-w-xl my-4 space-y-3">
            <h2 className="text-sm font-bold text-purple-300">{isNew ? 'New Collection' : 'Edit Collection'}</h2>

            <Field label="Name (collection tag)">
              <input value={editing.name ?? ''} onChange={e => setEditing(p => ({ ...p!, name: e.target.value }))}
                className="w-full input-admin font-mono" placeholder="e.g. Sentinel — Standard Series" />
            </Field>

            <Field label="Description">
              <textarea value={editing.description ?? ''} onChange={e => setEditing(p => ({ ...p!, description: e.target.value }))}
                rows={2} className="w-full input-admin" />
            </Field>

            {/* Required Items */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-gray-500">
                  Required Items{' '}
                  <span className="text-gray-600">
                    ({editing.requiredItems.length === 0
                      ? 'empty = legacy mode'
                      : `${editing.requiredItems.length} item${editing.requiredItems.length !== 1 ? 's' : ''} required`
                    })
                  </span>
                </label>
                <button type="button" onClick={openPicker}
                  className="px-2.5 py-1 text-xs bg-purple-800/50 border border-purple-700 text-purple-200 rounded hover:bg-purple-700/50 transition-colors">
                  + Add Item
                </button>
              </div>

              {editing.requiredItems.length === 0 ? (
                <p className="text-xs text-gray-600 italic py-1">No specific items — any {editing.totalRequired} items from this collection will count.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 p-2 bg-gray-900/30 rounded-lg border border-gray-800 min-h-[36px]">
                  {editing.requiredItems.map((name) => (
                    <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-900/40 border border-purple-700/40 text-purple-200">
                      {name}
                      <button onClick={() => toggleItem(name)}
                        className="text-purple-400 hover:text-red-400 ml-0.5 transition-colors leading-none">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* totalRequired only when list is empty */}
            {editing.requiredItems.length === 0 && (
              <Field label="Total Required (legacy mode)">
                <input type="number" min={1} value={editing.totalRequired ?? 3}
                  onChange={e => setEditing(p => ({ ...p!, totalRequired: parseInt(e.target.value) }))}
                  className="w-48 input-admin" />
              </Field>
            )}

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

      {/* ── Item Picker popup ─────────────────────────────────────────────────── */}
      {pickerOpen && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg w-full max-w-md flex flex-col" style={{ maxHeight: '80vh' }}>
            {/* Header */}
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-purple-300">Add Items to Collection</h3>
                <button onClick={() => setPickerOpen(false)}
                  className="text-gray-500 hover:text-gray-300 text-lg leading-none">×</button>
              </div>

              {/* Type filter */}
              <div className="flex gap-1 flex-wrap mb-2">
                {(['ALL', 'ROBOT', 'EQUIPMENT', 'BASE_UPGRADE'] as const).map(t => (
                  <button key={t} onClick={() => setPickerType(t)}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                      pickerType === t
                        ? 'bg-purple-800/60 border-purple-600 text-purple-200'
                        : 'border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}>
                    {t === 'BASE_UPGRADE' ? 'UPGRADE' : t}
                  </button>
                ))}
              </div>

              {/* Search */}
              <input value={pickerSearch} onChange={e => setPickerSearch(e.target.value)}
                placeholder="Search by name…"
                className="w-full px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded text-gray-200 placeholder-gray-600 outline-none focus:border-purple-700" />
            </div>

            {/* Item list */}
            <div className="overflow-y-auto flex-1 p-2">
              {itemsLoading ? (
                <p className="text-gray-400 text-xs p-3">Loading items…</p>
              ) : pickerItems.length === 0 ? (
                <p className="text-gray-600 text-xs p-3">No items found.</p>
              ) : (
                pickerItems.map(item => {
                  const selected = editing?.requiredItems.includes(item.name) ?? false
                  return (
                    <button key={`${item.type}-${item.name}`}
                      onClick={() => toggleItem(item.name)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 text-left transition-colors ${
                        selected
                          ? 'bg-purple-900/40 border border-purple-700/40'
                          : 'hover:bg-gray-800/50 border border-transparent'
                      }`}>
                      <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                        selected ? 'bg-purple-600 border-purple-500' : 'border-gray-600'
                      }`}>
                        {selected && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-200">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.rarity && (
                          <span className={`text-xs font-bold ${RARITY_COLOR[item.rarity] ?? 'text-gray-400'}`}>
                            {item.rarity}
                          </span>
                        )}
                        <span className="text-xs text-gray-600">
                          {item.type === 'BASE_UPGRADE' ? 'UPGRADE' : item.type}
                        </span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-800 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {editing?.requiredItems.length ?? 0} selected
              </span>
              <button onClick={() => setPickerOpen(false)}
                className="px-4 py-1.5 text-sm bg-purple-800/60 border border-purple-600 text-purple-200 rounded hover:bg-purple-700/60">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Collection list ───────────────────────────────────────────────────── */}
      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : (
        <div className="space-y-2">
          {collections.map(c => (
            <div key={c.id}
              className={`bg-[#0d0d1a] border rounded-lg p-3 ${c.active ? 'border-purple-900/20' : 'border-gray-800/40 opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-200 font-mono">{c.name}</span>
                    {!c.active && <span className="text-xs text-red-500">Inactive</span>}
                    {c.requiredItems.length > 0 && (
                      <span className="text-xs text-blue-400 bg-blue-900/20 px-1.5 rounded">
                        {c.requiredItems.length} specific items
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>

                  {c.requiredItems.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {c.requiredItems.map((item, i) => (
                        <span key={i} className="text-xs bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">{item}</span>
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
                    {c.completionTitle && <span>Title: &quot;{c.completionTitle}&quot;</span>}
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
