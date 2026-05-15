import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getShopItem, INVENTORY_DEFAULT, INVENTORY_FIELD, INVENTORY_MAX,
} from '@/lib/shop-items'
import {
  generateRobotDrop, generateEquipmentDrop, generateBaseUpgradeDrop,
  saveDropToInventory, checkInventorySpace,
} from '@/lib/lootbox'

function expansionPrice(basePrice: number, currentSlots: number, defaultSlots: number, addPerPurchase: number): number {
  const purchased = Math.round((currentSlots - defaultSlots) / addPerPurchase)
  return Math.round(basePrice * Math.pow(1.2, purchased) * 100) / 100
}

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { itemId } = await req.json()
  if (!itemId) return NextResponse.json({ error: 'Missing itemId.' }, { status: 400 })

  const item = getShopItem(itemId)
  if (!item) return NextResponse.json({ error: 'Item not found in shop.' }, { status: 404 })

  // Verifica se o item está ativo no banco (se existir no banco)
  const dbItem = await prisma.shopItem.findUnique({ where: { id: itemId }, select: { price: true, active: true } })
  if (dbItem && !dbItem.active) return NextResponse.json({ error: 'Item not available.' }, { status: 400 })

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      balanceCrate: true, outpostSlots: true,
      slotsRobots: true, slotsEquipments: true, slotsBaseUpgrades: true,
      slotsParts: true, slotsConsumables: true, slotsLootboxes: true,
    },
  })
  if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })

  // Calcula o preço real (expansões têm preço dinâmico)
  let price = item.price
  if (item.category === 'inventory') {
    const tab     = item.inventoryTab!
    const current = (profile as Record<string, number>)[INVENTORY_FIELD[tab]] ?? INVENTORY_DEFAULT[tab]
    price = expansionPrice(item.inventoryBasePrice!, current, INVENTORY_DEFAULT[tab], item.inventoryAdd!)
  }

  if (profile.balanceCrate < price) {
    return NextResponse.json({ error: `Insufficient balance. Need ${price} CRATE.` }, { status: 400 })
  }

  // ── Processar compra por categoria ────────────────────────────────────────

  switch (item.category) {

    case 'robots':
    case 'equipment':
    case 'baseUpgrades': {
      const rarity = item.rarity as 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC'
      const drop =
        item.generateType === 'robot'       ? generateRobotDrop(rarity) :
        item.generateType === 'equipment'   ? generateEquipmentDrop(rarity) :
                                              generateBaseUpgradeDrop(rarity)

      const spaceError = await checkInventorySpace(user.id, drop)
      if (spaceError) return NextResponse.json({ error: spaceError }, { status: 400 })

      await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { balanceCrate: { decrement: price } } }),
        prisma.transaction.create({ data: { userId: user.id, type: 'SHOP_PURCHASE', token: 'CRATE', amount: price, status: 'CONFIRMED' } }),
      ])
      await saveDropToInventory(user.id, drop)
      return NextResponse.json({ success: true, drop })
    }

    case 'batteries': {
      const value = item.batteryValue!
      // Verifica espaço no inventário de consumíveis
      const profile2 = await prisma.user.findUnique({
        where: { id: user.id },
        select: { slotsConsumables: true, _count: { select: { consumables: true } } },
      })
      if (profile2 && profile2._count.consumables >= profile2.slotsConsumables) {
        return NextResponse.json({ error: 'Consumables inventory is full.' }, { status: 400 })
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { balanceCrate: { decrement: price } } })
        await tx.transaction.create({ data: { userId: user.id, type: 'SHOP_PURCHASE', token: 'CRATE', amount: price, status: 'CONFIRMED' } })
        const existing = await tx.consumable.findUnique({
          where: { userId_consumableType_value: { userId: user.id, consumableType: 'REPAIR_KIT', value } },
        })
        if (existing) {
          await tx.consumable.update({ where: { id: existing.id }, data: { quantity: { increment: 1 } } })
        } else {
          await tx.consumable.create({ data: { userId: user.id, consumableType: 'REPAIR_KIT', value, quantity: 1 } })
        }
      })
      return NextResponse.json({ success: true })
    }

    case 'outpostSlots': {
      const slotNum = item.slotNumber!
      if (profile.outpostSlots >= slotNum) {
        return NextResponse.json({ error: 'This slot is already unlocked.' }, { status: 409 })
      }
      if (profile.outpostSlots < slotNum - 1) {
        return NextResponse.json({ error: `You need to unlock slot ${slotNum - 1} first.` }, { status: 400 })
      }
      await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { balanceCrate: { decrement: price }, outpostSlots: { increment: 1 } } }),
        prisma.transaction.create({ data: { userId: user.id, type: 'SHOP_PURCHASE', token: 'CRATE', amount: price, status: 'CONFIRMED' } }),
      ])
      return NextResponse.json({ success: true })
    }

    case 'inventory': {
      const tab      = item.inventoryTab!
      const field    = INVENTORY_FIELD[tab]
      const current  = (profile as Record<string, number>)[field]
      const maxSlots = INVENTORY_MAX[tab]
      if (current >= maxSlots) {
        return NextResponse.json({ error: `${tab} inventory is already at maximum capacity.` }, { status: 400 })
      }
      await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { balanceCrate: { decrement: price }, [field]: { increment: item.inventoryAdd! } } }),
        prisma.transaction.create({ data: { userId: user.id, type: 'SHOP_PURCHASE', token: 'CRATE', amount: price, status: 'CONFIRMED' } }),
      ])
      return NextResponse.json({ success: true })
    }

    default:
      return NextResponse.json({ error: 'Unknown item category.' }, { status: 400 })
  }
}
