'use client'

import { useEffect, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShopItem {
  id:        string
  category:  string
  name:      string
  description: string
  price:     number
  rarity:    string | null
  active:    boolean
  sortOrder: number
  metadata:  Record<string, unknown> | null
}

// ─── Filtros de categoria ─────────────────────────────────────────────────────

const CATEGORY_FILTERS = [
  { key: 'ALL',              label: 'All',          match: null },
  { key: 'robots',           label: 'Robots',       match: ['robots', 'robot-specific'] },
  { key: 'equipment',        label: 'Equipment',    match: ['equipment', 'equipment-specific'] },
  { key: 'baseUpgrades',     label: 'Base Upgrades',match: ['baseUpgrades', 'base-upgrade-specific'] },
  { key: 'batteries',        label: 'Batteries',    match: ['batteries'] },
  { key: 'outpostSlots',     label: 'Outpost Slots',match: ['outpostSlots'] },
  { key: 'inventory',        label: 'Storage',      match: ['inventory'] },
]

const RARITIES   = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']
const EFFECT_TYPES = [
  'HASH_POWER_FLAT', 'HASH_POWER_PCT',
  'DURABILITY_LOSS_PCT', 'GLOBAL_EFFICIENCY_PCT', 'UPTIME_HOURS',
]
const INVENTORY_TABS = ['robots', 'equipments', 'baseUpgrades', 'parts', 'consumables', 'lootboxes']

// ─── Formulário de criação ────────────────────────────────────────────────────

interface CreateForm {
  category:        string
  name:            string
  description:     string
  price:           string
  rarity:          string
  sortOrder:       string
  // flags
  isSpecific:      boolean
  // robot-specific
  robotName:       string
  robotCollection: string
  hashPower:       string
  energyRate:      string
  // equipment / base-upgrade specific
  effectType:      string
  effectValue:     string
  effectType2:     string
  effectValue2:    string
  // battery
  batteryValue:    string
  // outpost slot
  slotNumber:      string
  slotRequires:    string
  // inventory
  inventoryTab:    string
  inventoryAdd:    string
  inventoryBasePrice: string
}

const BLANK_FORM: CreateForm = {
  category: 'robots', name: '', description: '', price: '0', rarity: 'COMMON', sortOrder: '99',
  isSpecific: false,
  robotName: '', robotCollection: '', hashPower: '10', energyRate: '1',
  effectType: 'HASH_POWER_FLAT', effectValue: '5', effectType2: '', effectValue2: '',
  batteryValue: '25',
  slotNumber: '4', slotRequires: '3',
  inventoryTab: 'robots', inventoryAdd: '5', inventoryBasePrice: '5',
}

function buildMetadata(f: CreateForm): Record<string, unknown> {
  const cat = f.category
  if (cat === 'robots' && !f.isSpecific)     return { generateType: 'robot' }
  if (cat === 'equipment' && !f.isSpecific)  return { generateType: 'equipment' }
  if (cat === 'baseUpgrades' && !f.isSpecific) return { generateType: 'baseUpgrade' }
  if (cat === 'robots' && f.isSpecific)
    return { specific: true, robotName: f.robotName, robotCollection: f.robotCollection,
             hashPower: Number(f.hashPower), energyRate: Number(f.energyRate) }
  if ((cat === 'equipment' || cat === 'baseUpgrades') && f.isSpecific) {
    const meta: Record<string, unknown> = { specific: true, effectType: f.effectType, effectValue: Number(f.effectValue) }
    if (f.effectType2) { meta.effectType2 = f.effectType2; meta.effectValue2 = Number(f.effectValue2) }
    return meta
  }
  if (cat === 'batteries')    return { batteryValue: Number(f.batteryValue) }
  if (cat === 'outpostSlots') return { slotNumber: Number(f.slotNumber), slotRequires: Number(f.slotRequires) }
  if (cat === 'inventory')    return { inventoryTab: f.inventoryTab, inventoryAdd: Number(f.inventoryAdd),
                                       inventoryBasePrice: Number(f.inventoryBasePrice) }
  return {}
}

// Gera um id único a partir do nome (slug)
function toSlug(name: string, cat: string): string {
  return `${cat}-${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ShopAdminPage() {
  const [items, setItems]       = useState<ShopItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('ALL')
  const [editing, setEditing]   = useState<Record<string, Partial<ShopItem>>>({})
  const [msg, setMsg]           = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]         = useState<CreateForm>(BLANK_FORM)
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    const r = await fetch('/api/admin/shop')
    setItems(await r.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Editar item existente ────────────────────────────────────────────────
  async function save(id: string) {
    const data = editing[id]
    if (!data) return
    setMsg('Saving…')
    const r = await fetch('/api/admin/shop', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    })
    if (r.ok) {
      setMsg('Saved ✓')
      setEditing(p => { const n = { ...p }; delete n[id]; return n })
      load()
    } else {
      setMsg('Error saving')
    }
  }

  async function toggleActive(item: ShopItem) {
    await fetch('/api/admin/shop', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, active: !item.active }),
    })
    load()
  }

  // ── Criar item novo ──────────────────────────────────────────────────────
  async function handleCreate() {
    if (!form.name.trim()) { setMsg('Name is required.'); return }
    setCreating(true); setMsg('')

    // Para inventory, o price guardado é 0 (preço dinâmico calculado pela API)
    const isInventory = form.category === 'inventory'
    const metadata    = buildMetadata(form)

    const body = {
      id:          toSlug(form.name, form.category),
      category:    form.category,
      name:        form.name.trim(),
      description: form.description.trim(),
      price:       isInventory ? 0 : Number(form.price),
      rarity:      ['robots','equipment','baseUpgrades'].includes(form.category) ? form.rarity : null,
      active:      true,
      sortOrder:   Number(form.sortOrder),
      metadata,
    }

    const r = await fetch('/api/admin/shop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (r.ok) {
      setMsg('Item created ✓')
      setForm(BLANK_FORM)
      setShowCreate(false)
      load()
    } else {
      const err = await r.json().catch(() => ({}))
      setMsg(`Error: ${err?.error ?? 'creation failed'}`)
    }
    setCreating(false)
  }

  // ── Filtro ───────────────────────────────────────────────────────────────
  const filterDef   = CATEGORY_FILTERS.find(f => f.key === filter)!
  const visible     = filterDef.match
    ? items.filter(i => filterDef.match!.includes(i.category))
    : items

  const grouped = visible.reduce<Record<string, ShopItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const f = form // alias curto para o formulário

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-purple-300 font-mono">Shop Items</h1>
        <button
          onClick={() => { setShowCreate(v => !v); setMsg('') }}
          className="px-3 py-1.5 text-xs bg-purple-900/40 border border-purple-700/40 text-purple-300 rounded hover:bg-purple-800/40 transition-colors">
          {showCreate ? '✕ Cancel' : '+ New Item'}
        </button>
      </div>

      {/* Mensagem de feedback */}
      {msg && <p className="text-xs text-yellow-400 font-mono">{msg}</p>}

      {/* ── Formulário de criação ─────────────────────────────────────────── */}
      {showCreate && (
        <div className="bg-[#0a0a16] border border-purple-800/30 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-purple-300">Create New Shop Item</h2>

          <div className="grid grid-cols-2 gap-3">
            {/* Categoria */}
            <div className="space-y-1">
              <label className="label-admin">Category</label>
              <select value={f.category} onChange={e => setForm(p => ({ ...p, category: e.target.value, isSpecific: false }))}
                className="input-admin w-full">
                <option value="robots">Robots (random)</option>
                <option value="equipment">Equipment (random)</option>
                <option value="baseUpgrades">Base Upgrades (random)</option>
                <option value="batteries">Battery / Repair Kit</option>
                <option value="outpostSlots">Outpost Slot</option>
                <option value="inventory">Storage Expansion</option>
              </select>
            </div>

            {/* Raridade — só para robots/equipment/baseUpgrades */}
            {['robots','equipment','baseUpgrades'].includes(f.category) && (
              <div className="space-y-1">
                <label className="label-admin">Rarity</label>
                <select value={f.rarity} onChange={e => setForm(p => ({ ...p, rarity: e.target.value }))}
                  className="input-admin w-full">
                  {RARITIES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            )}

            {/* Toggle item específico */}
            {['robots','equipment','baseUpgrades'].includes(f.category) && (
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="isSpecific" checked={f.isSpecific}
                  onChange={e => setForm(p => ({ ...p, isSpecific: e.target.checked }))}
                  className="w-4 h-4 accent-purple-500" />
                <label htmlFor="isSpecific" className="text-xs text-gray-400 cursor-pointer">
                  Fixed stats (specific item) — desmarca para geração aleatória por raridade
                </label>
              </div>
            )}
          </div>

          {/* Nome e descrição */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="label-admin">Name</label>
              <input value={f.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="input-admin w-full" placeholder="Item name" />
            </div>
            <div className="space-y-1">
              <label className="label-admin">Description</label>
              <input value={f.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="input-admin w-full" placeholder="Short description" />
            </div>
          </div>

          {/* Preço e sortOrder */}
          <div className="grid grid-cols-3 gap-3">
            {f.category !== 'inventory' && (
              <div className="space-y-1">
                <label className="label-admin">Price (CRATE)</label>
                <input type="number" value={f.price} step="0.001"
                  onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                  className="input-admin w-full" />
              </div>
            )}
            <div className="space-y-1">
              <label className="label-admin">Sort Order</label>
              <input type="number" value={f.sortOrder}
                onChange={e => setForm(p => ({ ...p, sortOrder: e.target.value }))}
                className="input-admin w-full" />
            </div>
          </div>

          {/* ── Campos de metadata por categoria ─────────────────────────── */}

          {/* Robot — específico */}
          {f.category === 'robots' && f.isSpecific && (
            <div className="grid grid-cols-2 gap-3 border-t border-purple-900/30 pt-3">
              <p className="col-span-2 text-xs text-purple-400 font-mono">Robot metadata</p>
              <div className="space-y-1">
                <label className="label-admin">Robot Name</label>
                <input value={f.robotName} onChange={e => setForm(p => ({ ...p, robotName: e.target.value }))}
                  className="input-admin w-full" placeholder="Sentinel MK-I" />
              </div>
              <div className="space-y-1">
                <label className="label-admin">Collection</label>
                <input value={f.robotCollection} onChange={e => setForm(p => ({ ...p, robotCollection: e.target.value }))}
                  className="input-admin w-full" placeholder="Sentinel Series" />
              </div>
              <div className="space-y-1">
                <label className="label-admin">Hash Power (ER)</label>
                <input type="number" value={f.hashPower} onChange={e => setForm(p => ({ ...p, hashPower: e.target.value }))}
                  className="input-admin w-full" />
              </div>
              <div className="space-y-1">
                <label className="label-admin">Energy Rate</label>
                <input type="number" value={f.energyRate} step="0.1"
                  onChange={e => setForm(p => ({ ...p, energyRate: e.target.value }))}
                  className="input-admin w-full" />
              </div>
            </div>
          )}

          {/* Equipment / BaseUpgrade — específico */}
          {(f.category === 'equipment' || f.category === 'baseUpgrades') && f.isSpecific && (
            <div className="grid grid-cols-2 gap-3 border-t border-purple-900/30 pt-3">
              <p className="col-span-2 text-xs text-purple-400 font-mono">Effect metadata</p>
              <div className="space-y-1">
                <label className="label-admin">Effect Type</label>
                <select value={f.effectType} onChange={e => setForm(p => ({ ...p, effectType: e.target.value }))}
                  className="input-admin w-full">
                  {EFFECT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="label-admin">Effect Value</label>
                <input type="number" value={f.effectValue} step="0.1"
                  onChange={e => setForm(p => ({ ...p, effectValue: e.target.value }))}
                  className="input-admin w-full" />
              </div>
              <div className="space-y-1">
                <label className="label-admin">Effect Type 2 (opcional)</label>
                <select value={f.effectType2} onChange={e => setForm(p => ({ ...p, effectType2: e.target.value }))}
                  className="input-admin w-full">
                  <option value="">— none —</option>
                  {EFFECT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              {f.effectType2 && (
                <div className="space-y-1">
                  <label className="label-admin">Effect Value 2</label>
                  <input type="number" value={f.effectValue2} step="0.1"
                    onChange={e => setForm(p => ({ ...p, effectValue2: e.target.value }))}
                    className="input-admin w-full" />
                </div>
              )}
            </div>
          )}

          {/* Battery */}
          {f.category === 'batteries' && (
            <div className="grid grid-cols-2 gap-3 border-t border-purple-900/30 pt-3">
              <p className="col-span-2 text-xs text-purple-400 font-mono">Battery metadata</p>
              <div className="space-y-1">
                <label className="label-admin">Battery Value (% repair)</label>
                <input type="number" value={f.batteryValue}
                  onChange={e => setForm(p => ({ ...p, batteryValue: e.target.value }))}
                  className="input-admin w-full" />
              </div>
            </div>
          )}

          {/* Outpost Slots */}
          {f.category === 'outpostSlots' && (
            <div className="grid grid-cols-2 gap-3 border-t border-purple-900/30 pt-3">
              <p className="col-span-2 text-xs text-purple-400 font-mono">Outpost slot metadata</p>
              <div className="space-y-1">
                <label className="label-admin">Slot Number</label>
                <input type="number" value={f.slotNumber}
                  onChange={e => setForm(p => ({ ...p, slotNumber: e.target.value }))}
                  className="input-admin w-full" />
              </div>
              <div className="space-y-1">
                <label className="label-admin">Requires Slots</label>
                <input type="number" value={f.slotRequires}
                  onChange={e => setForm(p => ({ ...p, slotRequires: e.target.value }))}
                  className="input-admin w-full" />
              </div>
            </div>
          )}

          {/* Inventory Expansion */}
          {f.category === 'inventory' && (
            <div className="grid grid-cols-3 gap-3 border-t border-purple-900/30 pt-3">
              <p className="col-span-3 text-xs text-purple-400 font-mono">Storage expansion metadata</p>
              <div className="space-y-1">
                <label className="label-admin">Inventory Tab</label>
                <select value={f.inventoryTab} onChange={e => setForm(p => ({ ...p, inventoryTab: e.target.value }))}
                  className="input-admin w-full">
                  {INVENTORY_TABS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="label-admin">Slots Added</label>
                <input type="number" value={f.inventoryAdd}
                  onChange={e => setForm(p => ({ ...p, inventoryAdd: e.target.value }))}
                  className="input-admin w-full" />
              </div>
              <div className="space-y-1">
                <label className="label-admin">Base Price (CRATE)</label>
                <input type="number" value={f.inventoryBasePrice} step="0.1"
                  onChange={e => setForm(p => ({ ...p, inventoryBasePrice: e.target.value }))}
                  className="input-admin w-full" />
              </div>
            </div>
          )}

          <button onClick={handleCreate} disabled={creating}
            className="px-4 py-2 text-sm bg-purple-700/50 border border-purple-600/50 text-purple-200 rounded hover:bg-purple-700/70 disabled:opacity-50 transition-colors">
            {creating ? 'Creating…' : 'Create Item'}
          </button>
        </div>
      )}

      {/* ── Filtros de categoria ──────────────────────────────────────────── */}
      <div className="flex gap-1 flex-wrap">
        {CATEGORY_FILTERS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              filter === key
                ? 'bg-purple-800/60 border-purple-600 text-purple-200'
                : 'bg-transparent border-gray-700 text-gray-500 hover:border-gray-500'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Lista de itens ────────────────────────────────────────────────── */}
      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{cat}</h2>
              <div className="space-y-1.5">
                {catItems.map(item => {
                  const ed        = editing[item.id]
                  const isEditing = !!ed
                  return (
                    <div key={item.id}
                      className={`bg-[#0d0d1a] border rounded-lg p-3 flex items-center gap-4 ${
                        item.active ? 'border-purple-900/20' : 'border-gray-800/50 opacity-60'
                      }`}>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-gray-200">{item.name}</span>
                          {item.rarity && <RarityBadge rarity={item.rarity} />}
                          {!item.active && <span className="text-xs text-red-500">Inactive</span>}
                          {item.metadata && (item.metadata as Record<string,unknown>).specific === true && (
                            <span className="text-xs text-cyan-600">specific</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 truncate">{item.description}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {isEditing ? (
                          <>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">Price:</span>
                              <input type="number"
                                value={ed.price ?? item.price}
                                onChange={e => setEditing(p => ({ ...p, [item.id]: { ...p[item.id], price: parseFloat(e.target.value) } }))}
                                className="input-admin w-24" step="0.001" />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">Sort:</span>
                              <input type="number"
                                value={ed.sortOrder ?? item.sortOrder}
                                onChange={e => setEditing(p => ({ ...p, [item.id]: { ...p[item.id], sortOrder: parseInt(e.target.value) } }))}
                                className="input-admin w-16" />
                            </div>
                            <button onClick={() => save(item.id)}
                              className="px-2 py-1 text-xs bg-green-900/40 border border-green-700/40 text-green-300 rounded">
                              Save
                            </button>
                            <button onClick={() => setEditing(p => { const n = { ...p }; delete n[item.id]; return n })}
                              className="px-2 py-1 text-xs border border-gray-700 text-gray-400 rounded">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-bold text-purple-300">
                              {item.price > 0 ? `${item.price.toFixed(4)} CRATE` : '—'}
                            </span>
                            <button onClick={() => setEditing(p => ({ ...p, [item.id]: {} }))}
                              className="px-2 py-1 text-xs border border-gray-700 text-gray-300 rounded hover:bg-gray-800">
                              Edit
                            </button>
                            <button onClick={() => toggleActive(item)}
                              className={`px-2 py-1 text-xs rounded border transition-colors ${
                                item.active
                                  ? 'border-yellow-700/40 text-yellow-400 hover:bg-yellow-900/20'
                                  : 'border-green-700/40 text-green-400 hover:bg-green-900/20'
                              }`}>
                              {item.active ? 'Disable' : 'Enable'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {Object.keys(grouped).length === 0 && (
            <p className="text-gray-600 text-sm">No items in this category.</p>
          )}
        </div>
      )}

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
        .label-admin { font-size: 11px; color: #6b7280; display: block; }
      `}</style>
    </div>
  )
}

function RarityBadge({ rarity }: { rarity: string }) {
  const colors: Record<string, string> = {
    COMMON: 'text-gray-400', UNCOMMON: 'text-green-400',
    RARE: 'text-blue-400',   EPIC: 'text-purple-400', LEGENDARY: 'text-yellow-400',
  }
  return <span className={`text-xs ${colors[rarity] ?? 'text-gray-400'}`}>{rarity}</span>
}
