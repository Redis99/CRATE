import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Converte o enum do banco (EQUIPMENT, BASE_UPGRADE, ROBOT) para o formato usado na UI
function outputTypeToString(t: string): string {
  if (t === 'BASE_UPGRADE') return 'baseUpgrade'
  return t.toLowerCase()   // EQUIPMENT → equipment, ROBOT → robot
}

export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [dbRecipes, playerParts, pendingCrafts] = await Promise.all([
    prisma.craftingRecipe.findMany({
      where:   { active: true },
      include: { ingredients: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.inventoryPart.findMany({
      where:  { userId: user.id },
      select: { partType: true, quantity: true },
    }),
    prisma.pendingCraft.findMany({
      where:   { userId: user.id, claimed: false },
      include: { recipe: true },
      orderBy: { startedAt: 'asc' },
    }),
  ])

  // Mapa partType → quantidade total do jogador
  const partMap = new Map<string, number>()
  for (const p of playerParts) {
    partMap.set(p.partType, (partMap.get(p.partType) ?? 0) + p.quantity)
  }

  // Enriquece receitas com disponibilidade de ingredientes
  const recipes = dbRecipes.map((r) => {
    const ingredients = r.ingredients.map((ing) => ({
      partType: ing.partType,
      rarity:   ing.rarity,
      quantity: ing.quantity,
      have:     partMap.get(ing.partType) ?? 0,
      canCraft: (partMap.get(ing.partType) ?? 0) >= ing.quantity,
    }))

    return {
      id:          r.id,
      name:        r.name,
      description: r.description,
      costCrate:   r.costCrate,
      craftingTimeSec: r.craftingTimeSec,
      output: {
        type:        outputTypeToString(r.outputType),
        name:        r.outputName,
        rarity:      r.outputRarity,
        collection:  r.outputCollection  ?? undefined,
        hashPower:   r.outputHashPower   ?? undefined,
        energyRate:  r.outputEnergyRate  ?? undefined,
        effectType:  r.outputEffectType  ?? undefined,
        effectValue: r.outputEffectValue ?? undefined,
        effectType2: r.outputEffectType2  ?? undefined,
        effectValue2: r.outputEffectValue2 ?? undefined,
      },
      ingredients,
      canCraft: ingredients.every((i) => i.canCraft),
    }
  })

  // Crafts em andamento com tempo restante calculado
  const pending = pendingCrafts.map((pc) => ({
    id:          pc.id,
    recipeId:    pc.recipeId,
    recipeName:  pc.recipe.name,
    startedAt:   pc.startedAt.toISOString(),
    completesAt: pc.completesAt.toISOString(),
    isReady:     pc.completesAt <= new Date(),
    outputName:  pc.recipe.outputName,
    outputType:  outputTypeToString(pc.recipe.outputType),
    outputRarity: pc.recipe.outputRarity,
  }))

  return NextResponse.json({ recipes, pendingCrafts: pending })
}
