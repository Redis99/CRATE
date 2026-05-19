import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      outpostSlots: true,
      baseUpgrades: {
        where: { isApplied: true },
        select: {
          id: true, name: true, rarity: true,
          effectType: true, effectValue: true,
          effectType2: true, effectValue2: true,
          appliedSlot: true,
        },
      },
      robots: {
        select: {
          id: true,
          name: true,
          collection: true,
          rarity: true,
          hashPower: true,
          energyRate: true,
          durability: true, maxDurability: true,
          isActive: true,
          outpostSlot: true,
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
    },
  })

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  return NextResponse.json(profile)
}
