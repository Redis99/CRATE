import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { consumableId, robotId, quantity = 1 } = await req.json()
  if (!consumableId || !robotId) {
    return NextResponse.json({ error: 'Missing consumableId or robotId.' }, { status: 400 })
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json({ error: 'Quantity must be a positive integer.' }, { status: 400 })
  }

  const [consumable, robot] = await Promise.all([
    prisma.consumable.findFirst({ where: { id: consumableId, userId: user.id } }),
    prisma.robot.findFirst({ where: { id: robotId, userId: user.id }, select: { id: true, durability: true, maxDurability: true } }),
  ])

  if (!consumable) return NextResponse.json({ error: 'Consumable not found.' }, { status: 404 })
  if (!robot)      return NextResponse.json({ error: 'Robot not found.' }, { status: 404 })
  if (consumable.consumableType !== 'REPAIR_KIT') {
    return NextResponse.json({ error: 'This consumable is not a Repair Kit.' }, { status: 400 })
  }

  // Usa maxDurability individual do robô; fallback 100 para robôs antigos sem esse campo
  const maxDurability = robot.maxDurability ?? 100

  if (robot.durability >= maxDurability) {
    return NextResponse.json({ error: 'Robot is already at full durability.' }, { status: 400 })
  }
  if (quantity > consumable.quantity) {
    return NextResponse.json({ error: `Not enough batteries. Have ${consumable.quantity}, requested ${quantity}.` }, { status: 400 })
  }

  const qty = Math.min(quantity, consumable.quantity)
  const newDurability = Math.min(maxDurability, robot.durability + consumable.value * qty)
  const actualUsed = Math.ceil((newDurability - robot.durability) / consumable.value)
  const consume = Math.min(qty, actualUsed)  // nunca consome mais do que o necessário

  await prisma.$transaction([
    prisma.robot.update({
      where: { id: robotId },
      data: { durability: newDurability },
    }),
    consumable.quantity > consume
      ? prisma.consumable.update({ where: { id: consumableId }, data: { quantity: { decrement: consume } } })
      : prisma.consumable.delete({ where: { id: consumableId } }),
  ])

  return NextResponse.json({ success: true, newDurability, batteriesUsed: consume })
}
