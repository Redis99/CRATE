'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import {
  VISUAL_KEYS_BY_CATEGORY,
  ROBOT_COLLECTION_KEYS,
  EQUIPMENT_EFFECT_KEYS,
  PART_CATEGORY_KEYS,
  CONSUMABLE_KEYS,
  LOOTBOX_KEYS,
  type VisualCategory,
  type ItemVisualData,
} from '@/lib/item-visual-keys'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { value: VisualCategory; label: string }[] = [
  { value: 'robot',       label: '🤖 Robots'         },
  { value: 'equipment',   label: '🔧 Equipment'      },
  { value: 'baseUpgrade', label: '🏗️ Base Upgrades'  },
  { value: 'part',        label: '🔩 Parts'          },
  { value: 'consumable',  label: '🔋 Consumables'    },
  { value: 'lootbox',     label: '📦 Lootboxes'      },
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

// ─── Upload helper ────────────────────────────────────────────────────────────

type SpriteField = 'imageUrl' | 'spriteIdleUrl' | 'spriteActiveUrl' | 'spriteLowUrl'

const FIELD_TO_STORAGE: Record<SpriteField, 'image' | 'idle' | 'active' | 'low'> = {
  imageUrl:        'image',
  spriteIdleUrl:   'idle',
  spriteActiveUrl: 'active',
  spriteLowUrl:    'low',
}

const FIELD_LABEL: Record<SpriteField, string> = {
  imageUrl:        'Static icon',
  spriteIdleUrl:   'Sprite: Idle',
  spriteActiveUrl: 'Sprite: Active (mining)',
  spriteLowUrl:    'Sprite: Low energy',
}

// ─── Upload Button ────────────────────────────────────────────────────────────

interface UploadButtonProps {
  category:  VisualCategory
  keyValue:  string
  field:     SpriteField
  onUploaded: (url: string) => void
}

function UploadButton({ category, keyValue, field, onUploaded }: UploadButtonProps) {
  const inputRef  = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!keyValue) { setError('Set the key first.'); return }

    setLoading(true)
    setError('')

    const body = new FormData()
    body.append('file',     file)
    body.append('category', category)
    body.append('key',      keyValue)
    body.append('field',    FIELD_TO_STORAGE[field])

    const r = await fetch('/api/admin/item-visuals/upload', { method: 'POST', body })
    const data = await r.json()

    if (!r.ok) {
      setError(data.error ?? 'Upload failed.')
    } else {
      onUploaded(data.url)
    }
    setLoading(false)
    // Reset input so same file can be re-uploaded
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        disabled={loading || !keyValue}
        onClick={() => inputRef.current?.click()}
        className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-200 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
        title={!keyValue ? 'Select a key first' : 'Upload PNG to Supabase Storage'}
      >
        {loading ? (
          <>
            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/>
            </svg>
            Uploading…
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            Upload
          </>
        )}
      </button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}

// ─── URL Field with Upload ────────────────────────────────────────────────────

interface UrlFieldProps {
  label:     string
  field:     SpriteField
  value:     string
  category:  VisualCategory
  keyValue:  string
  onChange:  (val: string) => void
}

