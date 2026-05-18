import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

const LIMIT = 40

export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const type     = searchParams.get('type') ?? 'robot'
  const rarity   = searchParams.get('rarity')
  const username = searchParams.get('username') ?? ''
  const page     = parseInt(searchParams.get('page') ?? '1', 10)

  const userFilter = username
    ? { user: { username: { contains: username, mode: 'insensitive' as const } } }
    : {}
  const rarityFilter = rarity && rarity !== 'ALL' ? { rarity: rarity as never } : {}
  const where = { ...userFilter, ...rarityFilter }

  if (type === 'robot') {
    const [items, total] = await Promise.all([
      prisma.robot.findMany({
        where,
        take: LIMIT, skip: (page - 1) * LIMIT,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, collection: true, rarity: true,
          hashPower: true, energyRate: true, durability: true,
          isActive: true, inCodex: true,
          user: { select: { username: true } },
        },
      }),
      prisma.robot.count({ where }),
    ])
    return NextResponse.json({ items, total, pages: Math.ceil(total / LIMIT) })
  }

  if (type === 'equipment') {
    const [items, total] = await Promise.all([
      prisma.equipment.findMany({
        where,
        take: LIMIT, skip: (page - 1) * LIMIT,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, rarity: true,
          effectType: true, effectValue: true,
          effectType2: true, effectValue2: true,
          user: { select: { username: true } },
        },
      }),
      prisma.equipment.count({ where }),
    ])
    return NextResponse.json({ items, total, pages: Math.ceil(total / LIMIT) })
  }

  if (type === 'base-upgrade') {
    const [items, total] = await Promise.all([
      prisma.baseUpgrade.findMany({
        where,
        take: LIMIT, skip: (page - 1) * LIMIT,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, rarity: true,
          effectType: true, effectValue: true,
          effectType2: true, effectValue2: true,
          isApplied: true,
          user: { select: { username: true } },
        },
      }),
      prisma.baseUpgrade.count({ where }),
    ])
    return NextResponse.json({ items, total, pages: Math.ceil(total / LIMIT) })
  }

  if (type === 'part') {
    const partWhere = username
      ? { user: { username: { contains: username, mode: 'insensitive' as const } } }
      : {}
    const rarityPartFilter = rarity && rarity !== 'ALL' ? { rarity: rarity as never } : {}
    const partFullWhere = { ...partWhere, ...rarityPartFilter }
    const [items, total] = await Promise.all([
      prisma.inventoryPart.findMany({
        where: partFullWhere,
        take: LIMIT, skip: (page - 1) * LIMIT,
        orderBy: { partType: 'asc' },
        select: {
          id: true, partType: true, rarity: true, quantity: true, category: true,
          user: { select: { username: true } },
        },
      }),
      prisma.inventoryPart.count({ where: partFullWhere }),
    ])
    return NextResponse.json({ items, total, pages: Math.ceil(total / LIMIT) })
  }

  if (type === 'consumable') {
    const conWhere = username
      ? { user: { username: { contains: username, mode: 'insensitive' as const } } }
      : {}
    const [items, total] = await Promise.all([
      prisma.consumable.findMany({
        where: conWhere,
        take: LIMIT, skip: (page - 1) * LIMIT,
        orderBy: { consumableType: 'asc' },
        select: {
          id: true, consumableType: true, value: true, quantity: true,
          user: { select: { username: true } },
        },
      }),
      prisma.consumable.count({ where: conWhere }),
    ])
    return NextResponse.json({ items, total, pages: Math.ceil(total / LIMIT) })
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}

// PATCH — edita campos de um item específico
export async function PATCH(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { type, id, data } = await req.json() as {
    type: string
    id: string
    data: Record<string, unknown>
  }

  if (!type || !id || !data) {
    return NextResponse.json({ error: 'type, id and data required' }, { status: 400 })
  }

  // Allowlist de campos editáveis por tipo
  const ALLOWED: Record<string, string[]> = {
    robot:        ['name', 'collection', 'hashPower', 'energyRate', 'durability', 'rarity'],
    equipment:    ['name', 'rarity', 'effectValue', 'effectValue2', 'effectType', 'effectType2'],
    'base-upgrade': ['name', 'rarity', 'effectValue', 'effectValue2', 'effectType', 'effectType2'],
    part:         ['quantity'],
    consumable:   ['quantity'],
  }

  const allowed = ALLOWED[type] ?? []
  const safeData = Object.fromEntries(
    Object.entries(data).filter(([k]) => allowed.includes(k))
  )

  if (Object.keys(safeData).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
  }

  let updated
  if (type === 'robot')
    updated = await prisma.robot.update({ where: { id }, data: safeData })
  else if (type === 'equipment')
    updated = await prisma.equipment.update({ where: { id }, data: safeData })
  else if (type === 'base-upgrade')
    updated = await prisma.baseUpgrade.update({ where: { id }, data: safeData })
  else if (type === 'part')
    updated = await prisma.inventoryPart.update({ where: { id }, data: safeData })
  else if (type === 'consumable')
    updated = await prisma.consumable.update({ where: { id }, data: safeData })
  else
    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })

  return NextResponse.json(updated)
}
