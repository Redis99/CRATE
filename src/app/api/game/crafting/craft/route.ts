import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
type DbRecipe = NonNullable<Awaited<ReturnType<typeof prisma.craftingRecipe.findFirst>>>

async function createOutputItem(tx: TxClient, userId: string, recipe: DbRecipe) {
  if (recipe.outputType === 'ROBOT') {
    await tx.robot.create({
      data: {
        userId,
        name:       recipe.outputName,
        collection: recipe.outputCollection ?? 'Crafted Series',
        rarity:     recipe.outputRarity,
        hashPower:  recipe.outputHashPower  ?? 10,
        energyRate: recipe.outputEnergyRate ?? 1,
        durability: 100,
        isActive:   false,
      },
    })
  } else if (recipe.outputType === 'EQUIPMENT') {
    if (!recipe.outputEffectType || recipe.outputEffectValue == null)
      throw new Error('Equipment requires effectType and effectValue.')
    await tx.equipment.create({
      data: {
        userId,
        name:         recipe.outputName,
        rarity:       recipe.outputRarity,
        effectType:   recipe.outputEffectType,
        effectValue:  recipe.outputEffectValue,
        effectType2:  recipe.outputEffectType2  ?? null,
        effectValue2: recipe.outputEffectValue2 ?? null,
        isPermanent:  true,
      },
    })
  } else {
    if (!recipe.outputEffectType || recipe.outputEffectValue == null)
      throw new Error('Base upgrade requires effectType and effectValue.')
    await tx.baseUpgrade.create({
      data: {
        userId,
        name:        recipe.outputName,
        rarity:      recipe.outputRarity,
        effectType:  recipe.outputEffectType,
        effectValue: recipe.outputEffectValue,
        effectType2: recipe.outputEffectType2  ?? null,
        effectValue2: recipe.outputEffectValue2 ?? null,
        isApplied:   false,
      },
    })
  }
}

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipeId } = await req.json()
  if (!recipeId) return NextResponse.json({ error: 'Missing recipeId.' }, { status: 400 })

  const recipe = await prisma.craftingRecipe.findFirst({
    where:   { id: recipeId, active: true },
    include: { ingredients: true },
  })
  if (!recipe) return NextResponse.json({ error: 'Recipe not found or inactive.' }, { status: 404 })

  const [allParts, profile] = await Promise.all([
    prisma.inventoryPart.findMany({
      where:   { userId: user.id },
      select:  { id: true, partType: true, quantity: true },
      orderBy: { quantity: 'asc' },
    }),
    prisma.user.findUnique({
      where:  { id: user.id },
      select: {
        balanceCrate:     true,
        slotsRobots:      true,
        slotsEquipments:  true,
        slotsBaseUpgrades: true,
        _count: { select: { robots: true, equipments: true, baseUpgrades: true } },
      },
    }),
  ])

  if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })

  // Verifica saldo em CRATE
  if (recipe.costCrate > 0 && profile.balanceCrate < recipe.costCrate) {
    return NextResponse.json({
      error: `Insufficient CRATE balance. Need ${recipe.costCrate} CRATE.`,
    }, { status: 400 })
  }

  // Verifica ingredientes
  const partTypeMap = new Map<string, number>()
  for (const p of allParts) partTypeMap.set(p.partType, (partTypeMap.get(p.partType) ?? 0) + p.quantity)

  for (const ing of recipe.ingredients) {
    const have = partTypeMap.get(ing.partType) ?? 0
    if (have < ing.quantity) {
      return NextResponse.json({
        error: `Not enough: need ${ing.quantity}× ${ing.partType}, have ${have}.`,
      }, { status: 400 })
    }
  }

  // Para crafts instantâneos, verifica espaço no inventário agora
  const isInstant = recipe.craftingTimeSec === 0
  if (isInstant) {
    if (recipe.outputType === 'ROBOT'        && profile._count.robots       >= profile.slotsRobots)
      return NextResponse.json({ error: 'Robot inventory is full.' }, { status: 400 })
    if (recipe.outputType === 'EQUIPMENT'    && profile._count.equipments   >= profile.slotsEquipments)
      return NextResponse.json({ error: 'Equipment inventory is full.' }, { status: 400 })
    if (recipe.outputType === 'BASE_UPGRADE' && profile._count.baseUpgrades >= profile.slotsBaseUpgrades)
      return NextResponse.json({ error: 'Base upgrade inventory is full.' }, { status: 400 })
  }

  const now         = new Date()
  const completesAt = new Date(now.getTime() + recipe.craftingTimeSec * 1000)

  await prisma.$transaction(async (tx) => {
    // Debita custo em CRATE
    if (recipe.costCrate > 0) {
      await tx.user.update({ where: { id: user.id }, data: { balanceCrate: { decrement: recipe.costCrate } } })
    }

    // Consome ingredientes
    for (const ing of recipe.ingredients) {
      const stacks  = allParts.filter((p) => p.partType === ing.partType)
      let remaining = ing.quantity
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

    // Cria PendingCraft
    const pending = await tx.pendingCraft.create({
      data: { userId: user.id, recipeId, startedAt: now, completesAt },
    })

    // Se instantâneo, cria item e marca como coletado imediatamente
    if (isInstant) {
      await createOutputItem(tx, user.id, recipe)
      await tx.pendingCraft.update({ where: { id: pending.id }, data: { claimed: true, claimedAt: now } })
    }
  })

  return NextResponse.json({
    success:     true,
    instant:     isInstant,
    completesAt: completesAt.toISOString(),
    output:      { name: recipe.outputName, type: recipe.outputType, rarity: recipe.outputRarity },
  })
}
