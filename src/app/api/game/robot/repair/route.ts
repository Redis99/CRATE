import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MAX_DURABILITY = 100

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { consumableId, robotId } = await req.json()
  if (!consumableId || !robotId) {
    return NextResponse.json({ error: 'Missing consumableId or robotId.' }, { status: 400 })
  }

  const [consumable, robot] = await Promise.all([
    prisma.consumable.findFirst({ where: { id: consumableId, userId: user.id } }),
    prisma.robot.findFirst({ where: { id: robotId, userId: user.id } }),
  ])

  if (!consumable) return NextResponse.json({ error: 'Consumable not found.' }, { status: 404 })
  if (!robot)      return NextResponse.json({ error: 'Robot not found.' }, { status: 404 })
  if (consumable.consumableType !== 'REPAIR_KIT') {
    return NextResponse.json({ error: 'This consumable is not a Repair Kit.' }, { status: 400 })
  }
  if (robot.durability >= MAX_DURABILITY) {
    return NextResponse.json({ error: 'Robot is already at full durability.' }, { status: 400 })
  }

  const newDurability = Math.min(MAX_DURABILITY, robot.durability + consumable.value)

  await prisma.$transaction([
    prisma.robot.update({
      where: { id: robotId },
      data: { durability: newDurability },
    }),
    consumable.quantity > 1
      ? prisma.consumable.update({ where: { id: consumableId }, data: { quantity: { decrement: 1 } } })
      : prisma.consumable.delete({ where: { id: consumableId } }),
  ])

  return NextResponse.json({ success: true, newDurability })
}
