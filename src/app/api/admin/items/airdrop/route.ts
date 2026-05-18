import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, itemId } = await req.json()
  if (!userId || !itemId) {
    return NextResponse.json({ error: 'userId and itemId required' }, { status: 400 })
  }

  const [shopItem, player] = await Promise.all([
    prisma.shopItem.findUnique({ where: { id: itemId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, username: true,
        slotsEquipments: true, slotsBaseUpgrades: true,
        _count: { select: { equipments: true, baseUpgrades: true } },
      },
    }),
  ])

  if (!shopItem) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  if (!player)   return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  const meta = shopItem.metadata as Record<string, unknown>
  const isEquipment   = shopItem.category === 'equipment-specific'
  const isBaseUpgrade = shopItem.category === 'base-upgrade-specific'

  if (!isEquipment && !isBaseUpgrade) {
    return NextResponse.json({ error: 'Use /api/admin/robots/airdrop for robots' }, { status: 400 })
  }

  // Check inventory space
  if (isEquipment && player._count.equipments >= player.slotsEquipments) {
    return NextResponse.json({ error: `${player.username} equipment inventory is full` }, { status: 400 })
  }
  if (isBaseUpgrade && player._count.baseUpgrades >= player.slotsBaseUpgrades) {
    return NextResponse.json({ error: `${player.username} base upgrade inventory is full` }, { status: 400 })
  }

  const rarity = shopItem.rarity as 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

  if (isEquipment) {
    await prisma.equipment.create({
      data: {
        userId,
        name:         shopItem.name,
        rarity,
        effectType:   meta.effectType  as never,
        effectValue:  Number(meta.effectValue  ?? 0),
        effectType2:  (meta.effectType2  as never)  ?? null,
        effectValue2: meta.effectValue2 != null ? Number(meta.effectValue2) : null,
      },
    })
  } else {
    await prisma.baseUpgrade.create({
      data: {
        userId,
        name:         shopItem.name,
        rarity,
        effectType:   meta.effectType  as never,
        effectValue:  Number(meta.effectValue  ?? 0),
        effectType2:  (meta.effectType2  as never)  ?? null,
        effectValue2: meta.effectValue2 != null ? Number(meta.effectValue2) : null,
      },
    })
  }

  await prisma.notification.create({
    data: {
      userId,
      title: 'Item Received',
      message: `You received a ${rarity} ${isEquipment ? 'equipment' : 'base upgrade'}: ${shopItem.name}!`,
      read: false,
    },
  })

  return NextResponse.json({ success: true, name: shopItem.name })
}
