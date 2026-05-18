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

const EMPTY_RECIPE: Omit<Recipe, 'id'> = {
  name: '',
  description: '',
  active: true,
  costCrate: 0,
  craftingTimeSec: 0,
  outputType: 'EQUIPMENT',
  outputName: '',
  outputRarity: 'COMMON',
  outputCollection: null,
  outputHashPower: null,
  outputEnergyRate: null,
  outputEffectType: null,
  outputEffectValue: null,
  outputEffectType2: null,
  outputEffectValue2: null,
  ingredients: [],
}

const RARITIES = ['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY']
const OUTPUT_TYPES = ['EQUIPMENT','BASE_UPGRADE','ROBOT']
const EFFECT_TYPES = ['','HASH_POWER_FLAT','HASH_POWER_PCT','DURABILITY_LOSS_PCT','GLOBAL_EFFICIENCY_PCT','UPTIME_HOURS']

export default function CraftingAdminPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Recipe> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    setLoading(true)
    const r = await fetch('/api/admin/crafting')
    setRecipes(await r.json())
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
    setEditing(prev => {
      if (!prev) return prev
      return {
        ...prev,
        ingredients: [...(prev.ingredients ?? []), { partType: '', rarity: 'COMMON', quantity: 1 }],
      }
    })
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
    const method = isNew ? 'POST' : 'PUT'
    const r = await fetch('/api/admin/crafting', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    })
    if (r.ok) {
      setMsg('Saved!')
      setEditing(null)
      load()
    } else {
      setMsg('Error saving')
    }
  }

  async function deleteRecipe(id: string) {
    if (!confirm('Delete this recipe?')) return
    const r = await fetch('/api/admin/crafting', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (r.ok) { setMsg('Deleted'); load() }
    else setMsg('Error deleting')
  }

  async function toggleActive(recipe: Recipe) {
    await fetch('/api/admin/crafting', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...recipe, active: !recipe.active }),
    })
    load()
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-purple-300 font-mono">Crafting Recipes</h1>
        <button
          onClick={openNew}
          className="px-3 py-1.5 text-xs bg-purple-800/60 border border-purple-600 text-purple-200 rounded hover:bg-purple-700/60 transition-colors"
        >
          + New Recipe
        </button>
      </div>

      {msg && <p className="text-xs text-yellow-400 font-mono">{msg}</p>}

      {/* Editor Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg p-5 w-full max-w-2xl my-4 space-y-4">
            <h2 className="text-sm font-bold text-purple-300">{isNew ? 'New Recipe' : 'Edit Recipe'}</h2>

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
                <input type="number" value={editing.costCrate ?? 0} onChange={e => setEditing(p => ({ ...p!, costCrate: parseFloat(e.target.value) }))}
                  className="w-full input-admin" />
              </Field>
              <Field label="Craft Time (sec)">
                <input type="number" value={editing.craftingTimeSec ?? 0} onChange={e => setEditing(p => ({ ...p!, craftingTimeSec: parseInt(e.target.value) }))}
                  className="w-full input-admin" />
              </Field>
              <Field label="Active">
                <select value={editing.active ? 'yes' : 'no'} onChange={e => setEditing(p => ({ ...p!, active: e.target.value === 'yes' }))}
                  className="w-full input-admin">
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
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
                  <input type="number" value={editing.outputEffectValue ?? ''} onChange={e => setEditing(p => ({ ...p!, outputEffectValue: parseFloat(e.target.value) || null }))}
                    className="w-full input-admin" />
                </Field>
                <Field label="Effect Type 2">
                  <select value={editing.outputEffectType2 ?? ''} onChange={e => setEditing(p => ({ ...p!, outputEffectType2: e.target.value || null }))}
                    className="w-full input-admin">
                    {EFFECT_TYPES.map(t => <option key={t} value={t}>{t || '—'}</option>)}
                  </select>
                </Field>
                <Field label="Effect Value 2">
                  <input type="number" value={editing.outputEffectValue2 ?? ''} onChange={e => setEditing(p => ({ ...p!, outputEffectValue2: parseFloat(e.target.value) || null }))}
                    className="w-full input-admin" />
                </Field>
              </div>
            )}

            {editing.outputType === 'ROBOT' && (
              <div className="grid grid-cols-3 gap-3">
                <Field label="Collection">
                  <input value={editing.outputCollection ?? ''} onChange={e => setEditing(p => ({ ...p!, outputCollection: e.target.value || null }))}
                    className="w-full input-admin" />
                </Field>
                <Field label="Hash Power">
                  <input type="number" value={editing.outputHashPower ?? ''} onChange={e => setEditing(p => ({ ...p!, outputHashPower: parseFloat(e.target.value) || null }))}
                    className="w-full input-admin" />
                </Field>
                <Field label="Energy Rate">
                  <input type="number" value={editing.outputEnergyRate ?? ''} onChange={e => setEditing(p => ({ ...p!, outputEnergyRate: parseFloat(e.target.value) || null }))}
                    className="w-full input-admin" />
                </Field>
              </div>
            )}

            {/* Ingredients */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Ingredients</span>
                <button onClick={addIngredient} className="text-xs text-purple-400 hover:text-purple-300">
                  + Add
                </button>
              </div>
              {(editing.ingredients ?? []).map((ing, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_80px_32px] gap-2 mb-2">
                  <input placeholder="Part type" value={ing.partType} onChange={e => updateIngredient(i, 'partType', e.target.value)}
                    className="input-admin" />
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
                className="px-4 py-1.5 text-sm bg-purple-800/60 border border-purple-600 text-purple-200 rounded hover:bg-purple-700/60 transition-colors">
                Save
              </button>
              <button onClick={() => setEditing(null)}
                className="px-4 py-1.5 text-sm bg-gray-800/60 border border-gray-600 text-gray-300 rounded hover:bg-gray-700/60 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe List */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <div className="space-y-2">
          {recipes.map(r => (
            <div key={r.id} className="bg-[#0d0d1a] border border-purple-900/20 rounded-lg p-3 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-200 font-medium">{r.name}</span>
                  <RarityBadge rarity={r.outputRarity} />
                  <span className="text-xs text-gray-600">{r.outputType}</span>
                  {!r.active && <span className="text-xs text-red-500 bg-red-900/20 px-1.5 rounded">Inactive</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{r.description}</p>
                <div className="flex gap-3 mt-1 text-xs text-gray-600">
                  <span>{r.ingredients.length} ingredients</span>
                  <span>Cost: {r.costCrate} CRATE</span>
                  <span>Time: {r.craftingTimeSec}s</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => toggleActive(r)}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    r.active
                      ? 'border-yellow-700/40 text-yellow-400 hover:bg-yellow-900/20'
                      : 'border-green-700/40 text-green-400 hover:bg-green-900/20'
                  }`}>
                  {r.active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => openEdit(r)}
                  className="px-2 py-1 text-xs border border-gray-700 text-gray-300 rounded hover:bg-gray-800 transition-colors">
                  Edit
                </button>
                <button onClick={() => deleteRecipe(r.id)}
                  className="px-2 py-1 text-xs border border-red-900 text-red-400 rounded hover:bg-red-900/20 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          ))}
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

function RarityBadge({ rarity }: { rarity: string }) {
  const colors: Record<string, string> = {
    COMMON: 'text-gray-400',
    UNCOMMON: 'text-green-400',
    RARE: 'text-blue-400',
    EPIC: 'text-purple-400',
    LEGENDARY: 'text-yellow-400',
  }
  return <span className={`text-xs ${colors[rarity] ?? 'text-gray-400'}`}>{rarity}</span>
}