function UrlField({ label, field, value, category, keyValue, onChange }: UrlFieldProps) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <div className="flex gap-2 items-start">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or upload →"
          className="flex-1 bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 placeholder-gray-600"
        />
        <UploadButton
          category={category}
          keyValue={keyValue}
          field={field}
          onUploaded={onChange}
        />
        {/* Preview thumbnail */}
        {value && (
          <div className="relative w-10 h-10 rounded overflow-hidden border border-gray-700 flex-shrink-0 bg-gray-800">
            <Image src={value} alt="" fill className="object-contain" unoptimized />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VisualsAdminPage() {
  const [visuals, setVisuals]       = useState<ItemVisualData[]>([])
  const [loading, setLoading]       = useState(true)
  const [filterCat, setFilterCat]   = useState<VisualCategory | ''>('')
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ ...EMPTY_FORM })
  const [saving, setSaving]         = useState(false)
  const [msg, setMsg]               = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/admin/item-visuals')
    if (r.ok) setVisuals(await r.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = filterCat ? visuals.filter((v) => v.category === filterCat) : visuals

  function openEdit(v: ItemVisualData) {
    setEditingId(v.id)
    setForm({
      category:        v.category,
      key:             v.key,
      rarity:          v.rarity          ?? '',
      label:           v.label           ?? '',
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

  function openCreate() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setShowForm(true)
    setMsg('')
  }

  // Cria visual pré-preenchido a partir de uma chave faltante no checklist
  function openCreateWith(category: VisualCategory, key: string) {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, category, key })
    setShowForm(true)
    setMsg('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSave() {
    setSaving(true)
    setMsg('')
    const payload = {
      ...form,
      rarity:          form.rarity          || null,
      label:           form.label           || null,
      imageUrl:        form.imageUrl        || null,
      spriteIdleUrl:   form.spriteIdleUrl   || null,
      spriteActiveUrl: form.spriteActiveUrl || null,
      spriteLowUrl:    form.spriteLowUrl    || null,
      frameWidth:      Number(form.frameWidth),
      frameHeight:     Number(form.frameHeight),
      frameCount:      Number(form.frameCount),
      fps:             Number(form.fps),
    }
    const url    = editingId ? `/api/admin/item-visuals/${editingId}` : '/api/admin/item-visuals'
    const method = editingId ? 'PATCH' : 'POST'
    const r    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
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

  const availableKeys = VISUAL_KEYS_BY_CATEGORY[form.category] ?? []

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Item Visuals</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Sprites e ícones dos cards do jogo. Upload vai direto para o Supabase Storage em pastas organizadas.
          </p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">
          + New Visual
        </button>
      </div>

      {/* Checklist de cobertura — o que falta de asset */}
      {!loading && <CoveragePanel visuals={visuals} onCreate={openCreateWith} />}

      {/* Filtro por categoria */}
      <div className="flex gap-2 flex-wrap mb-5">
        <FilterChip label={`All (${visuals.length})`}  active={filterCat === ''} onClick={() => setFilterCat('')} />
        {CATEGORIES.map((c) => (
          <FilterChip
            key={c.value}
            label={`${c.label} (${visuals.filter((v) => v.category === c.value).length})`}
            active={filterCat === c.value}
            onClick={() => setFilterCat(c.value)}
          />
        ))}
      </div>

      {/* Feedback */}
      {msg && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${
          msg === 'Saved!' ? 'bg-green-900/40 text-green-300 border border-green-800/50' : 'bg-red-900/40 text-red-300 border border-red-800/50'
        }`}>
          {msg}
        </div>
      )}

      {/* ── Form ──────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="mb-6 bg-[#0d0d1a] border border-gray-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-5">
            {editingId ? 'Edit Visual' : 'New Visual'}
          </h2>

          {/* Row 1: category / key / rarity / label */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as VisualCategory, key: '' })}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2"
              >
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Key *</label>
              <select
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2"
              >
                <option value="">— select —</option>
                {availableKeys.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <input
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder="Ou digite (ex: templateId)"
                className="mt-1 w-full bg-gray-800 border border-gray-600 text-white text-xs rounded-lg px-3 py-1.5 placeholder-gray-600"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Rarity (opcional)</label>
              <select
                value={form.rarity}
                onChange={(e) => setForm({ ...form, rarity: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2"
              >
                {RARITIES.map((r) => <option key={r} value={r}>{r || '— todas —'}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Label (nome amigável)</label>
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Ex: Sentinel Standard"
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600"
              />
            </div>
          </div>

          {/* Storage info */}
          {form.key && (
            <div className="mb-4 px-3 py-2 bg-gray-800/60 rounded-lg border border-gray-700/50">
              <p className="text-xs text-gray-500">
                <span className="text-gray-400 font-medium">Storage path:</span>{' '}
                <code className="text-indigo-300">
                  game-assets / sprites / {form.category === 'robot' ? `robots/${form.key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}` : form.category} / …
                </code>
              </p>
            </div>
          )}

          {/* Image fields */}
          <div className="space-y-3">
            <UrlField
              label={FIELD_LABEL.imageUrl}
              field="imageUrl"
              value={form.imageUrl}
              category={form.category}
              keyValue={form.key}
              onChange={(v) => setForm({ ...form, imageUrl: v })}
            />

            {/* Sprite fields apenas para robots */}
            {form.category === 'robot' && (
              <>
                <div className="border-t border-gray-800 pt-3 mt-3">
                  <p className="text-xs text-gray-500 mb-3">
                    🎞 Sprite sheets — PNG horizontal, frames lado a lado (ex: 4 frames = 512×128px)
                  </p>
                  <div className="space-y-3">
                    <UrlField label={FIELD_LABEL.spriteIdleUrl}   field="spriteIdleUrl"   value={form.spriteIdleUrl}   category={form.category} keyValue={form.key} onChange={(v) => setForm({ ...form, spriteIdleUrl: v })} />
                    <UrlField label={FIELD_LABEL.spriteActiveUrl} field="spriteActiveUrl" value={form.spriteActiveUrl} category={form.category} keyValue={form.key} onChange={(v) => setForm({ ...form, spriteActiveUrl: v })} />
                    <UrlField label={FIELD_LABEL.spriteLowUrl}    field="spriteLowUrl"    value={form.spriteLowUrl}    category={form.category} keyValue={form.key} onChange={(v) => setForm({ ...form, spriteLowUrl: v })} />
                  </div>
                </div>

                {/* Sprite config */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
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
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-5 pt-4 border-t border-gray-800">
            <button
              onClick={handleSave}
              disabled={saving || !form.key}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create visual'}
            </button>
            <button
              onClick={() => { setShowForm(false); setMsg('') }}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── List ──────────────────────────────────────────────────────── */}
      {loading ? (
        <p className="text-gray-500 text-sm py-8 text-center">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-5xl mb-3">🖼️</p>
          <p className="text-sm font-medium text-gray-500">Nenhum visual configurado ainda.</p>
          <p className="text-xs mt-1">Clique em &quot;New Visual&quot; para adicionar o primeiro sprite ou ícone.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((v) => <VisualCard key={v.id} visual={v} onEdit={openEdit} onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  )
}

// ─── Coverage Panel ───────────────────────────────────────────────────────────
// Cruza as chaves esperadas (item-visual-keys) com os visuais cadastrados e os
// clipes de abertura das lootboxes, mostrando exatamente o que falta produzir.
// Clicar numa chave faltante abre o form de criação pré-preenchido.

interface LootboxCfgLite {
  lootboxType:    string
  name:           string
  active:         boolean
  openingWebpUrl: string | null
}

interface CoverageRow {
  category: VisualCategory
  label:    string
  /** Chaves mínimas necessárias (parts usa só as 6 categorias — nomes individuais são overrides opcionais) */
  expected: readonly string[]
  hint?:    string
}

const COVERAGE_ROWS: CoverageRow[] = [
  { category: 'robot',       label: '🤖 Robots (coleções)', expected: ROBOT_COLLECTION_KEYS,
    hint: 'Ícone estático no mínimo; sprite sheets idle/active/low são opcionais mas recomendados.' },
  { category: 'equipment',   label: '🔧 Equipment',          expected: EQUIPMENT_EFFECT_KEYS },
  { category: 'baseUpgrade', label: '🏗️ Base Upgrades',      expected: EQUIPMENT_EFFECT_KEYS },
  { category: 'part',        label: '🔩 Parts (categorias)', expected: PART_CATEGORY_KEYS,
    hint: 'Uma imagem por categoria cobre todas as peças; nomes individuais podem sobrepor depois.' },
  { category: 'consumable',  label: '🔋 Consumables',        expected: CONSUMABLE_KEYS },
  { category: 'lootbox',     label: '📦 Lootboxes (ícones)', expected: LOOTBOX_KEYS },
]

function CoveragePanel({
  visuals,
  onCreate,
}: {
  visuals:  ItemVisualData[]
  onCreate: (category: VisualCategory, key: string) => void
}) {
  const [open, setOpen] = useState(true)
  const [lootboxCfgs, setLootboxCfgs] = useState<LootboxCfgLite[] | null>(null)

  // Clipes de abertura vêm da config de lootbox, não de ItemVisual
  useEffect(() => {
    fetch('/api/admin/lootbox')
      .then((r) => r.json())
      .then((d) => setLootboxCfgs(Array.isArray(d) ? d : []))
      .catch(() => setLootboxCfgs([]))
  }, [])

  const hasArt = (cat: VisualCategory, key: string) =>
    visuals.some((v) => v.category === cat && v.key === key && (v.imageUrl || v.spriteIdleUrl))

  const rows = COVERAGE_ROWS.map((row) => {
    const missing = row.expected.filter((k) => !hasArt(row.category, k))
    return { ...row, missing, done: row.expected.length - missing.length }
  })

  // Sprites animados de robô — métrica secundária
  const robotsWithSprite = ROBOT_COLLECTION_KEYS.filter((k) =>
    visuals.some((v) => v.category === 'robot' && v.key === k && v.spriteIdleUrl),
  ).length

  // Clipes de abertura (apenas crates ativas contam como pendência)
  const activeCrates  = (lootboxCfgs ?? []).filter((c) => c.active)
  const missingClips  = activeCrates.filter((c) => !c.openingWebpUrl)

  const totalExpected = rows.reduce((s, r) => s + r.expected.length, 0) + activeCrates.length
  const totalDone     = rows.reduce((s, r) => s + r.done, 0) + (activeCrates.length - missingClips.length)
  const allDone       = totalExpected > 0 && totalDone === totalExpected

  return (
    <div className="mb-5 bg-[#0d0d1a] border border-gray-800 rounded-xl overflow-hidden">
      {/* Header — sempre visível, com resumo */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm">📋</span>
          <span className="text-sm font-semibold text-white">Asset Coverage</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${
            allDone
              ? 'text-emerald-400 border-emerald-700/50 bg-emerald-900/20'
              : 'text-amber-400 border-amber-700/50 bg-amber-900/20'
          }`}>
            {totalDone}/{totalExpected}
          </span>
        </div>
        <span className="text-gray-500 text-xs">{open ? '▲ recolher' : '▼ expandir'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-800/60 pt-3">
          <p className="text-xs text-gray-600">
            Lista de produção: tudo que o jogo cobre com placeholder genérico até você subir a arte.
            Clique numa chave para criar o visual já pré-preenchido.
          </p>

          {rows.map((row) => (
            <div key={row.category + row.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-300">{row.label}</span>
                <span className={`text-xs font-mono ${row.missing.length === 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                  {row.done}/{row.expected.length}
                  {row.category === 'robot' && ` · ${robotsWithSprite} c/ sprite animado`}
                </span>
              </div>
              {/* Barra de progresso */}
              <div className="h-1 rounded-full bg-gray-800 mb-1.5">
                <div
                  className={`h-1 rounded-full transition-all ${row.missing.length === 0 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                  style={{ width: `${row.expected.length ? (row.done / row.expected.length) * 100 : 0}%` }}
                />
              </div>
              {/* Chaves faltantes — clicáveis */}
              {row.missing.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {row.missing.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => onCreate(row.category, k)}
                      title={`Criar visual para ${k}`}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-gray-700 text-gray-400 hover:border-indigo-500/60 hover:text-indigo-300 transition-colors font-mono"
                    >
                      + {k}
                    </button>
                  ))}
                </div>
              )}
              {row.hint && row.missing.length > 0 && (
                <p className="text-[10px] text-gray-600 mt-1 italic">{row.hint}</p>
              )}
            </div>
          ))}

          {/* Clipes de abertura — gerenciados em /nexus/lootbox */}
          <div className="pt-2 border-t border-gray-800/60">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-300">🎬 Opening clips (crates ativas)</span>
              <span className={`text-xs font-mono ${missingClips.length === 0 && lootboxCfgs !== null ? 'text-emerald-400' : 'text-gray-500'}`}>
                {lootboxCfgs === null ? '…' : `${activeCrates.length - missingClips.length}/${activeCrates.length}`}
              </span>
            </div>
            <div className="h-1 rounded-full bg-gray-800 mb-1.5">
              <div
                className={`h-1 rounded-full transition-all ${missingClips.length === 0 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                style={{ width: `${activeCrates.length ? ((activeCrates.length - missingClips.length) / activeCrates.length) * 100 : 0}%` }}
              />
            </div>
            {missingClips.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center">
                {missingClips.map((c) => (
                  <a
                    key={c.lootboxType}
                    href="/nexus/lootbox"
                    title={`Configurar clipe de abertura para ${c.name}`}
                    className="text-[10px] px-1.5 py-0.5 rounded border border-gray-700 text-gray-400 hover:border-purple-500/60 hover:text-purple-300 transition-colors font-mono"
                  >
                    🎬 {c.lootboxType}
                  </a>
                ))}
              </div>
            )}
            <p className="text-[10px] text-gray-600 mt-1 italic">
              WebP/GIF da caixa abrindo — configurado por crate em <a href="/nexus/lootbox" className="text-purple-400 hover:underline">Lootboxes</a>. Sem clipe, o jogo usa a animação genérica embutida.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        active ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'
      }`}
    >
      {label}
    </button>
  )
}

function VisualCard({
  visual,
  onEdit,
  onDelete,
}: {
  visual:   ItemVisualData
  onEdit:   (v: ItemVisualData) => void
  onDelete: (id: string) => void
}) {
  const previewUrl = visual.imageUrl ?? visual.spriteIdleUrl ?? null
  const catLabel = CATEGORIES.find((c) => c.value === visual.category)?.label ?? visual.category

  return (
    <div className="bg-[#0d0d1a] border border-gray-800 rounded-xl p-4 flex gap-3 items-start hover:border-gray-700 transition-colors">
      {/* Preview */}
      <div className="w-12 h-12 rounded-lg bg-gray-800 border border-gray-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
        {previewUrl ? (
          <div className="relative w-full h-full">
            <Image src={previewUrl} alt={visual.label ?? visual.key} fill className="object-contain" unoptimized />
          </div>
        ) : (
          <span className="text-gray-600 text-xl">🖼️</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{visual.label ?? visual.key}</p>
        <p className="text-gray-500 text-xs mt-0.5">{catLabel}{visual.rarity ? ` · ${visual.rarity}` : ' · all rarities'}</p>
        <p className="text-gray-600 text-xs truncate mt-0.5 font-mono">{visual.key}</p>
        {(visual.spriteIdleUrl || visual.spriteActiveUrl) && (
          <p className="text-indigo-400 text-xs mt-1">🎞 {visual.frameCount}fr @ {visual.fps}fps</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 flex-shrink-0">
        <button onClick={() => onEdit(visual)} className="text-xs text-gray-500 hover:text-indigo-400 transition-colors px-2 py-1 rounded hover:bg-indigo-500/10">Edit</button>
        <button onClick={() => onDelete(visual.id)} className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10">Del</button>
      </div>
    </div>
  )
}
