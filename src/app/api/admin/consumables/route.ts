import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

async function buildConsumableStats() {
  const grouped = await prisma.consumable.groupBy({
    by: ['consumableType', 'value'],
    _count: { id: true },
    _sum:   { quantity: true },
  })
  return grouped
}

export async function GET(_req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [templates, stats] = await Promise.all([
    prisma.consumableTemplate.findMany({
      orderBy: [{ sortOrder: 'asc' }, { consumableType: 'asc' }, { effectValue: 'asc' }],
    }),
    buildConsumableStats(),
  ])

  // Match templates with in-game stats by (consumableType + effectValue)
  const merged = templates.map(t => {
    const stat = stats.find(s => s.consumableType === t.consumableType && s.value === t.effectValue)
    return {
      ...t,
      owners:   stat?._count.id ?? 0,
      totalQty: stat?._sum.quantity ?? 0,
    }
  })

  return NextResponse.json(merged)
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { consumableType, name, description, effectType, effectValue, durationSec, rarity, active, sortOrder } = body
  if (!consumableType || !name || !effectType || effectValue == null) {
    return NextResponse.json({ error: 'consumableType, name, effectType and effectValue required' }, { status: 400 })
  }

  const tpl = await prisma.consumableTemplate.create({
    data: {
      consumableType,
      name,
      description: description ?? null,
      effectType,
      effectValue: Number(effectValue),
      durationSec: Number(durationSec ?? 0),
      rarity:      rarity ?? null,
      active:      active ?? true,
      sortOrder:   Number(sortOrder ?? 0),
    },
  })
  return NextResponse.json(tpl)
}

export async function PUT(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, ...body } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const ALLOWED = ['consumableType','name','description','effectType','effectValue','durationSec','rarity','active','sortOrder']
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {}
  for (const k of ALLOWED) if (k in body) data[k] = body[k]

  const tpl = await prisma.consumableTemplate.update({ where: { id }, data })
  return NextResponse.json(tpl)
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await prisma.consumableTemplate.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
