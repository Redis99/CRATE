import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pendingCraftId } = await req.json()
  if (!pendingCraftId) return NextResponse.json({ error: 'Missing pendingCraftId.' }, { status: 400 })

  const pending = await prisma.pendingCraft.findFirst({
    where:   { id: pendingCraftId, userId: user.id },
    include: { recipe: true },
  })

  if (!pending)       return NextResponse.json({ error: 'Craft not found.' }, { status: 404 })
  if (pending.claimed) return NextResponse.json({ error: 'Already collected.' }, { status: 400 })
  if (pending.completesAt > new Date())
    return NextResponse.json({ error: 'Craft is still in progress.' }, { status: 400 })

  const recipe  = pending.recipe

  // Verifica espaço no inventário no momento da coleta
  const profile = await prisma.user.findUnique({
    where:  { id: user.id },
    select: {
      slotsRobots:      true,
      slotsEquipments:  true,
      slotsBaseUpgrades: true,
      _count: { select: { robots: true, equipments: true, baseUpgrades: true } },
    },
  })
  if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })

  if (recipe.outputType === 'ROBOT'        && profile._count.robots       >= profile.slotsRobots)
    return NextResponse.json({ error: 'Robot inventory is full.' }, { status: 400 })
  if (recipe.outputType === 'EQUIPMENT'    && profile._count.equipments   >= profile.slotsEquipments)
    return NextResponse.json({ error: 'Equipment inventory is full.' }, { status: 400 })
  if (recipe.outputType === 'BASE_UPGRADE' && profile._count.baseUpgrades >= profile.slotsBaseUpgrades)
    return NextResponse.json({ error: 'Base upgrade inventory is full.' }, { status: 400 })

  const now = new Date()

  await prisma.$transaction(async (tx) => {
    // Cria o item
    if (recipe.outputType === 'ROBOT') {
      await tx.robot.create({
        data: {
          userId:     user.id,
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
          userId:       user.id,
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
          userId:       user.id,
          name:         recipe.outputName,
          rarity:       recipe.outputRarity,
          effectType:   recipe.outputEffectType,
          effectValue:  recipe.outputEffectValue,
          effectType2:  recipe.outputEffectType2  ?? null,
          effectValue2: recipe.outputEffectValue2 ?? null,
          isApplied:    false,
        },
      })
    }

    // Marca como coletado
    await tx.pendingCraft.update({
      where: { id: pendingCraftId },
      data:  { claimed: true, claimedAt: now },
    })
  })

  return NextResponse.json({
    success: true,
    output:  { name: recipe.outputName, type: recipe.outputType, rarity: recipe.outputRarity },
  })
}
