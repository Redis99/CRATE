import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

// Whitelist de campos editáveis da receita (evita rejection do Prisma por campos extras)
const RECIPE_FIELDS = [
  'name', 'description', 'active', 'costCrate', 'craftingTimeSec',
  'outputType', 'outputName', 'outputRarity', 'outputCollection',
  'outputHashPower', 'outputEnergyRate',
  'outputEffectType', 'outputEffectValue', 'outputEffectType2', 'outputEffectValue2',
] as const

// Whitelist de campos editáveis do ingrediente
const INGREDIENT_FIELDS = ['partType', 'rarity', 'quantity'] as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickRecipeFields(body: Record<string, any>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: Record<string, any> = {}
  for (const k of RECIPE_FIELDS) if (k in body) out[k] = body[k]
  return out
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickIngredientFields(ing: Record<string, any>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: Record<string, any> = {}
  for (const k of INGREDIENT_FIELDS) if (k in ing) out[k] = ing[k]
  return out
}

export async function GET(_req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const recipes = await prisma.craftingRecipe.findMany({
    include: { ingredients: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(recipes)
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const ingredients = Array.isArray(body.ingredients) ? body.ingredients : []
  const recipeData = pickRecipeFields(body)

  const recipe = await prisma.craftingRecipe.create({
    data: {
      ...recipeData,
      ingredients: { create: ingredients.map(pickIngredientFields) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    include: { ingredients: true },
  })
  return NextResponse.json(recipe)
}

export async function PUT(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const ingredients = Array.isArray(body.ingredients) ? body.ingredients : []
  const recipeData  = pickRecipeFields(body)

  // Substitui ingredientes: deleta os antigos, recria os novos
  await prisma.craftingIngredient.deleteMany({ where: { recipeId: id } })

  const recipe = await prisma.craftingRecipe.update({
    where: { id },
    data: {
      ...recipeData,
      ingredients: { create: ingredients.map(pickIngredientFields) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    include: { ingredients: true },
  })
  return NextResponse.json(recipe)
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.craftingIngredient.deleteMany({ where: { recipeId: id } })
  await prisma.craftingRecipe.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
