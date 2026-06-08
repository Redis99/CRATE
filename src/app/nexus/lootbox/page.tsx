'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface DropEntry {
  id: string
  dropType: string
  rarity: string | null
  specificName: string | null
  minQuantity: number
  maxQuantity: number
  weight: number
}

interface LootboxConfig {
  id: string
  lootboxType: string
  name: string
  description: string
  priceCrate: number
  weeklyLimit: number | null
  active: boolean
  seasonal: boolean
  startsAt: string | null
  endsAt: string | null
  openingWebpUrl: string | null
  openingRevealMs: number
  dropEntries: DropEntry[]
}

interface AvailableItem { name: string; type: string; rarity?: string }

// ── Constants ──────────────────────────────────────────────────────────────────

const DROP_TYPES = [
  'ROBOT_RANDOM','EQUIPMENT_RANDOM','BASE_UPGRADE_RANDOM',
  'PARTS_RANDOM','REPAIR_KIT','PARTS_CRATE_FREE','SUPPLY_CRATE_FREE',
  'ROBOT_SPECIFIC','EQUIPMENT_SPECIFIC','BASE_UPGRADE_SPECIFIC',
]
const RANDOM_TYPES = DROP_TYPES.filter(t => t.endsWith('_RANDOM') || t === 'PARTS_RANDOM' || t === 'REPAIR_KIT' || t.endsWith('_FREE'))
const SPECIFIC_TYPES = DROP_TYPES.filter(t => t.endsWith('_SPECIFIC'))
const RARITIES = ['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY']
const RARITY_COLOR: Record<string, string> = {
  COMMON: 'text-gray-400', UNCOMMON: 'text-green-400',
  RARE: 'text-blue-400', EPIC: 'text-purple-400', LEGENDARY: 'text-yellow-400',
}

const EMPTY_CONFIG: {
  lootboxType: string; name: string; description: string; priceCrate: number
  weeklyLimit: number | null; active: boolean; seasonal: boolean
  startsAt: string | null; endsAt: string | null
} = {
  lootboxType: 'CUSTOM_EVENT',
  name: '', description: '', priceCrate: 1,
  weeklyLimit: null, active: false, seasonal: false,
  startsAt: null, endsAt: null,
}

const EMPTY_ENTRY: Partial<DropEntry> = {
  dropType: 'ROBOT_RANDOM', rarity: 'COMMON', specificName: null,
  minQuantity: 1, maxQuantity: 1, weight: 1,
}

