'use client'

import { useEffect, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  sortOrder: number
  active: boolean
  seasonal: boolean
  dropEntries: DropEntry[]
}

// ─── Opções dos selects — espelham os enums do schema ─────────────────────────

// LootboxDropType enum: ROBOT | EQUIPMENT | BASE_UPGRADE | PART | CONSUMABLE
const DROP_TYPES = ['ROBOT', 'EQUIPMENT', 'BASE_UPGRADE', 'PART', 'CONSUMABLE']

// Rarity enum: COMMON | UNCOMMON | RARE | EPIC | LEGENDARY
const RARITIES = ['', 'COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Calcula o % de chance de cada entrada */
function entryChance(entry: DropEntry, allEntries: DropEntry[]): string {
  const total = allEntries.reduce((s, e) => s + e.weight, 0)
  if (total === 0) return '0%'
  return `${((entry.weight / total) * 100).toFixed(1).replace(/\.0$/, '')}%`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LootboxAdminPage() {
  const [configs, setConfigs] = useState<LootboxConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg]         = useState('')
  const [editing, setEditing] = useState<Record<string, Partial<DropEntry>>>({})
  const [newEntry, setNewEntry] = useState<Record<string, Partial<DropEntry>>>({})

  async function load() {
    setLoading(true)
    const r = await fetch('/api/admin/lootbox')
    if (r.ok) setConfigs(await r.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Drop entry actions ───────────────────────────────────────────────────

  async function saveEntry(entry: Partial<DropEntry>) {
    setMsg('Saving…')
    const r = await fetch('/api/admin/lootbox', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    })
    if (r.ok) { setMsg('✓ Entry saved'); setEditing({}); load() }
    else setMsg('✗ Error saving entry')
  }

  async function deleteEntry(id: string) {
    if (!confirm('Delete this drop entry?')) return
    setMsg('Deleting…')
    await fetch('/api/admin/lootbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-entry', id }),
    })
    setMsg('✓ Deleted')
    load()
  }

  async function addEntry(configId: string) {
    const entry = newEntry[configId]
    if (!entry?.dropType) { setMsg('✗ Drop type required'); return }
    if (!entry.weight || entry.weight <= 0) { setMsg('✗ Weight must be > 0'); return }
    setMsg('Adding…')
    const r = await fetch('/api/admin/lootbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add-entry',
        entry: {
          ...entry,
          lootboxConfigId: configId,
          rarity:      entry.rarity      || null,
          specificName: entry.specificName || null,
          minQuantity: entry.minQuantity  ?? 1,
          maxQuantity: entry.maxQuantity  ?? 1,
        },
      }),
    })
    if (r.ok) {
      setNewEntry((p) => ({ ...p, [configId]: {} }))
      setMsg('✓ Entry added')
      load()
    } else setMsg('✗ Error adding entry')
  }

  // ── Config actions ───────────────────────────────────────────────────────

  async function updateConfig(config: LootboxConfig) {
    setMsg('Saving config…')
    const r = await fetch('/api/admin/lootbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-config', config }),
    })
    if (r.ok) setMsg('✓ Config saved')
    else setMsg('✗ Error saving config')
    load()
  }

  // ────────────────────────────────────────────────────────────────────────

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading…</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-purple-300 font-mono">Lootbox Drop Tables</h1>
        <p className="text-xs text-gray-600">{configs.length} configs • sorted by sortOrder</p>
      </div>

      {msg && (
        <p className={`text-xs font-mono px-3 py-2 rounded border ${
          msg.startsWith('✓') ? 'text-green-400 border-green-900/40 bg-green-900/10'
            : msg.startsWith('✗') ? 'text-red-400 border-red-900/40 bg-red-900/10'
            : 'text-yellow-400 border-yellow-900/40'
        }`}>
          {msg}
        </p>
      )}

      {configs.map((cfg) => (
        <div key={cfg.id} className="bg-[#0d0d1a] border border-purple-900/30 rounded-lg p-4 space-y-4">

          {/* ── Config Header ── */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-gray-200">{cfg.name}</h2>
              <p className="text-xs text-gray-600 font-mono">{cfg.lootboxType}</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap text-xs text-gray-400">
              {/* Price */}
              <label className="flex items-center gap-1">
                Price (CRATE)
                <input
                  type="number" step="0.001" min={0}
                  defaultValue={cfg.priceCrate}
                  onBlur={(e) => updateConfig({ ...cfg, priceCrate: parseFloat(e.target.value) || 0 })}
                  className="input-admin w-24 ml-1"
                />
              </label>

              {/* Weekly limit */}
              <label className="flex items-center gap-1">
                Weekly limit
                <input
                  type="number" min={0} placeholder="∞"
                  defaultValue={cfg.weeklyLimit ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    updateConfig({ ...cfg, weeklyLimit: v === '' ? null : parseInt(v) })
                  }}
                  className="input-admin w-16 ml-1"
                />
              </label>

              {/* Sort order */}
              <label className="flex items-center gap-1">
                Sort order
                <input
                  type="number" min={0}
                  defaultValue={cfg.sortOrder}
                  onBlur={(e) => updateConfig({ ...cfg, sortOrder: parseInt(e.target.value) || 0 })}
                  className="input-admin w-16 ml-1"
                />
              </label>

              {/* Active toggle */}
              <label className="flex items-center gap-1 cursor-pointer">
                Active
                <input
                  type="checkbox"
                  checked={cfg.active}
                  onChange={(e) => updateConfig({ ...cfg, active: e.target.checked })}
                  className="ml-1 accent-purple-500"
                />
              </label>
            </div>
          </div>

          {/* ── Drop entries table ── */}
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left pb-1 pr-2">Drop Type</th>
                <th className="text-left pb-1 pr-2">Rarity</th>
                <th className="text-left pb-1 pr-2">Specific Name</th>
                <th className="text-center pb-1 px-2">Min</th>
                <th className="text-center pb-1 px-2">Max</th>
                <th className="text-center pb-1 px-2">Weight</th>
                <th className="text-center pb-1 px-2">Chance</th>
                <th className="text-right pb-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cfg.dropEntries.map((entry) => {
                const isEditing = !!editing[entry.id]
                const ed = editing[entry.id] ?? entry
                return (
                  <tr key={entry.id} className="border-b border-gray-900 hover:bg-white/[0.02]">
                    <td className="py-1 pr-2">
                      {isEditing ? (
                        <select value={ed.dropType ?? entry.dropType}
                          onChange={(e) => setEditing((p) => ({ ...p, [entry.id]: { ...p[entry.id], dropType: e.target.value } }))}
                          className="input-admin w-full">
                          {DROP_TYPES.map((t) => <option key={t}>{t}</option>)}
                        </select>
                      ) : <span className="text-gray-300 font-mono">{entry.dropType}</span>}
                    </td>
                    <td className="py-1 pr-2">
                      {isEditing ? (
                        <select value={ed.rarity ?? ''}
                          onChange={(e) => setEditing((p) => ({ ...p, [entry.id]: { ...p[entry.id], rarity: e.target.value || null } }))}
                          className="input-admin w-24">
                          {RARITIES.map((r) => <option key={r} value={r}>{r || '—'}</option>)}
                        </select>
                      ) : <span className="text-gray-400">{entry.rarity ?? '—'}</span>}
                    </td>
                    <td className="py-1 pr-2">
                      {isEditing ? (
                        <input type="text" placeholder="e.g. REPAIR_KIT_25"
                          value={ed.specificName ?? ''}
                          onChange={(e) => setEditing((p) => ({ ...p, [entry.id]: { ...p[entry.id], specificName: e.target.value || null } }))}
                          className="input-admin w-full" />
                      ) : <span className="text-gray-600">{entry.specificName ?? '—'}</span>}
                    </td>
                    <td className="py-1 px-2 text-center">
                      {isEditing ? (
                        <input type="number" value={ed.minQuantity ?? entry.minQuantity} min={1}
                          onChange={(e) => setEditing((p) => ({ ...p, [entry.id]: { ...p[entry.id], minQuantity: parseInt(e.target.value) } }))}
                          className="input-admin w-14 text-center" />
                      ) : <span className="text-gray-400">{entry.minQuantity}</span>}
                    </td>
                    <td className="py-1 px-2 text-center">
                      {isEditing ? (
                        <input type="number" value={ed.maxQuantity ?? entry.maxQuantity} min={1}
                          onChange={(e) => setEditing((p) => ({ ...p, [entry.id]: { ...p[entry.id], maxQuantity: parseInt(e.target.value) } }))}
                          className="input-admin w-14 text-center" />
                      ) : <span className="text-gray-400">{entry.maxQuantity}</span>}
                    </td>
                    <td className="py-1 px-2 text-center">
                      {isEditing ? (
                        <input type="number" value={ed.weight ?? entry.weight} step="0.1" min={0}
                          onChange={(e) => setEditing((p) => ({ ...p, [entry.id]: { ...p[entry.id], weight: parseFloat(e.target.value) } }))}
                          className="input-admin w-16 text-center" />
                      ) : <span className="text-gray-400">{entry.weight}</span>}
                    </td>
                    <td className="py-1 px-2 text-center">
                      <span className="text-green-400 font-mono">{entryChance(entry, cfg.dropEntries)}</span>
                    </td>
                    <td className="py-1 text-right">
                      <div className="flex gap-1 justify-end">
                        {isEditing ? (
                          <>
                            <button onClick={() => saveEntry({ id: entry.id, ...ed })}
                              className="px-2 py-0.5 text-xs bg-green-900/40 border border-green-700/40 text-green-300 rounded">Save</button>
                            <button onClick={() => setEditing((p) => { const n = { ...p }; delete n[entry.id]; return n })}
                              className="px-2 py-0.5 text-xs bg-gray-800 border border-gray-700 text-gray-400 rounded">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setEditing((p) => ({ ...p, [entry.id]: { ...entry } }))}
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

          {/* ── Add new entry ── */}
          <div className="border-t border-gray-800 pt-3">
            <p className="text-xs text-gray-500 mb-2">Add drop entry:</p>
            <div className="grid grid-cols-[1fr_1fr_1fr_60px_60px_70px_auto] gap-2 items-end">
              <select
                value={newEntry[cfg.id]?.dropType ?? ''}
                onChange={(e) => setNewEntry((p) => ({ ...p, [cfg.id]: { ...p[cfg.id], dropType: e.target.value } }))}
                className="input-admin">
                <option value="">Drop type *</option>
                {DROP_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <select
                value={newEntry[cfg.id]?.rarity ?? ''}
                onChange={(e) => setNewEntry((p) => ({ ...p, [cfg.id]: { ...p[cfg.id], rarity: e.target.value || null } }))}
                className="input-admin">
                {RARITIES.map((r) => <option key={r} value={r}>{r || 'No rarity'}</option>)}
              </select>
              <input type="text" placeholder="specificName (optional)"
                value={newEntry[cfg.id]?.specificName ?? ''}
                onChange={(e) => setNewEntry((p) => ({ ...p, [cfg.id]: { ...p[cfg.id], specificName: e.target.value || null } }))}
                className="input-admin" />
              <input type="number" placeholder="Min" min={1}
                value={newEntry[cfg.id]?.minQuantity ?? ''}
                onChange={(e) => setNewEntry((p) => ({ ...p, [cfg.id]: { ...p[cfg.id], minQuantity: parseInt(e.target.value) } }))}
                className="input-admin text-center" />
              <input type="number" placeholder="Max" min={1}
                value={newEntry[cfg.id]?.maxQuantity ?? ''}
                onChange={(e) => setNewEntry((p) => ({ ...p, [cfg.id]: { ...p[cfg.id], maxQuantity: parseInt(e.target.value) } }))}
                className="input-admin text-center" />
              <input type="number" placeholder="Weight *" step="0.1" min={0}
                value={newEntry[cfg.id]?.weight ?? ''}
                onChange={(e) => setNewEntry((p) => ({ ...p, [cfg.id]: { ...p[cfg.id], weight: parseFloat(e.target.value) } }))}
                className="input-admin text-center" />
              <button onClick={() => addEntry(cfg.id)}
                className="px-3 py-1 text-xs bg-purple-800/50 border border-purple-700 text-purple-200 rounded hover:bg-purple-700/50 whitespace-nowrap">
                + Add
              </button>
            </div>
            <p className="text-[10px] text-gray-700 mt-1">
              CONSUMABLE → set specificName = REPAIR_KIT_5 / REPAIR_KIT_25 / REPAIR_KIT_50 / REPAIR_KIT_100
            </p>
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
          width: 100%;
        }
        .input-admin:focus { border-color: #7c3aed; }
      `}</style>
    </div>
  )
}
