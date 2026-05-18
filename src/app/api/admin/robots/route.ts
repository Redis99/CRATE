import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

// GET — lista todos os robôs específicos criados pelo admin
export async function GET(_req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const items = await prisma.shopItem.findMany({
    where: { category: 'robot-specific' },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })

  // Coleta coleções disponíveis no banco para o dropdown
  const collections = await prisma.codexCollection.findMany({
    where: { active: true },
    select: { name: true, itemType: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ items, collections: collections.map(c => c.name) })
}

// POST — cria um novo robô específico (como ShopItem com metadata)
export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, customId, collection, rarity, hashPower, energyRate, durability, price, active, description } = body

  if (!name || !rarity || !hashPower) {
    return NextResponse.json({ error: 'name, rarity and hashPower are required' }, { status: 400 })
  }

  // ID personalizado (se fornecido) ou gerado pelo slug do nome
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const id = customId
    ? `robot-${customId.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/(^-|-$)/g, '')}`
    : `robot-${slug}`

  // Verifica se ID já existe
  const existing = await prisma.shopItem.findUnique({ where: { id } })
  if (existing) {
    return NextResponse.json({ error: `ID "${id}" already exists. Choose a different custom ID.` }, { status: 409 })
  }

  const item = await prisma.shopItem.create({
    data: {
      id,
      category: 'robot-specific',
      name,
      description: description ?? `${rarity} robot — ${collection ?? 'No collection'}`,
      price: price ?? 0,
      rarity,
      active: active ?? false,
      sortOrder: 0,
      metadata: {
        specific:        true,
        robotName:       name,
        robotCollection: collection ?? '',
        hashPower:       Number(hashPower),
        energyRate:      Number(energyRate ?? 1),
        durability:      Number(durability ?? 100),
      },
    },
  })

  return NextResponse.json(item)
}

// PUT — edita um robô específico
export async function PUT(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, name, collection, rarity, hashPower, energyRate, durability, price, active, description } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Busca o nome atual antes de alterar (para localizar instâncias existentes)
  const existing = await prisma.shopItem.findUnique({ where: { id }, select: { name: true, metadata: true } })
  const oldName = (existing?.metadata as Record<string, unknown> | null)?.robotName as string ?? existing?.name ?? ''

  const [item] = await Promise.all([
    // 1. Atualiza o template (ShopItem)
    prisma.shopItem.update({
      where: { id },
      data: {
        name,
        description,
        price,
        rarity,
        active,
        metadata: {
          specific:        true,
          robotName:       name,
          robotCollection: collection ?? '',
          hashPower:       Number(hashPower),
          energyRate:      Number(energyRate ?? 1),
          durability:      Number(durability ?? 100),
        },
      },
    }),
    // 2. Propaga alterações para todas as instâncias existentes nos inventários
    //    Não propaga durability (desgaste individual por robô)
    prisma.robot.updateMany({
      where: { name: oldName, ...(rarity ? { rarity: rarity as never } : {}) },
      data: {
        name:       name,
        collection: collection ?? '',
        hashPower:  Number(hashPower),
        energyRate: Number(energyRate ?? 1),
      },
    }),
  ])

  return NextResponse.json(item)
}

// DELETE — remove um robô específico
export async function DELETE(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.shopItem.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
