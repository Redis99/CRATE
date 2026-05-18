import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

// category: 'equipment-specific' | 'base-upgrade-specific'

export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')

  const where = category
    ? { category }
    : { category: { in: ['equipment-specific', 'base-upgrade-specific'] } }

  const items = await prisma.shopItem.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })

  // Also return collections for dropdown
  const collections = await prisma.codexCollection.findMany({
    where: { active: true },
    select: { name: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ items, collections: collections.map(c => c.name) })
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { category, customId, name, collection, rarity, effectType, effectValue, effectType2, effectValue2, price, active, description } = body

  if (!category || !name || !rarity || !effectType || effectValue == null) {
    return NextResponse.json({ error: 'category, name, rarity, effectType and effectValue are required' }, { status: 400 })
  }

  const prefix = category === 'equipment-specific' ? 'equip' : 'upgrade'
  const slug   = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const id = customId
    ? `${prefix}-${customId.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/(^-|-$)/g, '')}`
    : `${prefix}-${slug}`

  const existing = await prisma.shopItem.findUnique({ where: { id } })
  if (existing) {
    return NextResponse.json({ error: `ID "${id}" already exists. Choose a different custom ID.` }, { status: 409 })
  }

  const item = await prisma.shopItem.create({
    data: {
      id,
      category,
      name,
      description: description ?? `${rarity} ${category.replace('-specific', '').replace('-', ' ')}`,
      price: price ?? 0,
      rarity,
      active: active ?? false,
      sortOrder: 0,
      metadata: {
        specific:     true,
        collection:   collection   ?? null,
        effectType:   effectType   ?? null,
        effectValue:  effectValue  ?? null,
        effectType2:  effectType2  ?? null,
        effectValue2: effectValue2 ?? null,
      },
    },
  })

  return NextResponse.json(item)
}

export async function PUT(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, name, collection, rarity, effectType, effectValue, effectType2, effectValue2, price, active, description } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const item = await prisma.shopItem.update({
    where: { id },
    data: {
      name, description, price, rarity, active,
      metadata: {
        specific:     true,
        collection:   collection   ?? null,
        effectType:   effectType   ?? null,
        effectValue:  effectValue  ?? null,
        effectType2:  effectType2  ?? null,
        effectValue2: effectValue2 ?? null,
      },
    },
  })

  return NextResponse.json(item)
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.shopItem.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
