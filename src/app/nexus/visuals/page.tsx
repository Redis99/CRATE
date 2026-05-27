'use client'

import { useState, useEffect, useCallback } from 'react'
import { ItemSprite } from '@/components/ui/ItemSprite'
import {
  VISUAL_KEYS_BY_CATEGORY,
  type VisualCategory,
  type ItemVisualData,
} from '@/lib/item-visual-keys'

// ─── Types ────────────────────────────────────────────────────────────────────

const CATEGORIES: { value: VisualCategory; label: string }[] = [
  { value: 'robot',       label: '🤖 Robots'        },
  { value: 'equipment',   label: '🔧 Equipment'     },
  { value: 'baseUpgrade', label: '🏗️ Base Upgrades' },
  { value: 'part',        label: '🔩 Parts'         },
  { value: 'consumable',  label: '🔋 Consumables'   },
  { value: 'lootbox',     label: '📦 Lootboxes'     },
]

const RARITIES = ['', 'COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']

const EMPTY_FORM = {
  category:        'robot' as VisualCategory,
  key:             '',
  rarity:          '',
  label:           '',
  imageUrl:        '',
  spriteIdleUrl:   '',
  spriteActiveUrl: '',
  spriteLowUrl:    '',
  frameWidth:      128,
  frameHeight:     128,
  frameCount:      1,
  fps:             8,
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VisualsAdminPage() {
  const [visuals, setVisuals]         = useState<ItemVisualData[]>([])
  const [loading, setLoading]         = useState(true)
  const [filterCat, setFilterCat]     = useState<VisualCategory | ''>('')
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [showForm, setShowForm]       = useState(false)
  const [form, setForm]               = useState({ ...EMPTY_FORM })
  const [saving, setSaving]           = useState(false)
  const [msg, setMsg]                 = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/admin/item-visuals')
    if (r.ok) setVisuals(await r.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Filtra por categoria
  const filtered = filterCat
    ? visuals.filter((v) => v.category === filterCat)
    : visuals

  // Abre form de edição
  function openEdit(v: ItemVisualData) {
    setEditingId(v.id)
    setForm({
      category:        v.category,
      key:             v.key,
      rarity:          v.rarity ?? '',
      label:           v.label  ?? '',
      imageUrl:        v.imageUrl        ?? '',
      spriteIdleUrl:   v.spriteIdleUrl   ?? '',
      spriteActiveUrl: v.spriteActiveUrl ?? '',
      spriteLowUrl:    v.spriteLowUrl    ?? '',
      frameWidth:      v.frameWidth,
      frameHeight:     v.frameHeight,
      frameCount:      v.frameCount,
      fps:             v.fps,
    })
    setShowForm(true)
    setMsg('')
  }

  // Abre form de criação
  function openCreate() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setShowForm(true)
    setMsg('')
  }

  async function handleSave() {
    setSaving(true)
    setMsg('')
    const payload = {
      ...form,
      rarity:     form.rarity     || null,
      label:      form.label      || null,
      imageUrl:   form.imageUrl   || null,
      spriteIdleUrl:   form.spriteIdleUrl   || null,
      spriteActiveUrl: form.spriteActiveUrl || null,
      spriteLowUrl:    form.spriteLowUrl    || null,
      frameWidth:  Number(form.frameWidth),
      frameHeight: Number(form.frameHeight),
      frameCount:  Number(form.frameCount),
      fps:         Number(form.fps),
    }

    const url    = editingId ? `/api/admin/item-visuals/${editingId}` : '/api/admin/item-visuals'
    const method = editingId ? 'PATCH' : 'POST'
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await r.json()

    if (!r.ok) {
      setMsg(data.error ?? 'Error saving.')
    } else {
      setMsg('Saved!')
      setShowForm(false)
      load()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this visual?')) return
    await fetch(`/api/admin/item-visuals/${id}`, { method: 'DELETE' })
    load()
  }

  // Chaves disponíveis para a categoria selecionada no form
  const availableKeys = VISUAL_KEYS_BY_CATEGORY[form.category] ?? []

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Item Visuals</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Sprites e ícones exibidos nos cards do jogo. Sem visual configurado, o card mostra o fallback padrão.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
        >
          + New Visual
        </button>
      </div>

      {/* Filtro por categoria */}
      <div className="flex gap-2 flex-wrap mb-4">
        <button
          onClick={() => setFilterCat('')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            filterCat === '' ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          All ({visuals.length})
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilterCat(c.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterCat === c.value ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {c.label} ({visuals.filter((v) => v.category === c.value).length})
          </button>
        ))}
      </div>

      {/* Mensagem */}
      {msg && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${
          msg.startsWith('Save') ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'
        }`}>
          {msg}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mb-6 bg-gray-900 border border-gray-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">
            {editingId ? 'Edit Visual' : 'New Visual'}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as VisualCategory, key: '' })}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Key */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Key *</label>
              <select
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2"
              >
                <option value="">— select key —</option>
                {availableKeys.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
              {/* Permite digitar chave customizada (ex: templateId) */}
              <input
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder="Or type custom key (templateId, etc.)"
                className="mt-1 w-full bg-gray-800 border border-gray-600 text-white text-xs rounded-lg px-3 py-1.5 placeholder-gray-600"
              />
            </div>

            {/* Rarity */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Rarity (optional)</label>
              <select
                value={form.rarity}
                onChange={(e) => setForm({ ...form, rarity: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2"
              >
                {RARITIES.map((r) => (
                  <option key={r} value={r}>{r || '— all rarities —'}</option>
                ))}
              </select>
            </div>

            {/* Label */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Label (friendly name)</label>
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Ex: Sentinel Standard"
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600"
              />
            </div>

            {/* Image URL */}
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Image URL (static icon)</label>
              <input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://..."
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600"
              />
            </div>
          </div>

          {/* Sprite fields — só para robots */}
          {form.category === 'robot' && (
            <div className="mt-4 border-t border-gray-800 pt-4">
              <p className="text-xs text-gray-500 mb-3">Sprite sheets (PNG horizontal — frames lado a lado)</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Sprite Idle URL</label>
                  <input value={form.spriteIdleUrl} onChange={(e) => setForm({ ...form, spriteIdleUrl: e.target.value })}
                    placeholder="https://..." className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Sprite Active (mining) URL</label>
                  <input value={form.spriteActiveUrl} onChange={(e) => setForm({ ...form, spriteActiveUrl: e.target.value })}
                    placeholder="https://..." className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Sprite Low Energy URL</label>
                  <input value={form.spriteLowUrl} onChange={(e) => setForm({ ...form, spriteLowUrl: e.target.value })}
                    placeholder="https://..." className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600" />
                </div>
              </div>

              {/* Sprite config */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                {(['frameWidth', 'frameHeight', 'frameCount', 'fps'] as const).map((f) => (
                  <div key={f}>
                    <label className="block text-xs text-gray-400 mb-1">{f}</label>
                    <input
                      type="number" min={1}
                      value={form[f]}
                      onChange={(e) => setForm({ ...form, [f]: Number(e.target.value) })}
                      className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {(form.imageUrl) && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs text-gray-500">Preview:</span>
              <ItemSprite
                visual={{
                  id: '__preview__',
                  category: form.category,
                  key: form.key,
                  rarity: form.rarity || null,
                  label: form.label || null,
                  imageUrl: form.imageUrl || null,
                  spriteIdleUrl: null, spriteActiveUrl: null, spriteLowUrl: null,
                  frameWidth: form.frameWidth, frameHeight: form.frameHeight,
                  frameCount: form.frameCount, fps: form.fps,
                }}
                size={64}
                alt="preview"
              />
            </div>
          )}

          <div className="flex gap-3 mt-5">
            <button
              onClick={handleSave}
              disabled={saving || !form.key}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">🖼️</p>
          <p className="text-sm">No visuals configured yet.</p>
          <p className="text-xs mt-1">Click "New Visual" to add the first sprite or icon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((v) => (
            <div key={v.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex gap-3 items-start">
              {/* Preview icon */}
              <ItemSprite visual={v} size={48} alt={v.label ?? v.key} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{v.label ?? v.key}</p>
                <p className="text-gray-500 text-xs">{v.category} · {v.rarity ?? 'all rarities'}</p>
                <p className="text-gray-600 text-xs truncate mt-0.5">{v.key}</p>
                {/* Sprite indicator */}
                {(v.spriteIdleUrl || v.spriteActiveUrl) && (
                  <p className="text-indigo-400 text-xs mt-1">
                    🎞 Animated ({v.frameCount}fr @ {v.fps}fps)
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button
                  onClick={() => openEdit(v)}
                  className="text-xs text-gray-500 hover:text-indigo-400 transition-colors px-2 py-1 rounded hover:bg-indigo-500/10"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(v.id)}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                >
                  Del
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
