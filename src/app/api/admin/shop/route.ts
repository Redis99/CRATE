import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const items = await prisma.shopItem.findMany({
    orderBy: [{ category: 'asc' }, { rarity: 'asc' }],
  })

  return NextResponse.json(items)
}

export async function PUT(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, ...data } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Only allow safe fields
  const allowedFields = ['price', 'active', 'sortOrder']
  const safeData = Object.fromEntries(
    Object.entries(data).filter(([k]) => allowedFields.includes(k))
  )

  const updated = await prisma.shopItem.update({ where: { id }, data: safeData })
  return NextResponse.json(updated)
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const item = await prisma.shopItem.create({ data: body })
  return NextResponse.json(item)
}
