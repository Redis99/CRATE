import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MAX_EQUIPMENT_SLOTS = 3

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { equipmentId, robotId } = await req.json()
  if (!equipmentId || !robotId) {
    return NextResponse.json({ error: 'Missing equipmentId or robotId.' }, { status: 400 })
  }

  const [equipment, robot] = await Promise.all([
    prisma.equipment.findFirst({ where: { id: equipmentId, userId: user.id } }),
    prisma.robot.findFirst({
      where: { id: robotId, userId: user.id },
      include: { _count: { select: { equipments: true } } },
    }),
  ])

  if (!equipment) return NextResponse.json({ error: 'Equipment not found.' }, { status: 404 })
  if (!robot)     return NextResponse.json({ error: 'Robot not found.' }, { status: 404 })
  if (robot.isActive) {
    return NextResponse.json({ error: 'Recall the robot from the Outpost before equipping.' }, { status: 409 })
  }
  if (robot._count.equipments >= MAX_EQUIPMENT_SLOTS) {
    return NextResponse.json({ error: `Robot already has ${MAX_EQUIPMENT_SLOTS} equipment slots filled.` }, { status: 409 })
  }

  // Verifica se o equipamento já está instalado em outro robô
  const alreadyEquipped = await prisma.robotEquipment.findUnique({
    where: { equipmentId },
  })
  if (alreadyEquipped) {
    return NextResponse.json({ error: 'This equipment is already installed on another robot.' }, { status: 409 })
  }

  await prisma.robotEquipment.create({
    data: { robotId, equipmentId },
  })

  return NextResponse.json({ success: true })
}
