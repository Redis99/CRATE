import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { robotId, slot } = await req.json()

  if (!robotId || !slot) {
    return NextResponse.json({ error: 'Missing robotId or slot.' }, { status: 400 })
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      outpostSlots: true,
      robots: {
        where: { isActive: true },
        select: { id: true, outpostSlot: true },
      },
    },
  })

  if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })

  // Valida slot
  if (slot < 1 || slot > profile.outpostSlots) {
    return NextResponse.json({ error: `Invalid slot. Your outpost has ${profile.outpostSlots} slot(s).` }, { status: 400 })
  }

  // Slot já ocupado?
  const slotOccupied = profile.robots.some((r) => r.outpostSlot === slot)
  if (slotOccupied) {
    return NextResponse.json({ error: 'This slot is already occupied.' }, { status: 409 })
  }

  // Robot pertence ao usuário e está disponível?
  const robot = await prisma.robot.findFirst({
    where: { id: robotId, userId: user.id },
  })

  if (!robot) return NextResponse.json({ error: 'Robot not found.' }, { status: 404 })
  if (robot.isActive) return NextResponse.json({ error: 'Robot is already deployed.' }, { status: 409 })
  if (robot.durability === 0) return NextResponse.json({ error: 'Robot has 0% durability and cannot be deployed.' }, { status: 400 })

  await prisma.robot.update({
    where: { id: robotId },
    data: { isActive: true, outpostSlot: slot },
  })

  return NextResponse.json({ success: true })
}