function totalWeight(entries: DropEntry[]) {
  return entries.reduce((s, e) => s + e.weight, 0)
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function LootboxAdminPage() {
  const [configs, setConfigs]         = useState<LootboxConfig[]>([])
  const [loading, setLoading]         = useState(true)
  const [msg, setMsg]                 = useState('')

  // Which lootbox is open in the editor modal
  const [selected, setSelected]       = useState<LootboxConfig | null>(null)

  // New lootbox modal
  const [newCfgOpen, setNewCfgOpen]   = useState(false)
  const [newCfg, setNewCfg]           = useState({ ...EMPTY_CONFIG })

  // Entry being edited inside the modal
  const [editEntry, setEditEntry]     = useState<Record<string, Partial<DropEntry>>>({})
  const [addForm, setAddForm]         = useState<Partial<DropEntry>>({ ...EMPTY_ENTRY })

  // Specific item picker
  const [pickerOpen, setPickerOpen]   = useState(false)
  const [pickerFor, setPickerFor]     = useState<'add' | string>('add') // 'add' | entryId
  const [availItems, setAvailItems]   = useState<AvailableItem[]>([])
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerType, setPickerType]   = useState<'ALL'|'ROBOT'|'EQUIPMENT'|'BASE_UPGRADE'>('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/admin/lootbox')
    setConfigs(await r.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Reload selected config after changes
  async function reloadAndSync() {
    const r = await fetch('/api/admin/lootbox')
    const data: LootboxConfig[] = await r.json()
    setConfigs(data)
    if (selected) setSelected(data.find(c => c.id === selected.id) ?? null)
  }

  // ── Item picker ──────────────────────────────────────────────────────────────

  async function openPicker(forId: 'add' | string) {
    setPickerFor(forId)
    setPickerSearch('')
    setPickerType('ALL')
    setPickerOpen(true)
    if (availItems.length === 0) {
      const [rd, ed, ud] = await Promise.all([
        fetch('/api/admin/robots').then(r => r.json()),
        fetch('/api/admin/items?category=equipment-specific').then(r => r.json()),
        fetch('/api/admin/items?category=base-upgrade-specific').then(r => r.json()),
      ])
      setAvailItems([
        ...(rd.items ?? []).map((i: { metadata: { robotName: string }; rarity: string }) => ({ name: i.metadata.robotName, type: 'ROBOT', rarity: i.rarity })),
        ...(ed.items ?? []).map((i: { name: string; rarity: string }) => ({ name: i.name, type: 'EQUIPMENT', rarity: i.rarity })),
        ...(ud.items ?? []).map((i: { name: string; rarity: string }) => ({ name: i.name, type: 'BASE_UPGRADE', rarity: i.rarity })),
      ])
    }
  }

  function selectSpecificItem(item: AvailableItem) {
    const dropType = item.type === 'ROBOT' ? 'ROBOT_SPECIFIC' : item.type === 'EQUIPMENT' ? 'EQUIPMENT_SPECIFIC' : 'BASE_UPGRADE_SPECIFIC'
    if (pickerFor === 'add') {
      setAddForm(p => ({ ...p, dropType, specificName: item.name, rarity: null }))
    } else {
      setEditEntry(p => ({ ...p, [pickerFor]: { ...p[pickerFor], dropType, specificName: item.name, rarity: null } }))
    }
    setPickerOpen(false)
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────

  async function createConfig() {
    setMsg('Creating…')
    await fetch('/api/admin/lootbox', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create-config', config: newCfg }),
    })
    setNewCfgOpen(false)
    setNewCfg({ ...EMPTY_CONFIG })
    setMsg('Lootbox created!')
    load()
  }

  async function saveConfig() {
    if (!selected) return
    setMsg('Saving…')
    await fetch('/api/admin/lootbox', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-config', config: selected }),
    })
    setMsg('Saved')
    reloadAndSync()
  }

  async function deleteConfig(id: string, name: string) {
    if (!confirm(`Delete lootbox "${name}" and all its drop entries?`)) return
    setMsg('Deleting…')
    await fetch('/api/admin/lootbox', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-config', id }),
    })
    setSelected(null)
    setMsg('Deleted')
    load()
  }

  async function saveEntry(id: string) {
    const data = editEntry[id]
    await fetch('/api/admin/lootbox', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    })
    setEditEntry(p => { const n = { ...p }; delete n[id]; return n })
    reloadAndSync()
  }

  async function addEntry() {
    if (!selected || !addForm.dropType) return
    setMsg('Adding…')
    await fetch('/api/admin/lootbox', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add-entry', entry: { ...addForm, lootboxConfigId: selected.id } }),
    })
    setAddForm({ ...EMPTY_ENTRY })
    setMsg('Added')
    reloadAndSync()
  }

  async function removeEntry(id: string) {
    if (!confirm('Remove this drop entry?')) return
    await fetch('/api/admin/lootbox', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-entry', id }),
    })
    reloadAndSync()
  }

  const isSpecific = (dt: string) => dt.endsWith('_SPECIFIC')

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-purple-300 font-mono">Lootboxes</h1>
        <button onClick={() => setNewCfgOpen(true)}
          className="px-3 py-1.5 text-xs bg-purple-800/60 border border-purple-600 text-purple-200 rounded hover:bg-purple-700/60">
          + New Lootbox
        </button>
      </div>

      {msg && <p className="text-xs font-mono text-yellow-400">{msg}</p>}

      {/* Compact card grid */}
      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {configs.map(cfg => {
            const total = totalWeight(cfg.dropEntries)
            return (
              <div key={cfg.id}
                className={`bg-[#0d0d1a] border rounded-lg p-4 flex flex-col gap-2 ${cfg.active ? 'border-purple-900/30' : 'border-gray-800/40 opacity-70'}`}>
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-200">{cfg.name}</span>
                      {cfg.seasonal && <span className="text-xs bg-yellow-900/30 text-yellow-400 px-1.5 rounded">Seasonal</span>}
                      {cfg.active
                        ? <span className="text-xs bg-green-900/30 text-green-400 px-1.5 rounded">Active</span>
                        : <span className="text-xs bg-gray-800 text-gray-500 px-1.5 rounded">Inactive</span>}
                    </div>
                    <p className="text-xs text-gray-600 font-mono mt-0.5">{cfg.lootboxType}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-purple-300">{cfg.priceCrate} CRATE</p>
                    {cfg.weeklyLimit && <p className="text-xs text-gray-600">Limit: {cfg.weeklyLimit}/week</p>}
                  </div>
                </div>

                {/* Stats bar */}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{cfg.dropEntries.length} entries</span>
                  <span>·</span>
                  <span>Σ weight {total.toFixed(1)}</span>
                  {cfg.seasonal && cfg.startsAt && (
                    <>
                      <span>·</span>
                      <span>{new Date(cfg.startsAt).toLocaleDateString()} – {cfg.endsAt ? new Date(cfg.endsAt).toLocaleDateString() : '∞'}</span>
                    </>
                  )}
                </div>

                {/* Entry preview — top 3 by weight */}
                <div className="space-y-0.5">
                  {[...cfg.dropEntries].sort((a,b) => b.weight - a.weight).slice(0,3).map(e => (
                    <div key={e.id} className="flex items-center justify-between text-xs text-gray-600">
                      <span className="truncate">
                        {e.specificName
                          ? <span className="text-blue-400">{e.specificName}</span>
                          : <>{e.rarity && <span className={`${RARITY_COLOR[e.rarity]} mr-1`}>{e.rarity}</span>}{e.dropType}</>
                        }
                      </span>
                      <span className="shrink-0 ml-2 text-gray-700">
                        {total > 0 ? ((e.weight / total) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  ))}
                  {cfg.dropEntries.length > 3 && (
                    <p className="text-xs text-gray-700">+{cfg.dropEntries.length - 3} more…</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 mt-1">
                  <button onClick={() => { setSelected(cfg); setEditEntry({}) }}
                    className="flex-1 px-3 py-1.5 text-xs bg-purple-800/40 border border-purple-700/40 text-purple-200 rounded hover:bg-purple-700/40 transition-colors">
                    Edit
                  </button>
                  <button onClick={() => deleteConfig(cfg.id, cfg.name)}
                    className="px-3 py-1.5 text-xs border border-red-900/60 text-red-400 rounded hover:bg-red-900/20 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── New Lootbox Modal ──────────────────────────────────────────────────── */}
      {newCfgOpen && (
        <Modal title="New Lootbox" onClose={() => setNewCfgOpen(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <F label="Name"><input value={newCfg.name} className="w-full ia" placeholder="e.g. Solar Storm Crate"
                onChange={e => setNewCfg(p => ({ ...p, name: e.target.value }))} /></F>
              <F label="Type (ID)"><input value={newCfg.lootboxType} className="w-full ia" placeholder="SOLAR_STORM"
                onChange={e => setNewCfg(p => ({ ...p, lootboxType: e.target.value.toUpperCase().replace(/\s/g,'_') }))} /></F>
            </div>
            <F label="Description"><textarea value={newCfg.description} rows={2} className="w-full ia"
              onChange={e => setNewCfg(p => ({ ...p, description: e.target.value }))} /></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Price (CRATE)"><input type="number" step="0.001" value={newCfg.priceCrate} className="w-full ia"
                onChange={e => setNewCfg(p => ({ ...p, priceCrate: parseFloat(e.target.value) }))} /></F>
              <F label="Weekly Limit"><input type="number" min={0} value={newCfg.weeklyLimit ?? ''} className="w-full ia"
                placeholder="Empty = unlimited"
                onChange={e => setNewCfg(p => ({ ...p, weeklyLimit: e.target.value ? parseInt(e.target.value) : null }))} /></F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Seasonal?">
                <select value={newCfg.seasonal ? 'yes' : 'no'} className="w-full ia"
                  onChange={e => setNewCfg(p => ({ ...p, seasonal: e.target.value === 'yes' }))}>
                  <option value="no">No</option><option value="yes">Yes</option>
                </select>
              </F>
              <F label="Active?">
                <select value={newCfg.active ? 'yes' : 'no'} className="w-full ia"
                  onChange={e => setNewCfg(p => ({ ...p, active: e.target.value === 'yes' }))}>
                  <option value="no">No (draft)</option><option value="yes">Yes</option>
                </select>
              </F>
            </div>
            {newCfg.seasonal && (
              <div className="grid grid-cols-2 gap-3">
                <F label="Starts At"><input type="datetime-local" className="w-full ia"
                  value={newCfg.startsAt?.slice(0,16) ?? ''}
                  onChange={e => setNewCfg(p => ({ ...p, startsAt: e.target.value ? new Date(e.target.value).toISOString() : null }))} /></F>
                <F label="Ends At"><input type="datetime-local" className="w-full ia"
                  value={newCfg.endsAt?.slice(0,16) ?? ''}
                  onChange={e => setNewCfg(p => ({ ...p, endsAt: e.target.value ? new Date(e.target.value).toISOString() : null }))} /></F>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Btn onClick={createConfig}>Create</Btn>
              <Btn secondary onClick={() => setNewCfgOpen(false)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit Lootbox Modal ─────────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg w-full max-w-3xl my-4 space-y-0 overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div>
                <h2 className="text-sm font-bold text-purple-300">{selected.name}</h2>
                <p className="text-xs text-gray-600 font-mono">{selected.lootboxType}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-300 text-lg">×</button>
            </div>

            {/* Config fields */}
            <div className="px-5 py-3 border-b border-gray-800 grid grid-cols-2 md:grid-cols-4 gap-3">
              <F label="Price (CRATE)">
                <input type="number" step="0.001" value={selected.priceCrate} className="w-full ia"
                  onChange={e => setSelected(p => p && ({ ...p, priceCrate: parseFloat(e.target.value) }))} />
              </F>
              <F label="Weekly Limit">
                <input type="number" value={selected.weeklyLimit ?? ''} className="w-full ia" placeholder="Unlimited"
                  onChange={e => setSelected(p => p && ({ ...p, weeklyLimit: e.target.value ? parseInt(e.target.value) : null }))} />
              </F>
              <F label="Active">
                <select value={selected.active ? 'yes' : 'no'} className="w-full ia"
                  onChange={e => setSelected(p => p && ({ ...p, active: e.target.value === 'yes' }))}>
                  <option value="no">No</option><option value="yes">Yes</option>
                </select>
              </F>
              <F label="Seasonal">
                <select value={selected.seasonal ? 'yes' : 'no'} className="w-full ia"
                  onChange={e => setSelected(p => p && ({ ...p, seasonal: e.target.value === 'yes' }))}>
                  <option value="no">No</option><option value="yes">Yes</option>
                </select>
              </F>
              {selected.seasonal && (
                <>
                  <F label="Starts At">
                    <input type="datetime-local" className="w-full ia"
                      value={selected.startsAt?.slice(0,16) ?? ''}
                      onChange={e => setSelected(p => p && ({ ...p, startsAt: e.target.value ? new Date(e.target.value).toISOString() : null }))} />
                  </F>
                  <F label="Ends At">
                    <input type="datetime-local" className="w-full ia"
                      value={selected.endsAt?.slice(0,16) ?? ''}
                      onChange={e => setSelected(p => p && ({ ...p, endsAt: e.target.value ? new Date(e.target.value).toISOString() : null }))} />
                  </F>
                </>
              )}

              {/* Opening animation — admin-managed clip + fallback notice */}
              <div className="col-span-full">
                <OpeningAnimationEditor
                  lootboxType={selected.lootboxType}
                  webpUrl={selected.openingWebpUrl}
                  revealMs={selected.openingRevealMs}
                  onChange={(webpUrl, revealMs) =>
                    setSelected(p => p && ({ ...p, openingWebpUrl: webpUrl, openingRevealMs: revealMs }))
                  }
                />
              </div>

              <div className="col-span-full flex justify-end">
                <Btn onClick={saveConfig}>Save config</Btn>
              </div>
            </div>

            {/* Drop entries */}
            <div className="px-5 py-3 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Drop Table</span>
                <span className="text-xs text-gray-600">
                  Σ {totalWeight(selected.dropEntries).toFixed(1)} weight
                </span>
              </div>

              {selected.dropEntries.map(entry => {
                const ed = editEntry[entry.id]
                const isEd = !!ed
                const cur = { ...entry, ...ed }
                const specific = isSpecific(cur.dropType ?? entry.dropType)
                const pct = totalWeight(selected.dropEntries) > 0
                  ? ((entry.weight / totalWeight(selected.dropEntries)) * 100).toFixed(1)
                  : '0'

                return (
                  <div key={entry.id} className="bg-gray-900/30 border border-gray-800 rounded-lg p-2.5">
                    {isEd ? (
                      /* Editing row */
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <F label="Drop Type">
                            <select value={cur.dropType} className="w-full ia"
                              onChange={e => setEditEntry(p => ({ ...p, [entry.id]: { ...p[entry.id], dropType: e.target.value, specificName: null, rarity: null } }))}>
                              <optgroup label="Random">
                                {RANDOM_TYPES.map(t => <option key={t}>{t}</option>)}
                              </optgroup>
                              <optgroup label="Specific Item">
                                {SPECIFIC_TYPES.map(t => <option key={t}>{t}</option>)}
                              </optgroup>
                            </select>
                          </F>
                          {specific ? (
                            <F label="Specific Item">
                              <div className="flex gap-1">
                                <input value={cur.specificName ?? ''} className="flex-1 ia" placeholder="Item name"
                                  onChange={e => setEditEntry(p => ({ ...p, [entry.id]: { ...p[entry.id], specificName: e.target.value } }))} />
                                <button onClick={() => openPicker(entry.id)}
                                  className="px-2 text-xs border border-purple-700 text-purple-400 rounded hover:bg-purple-900/20">⋯</button>
                              </div>
                            </F>
                          ) : (
                            <F label="Rarity">
                              <select value={cur.rarity ?? ''} className="w-full ia"
                                onChange={e => setEditEntry(p => ({ ...p, [entry.id]: { ...p[entry.id], rarity: e.target.value || null } }))}>
                                <option value="">— Any —</option>
                                {RARITIES.map(r => <option key={r}>{r}</option>)}
                              </select>
                            </F>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <F label="Min Qty"><input type="number" min={1} value={cur.minQuantity} className="w-full ia"
                            onChange={e => setEditEntry(p => ({ ...p, [entry.id]: { ...p[entry.id], minQuantity: parseInt(e.target.value) } }))} /></F>
                          <F label="Max Qty"><input type="number" min={1} value={cur.maxQuantity} className="w-full ia"
                            onChange={e => setEditEntry(p => ({ ...p, [entry.id]: { ...p[entry.id], maxQuantity: parseInt(e.target.value) } }))} /></F>
                          <F label="Weight"><input type="number" step="0.1" min={0} value={cur.weight} className="w-full ia"
                            onChange={e => setEditEntry(p => ({ ...p, [entry.id]: { ...p[entry.id], weight: parseFloat(e.target.value) } }))} /></F>
                        </div>
                        <div className="flex gap-1.5">
                          <Btn onClick={() => saveEntry(entry.id)}>Save</Btn>
                          <Btn secondary onClick={() => setEditEntry(p => { const n={...p}; delete n[entry.id]; return n })}>Cancel</Btn>
                        </div>
                      </div>
                    ) : (
                      /* Read row */
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            {entry.specificName
                              ? <span className="text-blue-400 font-medium">{entry.specificName}</span>
                              : <>
                                  {entry.rarity && <span className={`font-bold ${RARITY_COLOR[entry.rarity]}`}>{entry.rarity}</span>}
                                  <span className="text-gray-400">{entry.dropType}</span>
                                </>
                            }
                            <span className="text-gray-700">×{entry.minQuantity}{entry.minQuantity !== entry.maxQuantity ? `–${entry.maxQuantity}` : ''}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-xs">
                          <span className="text-gray-500">w {entry.weight}</span>
                          <span className="text-gray-700">{pct}%</span>
                          <button onClick={() => setEditEntry(p => ({ ...p, [entry.id]: { ...entry } }))}
                            className="px-2 py-0.5 border border-gray-700 text-gray-400 rounded hover:bg-gray-800">Edit</button>
                          <button onClick={() => removeEntry(entry.id)}
                            className="px-2 py-0.5 border border-red-900/60 text-red-400 rounded hover:bg-red-900/20">×</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Add entry form */}
              <div className="bg-purple-900/10 border border-purple-900/30 rounded-lg p-3 space-y-2">
                <p className="text-xs text-gray-500 font-semibold">New Entry</p>
                <div className="grid grid-cols-2 gap-2">
                  <F label="Drop Type">
                    <select value={addForm.dropType ?? ''} className="w-full ia"
                      onChange={e => setAddForm(p => ({ ...p, dropType: e.target.value, specificName: null, rarity: null }))}>
                      <optgroup label="Random">
                        {RANDOM_TYPES.map(t => <option key={t}>{t}</option>)}
                      </optgroup>
                      <optgroup label="Specific Item">
                        {SPECIFIC_TYPES.map(t => <option key={t}>{t}</option>)}
                      </optgroup>
                    </select>
                  </F>
                  {isSpecific(addForm.dropType ?? '') ? (
                    <F label="Specific Item">
                      <div className="flex gap-1">
                        <input value={addForm.specificName ?? ''} className="flex-1 ia" placeholder="Item name"
                          onChange={e => setAddForm(p => ({ ...p, specificName: e.target.value }))} />
                        <button onClick={() => openPicker('add')}
                          className="px-2 text-xs border border-purple-700 text-purple-400 rounded hover:bg-purple-900/20">⋯</button>
                      </div>
                    </F>
                  ) : (
                    <F label="Rarity">
                      <select value={addForm.rarity ?? ''} className="w-full ia"
                        onChange={e => setAddForm(p => ({ ...p, rarity: e.target.value || null }))}>
                        <option value="">— Any —</option>
                        {RARITIES.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </F>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <F label="Min Qty"><input type="number" min={1} value={addForm.minQuantity ?? 1} className="w-full ia"
                    onChange={e => setAddForm(p => ({ ...p, minQuantity: parseInt(e.target.value) }))} /></F>
                  <F label="Max Qty"><input type="number" min={1} value={addForm.maxQuantity ?? 1} className="w-full ia"
                    onChange={e => setAddForm(p => ({ ...p, maxQuantity: parseInt(e.target.value) }))} /></F>
                  <F label="Weight"><input type="number" step="0.1" min={0} value={addForm.weight ?? 1} className="w-full ia"
                    onChange={e => setAddForm(p => ({ ...p, weight: parseFloat(e.target.value) }))} /></F>
                </div>
                <Btn onClick={addEntry}>Add Entry</Btn>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-gray-800 flex justify-end">
              <Btn secondary onClick={() => setSelected(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Item Picker ────────────────────────────────────────────────────────── */}
      {pickerOpen && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg w-full max-w-sm flex flex-col" style={{ maxHeight: '70vh' }}>
            <div className="p-3 border-b border-gray-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-purple-300">Pick Item</span>
                <button onClick={() => setPickerOpen(false)} className="text-gray-500 hover:text-gray-300">×</button>
              </div>
              <div className="flex gap-1 flex-wrap">
                {(['ALL','ROBOT','EQUIPMENT','BASE_UPGRADE'] as const).map(t => (
                  <button key={t} onClick={() => setPickerType(t)}
                    className={`px-2 py-0.5 text-xs rounded border transition-colors ${pickerType === t ? 'bg-purple-800/60 border-purple-600 text-purple-200' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}>
                    {t === 'BASE_UPGRADE' ? 'UPGRADE' : t}
                  </button>
                ))}
              </div>
              <input value={pickerSearch} onChange={e => setPickerSearch(e.target.value)}
                placeholder="Search…" className="w-full px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded text-gray-200 placeholder-gray-600 outline-none focus:border-purple-700" />
            </div>
            <div className="overflow-y-auto flex-1">
              {availItems
                .filter(i => (pickerType === 'ALL' || i.type === pickerType) && (!pickerSearch || i.name.toLowerCase().includes(pickerSearch.toLowerCase())))
                .map(i => (
                  <button key={`${i.type}-${i.name}`} onClick={() => selectSpecificItem(i)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-purple-900/20 transition-colors">
                    <span className="flex-1 text-sm text-gray-200">{i.name}</span>
                    {i.rarity && <span className={`text-xs font-bold ${RARITY_COLOR[i.rarity] ?? 'text-gray-400'}`}>{i.rarity}</span>}
                    <span className="text-xs text-gray-600">{i.type === 'BASE_UPGRADE' ? 'UPG' : i.type.slice(0,3)}</span>
                  </button>
                ))
              }
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .ia { background:#111122;border:1px solid #2d2d50;border-radius:4px;padding:4px 8px;font-size:12px;color:#d1d5db;outline:none; }
        .ia:focus { border-color:#7c3aed; }
      `}</style>
    </div>
  )
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs text-gray-500 mb-1">{label}</label>{children}</div>
}

function Btn({ onClick, secondary, children }: { onClick: () => void; secondary?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 text-xs rounded border transition-colors ${secondary ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'bg-purple-800/60 border-purple-600 text-purple-200 hover:bg-purple-700/60'}`}>
      {children}
    </button>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg p-5 w-full max-w-lg my-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-purple-300">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Opening Animation Editor ─────────────────────────────────────────────────
// Lets the admin attach a custom WebP/GIF "crate falling + opening" clip per
// lootbox, and tune when (in ms) the box visually opens so the rarity-colored
// glow burst stays in sync with it.
//
// IMPORTANT: this is entirely OPTIONAL. When no clip is attached, the game uses
// a universal built-in animation (no asset required) — so lootboxes look and
// work fine before any custom visuals exist. This is the system-wide pattern:
// every place that needs custom media degrades gracefully to a generic,
// always-available fallback when nothing has been uploaded yet.

interface OpeningAnimationEditorProps {
  lootboxType: string
  webpUrl:     string | null
  revealMs:    number
  onChange:    (webpUrl: string | null, revealMs: number) => void
}

function OpeningAnimationEditor({ lootboxType, webpUrl, revealMs, onChange }: OpeningAnimationEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    const body = new FormData()
    body.append('file', file)
    body.append('category', 'lootbox-opening')
    body.append('key', lootboxType)
    body.append('field', 'image')

    const r = await fetch('/api/admin/item-visuals/upload', { method: 'POST', body })
    const data = await r.json()

    if (!r.ok) {
      setError(data.error ?? 'Upload failed.')
    } else {
      onChange(data.url, revealMs)
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
          Opening Animation
        </span>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full border ${
            webpUrl
              ? 'text-emerald-400 border-emerald-700/50 bg-emerald-900/20'
              : 'text-gray-500 border-gray-700 bg-gray-800/40'
          }`}
        >
          {webpUrl ? 'Custom clip active' : 'Using built-in fallback'}
        </span>
      </div>

      {/* Instructions — always visible so admins know exactly what to send */}
      <div className="text-[11px] text-gray-500 leading-relaxed space-y-1 bg-black/20 rounded-md p-2.5 border border-gray-800/60">
        <p className="text-gray-400 font-medium">What to upload:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Animated <span className="text-gray-300">WebP</span> or <span className="text-gray-300">GIF</span>, square-ish, recommended ~512×512px</li>
          <li>Should show the crate <span className="text-gray-300">falling in and opening</span> — the engine overlays the rarity glow/particles/label on top, you don&apos;t need to bake those in</li>
          <li>Keep it short (~1–2s) and loop-free — it plays once per opening</li>
          <li>Max 5MB. Transparent background recommended (WebP) for best blending</li>
        </ul>
        <p className="text-gray-400 font-medium pt-1">Glow timing:</p>
        <p>
          Set <span className="text-gray-300">&quot;Glow at&quot;</span> to the moment (in ms from the start of the
          clip) where the lid visually opens — that&apos;s when the rarity-colored burst fires, synced to your clip.
          The reveal waits for whichever comes later: this timing or the server response, so it never feels rushed.
        </p>
        <p className="pt-1 text-gray-600 italic">
          Leave this empty and the game automatically uses the built-in generic crate animation —
          fully functional, no asset needed. You can add a custom clip any time without code changes.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {/* URL + upload */}
        <div className="flex-1 space-y-1.5">
          <label className="block text-[11px] text-gray-500">Clip URL (WebP/GIF)</label>
          <div className="flex gap-2">
            <input
              value={webpUrl ?? ''}
              onChange={(e) => onChange(e.target.value || null, revealMs)}
              placeholder="https://… or upload →"
              className="flex-1 bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 placeholder-gray-600"
            />
            <input ref={inputRef} type="file" accept="image/webp,image/gif" className="hidden" onChange={handleFile} />
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-200 rounded-lg transition-colors whitespace-nowrap"
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            {webpUrl && (
              <button
                type="button"
                onClick={() => onChange(null, revealMs)}
                className="px-2.5 py-1.5 text-xs border border-red-900/50 text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                title="Remove clip — falls back to the built-in animation"
              >
                Clear
              </button>
            )}
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        {/* Reveal timing */}
        <div className="sm:w-44 space-y-1.5">
          <label className="block text-[11px] text-gray-500">
            Glow at <span className="text-gray-300 font-mono">{revealMs}ms</span>
          </label>
          <input
            type="range" min={200} max={3000} step={50}
            value={revealMs}
            disabled={!webpUrl}
            onChange={(e) => onChange(webpUrl, parseInt(e.target.value))}
            className="w-full accent-purple-500 disabled:opacity-30"
          />
          <input
            type="number" min={0} step={50}
            value={revealMs}
            disabled={!webpUrl}
            onChange={(e) => onChange(webpUrl, parseInt(e.target.value) || 0)}
            className="w-full ia text-xs disabled:opacity-30"
          />
        </div>
      </div>

      {/* Preview thumbnail */}
      {webpUrl && (
        <div className="flex items-center gap-3 pt-1">
          <div className="w-16 h-16 rounded-md overflow-hidden border border-gray-700 bg-black/30 flex items-center justify-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={webpUrl} alt="" className="w-full h-full object-contain" />
          </div>
          <p className="text-[11px] text-gray-600 break-all">{webpUrl}</p>
        </div>
      )}
    </div>
  )
}
