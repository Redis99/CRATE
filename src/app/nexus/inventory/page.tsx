'use client'

import { useEffect, useState, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Part {
  id: string
  partType: string
  category: string
  rarities: string[]
  description: string | null
  active: boolean
  owners: number
  totalQty: number
}

interface ConsumableTpl {
  id: string
  consumableType: string
  name: string
  description: string | null
  effectType: string
  effectValue: number
  durationSec: number
  rarity: string | null
  active: boolean
  sortOrder: number
  owners: number
  totalQty: number
}

// ── Constants ──────────────────────────────────────────────────────────────────

const PART_CATEGORIES = ['ENERGY','MINING','MAINTENANCE','TERRAIN','AI_SOFTWARE','SPECIAL']
const RARITIES = ['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY']
const RARITY_COLOR: Record<string, string> = {
  COMMON: 'text-gray-400', UNCOMMON: 'text-green-400',
  RARE: 'text-blue-400', EPIC: 'text-purple-400', LEGENDARY: 'text-yellow-400',
}

const CONSUMABLE_TYPES = ['REPAIR_KIT', 'BOOST_TEMP']
const EFFECT_TYPES = [
  'REPAIR_PCT', 'REPAIR_FLAT',
  'ER_BOOST_FLAT', 'ER_BOOST_PCT',
  'PD_REDUCTION_PCT', 'PD_REDUCTION_FLAT',
  'DURABILITY_LOSS_PCT', 'UPTIME_HOURS',
]

const EMPTY_PART = {
  partType: '', category: 'MINING' as string,
  rarities: [] as string[], description: '',
  active: true,
}

const EMPTY_CONSUMABLE = {
  consumableType: 'REPAIR_KIT' as string,
  name: '', description: '',
  effectType: 'REPAIR_PCT' as string,
  effectValue: 25,
  durationSec: 0,
  rarity: 'COMMON' as string | null,
  active: true,
  sortOrder: 0,
}

// ── Component ──────────────────────────────────────────────────────────────────

type Tab = 'parts' | 'consumables'

export default function PartsConsumablesPage() {
  const [tab, setTab]               = useState<Tab>('parts')
  const [parts, setParts]           = useState<Part[]>([])
  const [consumables, setConsumables] = useState<ConsumableTpl[]>([])
  const [loading, setLoading]       = useState(true)
  const [msg, setMsg]               = useState('')

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [search, setSearch]                 = useState('')

  // Editors
  const [editPart, setEditPart]     = useState<typeof EMPTY_PART & { id?: string } | null>(null)
  const [isNewPart, setIsNewPart]   = useState(false)
  const [editCons, setEditCons]     = useState<typeof EMPTY_CONSUMABLE & { id?: string } | null>(null)
  const [isNewCons, setIsNewCons]   = useState(false)

  const loadParts = useCallback(async () => {
    const res = await fetch('/api/admin/parts')
    setParts(await res.json())
  }, [])

  const loadConsumables = useCallback(async () => {
    const res = await fetch('/api/admin/consumables')
    setConsumables(await res.json())
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadParts(), loadConsumables()])
    setLoading(false)
  }, [loadParts, loadConsumables])

  useEffect(() => { load() }, [load])

  // ── Parts CRUD ────────────────────────────────────────────────────────────────

  function openNewPart() { setEditPart({ ...EMPTY_PART }); setIsNewPart(true) }
  function openEditPart(p: Part) {
    setEditPart({
      id: p.id, partType: p.partType, category: p.category,
      rarities: p.rarities, description: p.description ?? '',
      active: p.active,
    })
    setIsNewPart(false)
  }

  function togglePartRarity(r: string) {
    if (!editPart) return
    setEditPart(p => p && ({
      ...p,
      rarities: p.rarities.includes(r) ? p.rarities.filter(x => x !== r) : [...p.rarities, r],
    }))
  }

  async function savePart() {
    if (!editPart) return
    setMsg('Saving…')
    const r = await fetch('/api/admin/parts', {
      method: isNewPart ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editPart),
    })
    if (r.ok) { setMsg('Saved!'); setEditPart(null); loadParts() }
    else { const e = await r.json().catch(() => ({})); setMsg(`Error: ${e.error ?? r.status}`) }
  }

  async function deletePart(id: string, name: string) {
    if (!confirm(`Delete part "${name}"?`)) return
    await fetch('/api/admin/parts', { method: 'DELETE', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ id }) })
    setMsg('Deleted'); loadParts()
  }

  async function togglePartActive(p: Part) {
    await fetch('/api/admin/parts', {
      method: 'PUT', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ id: p.id, active: !p.active }),
    })
    loadParts()
  }

  // ── Consumables CRUD ──────────────────────────────────────────────────────────

  function openNewCons() { setEditCons({ ...EMPTY_CONSUMABLE }); setIsNewCons(true) }
  function openEditCons(c: ConsumableTpl) {
    setEditCons({
      id: c.id, consumableType: c.consumableType, name: c.name,
      description: c.description ?? '',
      effectType: c.effectType, effectValue: c.effectValue,
      durationSec: c.durationSec, rarity: c.rarity,
      active: c.active, sortOrder: c.sortOrder,
    })
    setIsNewCons(false)
  }

  async function saveCons() {
    if (!editCons) return
    setMsg('Saving…')
    const r = await fetch('/api/admin/consumables', {
      method: isNewCons ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editCons),
    })
    if (r.ok) { setMsg('Saved!'); setEditCons(null); loadConsumables() }
    else { const e = await r.json().catch(() => ({})); setMsg(`Error: ${e.error ?? r.status}`) }
  }

  async function deleteCons(id: string, name: string) {
    if (!confirm(`Delete consumable "${name}"?`)) return
    await fetch('/api/admin/consumables', { method: 'DELETE', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ id }) })
    setMsg('Deleted'); loadConsumables()
  }

  async function toggleConsActive(c: ConsumableTpl) {
    await fetch('/api/admin/consumables', {
      method: 'PUT', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ id: c.id, active: !c.active }),
    })
    loadConsumables()
  }

  // ── Filtered lists ────────────────────────────────────────────────────────────

  const filteredParts = parts.filter(p => {
    const catOk = categoryFilter === 'ALL' || p.category === categoryFilter
    const searchOk = !search || p.partType.toLowerCase().includes(search.toLowerCase())
    return catOk && searchOk
  })

  const filteredConsumables = consumables.filter(c => {
    const typeOk = categoryFilter === 'ALL' || c.consumableType === categoryFilter
    const searchOk = !search || c.name.toLowerCase().includes(search.toLowerCase())
    return typeOk && searchOk
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-purple-300 font-mono">Parts & Consumables</h1>
        <button onClick={tab === 'parts' ? openNewPart : openNewCons}
          className="px-3 py-1.5 text-xs bg-purple-800/60 border border-purple-600 text-purple-200 rounded hover:bg-purple-700/60">
          + New {tab === 'parts' ? 'Part' : 'Consumable'}
        </button>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2">
        {(['parts', 'consumables'] as Tab[]).map(t => (
          <button key={t} onClick={() => { setTab(t); setCategoryFilter('ALL'); setSearch('') }}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${
              tab === t ? 'bg-purple-800/60 border-purple-600 text-purple-200' : 'border-gray-700 text-gray-400 hover:border-gray-500'
            }`}>
            {t === 'parts' ? 'Parts' : 'Consumables'}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">{tab === 'parts' ? 'Category' : 'Type'}:</span>
        {['ALL', ...(tab === 'parts' ? PART_CATEGORIES : CONSUMABLE_TYPES)].map(c => (
          <button key={c} onClick={() => setCategoryFilter(c)}
            className={`px-2.5 py-1 text-xs rounded border transition-colors ${
              categoryFilter === c
                ? 'bg-purple-800/60 border-purple-600 text-purple-200'
                : 'border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
            }`}>
            {c}
          </button>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by name…"
        className="w-full max-w-sm px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded text-gray-200 placeholder-gray-600 outline-none focus:border-purple-700" />

      {msg && <p className="text-xs text-yellow-400 font-mono">{msg}</p>}

      {/* ── Part Editor Modal ─────────────────────────────────────────────────── */}
      {editPart && (
        <Modal title={isNewPart ? 'New Part' : `Edit — ${editPart.partType}`} onClose={() => setEditPart(null)}>
          <div className="grid grid-cols-2 gap-3">
            <F label="Part Name">
              <input value={editPart.partType} className="w-full ia"
                onChange={e => setEditPart(p => p && ({ ...p, partType: e.target.value }))} />
            </F>
            <F label="Category">
              <select value={editPart.category} className="w-full ia"
                onChange={e => setEditPart(p => p && ({ ...p, category: e.target.value }))}>
                {PART_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </F>
          </div>

          <F label="Description (optional)">
            <input value={editPart.description} className="w-full ia"
              onChange={e => setEditPart(p => p && ({ ...p, description: e.target.value }))} />
          </F>

          <F label={<>Available Rarities <span className="text-gray-600">(empty = all)</span></>}>
            <div className="flex gap-1 flex-wrap">
              {RARITIES.map(r => {
                const selected = editPart.rarities.includes(r)
                return (
                  <button key={r} type="button" onClick={() => togglePartRarity(r)}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                      selected
                        ? `bg-purple-900/40 border-purple-700 ${RARITY_COLOR[r]}`
                        : 'border-gray-800 text-gray-600 hover:border-gray-600'
                    }`}>
                    {r}
                  </button>
                )
              })}
            </div>
          </F>

          <F label="Active">
            <select value={editPart.active ? 'yes' : 'no'} className="w-full ia"
              onChange={e => setEditPart(p => p && ({ ...p, active: e.target.value === 'yes' }))}>
              <option value="yes">Yes</option><option value="no">No</option>
            </select>
          </F>

          <div className="flex gap-2 pt-1">
            <Btn onClick={savePart}>Save</Btn>
            <Btn secondary onClick={() => setEditPart(null)}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {/* ── Consumable Editor Modal ───────────────────────────────────────────── */}
      {editCons && (
        <Modal title={isNewCons ? 'New Consumable' : `Edit — ${editCons.name}`} onClose={() => setEditCons(null)}>
          <div className="grid grid-cols-2 gap-3">
            <F label="Name">
              <input value={editCons.name} className="w-full ia" placeholder="e.g. ER Boost 1h"
                onChange={e => setEditCons(p => p && ({ ...p, name: e.target.value }))} />
            </F>
            <F label="Type">
              <select value={editCons.consumableType} className="w-full ia"
                onChange={e => setEditCons(p => p && ({ ...p, consumableType: e.target.value }))}>
                {CONSUMABLE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </F>
          </div>

          <F label="Description (optional)">
            <textarea value={editCons.description} rows={2} className="w-full ia"
              onChange={e => setEditCons(p => p && ({ ...p, description: e.target.value }))} />
          </F>

          <p className="text-xs text-gray-500 pt-1">Effect</p>
          <div className="grid grid-cols-2 gap-3">
            <F label="Effect Type">
              <select value={editCons.effectType} className="w-full ia"
                onChange={e => setEditCons(p => p && ({ ...p, effectType: e.target.value }))}>
                {EFFECT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </F>
            <F label="Effect Value">
              <input type="number" step="0.1" value={editCons.effectValue} className="w-full ia"
                onChange={e => setEditCons(p => p && ({ ...p, effectValue: parseFloat(e.target.value) }))} />
            </F>
            <F label="Duration (seconds)">
              <input type="number" min={0} value={editCons.durationSec} className="w-full ia"
                placeholder="0 = instant"
                onChange={e => setEditCons(p => p && ({ ...p, durationSec: parseInt(e.target.value) }))} />
            </F>
            <F label="Rarity (optional)">
              <select value={editCons.rarity ?? ''} className="w-full ia"
                onChange={e => setEditCons(p => p && ({ ...p, rarity: e.target.value || null }))}>
                <option value="">— None —</option>
                {RARITIES.map(r => <option key={r}>{r}</option>)}
              </select>
            </F>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <F label="Sort Order">
              <input type="number" value={editCons.sortOrder} className="w-full ia"
                onChange={e => setEditCons(p => p && ({ ...p, sortOrder: parseInt(e.target.value) }))} />
            </F>
            <F label="Active">
              <select value={editCons.active ? 'yes' : 'no'} className="w-full ia"
                onChange={e => setEditCons(p => p && ({ ...p, active: e.target.value === 'yes' }))}>
                <option value="yes">Yes</option><option value="no">No</option>
              </select>
            </F>
          </div>

          <div className="flex gap-2 pt-1">
            <Btn onClick={saveCons}>Save</Btn>
            <Btn secondary onClick={() => setEditCons(null)}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {/* ── Parts List ────────────────────────────────────────────────────────── */}
      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : tab === 'parts' ? (
        filteredParts.length === 0 ? (
          <p className="text-gray-500 text-sm">
            {parts.length === 0 ? 'No parts in catalog. Run Seed Parts or click + New Part to start.' : 'No parts match the current filters.'}
          </p>
        ) : (
          <div className="space-y-1.5">
            {filteredParts.map(p => (
              <div key={p.id}
                className={`bg-[#0d0d1a] border rounded-lg p-3 flex items-center gap-4 ${
                  p.active ? 'border-purple-900/20' : 'border-gray-800/40 opacity-60'
                }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-200">{p.partType}</span>
                    <span className="text-xs text-gray-500 bg-gray-800 px-1.5 rounded">{p.category}</span>
                    {!p.active && <span className="text-xs text-red-500">Inactive</span>}
                  </div>
                  {p.description && <p className="text-xs text-gray-600 mt-0.5">{p.description}</p>}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {p.rarities.length === 0
                      ? <span className="text-xs text-gray-700 italic">all rarities</span>
                      : p.rarities.map(r => (
                          <span key={r} className={`text-xs font-bold ${RARITY_COLOR[r] ?? 'text-gray-400'}`}>{r}</span>
                        ))
                    }
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs">
                  <div className="text-purple-300 font-bold">{p.owners} <span className="text-gray-600 font-normal">owners</span></div>
                  <div className="text-gray-400">{p.totalQty} <span className="text-gray-600">total qty</span></div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => togglePartActive(p)}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      p.active
                        ? 'border-yellow-700/40 text-yellow-400 hover:bg-yellow-900/20'
                        : 'border-green-700/40 text-green-400 hover:bg-green-900/20'
                    }`}>
                    {p.active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => openEditPart(p)}
                    className="px-2 py-1 text-xs border border-gray-700 text-gray-300 rounded hover:bg-gray-800">Edit</button>
                  <button onClick={() => deletePart(p.id, p.partType)}
                    className="px-2 py-1 text-xs border border-red-900 text-red-400 rounded hover:bg-red-900/20">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ── Consumables List ─────────────────────────────────────────────── */
        filteredConsumables.length === 0 ? (
          <p className="text-gray-500 text-sm">
            {consumables.length === 0 ? 'No consumables yet. Run Seed Consumables or click + New Consumable.' : 'No consumables match the current filters.'}
          </p>
        ) : (
          <div className="space-y-1.5">
            {filteredConsumables.map(c => (
              <div key={c.id}
                className={`bg-[#0d0d1a] border rounded-lg p-3 flex items-center gap-4 ${
                  c.active ? 'border-purple-900/20' : 'border-gray-800/40 opacity-60'
                }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-200">{c.name}</span>
                    <span className="text-xs text-gray-500 bg-gray-800 px-1.5 rounded">{c.consumableType}</span>
                    {c.rarity && <span className={`text-xs font-bold ${RARITY_COLOR[c.rarity] ?? 'text-gray-400'}`}>{c.rarity}</span>}
                    {!c.active && <span className="text-xs text-red-500">Inactive</span>}
                  </div>
                  {c.description && <p className="text-xs text-gray-600 mt-0.5">{c.description}</p>}
                  <div className="flex gap-3 mt-1 text-xs text-gray-600 flex-wrap">
                    <span>{c.effectType}: <span className="text-gray-300">{c.effectValue}</span></span>
                    {c.durationSec > 0 && <span>· {c.durationSec}s duration</span>}
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs">
                  <div className="text-purple-300 font-bold">{c.owners} <span className="text-gray-600 font-normal">owners</span></div>
                  <div className="text-gray-400">{c.totalQty} <span className="text-gray-600">total qty</span></div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => toggleConsActive(c)}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      c.active
                        ? 'border-yellow-700/40 text-yellow-400 hover:bg-yellow-900/20'
                        : 'border-green-700/40 text-green-400 hover:bg-green-900/20'
                    }`}>
                    {c.active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => openEditCons(c)}
                    className="px-2 py-1 text-xs border border-gray-700 text-gray-300 rounded hover:bg-gray-800">Edit</button>
                  <button onClick={() => deleteCons(c.id, c.name)}
                    className="px-2 py-1 text-xs border border-red-900 text-red-400 rounded hover:bg-red-900/20">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <style jsx global>{`
        .ia { background:#111122;border:1px solid #2d2d50;border-radius:4px;padding:4px 8px;font-size:12px;color:#d1d5db;outline:none; }
        .ia:focus { border-color:#7c3aed; }
      `}</style>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function F({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <div><label className="block text-xs text-gray-500 mb-1">{label}</label>{children}</div>
}

function Btn({ onClick, secondary, children }: { onClick: () => void; secondary?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-1.5 text-sm rounded border transition-colors ${secondary ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'bg-purple-800/60 border-purple-600 text-purple-200 hover:bg-purple-700/60'}`}>
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
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
