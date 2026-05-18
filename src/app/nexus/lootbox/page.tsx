'use client'

import { useEffect, useState } from 'react'

interface DropEntry {
  id: string
  dropType: string
  rarity: string | null
  minQuantity: number
  maxQuantity: number
  weight: number
  specificName: string | null
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
  dropEntries: DropEntry[]
}

const DROP_TYPES = [
  'PARTS_RANDOM','EQUIPMENT_RANDOM','BASE_UPGRADE_RANDOM','ROBOT_RANDOM',
  'REPAIR_KIT','PARTS_CRATE_FREE','SUPPLY_CRATE_FREE',
]
const RARITIES = ['','COMMON','UNCOMMON','RARE','EPIC','LEGENDARY']

export default function LootboxAdminPage() {
  const [configs, setConfigs] = useState<LootboxConfig[]>([])
  const [loading, setLoading]  = useState(true)
  const [msg, setMsg]          = useState('')
  const [editing, setEditing]  = useState<Record<string, Partial<DropEntry>>>({})
  const [newEntry, setNewEntry] = useState<Record<string, Partial<DropEntry>>>({})

  async function load() {
    setLoading(true)
    const r = await fetch('/api/admin/lootbox')
    setConfigs(await r.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function saveEntry(entry: Partial<DropEntry>) {
    setMsg('Saving entry…')
    const r = await fetch('/api/admin/lootbox', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    })
    if (r.ok) { setMsg('Saved'); setEditing({}); load() }
    else setMsg('Error')
  }

  async function deleteEntry(id: string) {
    if (!confirm('Delete this drop entry?')) return
    setMsg('Deleting…')
    await fetch('/api/admin/lootbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-entry', id }),
    })
    setMsg('Deleted')
    load()
  }

  async function addEntry(configId: string) {
    const entry = newEntry[configId]
    if (!entry?.dropType) { setMsg('Drop type required'); return }
    setMsg('Adding…')
    await fetch('/api/admin/lootbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add-entry',
        entry: { ...entry, lootboxConfigId: configId, rarity: entry.rarity || null },
      }),
    })
    setNewEntry(p => ({ ...p, [configId]: {} }))
    setMsg('Added')
    load()
  }

  async function updateConfig(config: LootboxConfig) {
    await fetch('/api/admin/lootbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-config', config }),
    })
    setMsg('Config saved')
    load()
  }

  if (loading) return <div className="p-6 text-gray-400">Loading…</div>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-purple-300 font-mono">Lootbox Drop Tables</h1>
      {msg && <p className="text-xs text-yellow-400 font-mono">{msg}</p>}

      {configs.map(cfg => (
        <div key={cfg.id} className="bg-[#0d0d1a] border border-purple-900/30 rounded-lg p-4 space-y-4">
          {/* Config header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-200">{cfg.name}</h2>
              <p className="text-xs text-gray-500">{cfg.lootboxType}</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1 text-gray-400 cursor-pointer">
                Price (CRATE):
                <input
                  type="number"
                  defaultValue={cfg.priceCrate}
                  onBlur={e => updateConfig({ ...cfg, priceCrate: parseFloat(e.target.value) })}
                  className="w-20 input-admin ml-1"
                  step="0.001"
                />
              </label>
              <label className="flex items-center gap-1 text-gray-400 cursor-pointer">
                Active:
                <input
                  type="checkbox"
                  checked={cfg.active}
                  onChange={e => updateConfig({ ...cfg, active: e.target.checked })}
                  className="ml-1"
                />
              </label>
            </div>
          </div>

          {/* Drop entries table */}
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left pb-1">Drop Type</th>
                <th className="text-left pb-1">Rarity</th>
                <th className="text-center pb-1">Min</th>
                <th className="text-center pb-1">Max</th>
                <th className="text-center pb-1">Weight</th>
                <th className="text-right pb-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cfg.dropEntries.map(entry => {
                const isEditing = !!editing[entry.id]
                const ed = editing[entry.id] ?? entry
                return (
                  <tr key={entry.id} className="border-b border-gray-900">
                    <td className="py-1">
                      {isEditing ? (
                        <select value={ed.dropType ?? entry.dropType}
                          onChange={e => setEditing(p => ({ ...p, [entry.id]: { ...p[entry.id], dropType: e.target.value } }))}
                          className="input-admin w-full">
                          {DROP_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      ) : <span className="text-gray-300">{entry.dropType}</span>}
                    </td>
                    <td className="py-1">
                      {isEditing ? (
                        <select value={ed.rarity ?? ''}
                          onChange={e => setEditing(p => ({ ...p, [entry.id]: { ...p[entry.id], rarity: e.target.value || null } }))}
                          className="input-admin w-24">
                          {RARITIES.map(r => <option key={r} value={r}>{r || '—'}</option>)}
                        </select>
                      ) : <span className="text-gray-400">{entry.rarity ?? '—'}</span>}
                    </td>
                    <td className="py-1 text-center">
                      {isEditing ? (
                        <input type="number" value={ed.minQuantity ?? entry.minQuantity}
                          onChange={e => setEditing(p => ({ ...p, [entry.id]: { ...p[entry.id], minQuantity: parseInt(e.target.value) } }))}
                          className="input-admin w-14 text-center" min={1} />
                      ) : <span className="text-gray-400">{entry.minQuantity}</span>}
                    </td>
                    <td className="py-1 text-center">
                      {isEditing ? (
                        <input type="number" value={ed.maxQuantity ?? entry.maxQuantity}
                          onChange={e => setEditing(p => ({ ...p, [entry.id]: { ...p[entry.id], maxQuantity: parseInt(e.target.value) } }))}
                          className="input-admin w-14 text-center" min={1} />
                      ) : <span className="text-gray-400">{entry.maxQuantity}</span>}
                    </td>
                    <td className="py-1 text-center">
                      {isEditing ? (
                        <input type="number" value={ed.weight ?? entry.weight}
                          onChange={e => setEditing(p => ({ ...p, [entry.id]: { ...p[entry.id], weight: parseFloat(e.target.value) } }))}
                          className="input-admin w-16 text-center" step="0.1" min={0} />
                      ) : <span className="text-gray-400">{entry.weight}</span>}
                    </td>
                    <td className="py-1 text-right">
                      <div className="flex gap-1 justify-end">
                        {isEditing ? (
                          <>
                            <button onClick={() => saveEntry({ id: entry.id, ...ed })}
                              className="px-2 py-0.5 text-xs bg-green-900/40 border border-green-700/40 text-green-300 rounded">Save</button>
                            <button onClick={() => setEditing(p => { const n = { ...p }; delete n[entry.id]; return n })}
                              className="px-2 py-0.5 text-xs bg-gray-800 border border-gray-700 text-gray-400 rounded">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setEditing(p => ({ ...p, [entry.id]: { ...entry } }))}
                              className="px-2 py-0.5 text-xs border border-gray-700 text-gray-400 rounded hover:bg-gray-800">Edit</button>
                            <button onClick={() => deleteEntry(entry.id)}
                              className="px-2 py-0.5 text-xs border border-red-900 text-red-400 rounded hover:bg-red-900/20">Del</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Add new entry */}
          <div className="border-t border-gray-800 pt-3">
            <p className="text-xs text-gray-500 mb-2">Add entry:</p>
            <div className="grid grid-cols-[1fr_1fr_80px_80px_80px_auto] gap-2 items-end">
              <select
                value={newEntry[cfg.id]?.dropType ?? ''}
                onChange={e => setNewEntry(p => ({ ...p, [cfg.id]: { ...p[cfg.id], dropType: e.target.value } }))}
                className="input-admin">
                <option value="">Drop type</option>
                {DROP_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <select
                value={newEntry[cfg.id]?.rarity ?? ''}
                onChange={e => setNewEntry(p => ({ ...p, [cfg.id]: { ...p[cfg.id], rarity: e.target.value || null } }))}
                className="input-admin">
                {RARITIES.map(r => <option key={r} value={r}>{r || 'No rarity'}</option>)}
              </select>
              <input type="number" placeholder="Min" min={1}
                value={newEntry[cfg.id]?.minQuantity ?? ''}
                onChange={e => setNewEntry(p => ({ ...p, [cfg.id]: { ...p[cfg.id], minQuantity: parseInt(e.target.value) } }))}
                className="input-admin" />
              <input type="number" placeholder="Max" min={1}
                value={newEntry[cfg.id]?.maxQuantity ?? ''}
                onChange={e => setNewEntry(p => ({ ...p, [cfg.id]: { ...p[cfg.id], maxQuantity: parseInt(e.target.value) } }))}
                className="input-admin" />
              <input type="number" placeholder="Weight" step="0.1" min={0}
                value={newEntry[cfg.id]?.weight ?? ''}
                onChange={e => setNewEntry(p => ({ ...p, [cfg.id]: { ...p[cfg.id], weight: parseFloat(e.target.value) } }))}
                className="input-admin" />
              <button onClick={() => addEntry(cfg.id)}
                className="px-3 py-1 text-xs bg-purple-800/50 border border-purple-700 text-purple-200 rounded hover:bg-purple-700/50">
                Add
              </button>
            </div>
          </div>
        </div>
      ))}

      <style jsx global>{`
        .input-admin {
          background: #111122;
          border: 1px solid #2d2d50;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 12px;
          color: #d1d5db;
          outline: none;
        }
        .input-admin:focus { border-color: #7c3aed; }
      `}</style>
    </div>
  )
}
