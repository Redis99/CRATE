import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  PARTS_CRATE_PRICE, SUPPLY_CRATE_PRICE,
  PARTS_CRATE_WEEKLY_LIMIT, getLastMonday,
} from '@/app/api/game/lootbox/route'

const SUPPLY_CRATE_MAX_PURCHASE = 10

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lootboxType, quantity = 1 } = await req.json() as {
    lootboxType: 'PARTS_CRATE' | 'SUPPLY_CRATE'
    quantity: number
  }

  if (!['PARTS_CRATE', 'SUPPLY_CRATE'].includes(lootboxType)) {
    return NextResponse.json({ error: 'Invalid lootbox type.' }, { status: 400 })
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json({ error: 'Quantity must be a positive integer.' }, { status: 400 })
  }

  const price = lootboxType === 'PARTS_CRATE' ? PARTS_CRATE_PRICE : SUPPLY_CRATE_PRICE
  let qty = quantity

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { balanceCrate: true },
  })
  if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })

  // Verifica e ajusta quantidade para Parts Crate
  if (lootboxType === 'PARTS_CRATE') {
    const purchased = await prisma.transaction.count({
      where: {
        userId: user.id,
        type: 'LOOTBOX_PURCHASE',
        amount: PARTS_CRATE_PRICE,
        createdAt: { gte: getLastMonday() },
      },
    })
    const remaining = PARTS_CRATE_WEEKLY_LIMIT - purchased
    if (remaining <= 0) {
      return NextResponse.json({ error: 'Weekly limit reached for Parts Crates.' }, { status: 400 })
    }
    qty = Math.min(qty, remaining, PARTS_CRATE_WEEKLY_LIMIT)
  } else {
    qty = Math.min(qty, SUPPLY_CRATE_MAX_PURCHASE)
  }

  const totalCost = price * qty
  if (profile.balanceCrate < totalCost) {
    return NextResponse.json({
      error: `Insufficient balance. Need ${totalCost.toFixed(2)} CRATE for ${qty}× ${lootboxType === 'PARTS_CRATE' ? 'Parts Crate' : 'Supply Crate'}.`,
    }, { status: 400 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { balanceCrate: { decrement: totalCost } },
    })

    const existing = await tx.inventoryLootbox.findUnique({
      where: { userId_lootboxType: { userId: user.id, lootboxType } },
    })
    if (existing) {
      await tx.inventoryLootbox.update({
        where: { userId_lootboxType: { userId: user.id, lootboxType } },
        data: { quantity: { increment: qty } },
      })
    } else {
      await tx.inventoryLootbox.create({
        data: { userId: user.id, lootboxType, quantity: qty, source: 'purchased' },
      })
    }

    // Uma transação por unidade (para rastrear o limite semanal corretamente)
    // txHash armazena o tipo de lootbox para filtrar de forma confiável (evita comparação float)
    await tx.transaction.createMany({
      data: Array.from({ length: qty }, () => ({
        userId: user.id,
        type: 'LOOTBOX_PURCHASE' as const,
        token: 'CRATE' as const,
        amount: price,
        txHash: lootboxType,
        status: 'CONFIRMED' as const,
      })),
    })
  })

  return NextResponse.json({ success: true, purchased: qty, totalCost })
}
