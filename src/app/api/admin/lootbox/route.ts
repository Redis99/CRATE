import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const configs = await prisma.lootboxConfig.findMany({
    include: { dropEntries: { orderBy: { weight: 'desc' } } },
    // sortOrder via createdAt até o Prisma Client ser regenerado (prisma generate)
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(configs)
}

// ── PUT — atualiza um drop entry existente ────────────────────────────────────

export async function PUT(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, ...data } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Campos permitidos para atualização de drop entry
  const { dropType, rarity, minQuantity, maxQuantity, weight, specificName } = data
  const updated = await prisma.lootboxDropEntry.update({
    where: { id },
    data:  { dropType, rarity, minQuantity, maxQuantity, weight, specificName },
  })

  return NextResponse.json(updated)
}

// ── POST — ações de admin ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { action } = body

  // ── Adicionar drop entry ────────────────────────────────────────────────
  if (action === 'add-entry') {
    const { lootboxConfigId, dropType, rarity, minQuantity, maxQuantity, weight, specificName } = body.entry
    if (!lootboxConfigId || !dropType) {
      return NextResponse.json({ error: 'lootboxConfigId and dropType required' }, { status: 400 })
    }
    const entry = await prisma.lootboxDropEntry.create({
      data: {
        lootboxConfigId,
        dropType,
        rarity:       rarity       ?? null,
        minQuantity:  minQuantity  ?? 1,
        maxQuantity:  maxQuantity  ?? 1,
        weight:       weight       ?? 1,
        specificName: specificName ?? null,
      },
    })
    return NextResponse.json(entry)
  }

  // ── Remover drop entry ──────────────────────────────────────────────────
  if (action === 'delete-entry') {
    if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    await prisma.lootboxDropEntry.delete({ where: { id: body.id } })
    return NextResponse.json({ success: true })
  }

  // ── Atualizar config da lootbox ─────────────────────────────────────────
  // Apenas campos editáveis — lootboxType e id nunca podem ser alterados.
  if (action === 'update-config') {
    const { id, priceCrate, weeklyLimit, sortOrder, active, name, description, seasonal } = body.config
    if (!id) return NextResponse.json({ error: 'Missing config id' }, { status: 400 })

    const updateData: Record<string, unknown> = {}
    if (priceCrate   !== undefined) updateData.priceCrate   = priceCrate
    if (weeklyLimit  !== undefined) updateData.weeklyLimit  = weeklyLimit  // null = unlimited
    if (active       !== undefined) updateData.active       = active
    if (name         !== undefined) updateData.name         = name
    if (description  !== undefined) updateData.description  = description
    if (seasonal     !== undefined) updateData.seasonal     = seasonal
    // sortOrder: usa SQL raw até o client ser regenerado
    if (sortOrder !== undefined) {
      await prisma.$executeRawUnsafe(
        `UPDATE lootbox_configs SET sort_order = $1 WHERE id = $2`,
        sortOrder,
        id,
      )
    }

    const updated = await prisma.lootboxConfig.update({
      where: { id },
      data:  updateData,
    })
    return NextResponse.json(updated)
  }

  if (action === 'create-config') {
    const config = await prisma.lootboxConfig.create({ data: body.config })
    return NextResponse.json(config)
  }

  if (action === 'delete-config') {
    await prisma.lootboxDropEntry.deleteMany({ where: { lootboxConfigId: body.id } })
    await prisma.lootboxConfig.delete({ where: { id: body.id } })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
