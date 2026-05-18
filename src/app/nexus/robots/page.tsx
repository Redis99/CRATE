'use client'

import { useEffect, useState, useCallback } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

interface RobotGroup {
  name: string
  collection: string | null
  rarity: string
  ownerCount: number
  hashPower: number
  energyRate: number
  durability: number
}

interface RobotTemplate {
  id: string
  name: string
  description: string
  price: number
  rarity: string
  active: boolean
  metadata: {
    specific: boolean
    robotName: string
    robotCollection: string
    hashPower: number
    energyRate: number
    durability?: number
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const RARITIES = ['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY']
const RARITY_COLOR: Record<string, string> = {
  COMMON: 'text-gray-400', UNCOMMON: 'text-green-400',
  RARE: 'text-blue-400', EPIC: 'text-purple-400', LEGENDARY: 'text-yellow-400',
}

const EMPTY_TPL = {
  name: '', collection: '', rarity: 'COMMON',
  hashPower: 10, energyRate: 1, durability: 100,
  price: 0, active: false, description: '',
}

type View = 'in-game' | 'templates'

// ── Component ─────────────────────────────────────────────────────────────────

export default function RobotsAdminPage() {
  const [view, setView]               = useState<View>('in-game')
  const [rarity, setRarity]           = useState('ALL')
  const [groups, setGroups]           = useState<RobotGroup[]>([])
  const [templates, setTemplates]     = useState<RobotTemplate[]>([])
  const [collections, setCollections] = useState<string[]>([])
  const [loading, setLoading]         = useState(true)
  const [msg, setMsg]                 = useState('')

  // Edit (In Game — bulk)
  const [editGroup, setEditGroup]     = useState<RobotGroup | null>(null)
  const [editData, setEditData]       = useState<Record<string, unknown>>({})

  // Delete (In Game)
  const [delGroup, setDelGroup]       = useState<RobotGroup | null>(null)
  const [delConfirm, setDelConfirm]   = useState('')

  // New / Edit (Template)
  const [editTpl, setEditTpl]         = useState<typeof EMPTY_TPL & { id?: string } | null>(null)
  const [isTplNew, setIsTplNew]       = useState(false)

  // Airdrop
  const [airdropTplId, setAirdropTplId] = useState<string | null>(null)
  const [airdropUser, setAirdropUser]   = useState('')
  const [airdropMsg, setAirdropMsg]     = useState('')

  // Load
  const loadGroups = useCallback(async (r: string) => {
    setLoading(true)
    const p = new URLSearchParams({ type: 'robot', rarity: r })
    const res = await fetch(`/api/admin/inventory?${p}`)
    setGroups(await res.json())
    setLoading(false)
  }, [])

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/robots')
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
    if (view === 'in-game') loadGroups(rarity)
    else loadTemplates()
  }, [view, rarity, loadGroups, loadTemplates])

  // ── In-Game bulk edit ──────────────────────────────────────────────────────

  function startEditGroup(g: RobotGroup) {
    setEditGroup(g)
    setEditData({ name: g.name, collection: g.collection ?? '', rarity: g.rarity,
      hashPower: g.hashPower, energyRate: g.energyRate, durability: g.durability })
  }

