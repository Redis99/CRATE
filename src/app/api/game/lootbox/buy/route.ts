import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LootboxType } from '@prisma/client'
import {
  PARTS_CRATE_PRICE, SUPPLY_CRATE_PRICE, ROBOT_CRATE_PRICES,
  PARTS_CRATE_WEEKLY_LIMIT, getLastMonday,
} from '@/app/api/game/lootbox/route'

const VALID_TYPES = [
  'PARTS_CRATE',
  'SUPPLY_CRATE',
  'ROBOT_CRATE_COMMON',
  'ROBOT_CRATE_UNCOMMON',
  'ROBOT_CRATE_RARE',
  'ROBOT_CRATE_EPIC',
] as const

type ValidLootboxType = typeof VALID_TYPES[number]

const MAX_PURCHASE: Record<ValidLootboxType, number> = {
  PARTS_CRATE:          5,   // controlado pelo limite semanal
  SUPPLY_CRATE:         10,
  ROBOT_CRATE_COMMON:   10,
  ROBOT_CRATE_UNCOMMON: 10,
  ROBOT_CRATE_RARE:     10,
  ROBOT_CRATE_EPIC:     10,
}

/** Retorna o preço da lootbox: banco tem prioridade, fallback hardcoded */
async function getPrice(lootboxType: string): Promise<number> {
  const cfg = await prisma.lootboxConfig.findFirst({
    where: { lootboxType, active: true },
    select: { priceCrate: true },
  })
  if (cfg) return cfg.priceCrate

  // Fallback hardcoded
  if (lootboxType === 'PARTS_CRATE')  return PARTS_CRATE_PRICE
  if (lootboxType === 'SUPPLY_CRATE') return SUPPLY_CRATE_PRICE
  if (lootboxType in ROBOT_CRATE_PRICES) return ROBOT_CRATE_PRICES[lootboxType]
  return 0
}

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lootboxType, quantity = 1 } = await req.json() as {
    lootboxType: string
    quantity: number
  }

  if (!VALID_TYPES.includes(lootboxType as ValidLootboxType)) {
    return NextResponse.json({ error: 'Invalid lootbox type.' }, { status: 400 })
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json({ error: 'Quantity must be a positive integer.' }, { status: 400 })
  }

  const price = await getPrice(lootboxType)
  if (price <= 0) return NextResponse.json({ error: 'Price not configured for this lootbox.' }, { status: 400 })

  let qty = quantity

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { balanceCrate: true },
  })
  if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })

  // Verifica e ajusta quantidade para Parts Crate (limite semanal)
  if (lootboxType === 'PARTS_CRATE') {
    const purchased = await prisma.transaction.count({
      where: {
        userId: user.id,
        type: 'LOOTBOX_PURCHASE',
        txHash: 'PARTS_CRATE',
        createdAt: { gte: getLastMonday() },
      },
    })
    const remaining = PARTS_CRATE_WEEKLY_LIMIT - purchased
    if (remaining <= 0) {
      return NextResponse.json({ error: 'Weekly limit reached for Parts Crates.' }, { status: 400 })
    }
    qty = Math.min(qty, remaining, PARTS_CRATE_WEEKLY_LIMIT)
  } else {
    qty = Math.min(qty, MAX_PURCHASE[lootboxType as ValidLootboxType] ?? 10)
  }

  const totalCost = Math.round(price * qty * 100) / 100
  if (profile.balanceCrate < totalCost) {
    const typeName = lootboxType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    return NextResponse.json({
      error: `Insufficient balance. Need ${totalCost.toFixed(2)} CRATE for ${qty}× ${typeName}.`,
    }, { status: 400 })
  }

  // Verifica espaço de lootboxes no inventário
  const invProfile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { slotsLootboxes: true, _count: { select: { lootboxes: true } } },
  })
  const ltEnum = lootboxType as LootboxType

  if (invProfile) {
    const existing = await prisma.inventoryLootbox.findUnique({
      where: { userId_lootboxType: { userId: user.id, lootboxType: ltEnum } },
    })
    // Só verifica slot livre se este tipo ainda não está no inventário
    if (!existing && invProfile._count.lootboxes >= invProfile.slotsLootboxes) {
      return NextResponse.json({ error: 'Lootbox inventory is full.' }, { status: 400 })
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Debita de forma atômica — WHERE gte impede saldo negativo em requests concorrentes
      const deducted = await tx.user.updateMany({
        where: { id: user.id, balanceCrate: { gte: totalCost } },
        data:  { balanceCrate: { decrement: totalCost } },
      })
      if (deducted.count === 0) throw new Error('INSUFFICIENT_BALANCE')

      const existing = await tx.inventoryLootbox.findUnique({
        where: { userId_lootboxType: { userId: user.id, lootboxType: ltEnum } },
      })
      if (existing) {
        await tx.inventoryLootbox.update({
          where: { userId_lootboxType: { userId: user.id, lootboxType: ltEnum } },
          data: { quantity: { increment: qty } },
        })
      } else {
        await tx.inventoryLootbox.create({
          data: { userId: user.id, lootboxType: ltEnum, quantity: qty, source: 'purchased' },
        })
      }

      // Registra uma transaction por crate comprada (facilita rastreio do limite semanal)
      await tx.transaction.createMany({
        data: Array.from({ length: qty }, () => ({
          userId: user.id,
          type:   'LOOTBOX_PURCHASE' as const,
          token:  'CRATE'           as const,
          amount: price,
          txHash: lootboxType,   // identifica o tipo para rastreio do limite
          status: 'CONFIRMED'    as const,
        })),
      })
    })
  } catch (e) {
    if (e instanceof Error && e.message === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json({ error: 'Insufficient balance.' }, { status: 400 })
    }
    throw e
  }

  return NextResponse.json({ success: true, purchased: qty, totalCost })
}
