import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  ALL_SHOP_ITEMS, SHOP_INVENTORY,
  INVENTORY_DEFAULT, INVENTORY_FIELD, INVENTORY_MAX,
} from '@/lib/shop-items'

// Calcula o preço atual de uma expansão de inventário (+20% por compra anterior)
function expansionPrice(basePrice: number, currentSlots: number, defaultSlots: number, addPerPurchase: number): number {
  const purchased = Math.round((currentSlots - defaultSlots) / addPerPurchase)
  return Math.round(basePrice * Math.pow(1.2, purchased) * 100) / 100
}

export async function GET(_req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      balanceCrate: true,
      outpostSlots: true,
      slotsRobots: true, slotsEquipments: true, slotsBaseUpgrades: true,
      slotsParts: true, slotsConsumables: true, slotsLootboxes: true,
    },
  })

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Enriquece os itens de inventário com preço atual e estado
  const slotMap: Record<string, number> = {
    robots: profile.slotsRobots, equipments: profile.slotsEquipments,
    baseUpgrades: profile.slotsBaseUpgrades, parts: profile.slotsParts,
    consumables: profile.slotsConsumables, lootboxes: profile.slotsLootboxes,
  }

  const inventoryItems = SHOP_INVENTORY.map((item) => {
    const tab      = item.inventoryTab!
    const current  = slotMap[tab]
    const maxSlots = INVENTORY_MAX[tab]
    const price    = expansionPrice(item.inventoryBasePrice!, current, INVENTORY_DEFAULT[tab], item.inventoryAdd!)
    return { ...item, price, currentSlots: current, maxSlots, isCapped: current >= maxSlots }
  })

  return NextResponse.json({
    balance: profile.balanceCrate,
    outpostSlots: profile.outpostSlots,
    items: [...ALL_SHOP_ITEMS.filter((i) => i.category !== 'inventory'), ...inventoryItems],
  })
}
