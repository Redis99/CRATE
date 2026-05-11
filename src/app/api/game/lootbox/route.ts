import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Preços fixos para devnet (em CRATE/SOL)
export const PARTS_CRATE_PRICE  = 0.01
export const SUPPLY_CRATE_PRICE = 0.1
export const PARTS_CRATE_WEEKLY_LIMIT = 5

export function getLastMonday(): Date {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  d.setHours(0, 0, 0, 0)
  return d
}

export async function GET(_req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const lastMonday = getLastMonday()

  const [profile, partsCratePurchasedThisWeek] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        balanceCrate: true,
        lootboxes: {
          select: { id: true, lootboxType: true, quantity: true, source: true },
        },
      },
    }),
    // Filtra por txHash: 'PARTS_CRATE' (mais confiável que comparação float de amount)
    prisma.transaction.count({
      where: {
        userId: user.id,
        type: 'LOOTBOX_PURCHASE',
        txHash: 'PARTS_CRATE',
        createdAt: { gte: lastMonday },
      },
    }),
  ])

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const partsCrates  = profile.lootboxes.find((l) => l.lootboxType === 'PARTS_CRATE')
  const supplyCrates = profile.lootboxes.find((l) => l.lootboxType === 'SUPPLY_CRATE')

  return NextResponse.json({
    balance: profile.balanceCrate,
    partsCrates:  { owned: partsCrates?.quantity  ?? 0 },
    supplyCrates: { owned: supplyCrates?.quantity ?? 0 },
    weeklyPartsPurchased: partsCratePurchasedThisWeek,
    weeklyPartsLimit: PARTS_CRATE_WEEKLY_LIMIT,
    prices: { partsCrate: PARTS_CRATE_PRICE, supplyCrate: SUPPLY_CRATE_PRICE },
  })
}
