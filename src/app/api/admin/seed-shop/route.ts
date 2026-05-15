/**
 * Seed dos itens da loja no banco. Espelha shop-items.ts.
 * Após seed, preços e active são gerenciados via admin panel (sem deploy).
 * POST /api/admin/seed-shop (Bearer CRON_SECRET)
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ALL_SHOP_ITEMS } from '@/lib/shop-items'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.shopItem.count()
  if (existing > 0)
    return NextResponse.json({ message: `Skipped — ${existing} items already in DB.` })

  let created = 0
  for (const item of ALL_SHOP_ITEMS) {
    // Extrai metadados específicos por tipo
    const metadata: Record<string, unknown> = {}
    if (item.generateType)     metadata.generateType     = item.generateType
    if (item.batteryValue)     metadata.batteryValue     = item.batteryValue
    if (item.slotNumber)       metadata.slotNumber       = item.slotNumber
    if (item.slotRequires)     metadata.slotRequires     = item.slotRequires
    if (item.inventoryTab)     metadata.inventoryTab     = item.inventoryTab
    if (item.inventoryAdd)     metadata.inventoryAdd     = item.inventoryAdd
    if (item.inventoryBasePrice) metadata.inventoryBasePrice = item.inventoryBasePrice

    await prisma.shopItem.create({
      data: {
        id:          item.id,
        category:    item.category,
        name:        item.name,
        description: item.description,
        price:       item.price,
        rarity:      item.rarity ?? null,
        active:      true,
        sortOrder:   ALL_SHOP_ITEMS.indexOf(item),
        metadata:    Object.keys(metadata).length > 0 ? (metadata as object) : undefined,
      },
    })
    created++
  }

  return NextResponse.json({ success: true, created })
}
