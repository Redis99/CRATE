'use client'

import { useState, useEffect, useCallback } from 'react'
import { CraftingRecipeCard } from '@/components/game/CraftingRecipeCard'
import { LootboxDropModal } from '@/components/game/LootboxDropModal'
import type { DropResultType } from '@/lib/lootbox'
import type { CraftingRecipe } from '@/lib/crafting-recipes'

type RecipeFilter = 'all' | 'robot' | 'equipment' | 'baseUpgrade' | 'craftable'

interface EnrichedIngredient { partType: string; rarity: string; quantity: number; have: number; canCraft: boolean }
interface EnrichedRecipe extends Omit<CraftingRecipe, 'ingredients'> {
  ingredients: EnrichedIngredient[]
  canCraft: boolean
}

const FILTERS: { key: RecipeFilter; label: string }[] = [
  { key: 'all',         label: 'All Recipes' },
  { key: 'robot',       label: '🤖 Robots' },
  { key: 'equipment',   label: '⚙️ Equipment' },
  { key: 'baseUpgrade', label: '🏗️ Base Upgrades' },
  { key: 'craftable',   label: '✅ Can Craft' },
]

export function CraftingManager() {
  const [recipes, setRecipes]     = useState<EnrichedRecipe[]>([])
  const [loading, setLoading]     = useState(true)
  const [crafting, setCrafting]   = useState<string | null>(null)
  const [filter, setFilter]       = useState<RecipeFilter>('all')
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/game/crafting')
    if (res.ok) {
      const json = await res.json()
      setRecipes(json.recipes)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleCraft(recipeId: string) {
    setCrafting(recipeId); setError(''); setSuccess('')
    const res  = await fetch('/api/game/crafting/craft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Crafting failed.')
    } else {
      setSuccess(`"${json.output?.name}" crafted successfully! Check your inventory.`)
      await fetchData()
    }
    setCrafting(null)
  }

  const filtered = recipes.filter((r) => {
    if (filter === 'robot')       return r.output.type === 'robot'
    if (filter === 'equipment')   return r.output.type === 'equipment'
    if (filter === 'baseUpgrade') return r.output.type === 'baseUpgrade'
    if (filter === 'craftable')   return r.canCraft
    return true
  })

  const craftableCount = recipes.filter((r) => r.canCraft).length

  if (loading) return <div className="text-gray-500 text-sm py-8">Loading crafting station...</div>

  return (
    <>
      {success && (
        <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 flex justify-between">
          <p className="text-green-400 text-sm">{success}</p>
          <button onClick={() => setSuccess('')} className="text-green-400/60 text-xs">✕</button>
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex justify-between">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => setError('')} className="text-red-400/60 hover:text-red-400 text-xs">✕</button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filter === key
                ? 'bg-blue-600/20 text-blue-400 border-blue-600/30'
                : 'text-gray-500 border-gray-700/50 hover:text-gray-300 hover:border-gray-600'
            }`}>
            {label}
            {key === 'craftable' && craftableCount > 0 && (
              <span className="bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded text-xs">{craftableCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Grid de receitas */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-600 text-sm">
            {filter === 'craftable'
              ? 'No recipes available yet. Open lootboxes to get crafting parts.'
              : 'No recipes found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {filtered.map((recipe) => (
            <CraftingRecipeCard
              key={recipe.id}
              recipe={recipe}
              crafting={crafting === recipe.id}
              onCraft={handleCraft}
            />
          ))}
        </div>
      )}
    </>
  )
}
