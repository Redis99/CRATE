import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type ItemType = 'robot' | 'equipment' | 'baseUpgrade' | 'part' | 'consumable' | 'lootbox'

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { itemId, itemType } = await req.json() as { itemId: string; itemType: ItemType }

  if (!itemId || !itemType) {
    return NextResponse.json({ error: 'Missing itemId or itemType.' }, { status: 400 })
  }

  switch (itemType) {
    case 'robot': {
      const robot = await prisma.robot.findFirst({ where: { id: itemId, userId: user.id } })
      if (!robot) return NextResponse.json({ error: 'Robot not found.' }, { status: 404 })
      if (robot.isActive) return NextResponse.json({ error: 'Cannot destroy a deployed robot. Recall it first.' }, { status: 409 })
      await prisma.robot.delete({ where: { id: itemId } })
      break
    }
    case 'equipment': {
      const eq = await prisma.equipment.findFirst({
        where: { id: itemId, userId: user.id },
        include: { robot: true },
      })
      if (!eq) return NextResponse.json({ error: 'Equipment not found.' }, { status: 404 })
      if (eq.robot) return NextResponse.json({ error: 'Cannot destroy equipped item. Unequip it from the robot first.' }, { status: 409 })
      await prisma.equipment.delete({ where: { id: itemId } })
      break
    }
    case 'baseUpgrade': {
      const bu = await prisma.baseUpgrade.findFirst({ where: { id: itemId, userId: user.id } })
      if (!bu) return NextResponse.json({ error: 'Base upgrade not found.' }, { status: 404 })
      await prisma.baseUpgrade.delete({ where: { id: itemId } })
      break
    }
    case 'part': {
      const part = await prisma.inventoryPart.findFirst({ where: { id: itemId, userId: user.id } })
      if (!part) return NextResponse.json({ error: 'Part not found.' }, { status: 404 })
      if (part.quantity > 1) {
        await prisma.inventoryPart.update({ where: { id: itemId }, data: { quantity: { decrement: 1 } } })
      } else {
        await prisma.inventoryPart.delete({ where: { id: itemId } })
      }
      break
    }
    case 'consumable': {
      const con = await prisma.consumable.findFirst({ where: { id: itemId, userId: user.id } })
      if (!con) return NextResponse.json({ error: 'Consumable not found.' }, { status: 404 })
      if (con.quantity > 1) {
        await prisma.consumable.update({ where: { id: itemId }, data: { quantity: { decrement: 1 } } })
      } else {
        await prisma.consumable.delete({ where: { id: itemId } })
      }
      break
    }
    case 'lootbox': {
      const lb = await prisma.inventoryLootbox.findFirst({ where: { id: itemId, userId: user.id } })
      if (!lb) return NextResponse.json({ error: 'Lootbox not found.' }, { status: 404 })
      if (lb.quantity > 1) {
        await prisma.inventoryLootbox.update({ where: { id: itemId }, data: { quantity: { decrement: 1 } } })
      } else {
        await prisma.inventoryLootbox.delete({ where: { id: itemId } })
      }
      break
    }
    default:
      return NextResponse.json({ error: 'Invalid item type.' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
