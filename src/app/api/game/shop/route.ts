import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { INVENTORY_DEFAULT, INVENTORY_MAX } from '@/lib/shop-items'

function expansionPrice(
  basePrice: number,
  currentSlots: number,
  defaultSlots: number,
  addPerPurchase: number,
): number {
  const purchased = Math.round((currentSlots - defaultSlots) / addPerPurchase)
  return Math.round(basePrice * Math.pow(1.2, purchased) * 100) / 100
}

/** Normaliza categorias *-specific para o slug que o ShopManager usa nas abas */
function normalizeCategory(category: string): string {
  if (category === 'robot-specific')        return 'robots'
  if (category === 'equipment-specific')    return 'equipment'
  if (category === 'base-upgrade-specific') return 'baseUpgrades'
  return category
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
    // Única fonte de verdade: banco de dados
    prisma.shopItem.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ])

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const slotMap: Record<string, number> = {
    robots:       profile.slotsRobots,
    equipments:   profile.slotsEquipments,
    baseUpgrades: profile.slotsBaseUpgrades,
    parts:        profile.slotsParts,
    consumables:  profile.slotsConsumables,
    lootboxes:    profile.slotsLootboxes,
  }

  const items = dbItems.map((si) => {
    const meta = (si.metadata as Record<string, unknown>) ?? {}
    const category = normalizeCategory(si.category)

    // ── Expansões de inventário: preço dinâmico ──────────────────────────
    if (category === 'inventory') {
      const tab        = String(meta.inventoryTab ?? '')
      const current    = slotMap[tab] ?? 0
      const maxSlots   = INVENTORY_MAX[tab] ?? 0
      const add        = Number(meta.inventoryAdd ?? 5)
      // Usa || porque o campo price pode ser 0 no banco (preço base vem do metadata)
      const basePrice  = si.price || Number(meta.inventoryBasePrice ?? 5)
      const price      = expansionPrice(basePrice, current, INVENTORY_DEFAULT[tab] ?? 0, add)
      return {
        id:                 si.id,
        category,
        name:               si.name,
        description:        si.description,
        rarity:             si.rarity ?? undefined,
        price,
        inventoryTab:       tab,
        inventoryAdd:       add,
        inventoryBasePrice: basePrice,
        currentSlots:       current,
        maxSlots,
        isCapped:           current >= maxSlots,
      }
    }

    // ── Demais categorias ────────────────────────────────────────────────
    return {
      id:           si.id,
      category,
      name:         si.name,
      description:  si.description,
      price:        si.price,
      rarity:       si.rarity ?? undefined,
      // Campos de geração aleatória
      generateType: meta.generateType   as string | undefined,
      // Campos de item específico (admin-created com stats fixos)
      specific:        meta.specific === true ? true : undefined,
      hashPower:       meta.hashPower       != null ? Number(meta.hashPower)       : undefined,
      energyRate:      meta.energyRate      != null ? Number(meta.energyRate)      : undefined,
      durability:      meta.durability      != null ? Number(meta.durability)      : undefined,
      robotCollection: meta.robotCollection != null ? String(meta.robotCollection) : undefined,
      effectType:     meta.effectType     != null ? String(meta.effectType)     : undefined,
      effectValue:    meta.effectValue    != null ? Number(meta.effectValue)    : undefined,
      effectType2:    meta.effectType2    != null ? String(meta.effectType2)    : undefined,
      effectValue2:   meta.effectValue2   != null ? Number(meta.effectValue2)   : undefined,
      // Campos de outros tipos
      batteryValue: meta.batteryValue   != null ? Number(meta.batteryValue)  : undefined,
      slotNumber:   meta.slotNumber     != null ? Number(meta.slotNumber)    : undefined,
      slotRequires: meta.slotRequires   != null ? Number(meta.slotRequires)  : undefined,
    }
  })

  return NextResponse.json({
    balance:      profile.balanceCrate,
    outpostSlots: profile.outpostSlots,
    items,
  })
}
