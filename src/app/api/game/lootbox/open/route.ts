import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  rollPartsCrate, rollSupplyCrate,
  saveDropToInventory, checkInventorySpace,
  type DropResultType,
} from '@/lib/lootbox'

const MAX_OPEN_AT_ONCE = 10

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

  const qty = Math.min(Math.max(1, quantity), MAX_OPEN_AT_ONCE)

  const lootbox = await prisma.inventoryLootbox.findUnique({
    where: { userId_lootboxType: { userId: user.id, lootboxType } },
  })

  if (!lootbox || lootbox.quantity < 1) {
    return NextResponse.json({ error: 'You do not have this lootbox.' }, { status: 400 })
  }

  const toOpen = Math.min(qty, lootbox.quantity)
  const drops: DropResultType[] = []
  let stopped = false

  for (let i = 0; i < toOpen; i++) {
    const drop = lootboxType === 'PARTS_CRATE' ? rollPartsCrate() : rollSupplyCrate()

    const spaceError = await checkInventorySpace(user.id, drop)
    if (spaceError) {
      stopped = true
      break
    }

    await saveDropToInventory(user.id, drop)
    drops.push(drop)
  }

  // Remove as crates abertas do inventário
  if (drops.length > 0) {
    const newQty = lootbox.quantity - drops.length
    if (newQty <= 0) {
      await prisma.inventoryLootbox.delete({
        where: { userId_lootboxType: { userId: user.id, lootboxType } },
      })
    } else {
      await prisma.inventoryLootbox.update({
        where: { userId_lootboxType: { userId: user.id, lootboxType } },
        data: { quantity: newQty },
      })
    }
  }

  return NextResponse.json({
    success: drops.length > 0,
    drops,
    opened: drops.length,
    stoppedEarly: stopped,
  })
}
