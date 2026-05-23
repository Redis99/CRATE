'use client'

import { useEffect, useState } from 'react'

interface Ingredient {
  id?: string
  partType: string
  rarity: string
  quantity: number
}

interface Recipe {
  id: string
  name: string
  description: string
  active: boolean
  costCrate: number
  craftingTimeSec: number
  outputType: string
  outputName: string
  outputRarity: string
  outputCollection: string | null
  outputHashPower: number | null
  outputEnergyRate: number | null
  outputEffectType: string | null
  outputEffectValue: number | null
  outputEffectType2: string | null
  outputEffectValue2: number | null
  ingredients: Ingredient[]
}

interface Part { id: string; partType: string; category: string }

const EMPTY_RECIPE: Omit<Recipe, 'id'> = {
  name: '', description: '', active: true,
  costCrate: 0, craftingTimeSec: 0,
  outputType: 'EQUIPMENT',
  outputName: '', outputRarity: 'COMMON',
  outputCollection: null,
  outputHashPower: null, outputEnergyRate: null,
  outputEffectType: null, outputEffectValue: null,
  outputEffectType2: null, outputEffectValue2: null,
  ingredients: [],
}

const RARITIES     = ['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY']
const OUTPUT_TYPES = ['EQUIPMENT','BASE_UPGRADE','ROBOT']
const EFFECT_TYPES = ['','HASH_POWER_FLAT','HASH_POWER_PCT','DURABILITY_LOSS_PCT','GLOBAL_EFFICIENCY_PCT','UPTIME_HOURS','POWER_DRAW_FLAT','POWER_DRAW_PCT']
const RARITY_COLOR: Record<string, string> = {
  COMMON: 'text-gray-400', UNCOMMON: 'text-green-400',
  RARE: 'text-blue-400', EPIC: 'text-purple-400', LEGENDARY: 'text-yellow-400',
}

