import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

// Estatísticas de uso por parte: quantos jogadores têm + qtd total
async function buildPartStats() {
  const grouped = await prisma.inventoryPart.groupBy({
    by: ['partType'],
    _count: { id: true },
    _sum:   { quantity: true },
  })
  return Object.fromEntries(
    grouped.map(g => [g.partType, { owners: g._count.id, totalQty: g._sum.quantity ?? 0 }])
  )
}

export async function GET(_req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [parts, stats] = await Promise.all([
    prisma.part.findMany({ orderBy: [{ category: 'asc' }, { partType: 'asc' }] }),
    buildPartStats(),
  ])

  const merged = parts.map(p => ({
    ...p,
    rarities: Array.isArray(p.rarities) ? p.rarities : [],
    owners:   stats[p.partType]?.owners ?? 0,
    totalQty: stats[p.partType]?.totalQty ?? 0,
  }))

  return NextResponse.json(merged)
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { partType, category, rarities, description, active } = await req.json()
  if (!partType || !category) {
    return NextResponse.json({ error: 'partType and category required' }, { status: 400 })
  }

  const existing = await prisma.part.findUnique({ where: { partType } })
  if (existing) return NextResponse.json({ error: `Part "${partType}" already exists` }, { status: 409 })

  const part = await prisma.part.create({
    data: {
      partType,
      category,
      rarities:    Array.isArray(rarities) ? rarities : [],
      description: description ?? null,
      active:      active ?? true,
    },
  })
  return NextResponse.json(part)
}

export async function PUT(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, partType, category, rarities, description, active } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {}
  if (partType    !== undefined) data.partType    = partType
  if (category    !== undefined) data.category    = category
  if (rarities    !== undefined) data.rarities    = Array.isArray(rarities) ? rarities : []
  if (description !== undefined) data.description = description
  if (active      !== undefined) data.active      = active

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
