import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const missions = await prisma.mission.findMany({
    orderBy: [{ category: 'asc' }, { target: 'asc' }],
    include: { _count: { select: { userMissions: true } } },
  })

  return NextResponse.json(missions)
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const mission = await prisma.mission.create({ data: body })
  return NextResponse.json(mission)
}

export async function PUT(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, ...data } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const mission = await prisma.mission.update({ where: { id }, data })
  return NextResponse.json(mission)
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.userMission.deleteMany({ where: { missionId: id } })
  await prisma.mission.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
