'use client'

import { RarityBadge } from '@/components/ui/RarityBadge'
import { ActionButton } from '@/components/ui/ActionButton'
import { CategoryTag } from '@/components/game/CategoryTag'
import type { Rarity } from '@/lib/rarity'
import type { CraftingRecipe, CraftingOutput } from '@/lib/crafting-recipes'

const RARITY_BORDER: Record<string, string> = {
  COMMON:    'border-gray-700/50',
  UNCOMMON:  'border-green-700/40',
  RARE:      'border-blue-700/40',
  EPIC:      'border-purple-700/40',
  LEGENDARY: 'border-yellow-700/40',
}

// Formata o valor de efeito para exibição
function effectLabel(effectType: string, effectValue: number): string {
  const labels: Record<string, string> = {
    HASH_POWER_FLAT: 'ER +', HASH_POWER_PCT: 'ER +',
    POWER_DRAW_FLAT: 'PD -', POWER_DRAW_PCT: 'PD -',
    GLOBAL_EFFICIENCY_PCT: 'Efficiency +', DURABILITY_LOSS_PCT: 'PD -',
    UPTIME_HOURS: 'Uptime +',
  }
  const suffix = effectType.includes('PCT') ? '%' : effectType === 'UPTIME_HOURS' ? 'h' : ''
  return `${labels[effectType] ?? ''}${effectValue}${suffix}`
}

// Preview do item que será criado (output exato)
function OutputPreview({ output }: { output: CraftingOutput }) {
  return (
    <div className="bg-[#111118] rounded-lg px-3 py-2.5">
      <p className="text-gray-600 text-xs uppercase tracking-wider mb-2">Output</p>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{output.name}</p>

          {output.type === 'robot' ? (
            <>
              <div className="flex gap-3 text-xs mt-1">
                {output.hashPower  && <span className="text-orange-400">{output.hashPower} ER</span>}
                {output.energyRate && <span className="text-teal-400">{output.energyRate} PD/hr</span>}
              </div>
              {output.collection && (
                <p className="text-gray-500 text-xs mt-0.5 truncate">{output.collection}</p>
              )}
              <p className="text-gray-600 text-xs mt-0.5">Robot</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {output.effectType && <CategoryTag effectType={output.effectType} />}
                {output.effectType2 && <CategoryTag effectType={output.effectType2} />}
                {output.effectType && output.effectValue != null && (
                  <span className="text-gray-400 text-xs">
                    {effectLabel(output.effectType, output.effectValue)}
                    {output.effectType2 && output.effectValue2 != null
                      ? ` · ${effectLabel(output.effectType2, output.effectValue2)}`
                      : ''}
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-xs mt-0.5">
                {output.type === 'equipment' ? 'Robot equipment' : 'Base upgrade'}
              </p>
            </>
          )}
        </div>
        <RarityBadge rarity={output.rarity as Rarity} />
      </div>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnrichedIngredient {
  partType: string
  rarity:   string
  quantity: number
  have:     number
  canCraft: boolean
}

interface EnrichedRecipeForCard extends Omit<CraftingRecipe, 'ingredients'> {
  ingredients: EnrichedIngredient[]
  canCraft:    boolean
}

interface CraftingRecipeCardProps {
  recipe:   EnrichedRecipeForCard
  crafting: boolean
  onCraft:  (recipeId: string) => void
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function CraftingRecipeCard({ recipe, crafting, onCraft }: CraftingRecipeCardProps) {
  const borderColor = RARITY_BORDER[recipe.output.rarity] ?? 'border-gray-700/50'

  return (
    <div className={`border rounded-xl p-4 bg-[#0d0d15] flex flex-col gap-3 transition-all ${
      recipe.canCraft ? 'border-indigo-700/40' : borderColor
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-white text-sm font-semibold">{recipe.name}</p>
          <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{recipe.description}</p>
        </div>
        <RarityBadge rarity={recipe.output.rarity as Rarity} />
      </div>

      {/* Ingredientes */}
      <div className="bg-[#111118] rounded-lg px-3 py-2.5 space-y-2">
        <p className="text-gray-600 text-xs uppercase tracking-wider">Required</p>
        {recipe.ingredients.map((ing, i) => {
          const enough    = ing.have >= ing.quantity
          const partial   = ing.have > 0 && !enough
          const icon      = enough ? '✓' : partial ? '◐' : '✗'
          const iconColor = enough ? 'text-green-400' : partial ? 'text-yellow-400' : 'text-red-400'
          const nameColor = enough ? 'text-green-400' : partial ? 'text-yellow-400' : 'text-red-400'
          const countColor= enough ? 'text-green-400' : 'text-red-400'

          return (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-xs shrink-0 ${iconColor}`}>{icon}</span>
                <RarityBadge rarity={ing.rarity as Rarity} />
                <span className={`text-xs truncate ${nameColor}`}>{ing.partType}</span>
              </div>
              <span className={`text-xs font-mono shrink-0 ${countColor}`}>
                {ing.have}<span className="text-gray-600">/{ing.quantity}</span>
              </span>
            </div>
          )
        })}
      </div>

      {/* Output exato */}
      <OutputPreview output={recipe.output} />

      {/* Craft button */}
      <ActionButton
        variant="outline"
        size="sm"
        fullWidth
        disabled={!recipe.canCraft || crafting}
        loading={crafting}
        loadingText="Crafting..."
        onClick={() => onCraft(recipe.id)}
      >
        {recipe.canCraft ? '⚒️ Craft' : 'Missing ingredients'}
      </ActionButton>
    </div>
  )
}
