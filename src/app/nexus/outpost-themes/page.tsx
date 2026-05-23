'use client'

import { useEffect, useState, useCallback } from 'react'

interface OutpostTheme {
  id: string
  slug: string
  name: string
  description: string
  layoutKey: string
  accentColor: string | null
  bgColor: string | null
  borderColor: string | null
  bannerText: string | null
  bannerSubtext: string | null
  bannerIcon: string | null
  startsAt: string | null
  endsAt: string | null
  active: boolean
  sortOrder: number
}

const LAYOUT_KEYS = ['default', 'halloween', 'christmas', 'solar-storm', 'new-year', 'easter']

const EMPTY_THEME = {
  slug: '', name: '', description: '', layoutKey: 'default',
  accentColor: '', bgColor: '', borderColor: '',
  bannerText: '', bannerSubtext: '', bannerIcon: '',
  startsAt: null as string | null, endsAt: null as string | null,
  active: false, sortOrder: 0,
}

export default function OutpostThemesAdminPage() {
  const [themes, setThemes]         = useState<OutpostTheme[]>([])
  const [currentSlug, setCurrentSlug] = useState('default')
  const [source, setSource]         = useState<'forced' | 'scheduled' | 'fallback'>('fallback')
  const [loading, setLoading]       = useState(true)
  const [msg, setMsg]               = useState('')

  const [editing, setEditing]       = useState<typeof EMPTY_THEME & { id?: string } | null>(null)
  const [isNew, setIsNew]           = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/outpost-themes')
    const data = await res.json()
    setThemes(data.themes ?? [])
    setCurrentSlug(data.currentSlug ?? 'default')
    setSource(data.source ?? 'fallback')
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() {
    setEditing({ ...EMPTY_THEME })
    setIsNew(true)
  }

  function openEdit(t: OutpostTheme) {
    setEditing({
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      layoutKey: t.layoutKey,
      accentColor: t.accentColor ?? '',
      bgColor: t.bgColor ?? '',
      borderColor: t.borderColor ?? '',
      bannerText: t.bannerText ?? '',
      bannerSubtext: t.bannerSubtext ?? '',
      bannerIcon: t.bannerIcon ?? '',
      startsAt: t.startsAt,
      endsAt: t.endsAt,
      active: t.active,
      sortOrder: t.sortOrder,
    })
    setIsNew(false)
  }

  async function save() {
    if (!editing) return
    setMsg('Saving…')
    const body = {
      ...editing,
      accentColor: editing.accentColor || null,
      bgColor:     editing.bgColor     || null,
      borderColor: editing.borderColor || null,
      bannerText:    editing.bannerText    || null,
      bannerSubtext: editing.bannerSubtext || null,
      bannerIcon:    editing.bannerIcon    || null,
    }
    const url = isNew
      ? '/api/admin/outpost-themes'
      : `/api/admin/outpost-themes/${editing.id}`
    const method = isNew ? 'POST' : 'PATCH'
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (r.ok) { setMsg('Saved!'); setEditing(null); load() }
    else { const e = await r.json().catch(() => ({})); setMsg(`Error: ${e.error ?? r.status}`) }
  }

  async function del(t: OutpostTheme) {
    if (t.slug === 'default') { setMsg('Cannot delete the default theme'); return }
    if (!confirm(`Delete theme "${t.name}"?`)) return
    const r = await fetch(`/api/admin/outpost-themes/${t.id}`, { method: 'DELETE' })
    if (r.ok) { setMsg('Deleted'); load() }
    else { const e = await r.json().catch(() => ({})); setMsg(`Error: ${e.error ?? r.status}`) }
  }

  async function activate(t: OutpostTheme) {
    setMsg(`Activating ${t.name}…`)
    const r = await fetch('/api/admin/outpost-themes/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: t.slug }),
    })
    if (r.ok) { setMsg(`✓ ${t.name} is now forced active`); load() }
    else { const e = await r.json().catch(() => ({})); setMsg(`Error: ${e.error ?? r.status}`) }
  }

  async function resetAuto() {
    setMsg('Resetting…')
    const r = await fetch('/api/admin/outpost-themes/auto', { method: 'POST' })
    if (r.ok) { setMsg('Back to auto-schedule'); load() }
    else setMsg('Error')
  }

  function themeStatus(t: OutpostTheme): { label: string; color: string } {
    if (t.slug === currentSlug) {
      return { label: source === 'forced' ? 'Active (forced)' : 'Active now', color: 'bg-green-900/30 text-green-400 border-green-700/40' }
    }
    const now = new Date()
    const starts = t.startsAt ? new Date(t.startsAt) : null
    const ends   = t.endsAt   ? new Date(t.endsAt)   : null
    if (t.active && starts && ends) {
      if (now < starts) {
        return { label: `Scheduled ${starts.toLocaleDateString()}–${ends.toLocaleDateString()}`, color: 'bg-blue-900/30 text-blue-400 border-blue-700/40' }
      }
      if (now > ends) {
        return { label: 'Expired', color: 'bg-gray-800 text-gray-500 border-gray-700/40' }
      }
    }
    if (!t.active) {
      return { label: 'Inactive', color: 'bg-gray-800 text-gray-500 border-gray-700/40' }
    }
    return { label: 'Available', color: 'bg-gray-800/60 text-gray-400 border-gray-700/40' }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-purple-300 font-mono">Outpost Themes</h1>
        <button onClick={openNew}
          className="px-3 py-1.5 text-xs bg-purple-800/60 border border-purple-600 text-purple-200 rounded hover:bg-purple-700/60">
          + New theme
        </button>
      </div>

      {/* Current active theme banner */}
      <div className={`border rounded-lg p-3 flex items-center justify-between gap-3 ${
        source === 'forced' ? 'bg-yellow-900/10 border-yellow-700/40' : 'bg-purple-900/10 border-purple-700/40'
      }`}>
        <div className="text-xs">
          <span className="text-gray-500">Current theme:</span>
          <span className="ml-2 font-mono text-gray-200">{currentSlug}</span>
          <span className="ml-2 text-gray-500">
            {source === 'forced'    && '· forced by admin'}
            {source === 'scheduled' && '· scheduled'}
            {source === 'fallback'  && '· fallback (no active theme)'}
          </span>
        </div>
        {source === 'forced' && (
          <button onClick={resetAuto}
            className="px-3 py-1 text-xs border border-yellow-700/60 text-yellow-300 rounded hover:bg-yellow-900/20">
            Reset to auto-schedule
          </button>
        )}
      </div>

      {msg && <p className="text-xs text-yellow-400 font-mono">{msg}</p>}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg p-5 w-full max-w-2xl my-4 space-y-3">
            <h2 className="text-sm font-bold text-purple-300">{isNew ? 'New Theme' : `Edit — ${editing.name}`}</h2>

            <div className="grid grid-cols-2 gap-3">
              <F label="Name">
                <input value={editing.name} className="w-full ia" placeholder="Halloween 2026"
                  onChange={e => setEditing(p => p && ({ ...p, name: e.target.value }))} />
              </F>
              <F label="Slug (unique ID)">
                <input value={editing.slug} className="w-full ia font-mono"
                  placeholder="halloween-2026"
                  disabled={!isNew && editing.slug === 'default'}
                  onChange={e => setEditing(p => p && ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} />
              </F>
            </div>

            <F label="Description">
              <textarea value={editing.description} rows={2} className="w-full ia"
                onChange={e => setEditing(p => p && ({ ...p, description: e.target.value }))} />
            </F>

            <div className="grid grid-cols-2 gap-3">
              <F label="Layout Key (component in code)">
                <select value={editing.layoutKey} className="w-full ia font-mono"
                  onChange={e => setEditing(p => p && ({ ...p, layoutKey: e.target.value }))}>
                  {LAYOUT_KEYS.map(k => <option key={k}>{k}</option>)}
                </select>
              </F>
              <F label="Sort Order">
                <input type="number" value={editing.sortOrder} className="w-full ia"
                  onChange={e => setEditing(p => p && ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))} />
              </F>
            </div>

            <p className="text-xs text-gray-500 pt-1">Colors (hex, e.g. #ff6b00) — leave empty to use layout defaults</p>
            <div className="grid grid-cols-3 gap-3">
              <F label="Accent">
                <div className="flex gap-1.5 items-center">
                  <input type="color" value={editing.accentColor || '#7c3aed'} className="w-9 h-7 bg-transparent border border-gray-700 rounded cursor-pointer"
                    onChange={e => setEditing(p => p && ({ ...p, accentColor: e.target.value }))} />
                  <input value={editing.accentColor} className="flex-1 ia font-mono" placeholder="#ff6b00"
                    onChange={e => setEditing(p => p && ({ ...p, accentColor: e.target.value }))} />
                </div>
              </F>
              <F label="Background">
                <div className="flex gap-1.5 items-center">
                  <input type="color" value={editing.bgColor || '#0d0d1a'} className="w-9 h-7 bg-transparent border border-gray-700 rounded cursor-pointer"
                    onChange={e => setEditing(p => p && ({ ...p, bgColor: e.target.value }))} />
                  <input value={editing.bgColor} className="flex-1 ia font-mono" placeholder="#0d0d1a"
                    onChange={e => setEditing(p => p && ({ ...p, bgColor: e.target.value }))} />
                </div>
              </F>
              <F label="Border">
                <div className="flex gap-1.5 items-center">
                  <input type="color" value={editing.borderColor || '#2d2d50'} className="w-9 h-7 bg-transparent border border-gray-700 rounded cursor-pointer"
                    onChange={e => setEditing(p => p && ({ ...p, borderColor: e.target.value }))} />
                  <input value={editing.borderColor} className="flex-1 ia font-mono" placeholder="#2d2d50"
                    onChange={e => setEditing(p => p && ({ ...p, borderColor: e.target.value }))} />
                </div>
              </F>
            </div>

            <p className="text-xs text-gray-500 pt-1">Banner (optional — shown at top of Outpost)</p>
            <div className="grid grid-cols-[60px_1fr_1fr] gap-3">
              <F label="Icon">
                <input value={editing.bannerIcon} className="w-full ia text-center" placeholder="🎃"
                  onChange={e => setEditing(p => p && ({ ...p, bannerIcon: e.target.value }))} />
              </F>
              <F label="Text">
                <input value={editing.bannerText} className="w-full ia" placeholder="Halloween event!"
                  onChange={e => setEditing(p => p && ({ ...p, bannerText: e.target.value }))} />
              </F>
              <F label="Subtext">
                <input value={editing.bannerSubtext} className="w-full ia" placeholder="Ends in 3 days"
                  onChange={e => setEditing(p => p && ({ ...p, bannerSubtext: e.target.value }))} />
              </F>
            </div>

            <p className="text-xs text-gray-500 pt-1">Schedule</p>
            <div className="grid grid-cols-3 gap-3">
              <F label="Starts At">
                <input type="datetime-local" className="w-full ia"
                  value={editing.startsAt?.slice(0,16) ?? ''}
                  onChange={e => setEditing(p => p && ({ ...p, startsAt: e.target.value ? new Date(e.target.value).toISOString() : null }))} />
              </F>
              <F label="Ends At">
                <input type="datetime-local" className="w-full ia"
                  value={editing.endsAt?.slice(0,16) ?? ''}
                  onChange={e => setEditing(p => p && ({ ...p, endsAt: e.target.value ? new Date(e.target.value).toISOString() : null }))} />
              </F>
              <F label="Active">
                <select value={editing.active ? 'yes' : 'no'} className="w-full ia"
                  onChange={e => setEditing(p => p && ({ ...p, active: e.target.value === 'yes' }))}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </F>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={save}
                className="px-4 py-1.5 text-sm bg-purple-800/60 border border-purple-600 text-purple-200 rounded hover:bg-purple-700/60">Save</button>
              <button onClick={() => setEditing(null)}
                className="px-4 py-1.5 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Theme list */}
      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : themes.length === 0 ? (
        <p className="text-gray-500 text-sm">No themes yet. Click + New theme or run <code className="text-yellow-300">Seed Outpost Themes</code> in the dashboard.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {themes.map(t => {
            const status = themeStatus(t)
            const isActive = t.slug === currentSlug
            return (
              <div key={t.id}
                className={`bg-[#0d0d1a] border rounded-lg p-4 space-y-2 ${
                  isActive ? 'border-purple-700/60' : 'border-purple-900/20'
                }`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-200">{t.name}</span>
                      <code className="text-xs text-gray-600">{t.slug}</code>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded border shrink-0 ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                {/* Banner preview */}
                {t.bannerText && (
                  <div className="bg-gray-900/40 border border-gray-800 rounded px-2 py-1.5 flex items-center gap-2">
                    {t.bannerIcon && <span className="text-lg">{t.bannerIcon}</span>}
                    <div className="min-w-0">
                      <p className="text-xs text-gray-200 truncate">{t.bannerText}</p>
                      {t.bannerSubtext && <p className="text-xs text-gray-500 truncate">{t.bannerSubtext}</p>}
                    </div>
                  </div>
                )}

                {/* Layout key + color swatches */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded font-mono">{t.layoutKey}</span>
                  <div className="flex items-center gap-1.5">
                    <Swatch color={t.accentColor} label="A" />
                    <Swatch color={t.bgColor} label="B" />
                    <Swatch color={t.borderColor} label="◻" />
                  </div>
                </div>

                {/* Schedule */}
                {(t.startsAt || t.endsAt) && (
                  <p className="text-xs text-gray-600">
                    {t.startsAt && new Date(t.startsAt).toLocaleString()}
                    {(t.startsAt || t.endsAt) && ' – '}
                    {t.endsAt   && new Date(t.endsAt).toLocaleString()}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-1.5 pt-1">
                  <button onClick={() => openEdit(t)}
                    className="flex-1 px-2 py-1 text-xs border border-gray-700 text-gray-300 rounded hover:bg-gray-800">
                    Edit
                  </button>
                  <button onClick={() => activate(t)} disabled={isActive && source === 'forced'}
                    className="flex-1 px-2 py-1 text-xs border border-purple-700/40 text-purple-300 rounded hover:bg-purple-900/20 disabled:opacity-30 disabled:cursor-not-allowed">
                    {isActive && source === 'forced' ? 'Activated' : 'Activate now'}
                  </button>
                  {t.slug !== 'default' && (
                    <button onClick={() => del(t)}
                      className="px-2 py-1 text-xs border border-red-900 text-red-400 rounded hover:bg-red-900/20">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style jsx global>{`
        .ia { background:#111122;border:1px solid #2d2d50;border-radius:4px;padding:4px 8px;font-size:12px;color:#d1d5db;outline:none; }
        .ia:focus { border-color:#7c3aed; }
        .ia:disabled { opacity:.5; cursor:not-allowed; }
      `}</style>
    </div>
  )
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs text-gray-500 mb-1">{label}</label>{children}</div>
}

function Swatch({ color, label }: { color: string | null; label: string }) {
  if (!color) {
    return <span className="w-5 h-5 rounded border border-dashed border-gray-700 flex items-center justify-center text-xs text-gray-700">{label}</span>
  }
  return (
    <span title={color}
      className="w-5 h-5 rounded border border-gray-700 flex items-center justify-center text-[10px] font-bold"
      style={{ background: color, color: '#000', textShadow: '0 0 2px rgba(255,255,255,0.5)' }}>
      {label}
    </span>
  )
}
