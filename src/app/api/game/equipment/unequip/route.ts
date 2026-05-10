import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { equipmentId } = await req.json()
  if (!equipmentId) return NextResponse.json({ error: 'Missing equipmentId.' }, { status: 400 })

  const equipment = await prisma.equipment.findFirst({
    where: { id: equipmentId, userId: user.id },
    include: { robot: { include: { robot: true } } },
  })

  if (!equipment) return NextResponse.json({ error: 'Equipment not found.' }, { status: 404 })
  if (!equipment.robot) return NextResponse.json({ error: 'Equipment is not installed on any robot.' }, { status: 400 })
  if (equipment.robot.robot.isActive) {
    return NextResponse.json({ error: 'Recall the robot from the Outpost before unequipping.' }, { status: 409 })
  }

  await prisma.robotEquipment.delete({ where: { equipmentId } })

  return NextResponse.json({ success: true })
}
