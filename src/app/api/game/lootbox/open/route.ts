import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LootboxType } from '@prisma/client'
import {
  generateRobotDrop, generateEquipmentDrop, generateBaseUpgradeDrop,
  rollPartsCrate, rollSupplyCrateAsync,
  saveDropToInventory, checkInventorySpace,
  type DropResultType,
} from '@/lib/lootbox'
import { incrementMission } from '@/lib/mission-progress'

const MAX_OPEN_AT_ONCE = 10

const VALID_TYPES = [
  'PARTS_CRATE',
  'SUPPLY_CRATE',
  'ROBOT_CRATE_COMMON',
  'ROBOT_CRATE_UNCOMMON',
  'ROBOT_CRATE_RARE',
  'ROBOT_CRATE_EPIC',
  'EQUIPMENT_CRATE_COMMON',
  'EQUIPMENT_CRATE_UNCOMMON',
  'EQUIPMENT_CRATE_RARE',
  'EQUIPMENT_CRATE_EPIC',
  'BASE_UPGRADE_CRATE_COMMON',
  'BASE_UPGRADE_CRATE_UNCOMMON',
  'BASE_UPGRADE_CRATE_RARE',
  'BASE_UPGRADE_CRATE_EPIC',
] as const

// Mapa de crates específicas → função geradora de drop garantido
const SPECIFIC_CRATE_DROP: Record<string, () => DropResultType> = {
  ROBOT_CRATE_COMMON:          () => generateRobotDrop('COMMON'),
  ROBOT_CRATE_UNCOMMON:        () => generateRobotDrop('UNCOMMON'),
  ROBOT_CRATE_RARE:            () => generateRobotDrop('RARE'),
  ROBOT_CRATE_EPIC:            () => generateRobotDrop('EPIC'),
  EQUIPMENT_CRATE_COMMON:      () => generateEquipmentDrop('COMMON'),
  EQUIPMENT_CRATE_UNCOMMON:    () => generateEquipmentDrop('UNCOMMON'),
  EQUIPMENT_CRATE_RARE:        () => generateEquipmentDrop('RARE'),
  EQUIPMENT_CRATE_EPIC:        () => generateEquipmentDrop('EPIC'),
  BASE_UPGRADE_CRATE_COMMON:   () => generateBaseUpgradeDrop('COMMON'),
  BASE_UPGRADE_CRATE_UNCOMMON: () => generateBaseUpgradeDrop('UNCOMMON'),
  BASE_UPGRADE_CRATE_RARE:     () => generateBaseUpgradeDrop('RARE'),
  BASE_UPGRADE_CRATE_EPIC:     () => generateBaseUpgradeDrop('EPIC'),
}

// ─── Config pré-carregada do banco ────────────────────────────────────────────

type LoadedConfig = NonNullable<Awaited<ReturnType<typeof prisma.lootboxConfig.findFirst>>> & {
  dropEntries: {
    dropType: string; rarity: string | null
    minQuantity: number; maxQuantity: number
    weight: number; specificName: string | null
  }[]
}

/**
 * Roll a partir de config do banco — agora lida com TODOS os dropTypes:
 * PART, CONSUMABLE, ROBOT, EQUIPMENT, BASE_UPGRADE
 */
function rollFromConfigSync(
  config: LoadedConfig,
  robotTemplates: { id: string; name: string; rarity: string | null; metadata: unknown }[],
): DropResultType | null {
  if (!config.dropEntries.length) return null

  const totalWeight = config.dropEntries.reduce((s, e) => s + e.weight, 0)
  let rand = Math.random() * totalWeight
  let chosen = config.dropEntries[config.dropEntries.length - 1]
  for (const entry of config.dropEntries) {
    rand -= entry.weight
    if (rand <= 0) { chosen = entry; break }
  }

  const qty    = chosen.minQuantity === chosen.maxQuantity
    ? chosen.minQuantity
    : chosen.minQuantity + Math.floor(Math.random() * (chosen.maxQuantity - chosen.minQuantity + 1))
  const rarity = (chosen.rarity ?? 'COMMON') as 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

  switch (chosen.dropType) {
    case 'PART': {
      const NAMES: Record<string, string[]> = {
        COMMON:    ['Energy Core', 'Servo Pack', 'Circuit Board', 'Power Relay', 'Signal Node'],
        UNCOMMON:  ['Mining Core', 'AI Chip', 'Charge Crystal', 'Thruster Pack', 'Sensor Array'],
        RARE:      ['Void Crystal', 'Logic Core', 'Genesis Fragment', 'Terrain Scanner', 'Quantum Cell'],
        EPIC:      ['Nexus Shard', 'Plasma Core', 'Singularity Chip', 'Warp Conduit'],
        LEGENDARY: ['Omega Crystal', 'Stellar Core'],
      }
      type PartCat = 'ENERGY' | 'MINING' | 'MAINTENANCE' | 'TERRAIN' | 'AI_SOFTWARE' | 'SPECIAL'
      const CAT: Record<string, PartCat> = {
        COMMON: 'ENERGY', UNCOMMON: 'MINING', RARE: 'SPECIAL', EPIC: 'SPECIAL', LEGENDARY: 'SPECIAL',
      }
      const names = NAMES[rarity] ?? NAMES.COMMON
      return {
        kind: 'part',
        partType: names[Math.floor(Math.random() * names.length)],
        category: CAT[rarity] ?? 'ENERGY',
        rarity,
        quantity: qty,
      }
    }

    case 'CONSUMABLE': {
      const val = chosen.specificName
        ? parseInt(chosen.specificName.replace('REPAIR_KIT_', ''), 10)
        : 5
      return { kind: 'consumable', consumableType: 'REPAIR_KIT', value: isNaN(val) ? 5 : val, quantity: qty }
    }

    case 'ROBOT':
      return generateRobotDrop(rarity, robotTemplates)

    case 'EQUIPMENT':
      return generateEquipmentDrop(rarity)

    case 'BASE_UPGRADE':
      return generateBaseUpgradeDrop(rarity)

    default:
      return null
  }
}

