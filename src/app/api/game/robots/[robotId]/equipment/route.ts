import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ robotId: string }> }
) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { robotId } = await params

  const robot = await prisma.robot.findFirst({
    where: { id: robotId, userId: user.id },
    select: {
      equipments: {
        select: {
          equipment: {
            select: {
              id: true, name: true, rarity: true,
              effectType: true, effectValue: true,
              effectType2: true, effectValue2: true,
            },
          },
        },
      },
    },
  })

  if (!robot) return NextResponse.json({ error: 'Robot not found.' }, { status: 404 })

  return NextResponse.json(robot.equipments.map((e) => e.equipment))
}
