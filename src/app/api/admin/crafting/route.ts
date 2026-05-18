import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

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
  const { ingredients, ...recipeData } = body

  const recipe = await prisma.craftingRecipe.create({
    data: {
      ...recipeData,
      ingredients: { create: ingredients ?? [] },
    },
    include: { ingredients: true },
  })

  return NextResponse.json(recipe)
}

export async function PUT(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, ingredients, ...recipeData } = body

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Replace ingredients: delete all, then recreate
  await prisma.craftingIngredient.deleteMany({ where: { recipeId: id } })

  const recipe = await prisma.craftingRecipe.update({
    where: { id },
    data: {
      ...recipeData,
      ingredients: { create: ingredients ?? [] },
    },
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
