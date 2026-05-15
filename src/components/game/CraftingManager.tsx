'use client'

import { useState, useEffect, useCallback } from 'react'
import { CraftingRecipeCard } from '@/components/game/CraftingRecipeCard'
import type { EnrichedRecipeForCard } from '@/components/game/CraftingRecipeCard'
import { RarityBadge } from '@/components/ui/RarityBadge'
import { ActionButton } from '@/components/ui/ActionButton'
import type { Rarity } from '@/lib/rarity'

type RecipeFilter = 'all' | 'robot' | 'equipment' | 'baseUpgrade' | 'craftable'

interface PendingCraft {
  id:          string
  recipeId:    string
  recipeName:  string
  startedAt:   string
  completesAt: string
  isReady:     boolean
  outputName:  string
  outputType:  string
  outputRarity: string
}

const FILTERS: { key: RecipeFilter; label: string }[] = [
  { key: 'all',         label: 'All Recipes' },
  { key: 'robot',       label: '🤖 Robots' },
  { key: 'equipment',   label: '⚙️ Equipment' },
  { key: 'baseUpgrade', label: '🏗️ Base Upgrades' },
  { key: 'craftable',   label: '✅ Can Craft' },
]

function formatCountdown(completesAt: string): string {
  const ms = new Date(completesAt).getTime() - Date.now()
  if (ms <= 0) return 'Ready!'
  const s = Math.ceil(ms / 1000)
  if (s < 60)   return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
}

// ─── Pending Craft Card ───────────────────────────────────────────────────────

function PendingCraftCard({ pc, onCollect, collecting }: {
  pc:         PendingCraft
  onCollect:  (id: string) => void
  collecting: boolean
}) {
  const [countdown, setCountdown] = useState(formatCountdown(pc.completesAt))
  const [ready,     setReady]     = useState(pc.isReady)

  useEffect(() => {
    const id = setInterval(() => {
      const ms = new Date(pc.completesAt).getTime() - Date.now()
      setCountdown(formatCountdown(pc.completesAt))
      setReady(ms <= 0)
    }, 1000)
    return () => clearInterval(id)
  }, [pc.completesAt])

  const progress = Math.min(1, (Date.now() - new Date(pc.startedAt).getTime()) /
    (new Date(pc.completesAt).getTime() - new Date(pc.startedAt).getTime()))

  return (
    <div className={`border rounded-xl p-4 bg-[#0d0d15] flex flex-col gap-3 transition-all ${
      ready ? 'border-green-600/40' : 'border-gray-700/40'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-white text-sm font-semibold">{pc.recipeName}</p>
          <p className="text-gray-500 text-xs mt-0.5">→ {pc.outputName}</p>
        </div>
        <RarityBadge rarity={pc.outputRarity as Rarity} />
      </div>

      {/* Barra de progresso */}
      <div className="bg-gray-800 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${ready ? 'bg-green-500' : 'bg-indigo-500'}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs font-mono ${ready ? 'text-green-400' : 'text-gray-500'}`}>
          {ready ? '✓ Ready to collect!' : `⏱ ${countdown}`}
        </span>
        {ready && (
          <ActionButton
            variant="primary"
            size="sm"
            onClick={() => onCollect(pc.id)}
            disabled={collecting}
            loading={collecting}
            loadingText="Collecting..."
          >
            Collect
          </ActionButton>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CraftingManager() {
  const [recipes,       setRecipes]       = useState<EnrichedRecipeForCard[]>([])
  const [pendingCrafts, setPendingCrafts] = useState<PendingCraft[]>([])
  const [loading,       setLoading]       = useState(true)
  const [crafting,      setCrafting]      = useState<string | null>(null)
  const [collecting,    setCollecting]    = useState<string | null>(null)
  const [filter,        setFilter]        = useState<RecipeFilter>('all')
  const [error,         setError]         = useState('')
  const [success,       setSuccess]       = useState('')

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/game/crafting')
    if (res.ok) {
      const json = await res.json()
      setRecipes(json.recipes ?? [])
      setPendingCrafts(json.pendingCrafts ?? [])
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
    } else if (json.instant) {
      setSuccess(`"${json.output?.name}" crafted and added to inventory!`)
      await fetchData()
    } else {
      setSuccess(`Crafting started! Come back to collect when it's ready.`)
      await fetchData()
    }
    setCrafting(null)
  }

  async function handleCollect(pendingCraftId: string) {
    setCollecting(pendingCraftId); setError(''); setSuccess('')
    const res  = await fetch('/api/game/crafting/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pendingCraftId }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to collect.')
    } else {
      setSuccess(`"${json.output?.name}" collected and added to inventory!`)
      await fetchData()
    }
    setCollecting(null)
  }

  const filtered = recipes.filter((r) => {
    if (filter === 'robot')       return r.output.type === 'robot'
    if (filter === 'equipment')   return r.output.type === 'equipment'
    if (filter === 'baseUpgrade') return r.output.type === 'baseUpgrade'
    if (filter === 'craftable')   return r.canCraft
    return true
  })

  const craftableCount = recipes.filter((r) => r.canCraft).length
  const activeCrafts   = pendingCrafts.filter((p) => !p.isReady)
  const readyCrafts    = pendingCrafts.filter((p) => p.isReady)

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

      {/* Crafts prontos para coletar */}
      {readyCrafts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-green-400 text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Ready to Collect ({readyCrafts.length})
          </h3>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {readyCrafts.map((pc) => (
              <PendingCraftCard
                key={pc.id}
                pc={pc}
                onCollect={handleCollect}
                collecting={collecting === pc.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Crafts em andamento */}
      {activeCrafts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-gray-400 text-sm font-semibold mb-3">
            In Progress ({activeCrafts.length})
          </h3>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {activeCrafts.map((pc) => (
              <PendingCraftCard
                key={pc.id}
                pc={pc}
                onCollect={handleCollect}
                collecting={collecting === pc.id}
              />
            ))}
          </div>
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
