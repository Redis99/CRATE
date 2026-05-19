import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { INVENTORY_DEFAULT, INVENTORY_FIELD, INVENTORY_MAX } from '@/lib/shop-items'
import {
  generateRobotDrop, generateEquipmentDrop, generateBaseUpgradeDrop,
  saveDropToInventory, checkInventorySpace,
} from '@/lib/lootbox'

function expansionPrice(
  basePrice: number,
  currentSlots: number,
  defaultSlots: number,
  addPerPurchase: number,
): number {
  const purchased = Math.round((currentSlots - defaultSlots) / addPerPurchase)
  return Math.round(basePrice * Math.pow(1.2, purchased) * 100) / 100
}

/** Normaliza categorias *-specific para o slug interno de processamento */
function normalizeCategory(category: string): string {
  if (category === 'robot-specific')        return 'robots'
  if (category === 'equipment-specific')    return 'equipment'
  if (category === 'base-upgrade-specific') return 'baseUpgrades'
  return category
}

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { itemId } = await req.json()
  if (!itemId) return NextResponse.json({ error: 'Missing itemId.' }, { status: 400 })

  // ── Busca item no banco (única fonte de verdade) ───────────────────────
  const dbItem = await prisma.shopItem.findUnique({ where: { id: itemId } })
  if (!dbItem)       return NextResponse.json({ error: 'Item not found in shop.' }, { status: 404 })
  if (!dbItem.active) return NextResponse.json({ error: 'Item not available.'    }, { status: 400 })

  const meta     = (dbItem.metadata as Record<string, unknown>) ?? {}
  const category = normalizeCategory(dbItem.category)

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      balanceCrate: true, outpostSlots: true,
      slotsRobots: true, slotsEquipments: true, slotsBaseUpgrades: true,
      slotsParts: true, slotsConsumables: true, slotsLootboxes: true,
    },
  })
  if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })

  // ── Calcula preço real (inventário tem preço dinâmico) ─────────────────
  let price = dbItem.price
  if (category === 'inventory') {
    const tab       = String(meta.inventoryTab ?? '')
    const field     = INVENTORY_FIELD[tab]
    const current   = field ? (profile as Record<string, number>)[field] : (INVENTORY_DEFAULT[tab] ?? 0)
    const basePrice = dbItem.price || Number(meta.inventoryBasePrice ?? 5)
    price = expansionPrice(basePrice, current, INVENTORY_DEFAULT[tab] ?? 0, Number(meta.inventoryAdd ?? 5))
  }

  if (profile.balanceCrate < price) {
    return NextResponse.json({ error: `Insufficient balance. Need ${price} CRATE.` }, { status: 400 })
  }

  // ── Processa compra por categoria ──────────────────────────────────────

  switch (category) {

    // ── Robôs, Equipamentos, Melhorias de Base ───────────────────────────
    case 'robots':
    case 'equipment':
    case 'baseUpgrades': {
      const rarity      = (dbItem.rarity ?? 'COMMON') as 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
      const generateType = String(meta.generateType ?? '')
      const isSpecific   = meta.specific === true     // item com atributos fixos criado pelo admin

      const isRobot       = category === 'robots'
      const isEquipment   = category === 'equipment'
      const isBaseUpgrade = category === 'baseUpgrades'

      // Verificação de espaço no inventário
      if (isRobot) {
        const count = await prisma.robot.count({ where: { userId: user.id } })
        if (count >= profile.slotsRobots)
          return NextResponse.json({ error: 'Robot inventory is full.' }, { status: 400 })
      }
      if (isEquipment) {
        const count = await prisma.equipment.count({ where: { userId: user.id } })
        if (count >= profile.slotsEquipments)
          return NextResponse.json({ error: 'Equipment inventory is full.' }, { status: 400 })
      }
      if (isBaseUpgrade) {
        const count = await prisma.baseUpgrade.count({ where: { userId: user.id } })
        if (count >= profile.slotsBaseUpgrades)
          return NextResponse.json({ error: 'Base upgrade inventory is full.' }, { status: 400 })
      }

      if (isSpecific) {
        // ── Item com atributos fixos (criado pelo admin) ─────────────────
        const itemCreate = isRobot
          ? prisma.robot.create({ data: {
              userId:     user.id,
              templateId: dbItem.id,                                  // referência ao template
              name:       String(meta.robotName ?? dbItem.name),     // cache do template
              collection: String(meta.robotCollection ?? ''),
              rarity,
              hashPower:  Number(meta.hashPower  ?? 10),
              energyRate: Number(meta.energyRate ?? 1),
              maxDurability: Number(meta.durability ?? 100),          // máximo do template
              durability:    Number(meta.durability ?? 100),          // começa no máximo
            }})
          : isEquipment
          ? prisma.equipment.create({ data: {
              userId:       user.id,
              name:         dbItem.name,
              rarity,
              effectType:   meta.effectType   as never,
              effectValue:  Number(meta.effectValue  ?? 0),
              effectType2:  (meta.effectType2  as never) ?? null,
              effectValue2: meta.effectValue2 != null ? Number(meta.effectValue2) : null,
            }})
          : prisma.baseUpgrade.create({ data: {
              userId:       user.id,
              name:         dbItem.name,
              rarity,
              effectType:   meta.effectType   as never,
              effectValue:  Number(meta.effectValue  ?? 0),
              effectType2:  (meta.effectType2  as never) ?? null,
              effectValue2: meta.effectValue2 != null ? Number(meta.effectValue2) : null,
            }})

        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data:  { balanceCrate: { decrement: price } },
          }),
          prisma.transaction.create({
            data: { userId: user.id, type: 'SHOP_PURCHASE', token: 'CRATE', amount: price, status: 'CONFIRMED' },
          }),
          itemCreate,
        ])
        return NextResponse.json({ success: true, specific: true })

      } else {
        // ── Item gerado aleatoriamente por raridade ───────────────────────
        const rarityForDrop = rarity as 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC'
        const drop =
          generateType === 'robot'       ? generateRobotDrop(rarityForDrop) :
          generateType === 'equipment'   ? generateEquipmentDrop(rarityForDrop) :
                                          generateBaseUpgradeDrop(rarityForDrop)

        const spaceError = await checkInventorySpace(user.id, drop)
        if (spaceError) return NextResponse.json({ error: spaceError }, { status: 400 })

        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data:  { balanceCrate: { decrement: price } },
          }),
          prisma.transaction.create({
            data: { userId: user.id, type: 'SHOP_PURCHASE', token: 'CRATE', amount: price, status: 'CONFIRMED' },
          }),
        ])
        await saveDropToInventory(user.id, drop)
        return NextResponse.json({ success: true, drop })
      }
    }

    // ── Baterias (Kits de Reparo) ─────────────────────────────────────────
    case 'batteries': {
      const value = Number(meta.batteryValue ?? 0)
      if (!value) return NextResponse.json({ error: 'Invalid battery item.' }, { status: 400 })

      const profile2 = await prisma.user.findUnique({
        where: { id: user.id },
        select: { slotsConsumables: true, _count: { select: { consumables: true } } },
      })
      if (profile2 && profile2._count.consumables >= profile2.slotsConsumables) {
        return NextResponse.json({ error: 'Consumables inventory is full.' }, { status: 400 })
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { balanceCrate: { decrement: price } } })
        await tx.transaction.create({
          data: { userId: user.id, type: 'SHOP_PURCHASE', token: 'CRATE', amount: price, status: 'CONFIRMED' },
        })
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

    // ── Slots do Outpost ──────────────────────────────────────────────────
    case 'outpostSlots': {
      const slotNum      = Number(meta.slotNumber  ?? 0)
      const slotRequires = Number(meta.slotRequires ?? 0)
      if (!slotNum) return NextResponse.json({ error: 'Invalid slot item.' }, { status: 400 })

      if (profile.outpostSlots >= slotNum) {
        return NextResponse.json({ error: 'This slot is already unlocked.' }, { status: 409 })
      }
      if (slotRequires && profile.outpostSlots < slotRequires) {
        return NextResponse.json({ error: `You need to unlock slot ${slotRequires} first.` }, { status: 400 })
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data:  { balanceCrate: { decrement: price }, outpostSlots: { increment: 1 } },
        }),
        prisma.transaction.create({
          data: { userId: user.id, type: 'SHOP_PURCHASE', token: 'CRATE', amount: price, status: 'CONFIRMED' },
        }),
      ])
      return NextResponse.json({ success: true })
    }

    // ── Expansões de Inventário ───────────────────────────────────────────
    case 'inventory': {
      const tab     = String(meta.inventoryTab ?? '')
      const field   = INVENTORY_FIELD[tab]
      const add     = Number(meta.inventoryAdd ?? 0)
      if (!field || !add) return NextResponse.json({ error: 'Invalid inventory item.' }, { status: 400 })

      const current  = (profile as Record<string, number>)[field]
      const maxSlots = INVENTORY_MAX[tab] ?? 0
      if (current >= maxSlots) {
        return NextResponse.json({ error: `${tab} inventory is already at maximum capacity.` }, { status: 400 })
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data:  { balanceCrate: { decrement: price }, [field]: { increment: add } },
        }),
        prisma.transaction.create({
          data: { userId: user.id, type: 'SHOP_PURCHASE', token: 'CRATE', amount: price, status: 'CONFIRMED' },
        }),
      ])
      return NextResponse.json({ success: true })
    }

    default:
      return NextResponse.json({ error: 'Unknown item category.' }, { status: 400 })
  }
}
