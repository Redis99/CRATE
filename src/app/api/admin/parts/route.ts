import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parts = await prisma.part.findMany({
    where: { active: true },
    orderBy: [{ category: 'asc' }, { partType: 'asc' }],
  })
  return NextResponse.json(parts)
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { partType, category } = await req.json()
  if (!partType || !category) {
    return NextResponse.json({ error: 'partType and category required' }, { status: 400 })
  }
  const part = await prisma.part.create({ data: { partType, category, active: true } })
  return NextResponse.json(part)
}

export async function PUT(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, ...data } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const part = await prisma.part.update({ where: { id }, data })
  return NextResponse.json(part)
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await prisma.part.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
