import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const collections = await prisma.codexCollection.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })

  // Count entries per collection
  const entryCounts = await prisma.codexEntry.groupBy({
    by: ['collection'],
    _count: { id: true },
  })
  const countMap = Object.fromEntries(entryCounts.map(e => [e.collection, e._count.id]))

  return NextResponse.json(collections.map(c => ({ ...c, totalRegistered: countMap[c.name] ?? 0 })))
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  // Ensure requiredItems is always stored as a valid JSON array
  const data = {
    ...body,
    requiredItems: Array.isArray(body.requiredItems) ? body.requiredItems : [],
    // totalRequired derived from requiredItems when not empty
    totalRequired: Array.isArray(body.requiredItems) && body.requiredItems.length > 0
      ? body.requiredItems.length
      : body.totalRequired ?? 1,
  }
  const collection = await prisma.codexCollection.create({ data })
  return NextResponse.json(collection)
}

export async function PUT(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, ...body } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const data = {
    ...body,
    requiredItems: Array.isArray(body.requiredItems) ? body.requiredItems : [],
    totalRequired: Array.isArray(body.requiredItems) && body.requiredItems.length > 0
      ? body.requiredItems.length
      : body.totalRequired ?? 1,
  }
  const collection = await prisma.codexCollection.update({ where: { id }, data })
  return NextResponse.json(collection)
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.codexCollection.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