  async function saveGroup() {
    if (!editGroup) return
    setMsg('Saving…')
    const r = await fetch('/api/admin/inventory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'robot', name: editGroup.name, rarity: editGroup.rarity, data: editData }),
    })
    const result = await r.json()
    if (r.ok) { setMsg(`✓ Updated ${result.updated} robot(s)`); setEditGroup(null); loadGroups(rarity) }
    else setMsg(`Error: ${result.error}`)
  }

  async function deleteGroup() {
    if (!delGroup || delConfirm !== delGroup.name) return
    setMsg('Deleting…')
    const r = await fetch('/api/admin/inventory', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'robot', name: delGroup.name, rarity: delGroup.rarity, confirm: delConfirm }),
    })
    const result = await r.json()
    if (r.ok) { setMsg(`✓ Deleted ${result.deleted} robot(s)`); setDelGroup(null); setDelConfirm(''); loadGroups(rarity) }
    else setMsg(`Error: ${result.error}`)
  }

  // ── Template CRUD ──────────────────────────────────────────────────────────

  function openNewTpl() { setEditTpl({ ...EMPTY_TPL }); setIsTplNew(true) }
  function openEditTpl(t: RobotTemplate) {
    setEditTpl({
      id: t.id, name: t.metadata.robotName, collection: t.metadata.robotCollection,
      rarity: t.rarity, hashPower: t.metadata.hashPower, energyRate: t.metadata.energyRate,
      durability: t.metadata.durability ?? 100,
      price: t.price, active: t.active, description: t.description,
    })
    setIsTplNew(false)
  }

  async function saveTpl() {
    if (!editTpl) return
    setMsg('Saving…')
    const r = await fetch('/api/admin/robots', {
      method: isTplNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editTpl),
    })
    if (r.ok) { setMsg('Saved!'); setEditTpl(null); loadTemplates() }
    else { const e = await r.json(); setMsg(`Error: ${e.error}`) }
  }

  async function delTpl(id: string, name: string) {
    if (!confirm(`Delete template "${name}"?`)) return
    await fetch('/api/admin/robots', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setMsg('Template deleted')
    loadTemplates()
  }

  async function toggleTpl(t: RobotTemplate) {
    await fetch('/api/admin/robots', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: t.id, name: t.metadata.robotName, collection: t.metadata.robotCollection,
        rarity: t.rarity, hashPower: t.metadata.hashPower, energyRate: t.metadata.energyRate,
        durability: t.metadata.durability, price: t.price, active: !t.active, description: t.description,
      }),
    })
    loadTemplates()
  }

  async function sendAirdrop() {
    if (!airdropTplId || !airdropUser.trim()) { setAirdropMsg('Enter a user ID'); return }
    setAirdropMsg('Sending…')
    const r = await fetch('/api/admin/robots/airdrop', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: airdropUser, robotItemId: airdropTplId }),
    })
    const d = await r.json()
    if (r.ok) setAirdropMsg(`✓ ${d.robot.name} sent!`)
    else setAirdropMsg(`Error: ${d.error}`)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-purple-300 font-mono">Robots</h1>
        {view === 'templates' && (
          <button onClick={openNewTpl}
            className="px-3 py-1.5 text-xs bg-purple-800/60 border border-purple-600 text-purple-200 rounded hover:bg-purple-700/60">
            + New Robot
          </button>
        )}
      </div>

      {/* View tabs */}
      <div className="flex gap-2">
        <ViewTab active={view === 'in-game'} onClick={() => setView('in-game')}>
          In Game
        </ViewTab>
        <ViewTab active={view === 'templates'} onClick={() => setView('templates')}>
          Templates / Shop
        </ViewTab>
      </div>

      {view === 'in-game' && (
        <p className="text-xs text-gray-500">
          All robot instances owned by players, grouped by type. Edit all = bulk update every copy.
        </p>
      )}
      {view === 'templates' && (
        <p className="text-xs text-gray-500">
          Admin-defined robot definitions. Active ones appear in the shop. Use Airdrop to give directly to a player.
        </p>
      )}

      {/* Rarity filter (in-game only) */}
      {view === 'in-game' && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Rarity:</span>
          {['ALL','COMMON','UNCOMMON','RARE','EPIC','LEGENDARY'].map(r => (
            <button key={r} onClick={() => setRarity(r)}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                rarity === r ? 'bg-purple-800/60 border-purple-600 text-purple-200'
                : 'border-gray-800 text-gray-500 hover:border-gray-600'
              }`}>
              {r}
            </button>
          ))}
        </div>
      )}

      {msg && <p className="text-xs font-mono text-yellow-400">{msg}</p>}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {/* Bulk edit modal (in-game) */}
      {editGroup && (
        <Modal title={`Edit all — ${editGroup.name}`}
          warning={`Will update ${editGroup.ownerCount} robot(s) across all players.`}
          onClose={() => setEditGroup(null)}>
          <div className="grid grid-cols-2 gap-3">
            <F label="Name"><input value={String(editData.name ?? '')} className="w-full ia"
              onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} /></F>
            <F label="Rarity">
              <select value={String(editData.rarity ?? 'COMMON')} className="w-full ia"
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
            {editData.collection && <CollectionChip name={String(editData.collection)} />}
          </F>
          <div className="grid grid-cols-3 gap-3">
            <F label="ER"><input type="number" step="0.1" value={Number(editData.hashPower ?? 0)} className="w-full ia"
              onChange={e => setEditData(p => ({ ...p, hashPower: parseFloat(e.target.value) }))} /></F>
            <F label="PD"><input type="number" step="0.1" value={Number(editData.energyRate ?? 0)} className="w-full ia"
              onChange={e => setEditData(p => ({ ...p, energyRate: parseFloat(e.target.value) }))} /></F>
            <F label="Energia (Durability)"><input type="number" step="1" min={0} value={Number(editData.durability ?? 100)} className="w-full ia"
              onChange={e => setEditData(p => ({ ...p, durability: parseFloat(e.target.value) }))} /></F>
          </div>
          <div className="flex gap-2 pt-1">
            <Btn onClick={saveGroup}>Save all</Btn>
            <Btn secondary onClick={() => setEditGroup(null)}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {/* Delete confirmation modal */}
      {delGroup && (
        <Modal title="⚠ Permanent Delete" danger
          onClose={() => { setDelGroup(null); setDelConfirm('') }}>
          <p className="text-xs text-gray-300">
            This will permanently remove all <strong>{delGroup.ownerCount}</strong> instance(s) of{' '}
            <strong className="text-gray-200">{delGroup.name}</strong> ({delGroup.rarity}) from every player. Cannot be undone.
          </p>
          <F label={<>Type <span className="text-red-400 font-mono">{delGroup.name}</span> to confirm:</>}>
            <input value={delConfirm} onChange={e => setDelConfirm(e.target.value)}
              className="w-full ia border-red-900/60" placeholder={delGroup.name} autoFocus />
          </F>
          <div className="flex gap-2">
            <button onClick={deleteGroup} disabled={delConfirm !== delGroup.name}
              className="flex-1 px-3 py-2 text-sm bg-red-900/50 border border-red-700 text-red-300 rounded hover:bg-red-900/70 disabled:opacity-30 disabled:cursor-not-allowed">
              Delete permanently
            </button>
            <Btn secondary onClick={() => { setDelGroup(null); setDelConfirm('') }}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {/* Template create/edit modal */}
      {editTpl && (
        <Modal title={isTplNew ? 'New Robot' : 'Edit Template'}
          onClose={() => setEditTpl(null)}>
          <div className="grid grid-cols-2 gap-3">
            <F label="Name"><input value={editTpl.name} className="w-full ia"
              onChange={e => setEditTpl(p => ({ ...p!, name: e.target.value }))}
              placeholder="e.g. Sentinel Mk.VII" /></F>
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
          <div className="grid grid-cols-3 gap-3">
            <F label="ER"><input type="number" step="0.1" value={editTpl.hashPower} className="w-full ia"
              onChange={e => setEditTpl(p => ({ ...p!, hashPower: parseFloat(e.target.value) }))} /></F>
            <F label="PD"><input type="number" step="0.1" value={editTpl.energyRate} className="w-full ia"
              onChange={e => setEditTpl(p => ({ ...p!, energyRate: parseFloat(e.target.value) }))} /></F>
            <F label="Energia"><input type="number" step="1" min={0} value={editTpl.durability} className="w-full ia"
              onChange={e => setEditTpl(p => ({ ...p!, durability: parseFloat(e.target.value) }))} /></F>
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
          <F label="Description"><input value={editTpl.description} className="w-full ia"
            placeholder="Optional shop description"
            onChange={e => setEditTpl(p => ({ ...p!, description: e.target.value }))} /></F>
          <div className="flex gap-2 pt-1">
            <Btn onClick={saveTpl}>Save</Btn>
            <Btn secondary onClick={() => setEditTpl(null)}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {/* Airdrop modal */}
      {airdropTplId && (
        <Modal title="Airdrop Robot" onClose={() => { setAirdropTplId(null); setAirdropUser(''); setAirdropMsg('') }}>
          <p className="text-xs text-gray-400">{templates.find(t => t.id === airdropTplId)?.name}</p>
          <F label="Player User ID">
            <input value={airdropUser} onChange={e => setAirdropUser(e.target.value)}
              className="w-full ia font-mono" placeholder="UUID from Players page…" />
          </F>
          {airdropMsg && <p className={`text-xs font-mono ${airdropMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>{airdropMsg}</p>}
          <div className="flex gap-2">
            <Btn onClick={sendAirdrop}>Send</Btn>
            <Btn secondary onClick={() => { setAirdropTplId(null); setAirdropUser(''); setAirdropMsg('') }}>Close</Btn>
          </div>
        </Modal>
      )}

      {/* ── Lists ───────────────────────────────────────────────────────────── */}

      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : (
        <>
          {/* IN GAME */}
          {view === 'in-game' && (
            <div className="space-y-1.5">
              {groups.length === 0 && <p className="text-gray-500 text-sm">No robots found.</p>}
              {groups.map((g, i) => (
                <div key={i} className="bg-[#0d0d1a] border border-purple-900/20 rounded-lg p-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-200">{g.name}</span>
                      <span className={`text-xs font-bold ${RARITY_COLOR[g.rarity]}`}>{g.rarity}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {g.collection
                        ? <CollectionChip name={g.collection} />
                        : <span className="text-xs text-gray-700 italic">No collection</span>}
                      <span className="text-xs text-gray-500">ER {g.hashPower}</span>
                      <span className="text-xs text-gray-500">PD {g.energyRate}</span>
                      <span className="text-xs text-gray-500">Energia {g.durability}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-center">
                    <div className="text-lg font-bold text-purple-300">{g.ownerCount}</div>
                    <div className="text-xs text-gray-600">in game</div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => startEditGroup(g)}
                      className="px-3 py-1.5 text-xs border border-gray-700 text-gray-300 rounded hover:bg-gray-800">
                      Edit all
                    </button>
                    <button onClick={() => { setDelGroup(g); setDelConfirm('') }}
                      className="px-3 py-1.5 text-xs border border-red-900/60 text-red-400 rounded hover:bg-red-900/20">
                      Delete all
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TEMPLATES */}
          {view === 'templates' && (
            <div className="space-y-1.5">
              {templates.length === 0 && (
                <p className="text-gray-500 text-sm">No templates yet. Click + New Robot to create one.</p>
              )}
              {templates.map(t => (
                <div key={t.id}
                  className={`bg-[#0d0d1a] border rounded-lg p-3 flex items-center gap-4 ${
                    t.active ? 'border-purple-900/30' : 'border-gray-800/40 opacity-70'
                  }`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-200">{t.metadata.robotName}</span>
                      <span className={`text-xs font-bold ${RARITY_COLOR[t.rarity]}`}>{t.rarity}</span>
                      {t.active
                        ? <span className="text-xs bg-green-900/30 text-green-400 px-1.5 rounded">In Shop</span>
                        : <span className="text-xs bg-gray-800 text-gray-500 px-1.5 rounded">Airdrop only</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {t.metadata.robotCollection
                        ? <CollectionChip name={t.metadata.robotCollection} />
                        : <span className="text-xs text-gray-700 italic">No collection</span>}
                      <span className="text-xs text-gray-500">ER {t.metadata.hashPower}</span>
                      <span className="text-xs text-gray-500">PD {t.metadata.energyRate}</span>
                      {t.metadata.durability != null && <span className="text-xs text-gray-500">Energia {t.metadata.durability}</span>}
                      <span className="text-xs text-purple-300">{t.price} CRATE</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => { setAirdropTplId(t.id); setAirdropUser(''); setAirdropMsg('') }}
                      className="px-2 py-1 text-xs border border-purple-700/40 text-purple-400 rounded hover:bg-purple-900/20">
                      Airdrop
                    </button>
                    <button onClick={() => toggleTpl(t)}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                        t.active
                          ? 'border-yellow-700/40 text-yellow-400 hover:bg-yellow-900/20'
                          : 'border-green-700/40 text-green-400 hover:bg-green-900/20'
                      }`}>
                      {t.active ? 'Remove from shop' : 'Add to shop'}
                    </button>
                    <button onClick={() => openEditTpl(t)}
                      className="px-2 py-1 text-xs border border-gray-700 text-gray-300 rounded hover:bg-gray-800">
                      Edit
                    </button>
                    <button onClick={() => delTpl(t.id, t.metadata.robotName)}
                      className="px-2 py-1 text-xs border border-red-900 text-red-400 rounded hover:bg-red-900/20">
                      Delete
                    </button>
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

// ── Shared helpers ────────────────────────────────────────────────────────────

function ViewTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-1.5 text-xs rounded border transition-colors ${
        active ? 'bg-purple-800/60 border-purple-600 text-purple-200' : 'border-gray-700 text-gray-400 hover:border-gray-500'
      }`}>
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

function Modal({ title, warning, danger, onClose, children }: {
  title: string; warning?: string; danger?: boolean; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className={`bg-[#0d0d1a] border rounded-lg p-5 w-full max-w-md my-4 space-y-3 ${danger ? 'border-red-800/60' : 'border-purple-800/50'}`}>
        <h2 className={`text-sm font-bold ${danger ? 'text-red-400' : 'text-purple-300'}`}>{title}</h2>
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
      className={`px-4 py-1.5 text-sm rounded border transition-colors ${
        secondary
          ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
          : 'bg-purple-800/60 border-purple-600 text-purple-200 hover:bg-purple-700/60'
      }`}>
      {children}
    </button>
  )
}
