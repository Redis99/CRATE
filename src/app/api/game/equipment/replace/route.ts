import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { newEquipmentId, oldEquipmentId, robotId } = await req.json()

  if (!newEquipmentId || !oldEquipmentId || !robotId) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const [newEq, oldEqLink, robot] = await Promise.all([
    prisma.equipment.findFirst({ where: { id: newEquipmentId, userId: user.id } }),
    prisma.robotEquipment.findUnique({ where: { equipmentId: oldEquipmentId } }),
    prisma.robot.findFirst({ where: { id: robotId, userId: user.id } }),
  ])

  if (!newEq) return NextResponse.json({ error: 'New equipment not found.' }, { status: 404 })
  if (!robot) return NextResponse.json({ error: 'Robot not found.' }, { status: 404 })

  if (robot.isActive) {
    return NextResponse.json({ error: 'Recall the robot from the Outpost before swapping equipment.' }, { status: 409 })
  }
  if (!oldEqLink || oldEqLink.robotId !== robotId) {
    return NextResponse.json({ error: 'The equipment to replace is not installed on this robot.' }, { status: 409 })
  }

  const newEqLink = await prisma.robotEquipment.findUnique({ where: { equipmentId: newEquipmentId } })
  if (newEqLink) {
    return NextResponse.json({ error: 'The new equipment is already installed on another robot.' }, { status: 409 })
  }

  // Troca atômica: remove o antigo e instala o novo
  await prisma.$transaction([
    prisma.robotEquipment.delete({ where: { equipmentId: oldEquipmentId } }),
    prisma.robotEquipment.create({ data: { robotId, equipmentId: newEquipmentId } }),
  ])

  return NextResponse.json({ success: true })
}
