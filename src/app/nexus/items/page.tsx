'use client'

import { useEffect, useState, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ItemGroup {
  name: string
  collection: string | null
  rarity: string
  effectType: string
  effectType2: string | null
  effectValue: number
  effectValue2: number | null
  ownerCount: number
}

interface ItemTemplate {
  id: string
  name: string
  description: string
  price: number
  rarity: string
  active: boolean
  metadata: {
    specific: boolean
    collection: string | null
    effectType: string | null
    effectValue: number | null
    effectType2: string | null
    effectValue2: number | null
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const RARITIES = ['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY']
const EFFECT_TYPES = [
  'HASH_POWER_FLAT','HASH_POWER_PCT','DURABILITY_LOSS_PCT',
  'GLOBAL_EFFICIENCY_PCT','UPTIME_HOURS','POWER_DRAW_FLAT','POWER_DRAW_PCT',
]
const RARITY_COLOR: Record<string, string> = {
  COMMON: 'text-gray-400', UNCOMMON: 'text-green-400',
  RARE: 'text-blue-400', EPIC: 'text-purple-400', LEGENDARY: 'text-yellow-400',
}
const EMPTY_TPL = {
  name: '', customId: '', collection: '', rarity: 'COMMON',
  effectType: '', effectValue: 0, effectType2: '', effectValue2: 0,
  price: 0, active: false, description: '',
}

type ItemTab = 'equipment' | 'base-upgrade'
type View    = 'in-game' | 'templates'

// ── Component ─────────────────────────────────────────────────────────────────

export default function ItemsAdminPage() {
  const [itemTab, setItemTab]         = useState<ItemTab>('equipment')
  const [view, setView]               = useState<View>('in-game')
  const [rarity, setRarity]           = useState('ALL')
  const [groups, setGroups]           = useState<ItemGroup[]>([])
  const [templates, setTemplates]     = useState<ItemTemplate[]>([])
  const [collections, setCollections] = useState<string[]>([])
  const [loading, setLoading]         = useState(true)
  const [msg, setMsg]                 = useState('')

  // Bulk edit (in-game)
  const [editGroup, setEditGroup]   = useState<ItemGroup | null>(null)
  const [editData, setEditData]     = useState<Record<string, unknown>>({})

  // Template create/edit
  const [editTpl, setEditTpl]       = useState<typeof EMPTY_TPL & { id?: string } | null>(null)
  const [isTplNew, setIsTplNew]     = useState(false)

  // Airdrop
  const [airdropId, setAirdropId]   = useState<string | null>(null)
  const [airdropUser, setAirdropUser] = useState('')
  const [airdropMsg, setAirdropMsg]   = useState('')

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadGroups = useCallback(async (tab: ItemTab, r: string) => {
    setLoading(true)
    const res = await fetch(`/api/admin/inventory?type=${tab}&rarity=${r}`)
    setGroups(await res.json())
    setLoading(false)
  }, [])

  const loadTemplates = useCallback(async (tab: ItemTab) => {
    setLoading(true)
    const category = tab === 'equipment' ? 'equipment-specific' : 'base-upgrade-specific'
    const res = await fetch(`/api/admin/items?category=${category}`)
    const data = await res.json()
    setTemplates(data.items ?? [])
    setCollections(data.collections ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch('/api/admin/codex')
      .then(r => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((d: any[]) => setCollections(d.map((c: any) => c.name)))
  }, [])

  useEffect(() => {
    if (view === 'in-game') loadGroups(itemTab, rarity)
    else loadTemplates(itemTab)
  }, [view, itemTab, rarity, loadGroups, loadTemplates])

  // ── Bulk edit ─────────────────────────────────────────────────────────────

  function startEditGroup(g: ItemGroup) {
    setEditGroup(g)
    setEditData({
      name: g.name, collection: g.collection ?? '', rarity: g.rarity,
      effectType: g.effectType, effectValue: g.effectValue,
      effectType2: g.effectType2 ?? '', effectValue2: g.effectValue2 ?? 0,
    })
  }

  async function saveGroup() {
    if (!editGroup) return
    setMsg('Saving…')
    const r = await fetch('/api/admin/inventory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: itemTab, name: editGroup.name, rarity: editGroup.rarity,
        effectType: editGroup.effectType,
        data: {
          ...editData,
          effectType2: editData.effectType2 || null,
          effectValue2: editData.effectType2 ? Number(editData.effectValue2) : null,
        },
      }),
    })
    const result = await r.json()
    if (r.ok) { setMsg(`✓ Updated ${result.updated} item(s)`); setEditGroup(null); loadGroups(itemTab, rarity) }
    else setMsg(`Error: ${result.error}`)
  }

  // ── Template CRUD ─────────────────────────────────────────────────────────

  function openNewTpl() { setEditTpl({ ...EMPTY_TPL }); setIsTplNew(true) }
  function openEditTpl(t: ItemTemplate) {
    setEditTpl({
      id: t.id, customId: '', name: t.name, collection: t.metadata.collection ?? '',
      rarity: t.rarity,
      effectType:   t.metadata.effectType  ?? '',
      effectValue:  t.metadata.effectValue ?? 0,
      effectType2:  t.metadata.effectType2 ?? '',
      effectValue2: t.metadata.effectValue2 ?? 0,
      price: t.price, active: t.active, description: t.description,
    })
    setIsTplNew(false)
  }

  async function saveTpl() {
    if (!editTpl) return
    setMsg('Saving…')
    const category = itemTab === 'equipment' ? 'equipment-specific' : 'base-upgrade-specific'
    const r = await fetch('/api/admin/items', {
      method: isTplNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...editTpl, category,
        effectType:  editTpl.effectType  || null,
        effectType2: editTpl.effectType2 || null,
        effectValue2: editTpl.effectType2 ? editTpl.effectValue2 : null,
      }),
    })
    if (r.ok) { setMsg('Saved!'); setEditTpl(null); loadTemplates(itemTab) }
    else { const e = await r.json(); setMsg(`Error: ${e.error}`) }
  }

  async function delTpl(id: string, name: string) {
    if (!confirm(`Delete template "${name}"?`)) return
    await fetch('/api/admin/items', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setMsg('Deleted'); loadTemplates(itemTab)
  }

  async function toggleTpl(t: ItemTemplate) {
    await fetch('/api/admin/items', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: t.id, name: t.name, collection: t.metadata.collection,
        rarity: t.rarity, effectType: t.metadata.effectType, effectValue: t.metadata.effectValue,
        effectType2: t.metadata.effectType2, effectValue2: t.metadata.effectValue2,
        price: t.price, active: !t.active, description: t.description,
      }),
    })
    loadTemplates(itemTab)
  }

  async function sendAirdrop() {
    if (!airdropId || !airdropUser.trim()) { setAirdropMsg('Enter a user ID'); return }
    setAirdropMsg('Sending…')
    const r = await fetch('/api/admin/items/airdrop', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: airdropUser, itemId: airdropId }),
    })
    const d = await r.json()
    if (r.ok) setAirdropMsg(`✓ ${d.name} sent!`)
    else setAirdropMsg(`Error: ${d.error}`)
  }

  const typeLabel = itemTab === 'equipment' ? 'Equipment' : 'Base Upgrade'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-purple-300 font-mono">Equip & Upgrades</h1>
        {view === 'templates' && (
          <button onClick={openNewTpl}
            className="px-3 py-1.5 text-xs bg-purple-800/60 border border-purple-600 text-purple-200 rounded hover:bg-purple-700/60">
            + New {typeLabel}
          </button>
        )}
      </div>

      {/* Item type tabs */}
      <div className="flex gap-2">
        {(['equipment', 'base-upgrade'] as ItemTab[]).map(t => (
          <button key={t} onClick={() => { setItemTab(t); setMsg('') }}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${
              itemTab === t ? 'bg-purple-800/60 border-purple-600 text-purple-200' : 'border-gray-700 text-gray-400 hover:border-gray-500'
            }`}>
            {t === 'equipment' ? 'Equipments' : 'Base Upgrades'}
          </button>
        ))}
      </div>

      {/* View tabs */}
      <div className="flex gap-2">
        <ViewTab active={view === 'in-game'} onClick={() => setView('in-game')}>In Game</ViewTab>
        <ViewTab active={view === 'templates'} onClick={() => setView('templates')}>Templates / Shop</ViewTab>
      </div>

      {/* Rarity filter */}
      {view === 'in-game' && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Rarity:</span>
          {['ALL','COMMON','UNCOMMON','RARE','EPIC','LEGENDARY'].map(r => (
            <button key={r} onClick={() => setRarity(r)}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                rarity === r ? 'bg-purple-800/60 border-purple-600 text-purple-200' : 'border-gray-800 text-gray-500 hover:border-gray-600'
              }`}>
              {r}
            </button>
          ))}
        </div>
      )}

      {msg && <p className="text-xs font-mono text-yellow-400">{msg}</p>}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {editGroup && (
        <Modal title={`Edit all — ${editGroup.name}`}
          warning={`Will update ${editGroup.ownerCount} item(s) across all players.`}
          onClose={() => setEditGroup(null)}>
          <div className="grid grid-cols-2 gap-3">
            <F label="Name"><input value={String(editData.name ?? '')} className="w-full ia"
              onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} /></F>
            <F label="Rarity">
              <select value={String(editData.rarity ?? '')} className="w-full ia"
                onChange={e => setEditData(p => ({ ...p, rarity: e.target.value }))}>
                {RARITIES.map(r => <option key={r}>{r}</option>)}
              </select>
            </F>
          </div>
          <F label="Collection tag">
            <select value={String(editData.collection ?? '')} className="w-full ia"
              onChange={e => setEditData(p => ({ ...p, collection: e.target.value }))}>
              <option value="">— No collection —</option>
              {collections.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {editData.collection ? <CollectionChip name={String(editData.collection)} /> : null}
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Effect Type">
              <select value={String(editData.effectType ?? '')} className="w-full ia"
                onChange={e => setEditData(p => ({ ...p, effectType: e.target.value }))}>
                {EFFECT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </F>
            <F label="Effect Value"><input type="number" step="0.1" value={Number(editData.effectValue ?? 0)} className="w-full ia"
              onChange={e => setEditData(p => ({ ...p, effectValue: parseFloat(e.target.value) }))} /></F>
            <F label="Effect Type 2">
              <select value={String(editData.effectType2 ?? '')} className="w-full ia"
                onChange={e => setEditData(p => ({ ...p, effectType2: e.target.value }))}>
                <option value="">— None —</option>
                {EFFECT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </F>
            <F label="Effect Value 2"><input type="number" step="0.1" value={Number(editData.effectValue2 ?? 0)} className="w-full ia"
              disabled={!editData.effectType2}
              onChange={e => setEditData(p => ({ ...p, effectValue2: parseFloat(e.target.value) }))} /></F>
          </div>
          <div className="flex gap-2 pt-1">
            <Btn onClick={saveGroup}>Save all</Btn>
            <Btn secondary onClick={() => setEditGroup(null)}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {editTpl && (
        <Modal title={isTplNew ? `New ${typeLabel}` : `Edit — ${editTpl.name}`} onClose={() => setEditTpl(null)}>

          {/* ID */}
          {isTplNew ? (
            <F label={<>Custom ID <span className="text-gray-600">(optional)</span></>}>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600 font-mono">
                  {itemTab === 'equipment' ? 'equip-' : 'upgrade-'}
                </span>
                <input value={editTpl.customId} className="flex-1 ia font-mono"
                  placeholder="mining-drill-plus"
                  onChange={e => setEditTpl(p => ({ ...p!, customId: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} />
              </div>
              <p className="text-xs text-gray-600 mt-1 font-mono">
                Final ID:{' '}
                <span className="text-gray-400">
                  {itemTab === 'equipment' ? 'equip' : 'upgrade'}-{editTpl.customId || editTpl.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '…'}
                </span>
              </p>
            </F>
          ) : (
            <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-800 rounded px-3 py-1.5">
              <span className="text-xs text-gray-500">ID:</span>
              <span className="text-xs font-mono text-gray-300 flex-1">{editTpl.id}</span>
              <button onClick={() => navigator.clipboard.writeText(editTpl.id ?? '')}
                className="text-xs text-gray-600 hover:text-purple-400 transition-colors">copy</button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <F label="Name"><input value={editTpl.name} className="w-full ia" placeholder="e.g. Mining Drill+"
              onChange={e => setEditTpl(p => ({ ...p!, name: e.target.value }))} /></F>
            <F label="Rarity">
              <select value={editTpl.rarity} className="w-full ia"
                onChange={e => setEditTpl(p => ({ ...p!, rarity: e.target.value }))}>
                {RARITIES.map(r => <option key={r}>{r}</option>)}
              </select>
            </F>
          </div>
          <F label="Collection tag">
            <select value={editTpl.collection} className="w-full ia"
              onChange={e => setEditTpl(p => ({ ...p!, collection: e.target.value }))}>
              <option value="">— No collection —</option>
              {collections.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {editTpl.collection && <CollectionChip name={editTpl.collection} />}
          </F>
          <p className="text-xs text-gray-500">Primary Effect</p>
          <div className="grid grid-cols-2 gap-3">
            <F label="Effect Type">
              <select value={editTpl.effectType} className="w-full ia"
                onChange={e => setEditTpl(p => ({ ...p!, effectType: e.target.value }))}>
                <option value="">— Select —</option>
                {EFFECT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </F>
            <F label="Effect Value"><input type="number" step="0.1" value={editTpl.effectValue} className="w-full ia"
              onChange={e => setEditTpl(p => ({ ...p!, effectValue: parseFloat(e.target.value) }))} /></F>
          </div>
          <p className="text-xs text-gray-500">Secondary Effect (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            <F label="Effect Type 2">
              <select value={editTpl.effectType2} className="w-full ia"
                onChange={e => setEditTpl(p => ({ ...p!, effectType2: e.target.value }))}>
                <option value="">— None —</option>
                {EFFECT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </F>
            <F label="Effect Value 2"><input type="number" step="0.1" value={editTpl.effectValue2} className="w-full ia"
              disabled={!editTpl.effectType2}
              onChange={e => setEditTpl(p => ({ ...p!, effectValue2: parseFloat(e.target.value) }))} /></F>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Price (CRATE)"><input type="number" step="0.001" min={0} value={editTpl.price} className="w-full ia"
              onChange={e => setEditTpl(p => ({ ...p!, price: parseFloat(e.target.value) }))} /></F>
            <F label="Active in shop">
              <select value={editTpl.active ? 'yes' : 'no'} className="w-full ia"
                onChange={e => setEditTpl(p => ({ ...p!, active: e.target.value === 'yes' }))}>
                <option value="no">No (airdrop only)</option>
                <option value="yes">Yes (visible in shop)</option>
              </select>
            </F>
          </div>
          <div className="flex gap-2 pt-1">
            <Btn onClick={saveTpl}>Save</Btn>
            <Btn secondary onClick={() => setEditTpl(null)}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {airdropId && (
        <Modal title={`Airdrop ${typeLabel}`} onClose={() => { setAirdropId(null); setAirdropUser(''); setAirdropMsg('') }}>
          <p className="text-xs text-gray-400">{templates.find(t => t.id === airdropId)?.name}</p>
          <F label="Player User ID">
            <input value={airdropUser} onChange={e => setAirdropUser(e.target.value)}
              className="w-full ia font-mono" placeholder="UUID from Players page…" />
          </F>
          {airdropMsg && <p className={`text-xs font-mono ${airdropMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>{airdropMsg}</p>}
          <div className="flex gap-2">
            <Btn onClick={sendAirdrop}>Send</Btn>
            <Btn secondary onClick={() => { setAirdropId(null); setAirdropUser(''); setAirdropMsg('') }}>Close</Btn>
          </div>
        </Modal>
      )}

      {/* ── Lists ────────────────────────────────────────────────────────────── */}

      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : (
        <>
          {view === 'in-game' && (
            <div className="space-y-1.5">
              {groups.length === 0 && <p className="text-gray-500 text-sm">No items found.</p>}
              {groups.map((g, i) => (
                <div key={i} className="bg-[#0d0d1a] border border-purple-900/20 rounded-lg p-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-200">{g.name}</span>
                      <span className={`text-xs font-bold ${RARITY_COLOR[g.rarity]}`}>{g.rarity}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {g.collection ? <CollectionChip name={g.collection} /> : null}
                      <span className="text-xs text-gray-500">{g.effectType}: {g.effectValue}</span>
                      {g.effectType2 && <span className="text-xs text-gray-500">{g.effectType2}: {g.effectValue2}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 text-center">
                    <div className="text-lg font-bold text-purple-300">{g.ownerCount}</div>
                    <div className="text-xs text-gray-600">in game</div>
                  </div>
                  <button onClick={() => startEditGroup(g)}
                    className="shrink-0 px-3 py-1.5 text-xs border border-gray-700 text-gray-300 rounded hover:bg-gray-800">
                    Edit all
                  </button>
                </div>
              ))}
            </div>
          )}

          {view === 'templates' && (
            <div className="space-y-1.5">
              {templates.length === 0 && <p className="text-gray-500 text-sm">No templates yet. Click + New {typeLabel} to create one.</p>}
              {templates.map(t => (
                <div key={t.id}
                  className={`bg-[#0d0d1a] border rounded-lg p-3 flex items-center gap-4 ${
                    t.active ? 'border-purple-900/30' : 'border-gray-800/40 opacity-70'
                  }`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-200">{t.name}</span>
                      <span className={`text-xs font-bold ${RARITY_COLOR[t.rarity]}`}>{t.rarity}</span>
                      {t.active
                        ? <span className="text-xs bg-green-900/30 text-green-400 px-1.5 rounded">In Shop</span>
                        : <span className="text-xs bg-gray-800 text-gray-500 px-1.5 rounded">Airdrop only</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {t.metadata.collection ? <CollectionChip name={t.metadata.collection} /> : null}
                      {t.metadata.effectType && <span className="text-xs text-gray-500">{t.metadata.effectType}: {t.metadata.effectValue}</span>}
                      {t.metadata.effectType2 && <span className="text-xs text-gray-500">{t.metadata.effectType2}: {t.metadata.effectValue2}</span>}
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
                      className="px-2 py-1 text-xs border border-purple-700/40 text-purple-400 rounded hover:bg-purple-900/20">Airdrop</button>
                    <button onClick={() => toggleTpl(t)}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${t.active ? 'border-yellow-700/40 text-yellow-400 hover:bg-yellow-900/20' : 'border-green-700/40 text-green-400 hover:bg-green-900/20'}`}>
                      {t.active ? 'Remove' : 'Add to shop'}
                    </button>
                    <button onClick={() => openEditTpl(t)}
                      className="px-2 py-1 text-xs border border-gray-700 text-gray-300 rounded hover:bg-gray-800">Edit</button>
                    <button onClick={() => delTpl(t.id, t.name)}
                      className="px-2 py-1 text-xs border border-red-900 text-red-400 rounded hover:bg-red-900/20">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <style jsx global>{`
        .ia { background:#111122;border:1px solid #2d2d50;border-radius:4px;padding:4px 8px;font-size:12px;color:#d1d5db;outline:none; }
        .ia:focus { border-color:#7c3aed; }
        .ia:disabled { opacity:.4;cursor:not-allowed; }
      `}</style>
    </div>
  )
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function ViewTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-1.5 text-xs rounded border transition-colors ${active ? 'bg-purple-800/60 border-purple-600 text-purple-200' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
      {children}
    </button>
  )
}

function CollectionChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-900/30 border border-purple-800/40 text-purple-300">
      🏷 {name}
    </span>
  )
}

function Modal({ title, warning, onClose, children }: { title: string; warning?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg p-5 w-full max-w-md my-4 space-y-3">
        <h2 className="text-sm font-bold text-purple-300">{title}</h2>
        {warning && <p className="text-xs text-yellow-400/80">⚠ {warning}</p>}
        {children}
      </div>
    </div>
  )
}

function F({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Btn({ onClick, secondary, children }: { onClick: () => void; secondary?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-1.5 text-sm rounded border transition-colors ${secondary ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-purple-800/60 border-purple-600 text-purple-200 hover:bg-purple-700/60'}`}>
      {children}
    </button>
  )
}
