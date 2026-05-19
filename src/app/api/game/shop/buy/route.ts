import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { INVENTORY_DEFAULT, INVENTORY_FIELD, INVENTORY_MAX } from '@/lib/shop-items'
import {
  generateRobotDrop, generateEquipmentDrop, generateBaseUpgradeDrop,
  type DropResultType,
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

/** Monta o `prisma.create` para um drop gerado aleatoriamente */
function buildDropCreate(userId: string, drop: DropResultType) {
  switch (drop.kind) {
    case 'robot':
      return prisma.robot.create({ data: {
        userId,
        templateId:    drop.templateId ?? null,
        name:          drop.name,
        collection:    drop.collection,
        rarity:        drop.rarity,
        hashPower:     drop.hashPower,
        energyRate:    drop.energyRate,
        maxDurability: drop.durability ?? null,
        durability:    drop.durability ?? 100,
        isActive:      false,
      }})
    case 'equipment':
      return prisma.equipment.create({ data: {
        userId,
        name:        drop.name,
        rarity:      drop.rarity,
        effectType:  drop.effectType,
        effectValue: drop.effectValue,
        effectType2:  drop.effectType2  ?? null,
        effectValue2: drop.effectValue2 ?? null,
        isPermanent: true,
      }})
    case 'baseUpgrade':
      return prisma.baseUpgrade.create({ data: {
        userId,
        name:        drop.name,
        rarity:      drop.rarity,
        effectType:  drop.effectType,
        effectValue: drop.effectValue,
        isApplied:   false,
      }})
    default:
      throw new Error(`Unsupported drop kind for shop: ${(drop as DropResultType).kind}`)
  }
}

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body       = await req.json()
  const { itemId } = body
  // Quantidade: 1–99, sempre inteiro positivo
  const quantity   = Math.min(99, Math.max(1, Math.floor(Number(body.quantity ?? 1))))

  if (!itemId) return NextResponse.json({ error: 'Missing itemId.' }, { status: 400 })

  // ── Busca item no banco (única fonte de verdade) ───────────────────────
  const dbItem = await prisma.shopItem.findUnique({ where: { id: itemId } })
  if (!dbItem)        return NextResponse.json({ error: 'Item not found in shop.' }, { status: 404 })
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

  // ── Verificação de saldo mínimo (1 unidade) ───────────────────────────
  if (profile.balanceCrate < dbItem.price) {
    return NextResponse.json({ error: `Insufficient balance. Need ${dbItem.price} CRATE.` }, { status: 400 })
  }

  // ── Processa compra por categoria ──────────────────────────────────────

  switch (category) {

    // ── Robôs, Equipamentos, Melhorias de Base ───────────────────────────
    case 'robots':
    case 'equipment':
    case 'baseUpgrades': {
      const rarity       = (dbItem.rarity ?? 'COMMON') as 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
      const generateType = String(meta.generateType ?? '')
      const isSpecific   = meta.specific === true
      const isRobot      = category === 'robots'
      const isEquipment  = category === 'equipment'

      const totalCost = Math.round(dbItem.price * quantity * 100) / 100
      if (profile.balanceCrate < totalCost) {
        return NextResponse.json({ error: `Insufficient balance. Need ${totalCost} CRATE.` }, { status: 400 })
      }

      // Verifica slots livres para N itens
      const [robotCount, equipCount, baseCount] = await Promise.all([
        isRobot     ? prisma.robot.count({ where: { userId: user.id } })       : Promise.resolve(0),
        isEquipment ? prisma.equipment.count({ where: { userId: user.id } })   : Promise.resolve(0),
        !isRobot && !isEquipment ? prisma.baseUpgrade.count({ where: { userId: user.id } }) : Promise.resolve(0),
      ])

      const freeSlots = isRobot     ? profile.slotsRobots       - robotCount
                      : isEquipment ? profile.slotsEquipments   - equipCount
                      :               profile.slotsBaseUpgrades - baseCount

      if (freeSlots < quantity) {
        const label = isRobot ? 'robot' : isEquipment ? 'equipment' : 'base upgrade'
        return NextResponse.json({
          error: `Not enough ${label} inventory slots. Free: ${freeSlots}, requested: ${quantity}.`,
        }, { status: 400 })
      }

      if (isSpecific) {
        // ── Item com atributos fixos criado pelo admin ────────────────────
        const makeCreate = () => isRobot
          ? prisma.robot.create({ data: {
              userId:       user.id,
              templateId:   dbItem.id,
              name:         String(meta.robotName ?? dbItem.name),
              collection:   String(meta.robotCollection ?? ''),
              rarity,
              hashPower:    Number(meta.hashPower  ?? 10),
              energyRate:   Number(meta.energyRate ?? 1),
              maxDurability: Number(meta.durability ?? 100),
              durability:    Number(meta.durability ?? 100),
              isActive:     false,
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
              isPermanent:  true,
            }})
          : prisma.baseUpgrade.create({ data: {
              userId:      user.id,
              name:        dbItem.name,
              rarity,
              effectType:  meta.effectType   as never,
              effectValue: Number(meta.effectValue  ?? 0),
              isApplied:   false,
            }})

        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data:  { balanceCrate: { decrement: totalCost } },
          }),
          prisma.transaction.create({
            data: { userId: user.id, type: 'SHOP_PURCHASE', token: 'CRATE', amount: totalCost, status: 'CONFIRMED' },
          }),
          ...Array.from({ length: quantity }, makeCreate),
        ])
        return NextResponse.json({ success: true, quantity })

      } else {
        // ── Geração aleatória por raridade ────────────────────────────────
        const rarityForDrop = rarity as 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC'
        const generatedDrops = Array.from({ length: quantity }, () =>
          generateType === 'robot'       ? generateRobotDrop(rarityForDrop) :
          generateType === 'equipment'   ? generateEquipmentDrop(rarityForDrop) :
                                          generateBaseUpgradeDrop(rarityForDrop)
        )

        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data:  { balanceCrate: { decrement: totalCost } },
          }),
          prisma.transaction.create({
            data: { userId: user.id, type: 'SHOP_PURCHASE', token: 'CRATE', amount: totalCost, status: 'CONFIRMED' },
          }),
          ...generatedDrops.map(drop => buildDropCreate(user.id, drop)),
        ])
        return NextResponse.json({ success: true, drops: generatedDrops })
      }
    }

    // ── Baterias (Kits de Reparo) ─────────────────────────────────────────
    case 'batteries': {
      const value     = Number(meta.batteryValue ?? 0)
      if (!value) return NextResponse.json({ error: 'Invalid battery item.' }, { status: 400 })

      const totalCost = Math.round(dbItem.price * quantity * 100) / 100
      if (profile.balanceCrate < totalCost) {
        return NextResponse.json({ error: `Insufficient balance. Need ${totalCost} CRATE.` }, { status: 400 })
      }

      // Slot novo só é necessário se esse tipo de kit ainda não existir
      const existingRow = await prisma.consumable.findUnique({
        where: { userId_consumableType_value: { userId: user.id, consumableType: 'REPAIR_KIT', value } },
      })
      if (!existingRow) {
        const profile2 = await prisma.user.findUnique({
          where: { id: user.id },
          select: { slotsConsumables: true, _count: { select: { consumables: true } } },
        })
        if (profile2 && profile2._count.consumables >= profile2.slotsConsumables) {
          return NextResponse.json({ error: 'Consumables inventory is full.' }, { status: 400 })
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { balanceCrate: { decrement: totalCost } } })
        await tx.transaction.create({
          data: { userId: user.id, type: 'SHOP_PURCHASE', token: 'CRATE', amount: totalCost, status: 'CONFIRMED' },
        })
        if (existingRow) {
          await tx.consumable.update({ where: { id: existingRow.id }, data: { quantity: { increment: quantity } } })
        } else {
          await tx.consumable.create({ data: { userId: user.id, consumableType: 'REPAIR_KIT', value, quantity } })
        }
      })
      return NextResponse.json({ success: true, quantity })
    }

    // ── Slots do Outpost ──────────────────────────────────────────────────
    // Unlock é sequencial — sempre processa 1 por vez independente de quantity
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
          data:  { balanceCrate: { decrement: dbItem.price }, outpostSlots: { increment: 1 } },
        }),
        prisma.transaction.create({
          data: { userId: user.id, type: 'SHOP_PURCHASE', token: 'CRATE', amount: dbItem.price, status: 'CONFIRMED' },
        }),
      ])
      return NextResponse.json({ success: true, quantity: 1 })
    }

    // ── Expansões de Inventário ───────────────────────────────────────────
    // Preço escalonado: cada unidade custa +20% em relação à anterior.
    // Processa tantas compras quantas forem acessíveis até o limite máximo.
    case 'inventory': {
      const tab     = String(meta.inventoryTab ?? '')
      const field   = INVENTORY_FIELD[tab]
      const add     = Number(meta.inventoryAdd ?? 0)
      if (!field || !add) return NextResponse.json({ error: 'Invalid inventory item.' }, { status: 400 })

      const maxSlots  = INVENTORY_MAX[tab] ?? 0
      const basePrice = dbItem.price || Number(meta.inventoryBasePrice ?? 5)
      let current     = (profile as Record<string, number>)[field]

      // Calcula custo real escalonado para N compras (para quando bater no max)
      let totalCost  = 0
      let actualQty  = 0
      for (let i = 0; i < quantity; i++) {
        if (current >= maxSlots) break
        totalCost += expansionPrice(basePrice, current, INVENTORY_DEFAULT[tab] ?? 0, add)
        current   += add
        actualQty++
      }
      totalCost = Math.round(totalCost * 100) / 100

      if (actualQty === 0) {
        return NextResponse.json({ error: `${tab} inventory is already at maximum capacity.` }, { status: 400 })
      }
      if (profile.balanceCrate < totalCost) {
        return NextResponse.json({ error: `Insufficient balance. Need ${totalCost} CRATE.` }, { status: 400 })
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data:  { balanceCrate: { decrement: totalCost }, [field]: { increment: add * actualQty } },
        }),
        prisma.transaction.create({
          data: { userId: user.id, type: 'SHOP_PURCHASE', token: 'CRATE', amount: totalCost, status: 'CONFIRMED' },
        }),
      ])
      return NextResponse.json({ success: true, quantity: actualQty, totalCost })
    }

    default:
      return NextResponse.json({ error: 'Unknown item category.' }, { status: 400 })
  }
}
