import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveRecipes } from '@/lib/crafting-recipes'

export async function GET(_req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parts = await prisma.inventoryPart.findMany({
    where: { userId: user.id },
    select: { partType: true, rarity: true, quantity: true },
  })

  // Mapa de quantidade por partType específico
  const partTypeMap = new Map<string, number>()
  for (const p of parts) {
    partTypeMap.set(p.partType, (partTypeMap.get(p.partType) ?? 0) + p.quantity)
  }

  const recipes = getActiveRecipes().map((recipe) => {
    const ingredients = recipe.ingredients.map((ing) => {
      const have = partTypeMap.get(ing.partType) ?? 0
      return {
        ...ing,
        have,
        canCraft: have >= ing.quantity,
      }
    })
    const canCraft = ingredients.every((i) => i.canCraft)
    return { ...recipe, ingredients, canCraft }
  })

  return NextResponse.json({ recipes })
}
