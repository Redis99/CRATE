import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LootboxType } from '@prisma/client'
import {
  PARTS_CRATE_PRICE, SUPPLY_CRATE_PRICE, SPECIFIC_CRATE_PRICES,
  PARTS_CRATE_WEEKLY_LIMIT, getLastMonday,
} from '@/app/api/game/lootbox/route'

const VALID_TYPES = [
  'PARTS_CRATE',
  'SUPPLY_CRATE',
  'ROBOT_CRATE_COMMON',
  'ROBOT_CRATE_UNCOMMON',
  'ROBOT_CRATE_RARE',
  'ROBOT_CRATE_EPIC',
  'EQUIPMENT_CRATE_COMMON',
  'EQUIPMENT_CRATE_UNCOMMON',
  'EQUIPMENT_CRATE_RARE',
  'EQUIPMENT_CRATE_EPIC',
  'BASE_UPGRADE_CRATE_COMMON',
  'BASE_UPGRADE_CRATE_UNCOMMON',
  'BASE_UPGRADE_CRATE_RARE',
  'BASE_UPGRADE_CRATE_EPIC',
] as const

type ValidLootboxType = typeof VALID_TYPES[number]

/** Máximo de crates por transação — teto de UX, independente do limite semanal */
const MAX_PER_TX = 10

interface CrateConfig {
  price:       number
  weeklyLimit: number | null  // null = ilimitado
}

/**
 * Busca configuração da crate no banco.
 * O banco é sempre a fonte de verdade; fallback hardcoded apenas se DB vazio.
 */
async function getCrateConfig(lootboxType: string): Promise<CrateConfig> {
  const cfg = await prisma.lootboxConfig.findFirst({
    where:  { lootboxType, active: true },
    select: { priceCrate: true, weeklyLimit: true },
  })

  if (cfg) return { price: cfg.priceCrate, weeklyLimit: cfg.weeklyLimit }

  // Fallback hardcoded (banco vazio / emergência)
  const price = lootboxType === 'PARTS_CRATE'  ? PARTS_CRATE_PRICE
              : lootboxType === 'SUPPLY_CRATE'  ? SUPPLY_CRATE_PRICE
              : SPECIFIC_CRATE_PRICES[lootboxType] ?? 0

  const weeklyLimit = lootboxType === 'PARTS_CRATE' ? PARTS_CRATE_WEEKLY_LIMIT : null

  return { price, weeklyLimit }
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

  const config = await getCrateConfig(lootboxType)
  if (config.price <= 0) {
    return NextResponse.json({ error: 'Price not configured for this lootbox.' }, { status: 400 })
  }

  const profile = await prisma.user.findUnique({
    where:  { id: user.id },
    select: { balanceCrate: true },
  })
  if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })

  // ── Limite semanal (lido do banco via config) ─────────────────────────────
  // Funciona para qualquer crate que tenha weeklyLimit definido — não apenas Parts Crate.
  let qty = Math.min(quantity, MAX_PER_TX)

  if (config.weeklyLimit !== null) {
    const purchased = await prisma.transaction.count({
      where: {
        userId:    user.id,
        type:      'LOOTBOX_PURCHASE',
        txHash:    lootboxType,            // txHash armazena o tipo para rastreio
        createdAt: { gte: getLastMonday() },
      },
    })
    const remaining = config.weeklyLimit - purchased
    if (remaining <= 0) {
      const typeName = lootboxType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      return NextResponse.json({
        error: `Weekly limit reached for ${typeName}. Resets every Monday.`,
      }, { status: 400 })
    }
    qty = Math.min(qty, remaining)
  }

  // ── Verificação de saldo ──────────────────────────────────────────────────
  const totalCost = Math.round(config.price * qty * 100) / 100
  if (profile.balanceCrate < totalCost) {
    const typeName = lootboxType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    return NextResponse.json({
      error: `Insufficient balance. Need ${totalCost.toFixed(2)} CRATE for ${qty}× ${typeName}.`,
    }, { status: 400 })
  }

  // ── Verificação de espaço no inventário de lootboxes ──────────────────────
  const invProfile = await prisma.user.findUnique({
    where:  { id: user.id },
    select: { slotsLootboxes: true, _count: { select: { lootboxes: true } } },
  })
  const ltEnum = lootboxType as LootboxType

  if (invProfile) {
    const existing = await prisma.inventoryLootbox.findUnique({
      where: { userId_lootboxType: { userId: user.id, lootboxType: ltEnum } },
    })
    if (!existing && invProfile._count.lootboxes >= invProfile.slotsLootboxes) {
      return NextResponse.json({ error: 'Lootbox inventory is full.' }, { status: 400 })
    }
  }

  // ── Transação atômica ─────────────────────────────────────────────────────
  try {
    await prisma.$transaction(async (tx) => {
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
          data:  { quantity: { increment: qty } },
        })
      } else {
        await tx.inventoryLootbox.create({
          data: { userId: user.id, lootboxType: ltEnum, quantity: qty, source: 'purchased' },
        })
      }

      // Uma transaction por crate — txHash = lootboxType para rastreio do limite semanal
      await tx.transaction.createMany({
        data: Array.from({ length: qty }, () => ({
          userId: user.id,
          type:   'LOOTBOX_PURCHASE' as const,
          token:  'CRATE'           as const,
          amount: config.price,
          txHash: lootboxType,
          status: 'CONFIRMED'       as const,
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
