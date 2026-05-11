import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRecipe } from '@/lib/crafting-recipes'

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipeId } = await req.json()
  if (!recipeId) return NextResponse.json({ error: 'Missing recipeId.' }, { status: 400 })

  const recipe = getRecipe(recipeId)
  if (!recipe) return NextResponse.json({ error: 'Recipe not found or inactive.' }, { status: 404 })

  // Busca todas as peças do jogador com quantidades
  const allParts = await prisma.inventoryPart.findMany({
    where: { userId: user.id },
    select: { id: true, partType: true, quantity: true },
    orderBy: { quantity: 'asc' },
  })

  const partTypeMap = new Map<string, number>()
  for (const p of allParts) {
    partTypeMap.set(p.partType, (partTypeMap.get(p.partType) ?? 0) + p.quantity)
  }

  // Verifica ingredientes
  for (const ing of recipe.ingredients) {
    const have = partTypeMap.get(ing.partType) ?? 0
    if (have < ing.quantity) {
      return NextResponse.json({
        error: `Not enough: need ${ing.quantity}× ${ing.partType}, have ${have}.`,
      }, { status: 400 })
    }
  }

  // Verifica espaço no inventário
  const { output } = recipe
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      slotsRobots: true, slotsEquipments: true, slotsBaseUpgrades: true,
      _count: { select: { robots: true, equipments: true, baseUpgrades: true } },
    },
  })
  if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })

  if (output.type === 'robot'       && profile._count.robots       >= profile.slotsRobots)       return NextResponse.json({ error: 'Robot inventory is full.'       }, { status: 400 })
  if (output.type === 'equipment'   && profile._count.equipments   >= profile.slotsEquipments)   return NextResponse.json({ error: 'Equipment inventory is full.'   }, { status: 400 })
  if (output.type === 'baseUpgrade' && profile._count.baseUpgrades >= profile.slotsBaseUpgrades) return NextResponse.json({ error: 'Base upgrade inventory is full.' }, { status: 400 })

  // Consome os ingredientes
  await prisma.$transaction(async (tx) => {
    for (const ing of recipe.ingredients) {
      const stacks   = allParts.filter((p) => p.partType === ing.partType)
      let remaining  = ing.quantity

      for (const stack of stacks) {
        if (remaining <= 0) break
        const consume = Math.min(stack.quantity, remaining)
        remaining -= consume

        if (stack.quantity > consume) {
          await tx.inventoryPart.update({ where: { id: stack.id }, data: { quantity: { decrement: consume } } })
        } else {
          await tx.inventoryPart.delete({ where: { id: stack.id } })
        }
      }
    }
  })

  // Cria o item exato definido na receita — sem aleatoriedade
  if (output.type === 'robot') {
    await prisma.robot.create({
      data: {
        userId:     user.id,
        name:       output.name,
        collection: output.collection ?? 'Crafted Series',
        rarity:     output.rarity,
        hashPower:  output.hashPower  ?? 10,
        energyRate: output.energyRate ?? 1,
        durability: 100,
        isActive:   false,
      },
    })
  } else if (output.type === 'equipment') {
    if (!output.effectType || output.effectValue == null) throw new Error('Equipment requires effectType and effectValue.')
    await prisma.equipment.create({
      data: {
        userId:       user.id,
        name:         output.name,
        rarity:       output.rarity,
        effectType:   output.effectType,
        effectValue:  output.effectValue,
        effectType2:  output.effectType2  ?? null,
        effectValue2: output.effectValue2 ?? null,
        isPermanent:  true,
      },
    })
  } else {
    if (!output.effectType || output.effectValue == null) throw new Error('Base upgrade requires effectType and effectValue.')
    await prisma.baseUpgrade.create({
      data: {
        userId:      user.id,
        name:        output.name,
        rarity:      output.rarity,
        effectType:  output.effectType,
        effectValue: output.effectValue,
        effectType2: output.effectType2  ?? null,
        effectValue2: output.effectValue2 ?? null,
        isApplied:   false,
      },
    })
  }

  return NextResponse.json({ success: true, output })
}
