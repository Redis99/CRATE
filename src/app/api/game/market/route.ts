import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ITEM_SELECT = {
  robot:       { select: { id: true, name: true, collection: true, rarity: true, hashPower: true, energyRate: true, durability: true, maxDurability: true, equipments: { select: { equipment: { select: { id: true, name: true, rarity: true, effectType: true, effectValue: true, effectType2: true, effectValue2: true } } } } } },
  equipment:   { select: { id: true, name: true, rarity: true, effectType: true, effectValue: true, effectType2: true, effectValue2: true, isPermanent: true } },
  baseUpgrade: { select: { id: true, name: true, rarity: true, effectType: true, effectValue: true, effectType2: true, effectValue2: true } },
}

export async function GET(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') // 'browse' | 'mine' | 'sell'

  if (mode === 'sell') {
    // Retorna itens do jogador elegíveis para listagem
    const [robots, equipments, baseUpgrades] = await Promise.all([
      prisma.robot.findMany({
        where: { userId: user.id, isActive: false, listing: null },
        select: {
          id: true, name: true, collection: true, rarity: true,
          hashPower: true, energyRate: true, durability: true, maxDurability: true,
          equipments: { select: { equipmentId: true, equipment: { select: { id: true, name: true } } } },
        },
        orderBy: { rarity: 'asc' },
      }),
      prisma.equipment.findMany({
        where: { userId: user.id, robot: null, listing: null },
        select: { id: true, name: true, rarity: true, effectType: true, effectValue: true, effectType2: true, effectValue2: true },
        orderBy: { rarity: 'asc' },
      }),
      prisma.baseUpgrade.findMany({
        where: { userId: user.id, isApplied: false, listing: null },
        select: { id: true, name: true, rarity: true, effectType: true, effectValue: true, effectType2: true, effectValue2: true },
        orderBy: { rarity: 'asc' },
      }),
    ])
    return NextResponse.json({ robots, equipments, baseUpgrades })
  }

  if (mode === 'mine') {
    // Listagens do próprio jogador (filtra expiradas)
    const listings = await prisma.marketListing.findMany({
      where: { sellerId: user.id, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      include: {
        robot:       ITEM_SELECT.robot,
        equipment:   ITEM_SELECT.equipment,
        baseUpgrade: ITEM_SELECT.baseUpgrade,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ listings })
  }

  // Browse — todas as listagens ativas e não expiradas
  const listings = await prisma.marketListing.findMany({
    where: { status: 'ACTIVE', expiresAt: { gt: new Date() } },
    include: {
      seller:      { select: { username: true } },
      robot:       ITEM_SELECT.robot,
      equipment:   ITEM_SELECT.equipment,
      baseUpgrade: ITEM_SELECT.baseUpgrade,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ listings, userId: user.id })
}