export default function CraftingAdminPage() {
  const [recipes, setRecipes]         = useState<Recipe[]>([])
  const [parts, setParts]             = useState<Part[]>([])
  const [collections, setCollections] = useState<string[]>([])
  const [loading, setLoading]         = useState(true)
  const [editing, setEditing]         = useState<Partial<Recipe> | null>(null)
  const [isNew, setIsNew]             = useState(false)
  const [msg, setMsg]                 = useState('')

  // Filters
  const [rarityFilter, setRarityFilter] = useState('ALL')
  const [typeFilter, setTypeFilter]     = useState('ALL')
  const [search, setSearch]             = useState('')

  async function load() {
    setLoading(true)
    const [recipesRes, partsRes, codexRes] = await Promise.all([
      fetch('/api/admin/crafting').then(r => r.json()),
      fetch('/api/admin/parts').then(r => r.json()).catch(() => []),
      fetch('/api/admin/codex').then(r => r.json()).catch(() => []),
    ])
    setRecipes(recipesRes)
    setParts(Array.isArray(partsRes) ? partsRes : [])
    setCollections(Array.isArray(codexRes) ? codexRes.map((c: { name: string }) => c.name) : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openNew() {
    setEditing({ ...EMPTY_RECIPE, ingredients: [] })
    setIsNew(true)
  }
  function openEdit(r: Recipe) {
    setEditing({ ...r })
    setIsNew(false)
  }

  function updateIngredient(idx: number, field: keyof Ingredient, value: string | number) {
    setEditing(prev => {
      if (!prev) return prev
      const ings = [...(prev.ingredients ?? [])]
      ings[idx] = { ...ings[idx], [field]: value }
      return { ...prev, ingredients: ings }
    })
  }

  function addIngredient() {
    setEditing(prev => prev
      ? { ...prev, ingredients: [...(prev.ingredients ?? []), { partType: '', rarity: 'COMMON', quantity: 1 }] }
      : prev
    )
  }

  function removeIngredient(idx: number) {
    setEditing(prev => {
      if (!prev) return prev
      const ings = [...(prev.ingredients ?? [])]
      ings.splice(idx, 1)
      return { ...prev, ingredients: ings }
    })
  }

  async function save() {
    if (!editing) return
    setMsg('Saving…')

    // Strip campos computados que o Prisma não aceita
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ingredients = [], ...rest } = editing
    // Limpa ingredients de campos extras (id, recipeId, etc) — API também filtra, mas reforçamos aqui
    const cleanIngredients = ingredients.map(i => ({
      partType: i.partType, rarity: i.rarity, quantity: Number(i.quantity),
    }))

    const method = isNew ? 'POST' : 'PUT'
    const r = await fetch('/api/admin/crafting', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...rest, ingredients: cleanIngredients }),
    })
    if (r.ok) { setMsg('Saved!'); setEditing(null); load() }
    else { const e = await r.json().catch(() => ({})); setMsg(`Error: ${e.error ?? r.status}`) }
  }

  async function deleteRecipe(id: string) {
    if (!confirm('Delete this recipe?')) return
    const r = await fetch('/api/admin/crafting', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (r.ok) { setMsg('Deleted'); load() }
    else setMsg('Error deleting')
  }

  async function toggleActive(recipe: Recipe) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ingredients, ...rest } = recipe
    await fetch('/api/admin/crafting', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...rest, active: !recipe.active, ingredients: recipe.ingredients.map(i => ({ partType: i.partType, rarity: i.rarity, quantity: i.quantity })) }),
    })
    load()
  }

  // Filtered list
  const filtered = recipes.filter(r => {
    const rarityOk = rarityFilter === 'ALL' || r.outputRarity === rarityFilter
    const typeOk   = typeFilter === 'ALL' || r.outputType === typeFilter
    const searchOk = !search || r.name.toLowerCase().includes(search.toLowerCase())
                              || r.outputName.toLowerCase().includes(search.toLowerCase())
    return rarityOk && typeOk && searchOk
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-purple-300 font-mono">Crafting Recipes</h1>
        <button onClick={openNew}
          className="px-3 py-1.5 text-xs bg-purple-800/60 border border-purple-600 text-purple-200 rounded hover:bg-purple-700/60">
          + New Recipe
        </button>
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">Type:</span>
        {['ALL', ...OUTPUT_TYPES].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-2.5 py-1 text-xs rounded border transition-colors ${
              typeFilter === t
                ? 'bg-purple-800/60 border-purple-600 text-purple-200'
                : 'border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
            }`}>
            {t === 'BASE_UPGRADE' ? 'UPGRADE' : t}
          </button>
        ))}
      </div>

      {/* Rarity filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">Rarity:</span>
        {['ALL', ...RARITIES].map(r => (
          <button key={r} onClick={() => setRarityFilter(r)}
            className={`px-2.5 py-1 text-xs rounded border transition-colors ${
              rarityFilter === r
                ? 'bg-purple-800/60 border-purple-600 text-purple-200'
                : 'border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
            }`}>
            {r}
          </button>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by recipe or output name…"
        className="w-full max-w-sm px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded text-gray-200 placeholder-gray-600 outline-none focus:border-purple-700" />

      {msg && <p className="text-xs text-yellow-400 font-mono">{msg}</p>}

      {/* Editor Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg p-5 w-full max-w-2xl my-4 space-y-3">
            <h2 className="text-sm font-bold text-purple-300">{isNew ? 'New Recipe' : `Edit — ${editing.name ?? ''}`}</h2>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <input value={editing.name ?? ''} onChange={e => setEditing(p => ({ ...p!, name: e.target.value }))}
                  className="w-full input-admin" />
              </Field>
              <Field label="Output Type">
                <select value={editing.outputType ?? 'EQUIPMENT'} onChange={e => setEditing(p => ({ ...p!, outputType: e.target.value }))}
                  className="w-full input-admin">
                  {OUTPUT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Description">
              <textarea value={editing.description ?? ''} onChange={e => setEditing(p => ({ ...p!, description: e.target.value }))}
                rows={2} className="w-full input-admin" />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Cost (CRATE)">
                <input type="number" step="0.001" value={editing.costCrate ?? 0}
                  onChange={e => setEditing(p => ({ ...p!, costCrate: parseFloat(e.target.value) }))}
                  className="w-full input-admin" />
              </Field>
              <Field label="Craft Time (sec)">
                <input type="number" value={editing.craftingTimeSec ?? 0}
                  onChange={e => setEditing(p => ({ ...p!, craftingTimeSec: parseInt(e.target.value) }))}
                  className="w-full input-admin" />
              </Field>
              <Field label="Active">
                <select value={editing.active ? 'yes' : 'no'} onChange={e => setEditing(p => ({ ...p!, active: e.target.value === 'yes' }))}
                  className="w-full input-admin">
                  <option value="yes">Yes</option><option value="no">No</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Output Name">
                <input value={editing.outputName ?? ''} onChange={e => setEditing(p => ({ ...p!, outputName: e.target.value }))}
                  className="w-full input-admin" />
              </Field>
              <Field label="Output Rarity">
                <select value={editing.outputRarity ?? 'COMMON'} onChange={e => setEditing(p => ({ ...p!, outputRarity: e.target.value }))}
                  className="w-full input-admin">
                  {RARITIES.map(r => <option key={r}>{r}</option>)}
                </select>
              </Field>
            </div>

            {(editing.outputType === 'EQUIPMENT' || editing.outputType === 'BASE_UPGRADE') && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Effect Type">
                  <select value={editing.outputEffectType ?? ''} onChange={e => setEditing(p => ({ ...p!, outputEffectType: e.target.value || null }))}
                    className="w-full input-admin">
                    {EFFECT_TYPES.map(t => <option key={t} value={t}>{t || '—'}</option>)}
                  </select>
                </Field>
                <Field label="Effect Value">
                  <input type="number" step="0.1" value={editing.outputEffectValue ?? ''} onChange={e => setEditing(p => ({ ...p!, outputEffectValue: parseFloat(e.target.value) || null }))}
                    className="w-full input-admin" />
                </Field>
                <Field label="Effect Type 2">
                  <select value={editing.outputEffectType2 ?? ''} onChange={e => setEditing(p => ({ ...p!, outputEffectType2: e.target.value || null }))}
                    className="w-full input-admin">
                    {EFFECT_TYPES.map(t => <option key={t} value={t}>{t || '—'}</option>)}
                  </select>
                </Field>
                <Field label="Effect Value 2">
                  <input type="number" step="0.1" value={editing.outputEffectValue2 ?? ''} onChange={e => setEditing(p => ({ ...p!, outputEffectValue2: parseFloat(e.target.value) || null }))}
                    className="w-full input-admin" />
                </Field>
              </div>
            )}

            {editing.outputType === 'ROBOT' && (
              <div className="grid grid-cols-3 gap-3">
                <Field label="Collection">
                  {/* Dropdown alimentado pelo Codex */}
                  <select value={editing.outputCollection ?? ''} onChange={e => setEditing(p => ({ ...p!, outputCollection: e.target.value || null }))}
                    className="w-full input-admin">
                    <option value="">— No collection —</option>
                    {editing.outputCollection && !collections.includes(editing.outputCollection) && (
                      <option value={editing.outputCollection}>{editing.outputCollection}</option>
                    )}
                    {collections.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Hash Power (ER)">
                  <input type="number" step="0.1" value={editing.outputHashPower ?? ''}
                    onChange={e => setEditing(p => ({ ...p!, outputHashPower: parseFloat(e.target.value) || null }))}
                    className="w-full input-admin" />
                </Field>
                <Field label="Energy Rate (PD)">
                  <input type="number" step="0.1" value={editing.outputEnergyRate ?? ''}
                    onChange={e => setEditing(p => ({ ...p!, outputEnergyRate: parseFloat(e.target.value) || null }))}
                    className="w-full input-admin" />
                </Field>
              </div>
            )}

            {/* Ingredients */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Ingredients ({parts.length} parts available)</span>
                <button onClick={addIngredient} className="text-xs text-purple-400 hover:text-purple-300">
                  + Add ingredient
                </button>
              </div>
              {parts.length === 0 && (
                <p className="text-xs text-yellow-500/80 bg-yellow-900/10 border border-yellow-900/30 rounded px-2 py-1.5 mb-2">
                  ⚠ Parts catalog is empty — run <code className="text-yellow-300">Seed Parts</code> in the dashboard first.
                </p>
              )}
              {(editing.ingredients ?? []).map((ing, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_80px_32px] gap-2 mb-2">
                  <select value={ing.partType} onChange={e => updateIngredient(i, 'partType', e.target.value)}
                    className="input-admin">
                    <option value="">— Select part —</option>
                    {/* Inclui o valor atual mesmo que não esteja no catálogo */}
                    {ing.partType && !parts.some(p => p.partType === ing.partType) && (
                      <option value={ing.partType}>{ing.partType} (legacy)</option>
                    )}
                    {/* Agrupa por categoria */}
                    {Object.entries(
                      parts.reduce<Record<string, Part[]>>((acc, p) => {
                        ;(acc[p.category] ??= []).push(p); return acc
                      }, {})
                    ).map(([cat, list]) => (
                      <optgroup key={cat} label={cat}>
                        {list.map(p => <option key={p.id} value={p.partType}>{p.partType}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <select value={ing.rarity} onChange={e => updateIngredient(i, 'rarity', e.target.value)}
                    className="input-admin">
                    {RARITIES.map(r => <option key={r}>{r}</option>)}
                  </select>
                  <input type="number" value={ing.quantity} onChange={e => updateIngredient(i, 'quantity', parseInt(e.target.value))}
                    className="input-admin" min={1} />
                  <button onClick={() => removeIngredient(i)} className="text-red-500 hover:text-red-400 text-sm">✕</button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={save}
                className="px-4 py-1.5 text-sm bg-purple-800/60 border border-purple-600 text-purple-200 rounded hover:bg-purple-700/60">
                Save
              </button>
              <button onClick={() => setEditing(null)}
                className="px-4 py-1.5 text-sm bg-gray-800/60 border border-gray-600 text-gray-300 rounded hover:bg-gray-700/60">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe List */}
      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="text-gray-500 text-sm">No recipes match the current filters.</p>
          )}
          {filtered.map(r => (
            <div key={r.id} className="bg-[#0d0d1a] border border-purple-900/20 rounded-lg p-3 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-200 font-medium">{r.name}</span>
                  <span className={`text-xs font-bold ${RARITY_COLOR[r.outputRarity] ?? 'text-gray-400'}`}>{r.outputRarity}</span>
                  <span className="text-xs text-gray-600 bg-gray-800 px-1.5 rounded">{r.outputType}</span>
                  {!r.active && <span className="text-xs text-red-500 bg-red-900/20 px-1.5 rounded">Inactive</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{r.description}</p>
                <div className="flex gap-3 mt-1 text-xs text-gray-600 flex-wrap">
                  <span>→ <span className="text-gray-400">{r.outputName}</span></span>
                  <span>·</span>
                  <span>{r.ingredients.length} ingredient{r.ingredients.length !== 1 ? 's' : ''}</span>
                  <span>{r.costCrate} CRATE</span>
                  <span>{r.craftingTimeSec}s</span>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => toggleActive(r)}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    r.active
                      ? 'border-yellow-700/40 text-yellow-400 hover:bg-yellow-900/20'
                      : 'border-green-700/40 text-green-400 hover:bg-green-900/20'
                  }`}>
                  {r.active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => openEdit(r)}
                  className="px-2 py-1 text-xs border border-gray-700 text-gray-300 rounded hover:bg-gray-800">
                  Edit
                </button>
                <button onClick={() => deleteRecipe(r.id)}
                  className="px-2 py-1 text-xs border border-red-900 text-red-400 rounded hover:bg-red-900/20">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        .input-admin {
          background: #111122; border: 1px solid #2d2d50;
          border-radius: 4px; padding: 4px 8px;
          font-size: 12px; color: #d1d5db; outline: none;
        }
        .input-admin:focus { border-color: #7c3aed; }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}
