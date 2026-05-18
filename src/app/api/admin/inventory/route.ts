import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

// GET ?type=robot&rarity=ALL — grouped view (unique item types + owner count)
export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const type   = searchParams.get('type') ?? 'robot'
  const rarity = searchParams.get('rarity') ?? 'ALL'

  const rarityWhere = rarity !== 'ALL' ? { rarity: rarity as never } : {}

  if (type === 'robot') {
    const groups = await prisma.robot.groupBy({
      by: ['name', 'collection', 'rarity'],
      where: rarityWhere,
      _count: { id: true },
      _avg:   { hashPower: true, energyRate: true },
      orderBy: { _count: { id: 'desc' } },
    })
    return NextResponse.json(groups.map(g => ({
      name:       g.name,
      collection: g.collection,
      rarity:     g.rarity,
      ownerCount: g._count.id,
      hashPower:  Math.round((g._avg.hashPower  ?? 0) * 100) / 100,
      energyRate: Math.round((g._avg.energyRate ?? 0) * 100) / 100,
    })))
  }

  if (type === 'equipment') {
    const groups = await prisma.equipment.groupBy({
      by: ['name', 'rarity', 'effectType', 'effectType2'],
      where: rarityWhere,
      _count: { id: true },
      _avg:   { effectValue: true, effectValue2: true },
      orderBy: { _count: { id: 'desc' } },
    })
    return NextResponse.json(groups.map(g => ({
      name:         g.name,
      rarity:       g.rarity,
      effectType:   g.effectType,
      effectType2:  g.effectType2,
      effectValue:  Math.round((g._avg.effectValue  ?? 0) * 100) / 100,
      effectValue2: g.effectType2 ? Math.round((g._avg.effectValue2 ?? 0) * 100) / 100 : null,
      ownerCount:   g._count.id,
    })))
  }

  if (type === 'base-upgrade') {
    const groups = await prisma.baseUpgrade.groupBy({
      by: ['name', 'rarity', 'effectType', 'effectType2'],
      where: rarityWhere,
      _count: { id: true },
      _avg:   { effectValue: true, effectValue2: true },
      orderBy: { _count: { id: 'desc' } },
    })
    return NextResponse.json(groups.map(g => ({
      name:         g.name,
      rarity:       g.rarity,
      effectType:   g.effectType,
      effectType2:  g.effectType2,
      effectValue:  Math.round((g._avg.effectValue  ?? 0) * 100) / 100,
      effectValue2: g.effectType2 ? Math.round((g._avg.effectValue2 ?? 0) * 100) / 100 : null,
      ownerCount:   g._count.id,
    })))
  }

  if (type === 'part') {
    const groups = await prisma.inventoryPart.groupBy({
      by: ['partType', 'rarity', 'category'],
      where: rarity !== 'ALL' ? { rarity: rarity as never } : {},
      _sum:   { quantity: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    })
    return NextResponse.json(groups.map(g => ({
      partType:    g.partType,
      rarity:      g.rarity,
      category:    g.category,
      ownerCount:  g._count.id,
      totalQty:    g._sum.quantity ?? 0,
    })))
  }

  if (type === 'consumable') {
    const groups = await prisma.consumable.groupBy({
      by: ['consumableType', 'value'],
      _sum:   { quantity: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    })
    return NextResponse.json(groups.map(g => ({
      consumableType: g.consumableType,
      value:          g.value,
      ownerCount:     g._count.id,
      totalQty:       g._sum.quantity ?? 0,
    })))
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}

// PATCH — atualiza TODOS os itens do mesmo tipo (nome + raridade)
export async function PATCH(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    type: string
    name: string
    rarity?: string
    effectType?: string   // para equipment/base-upgrade: identifica qual grupo
    data: Record<string, unknown>
  }

  const { type, name, rarity, effectType, data } = body
  if (!type || !name || !data) {
    return NextResponse.json({ error: 'type, name and data required' }, { status: 400 })
  }

  const ALLOWED: Record<string, string[]> = {
    robot:          ['name', 'collection', 'hashPower', 'energyRate', 'rarity'],
    equipment:      ['name', 'rarity', 'effectType', 'effectValue', 'effectType2', 'effectValue2'],
    'base-upgrade': ['name', 'rarity', 'effectType', 'effectValue', 'effectType2', 'effectValue2'],
    part:           [],  // partes não têm stats para balancear
    consumable:     [],
  }

  const safeData = Object.fromEntries(
    Object.entries(data).filter(([k]) => (ALLOWED[type] ?? []).includes(k))
  )
  if (Object.keys(safeData).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
  }

  let count = 0

  if (type === 'robot') {
    const where = rarity
      ? { name, rarity: rarity as never }
      : { name }
    const result = await prisma.robot.updateMany({ where, data: safeData })
    count = result.count
  } else if (type === 'equipment') {
    const where: Record<string, unknown> = { name }
    if (rarity)     where.rarity     = rarity
    if (effectType) where.effectType = effectType
    const result = await prisma.equipment.updateMany({ where: where as never, data: safeData })
    count = result.count
  } else if (type === 'base-upgrade') {
    const where: Record<string, unknown> = { name }
    if (rarity)     where.rarity     = rarity
    if (effectType) where.effectType = effectType
    const result = await prisma.baseUpgrade.updateMany({ where: where as never, data: safeData })
    count = result.count
  } else {
    return NextResponse.json({ error: 'Bulk edit not supported for this type' }, { status: 400 })
  }

  return NextResponse.json({ success: true, updated: count })
}
