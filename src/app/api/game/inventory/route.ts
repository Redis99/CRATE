import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      slotsRobots: true,
      slotsEquipments: true,
      slotsBaseUpgrades: true,
      slotsParts: true,
      slotsConsumables: true,
      slotsLootboxes: true,
      robots: {
        where: { isActive: false },
        select: {
          id: true, name: true, collection: true,
          rarity: true, hashPower: true, energyRate: true, durability: true,
          equipments: {
            select: {
              equipmentId: true,
              equipment: {
                select: {
                  id: true, name: true, rarity: true,
                  effectType: true, effectValue: true,
                  effectType2: true, effectValue2: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      equipments: {
        select: {
          id: true, name: true, rarity: true,
          effectType: true, effectValue: true,
          effectType2: true, effectValue2: true,
          isPermanent: true,
          robot: {
            select: {
              robot: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      baseUpgrades: {
        select: {
          id: true, name: true, rarity: true,
          effectType: true, effectValue: true, isApplied: true, appliedSlot: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      parts: {
        select: {
          id: true, partType: true, category: true,
          rarity: true, quantity: true,
        },
        orderBy: { rarity: 'asc' },
      },
      consumables: {
        select: {
          id: true, consumableType: true, value: true, quantity: true,
        },
        orderBy: { consumableType: 'asc' },
      },
      lootboxes: {
        select: {
          id: true, lootboxType: true, quantity: true, source: true,
        },
        orderBy: { lootboxType: 'asc' },
      },
    },
  })

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  return NextResponse.json(profile)
}
