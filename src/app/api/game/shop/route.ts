import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  ALL_SHOP_ITEMS, SHOP_INVENTORY,
  INVENTORY_DEFAULT, INVENTORY_FIELD, INVENTORY_MAX,
} from '@/lib/shop-items'

function expansionPrice(basePrice: number, currentSlots: number, defaultSlots: number, addPerPurchase: number): number {
  const purchased = Math.round((currentSlots - defaultSlots) / addPerPurchase)
  return Math.round(basePrice * Math.pow(1.2, purchased) * 100) / 100
}

export async function GET(_req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [profile, dbItems] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        balanceCrate: true, outpostSlots: true,
        slotsRobots: true, slotsEquipments: true, slotsBaseUpgrades: true,
        slotsParts: true, slotsConsumables: true, slotsLootboxes: true,
      },
    }),
    // Lê preços e active do banco (se disponível)
    prisma.shopItem.findMany({ select: { id: true, price: true, active: true } }),
  ])

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Mapa DB id → { price, active } para override de preços
  const dbMap = new Map(dbItems.map((i) => [i.id, i]))

  const slotMap: Record<string, number> = {
    robots: profile.slotsRobots, equipments: profile.slotsEquipments,
    baseUpgrades: profile.slotsBaseUpgrades, parts: profile.slotsParts,
    consumables: profile.slotsConsumables, lootboxes: profile.slotsLootboxes,
  }

  // Aplica preço do banco (ou mantém hardcoded como fallback)
  const staticItems = ALL_SHOP_ITEMS
    .filter((i) => i.category !== 'inventory')
    .map((item) => {
      const db = dbMap.get(item.id)
      return {
        ...item,
        price:  db?.price  ?? item.price,
        active: db?.active ?? true,
      }
    })
    .filter((i) => i.active)

  const inventoryItems = SHOP_INVENTORY.map((item) => {
    const tab      = item.inventoryTab!
    const current  = slotMap[tab]
    const maxSlots = INVENTORY_MAX[tab]
    const db       = dbMap.get(item.id)
    const basePrice = db?.price ?? item.inventoryBasePrice!
    const price    = expansionPrice(basePrice, current, INVENTORY_DEFAULT[tab], item.inventoryAdd!)
    return { ...item, price, currentSlots: current, maxSlots, isCapped: current >= maxSlots, active: db?.active ?? true }
  }).filter((i) => i.active)

  return NextResponse.json({
    balance:      profile.balanceCrate,
    outpostSlots: profile.outpostSlots,
    items:        [...staticItems, ...inventoryItems],
  })
}
