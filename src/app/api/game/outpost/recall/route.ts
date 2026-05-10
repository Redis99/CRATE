import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { robotId } = await req.json()
  if (!robotId) return NextResponse.json({ error: 'Missing robotId.' }, { status: 400 })

  const robot = await prisma.robot.findFirst({
    where: { id: robotId, userId: user.id },
  })

  if (!robot) return NextResponse.json({ error: 'Robot not found.' }, { status: 404 })
  if (!robot.isActive) return NextResponse.json({ error: 'Robot is not deployed.' }, { status: 409 })

  await prisma.robot.update({
    where: { id: robotId },
    data: { isActive: false, outpostSlot: null },
  })

  return NextResponse.json({ success: true })
}