// ─── Main route ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lootboxType, quantity = 1 } = await req.json() as {
    lootboxType: string
    quantity: number
  }

  if (!VALID_TYPES.includes(lootboxType as typeof VALID_TYPES[number])) {
    return NextResponse.json({ error: 'Invalid lootbox type.' }, { status: 400 })
  }

  const qty    = Math.min(Math.max(1, quantity), MAX_OPEN_AT_ONCE)
  const ltEnum = lootboxType as LootboxType

  const lootbox = await prisma.inventoryLootbox.findUnique({
    where: { userId_lootboxType: { userId: user.id, lootboxType: ltEnum } },
  })

  if (!lootbox || lootbox.quantity < 1) {
    return NextResponse.json({ error: 'You do not have this lootbox.' }, { status: 400 })
  }

  const toOpen = Math.min(qty, lootbox.quantity)
  const drops: DropResultType[] = []
  let stopped = false

  // ── Crates específicas: drop garantido via mapa ───────────────────────────
  if (lootboxType in SPECIFIC_CRATE_DROP) {
    const generate = SPECIFIC_CRATE_DROP[lootboxType]

    for (let i = 0; i < toOpen && !stopped; i++) {
      const drop = generate()
      const spaceError = await checkInventorySpace(user.id, drop)
      if (spaceError) { stopped = true; break }
      await saveDropToInventory(user.id, drop)
      drops.push(drop)
    }
  } else {
    // ── Parts Crate / Supply Crate: usa config do banco ou fallback ──────────

    // Pré-carrega config e templates de robô UMA vez antes do loop
    const [dbConfig, robotTemplates] = await Promise.all([
      prisma.lootboxConfig.findFirst({
        where:   { lootboxType, active: true },
        include: { dropEntries: true },
      }),
      prisma.shopItem.findMany({ where: { category: 'robot-specific', active: true } }),
    ])

    for (let i = 0; i < toOpen && !stopped; i++) {
      let drop: DropResultType | null = null

      if (dbConfig && dbConfig.dropEntries.length > 0) {
        drop = rollFromConfigSync(dbConfig, robotTemplates)
      }

      // Fallback hardcoded quando config do banco não cobriu o tipo
      if (!drop) {
        drop = lootboxType === 'PARTS_CRATE'
          ? rollPartsCrate()
          : await rollSupplyCrateAsync()
      }

      const spaceError = await checkInventorySpace(user.id, drop)
      if (spaceError) { stopped = true; break }

      await saveDropToInventory(user.id, drop)
      drops.push(drop)
    }
  }

  // ── Atualiza inventário de lootboxes ──────────────────────────────────────
  if (drops.length > 0) {
    const newQty = lootbox.quantity - drops.length
    if (newQty <= 0) {
      await prisma.inventoryLootbox.delete({
        where: { userId_lootboxType: { userId: user.id, lootboxType: ltEnum } },
      })
    } else {
      await prisma.inventoryLootbox.update({
        where: { userId_lootboxType: { userId: user.id, lootboxType: ltEnum } },
        data:  { quantity: newQty },
      })
    }

    void incrementMission(user.id, 'LOOTBOX', drops.length)
  }

  return NextResponse.json({
    success:     drops.length > 0,
    drops,
    opened:      drops.length,
    stoppedEarly: stopped,
  })
}
