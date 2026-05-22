import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ─── Configurações padrão (fallback se não houver config no banco) ─────────────

export const PARTS_CRATE_PRICE        = 0.01
export const SUPPLY_CRATE_PRICE       = 0.1
export const ROBOT_CRATE_PRICES: Record<string, number> = {
  ROBOT_CRATE_COMMON:   5,
  ROBOT_CRATE_UNCOMMON: 15,
  ROBOT_CRATE_RARE:     50,
  ROBOT_CRATE_EPIC:     150,
}
export const PARTS_CRATE_WEEKLY_LIMIT = 5

export function getLastMonday(): Date {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  d.setHours(0, 0, 0, 0)
  return d
}

// ─── Formata label de drop entry para exibição ────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function formatDropLabel(
  dropType: string,
  rarity: string | null,
  minQty: number,
  maxQty: number,
  specificName: string | null,
): string {
  const rarityLabel = rarity ? `${capitalize(rarity)} ` : ''
  const qtyLabel    = minQty === maxQty
    ? (minQty > 1 ? ` ×${minQty}` : '')
    : ` ×${minQty}–${maxQty}`

  switch (dropType) {
    case 'PART':         return `${rarityLabel}Parts${qtyLabel}`
    case 'ROBOT':        return `${rarityLabel}Robot${qtyLabel}`
    case 'EQUIPMENT':    return `${rarityLabel}Equipment${qtyLabel}`
    case 'BASE_UPGRADE': return `${rarityLabel}Base Upgrade${qtyLabel}`
    case 'CONSUMABLE': {
      if (specificName?.startsWith('REPAIR_KIT_')) {
        const val = specificName.replace('REPAIR_KIT_', '')
        return `Repair Kit +${val}%${qtyLabel}`
      }
      return `Consumable${qtyLabel}`
    }
    default: return `${dropType}${qtyLabel}`
  }
}

// ─── Fallback drop tables (usadas se não houver config no banco) ──────────────

const FALLBACK_CONFIGS: Record<string, {
  name: string
  description: string
  price: number
  weeklyLimit: number | null
  drops: { label: string; chance: string }[]
}> = {
  PARTS_CRATE: {
    name: 'Parts Crate',
    description: 'Crafting parts of various rarities. Limited to 5 purchases per week.',
    price: PARTS_CRATE_PRICE,
    weeklyLimit: PARTS_CRATE_WEEKLY_LIMIT,
    drops: [
      { label: 'Common Parts ×4',   chance: '35%'  },
      { label: 'Common Parts ×8',   chance: '25%'  },
      { label: 'Uncommon Parts ×2', chance: '18%'  },
      { label: 'Uncommon Parts ×4', chance: '12%'  },
      { label: 'Rare Part ×1',      chance: '5%'   },
      { label: 'Rare Parts ×2',     chance: '3%'   },
      { label: 'Epic Part ×1',      chance: '2%'   },
    ],
  },
  SUPPLY_CRATE: {
    name: 'Supply Crate',
    description: 'Robots, equipment, base upgrades and consumables. Legendary drops possible.',
    price: SUPPLY_CRATE_PRICE,
    weeklyLimit: null,
    drops: [
      { label: 'Common Equipment',       chance: '18%'  },
      { label: 'Common Base Upgrade',    chance: '15%'  },
      { label: 'Repair Kit +25% ×5',    chance: '12%'  },
      { label: 'Common Robot',           chance: '12%'  },
      { label: 'Uncommon Equipment',     chance: '9%'   },
      { label: 'Uncommon Base Upgrade',  chance: '8%'   },
      { label: 'Uncommon Robot',         chance: '7%'   },
      { label: 'Rare Equipment',         chance: '5%'   },
      { label: 'Rare Base Upgrade',      chance: '4%'   },
      { label: 'Rare Robot',             chance: '4%'   },
      { label: 'Epic Equipment',         chance: '2%'   },
      { label: 'Epic Base Upgrade',      chance: '2%'   },
      { label: 'Epic Robot',             chance: '1%'   },
      { label: 'Legendary Equipment',    chance: '0.5%' },
      { label: 'Legendary Base Upgrade', chance: '0.3%' },
      { label: 'Legendary Robot',        chance: '0.2%' },
    ],
  },
  ROBOT_CRATE_COMMON: {
    name: 'Robot Crate — Common',
    description: 'Guaranteed Common robot. Reliable and energy efficient.',
    price: ROBOT_CRATE_PRICES.ROBOT_CRATE_COMMON,
    weeklyLimit: null,
    drops: [{ label: 'Common Robot ×1', chance: '100%' }],
  },
  ROBOT_CRATE_UNCOMMON: {
    name: 'Robot Crate — Uncommon',
    description: 'Guaranteed Uncommon robot with improved extraction capabilities.',
    price: ROBOT_CRATE_PRICES.ROBOT_CRATE_UNCOMMON,
    weeklyLimit: null,
    drops: [{ label: 'Uncommon Robot ×1', chance: '100%' }],
  },
  ROBOT_CRATE_RARE: {
    name: 'Robot Crate — Rare',
    description: 'Guaranteed Rare robot. High-performance unit with significant ER output.',
    price: ROBOT_CRATE_PRICES.ROBOT_CRATE_RARE,
    weeklyLimit: null,
    drops: [{ label: 'Rare Robot ×1', chance: '100%' }],
  },
  ROBOT_CRATE_EPIC: {
    name: 'Robot Crate — Epic',
    description: 'Guaranteed Epic robot. Top-tier unit. Maximum ER, higher power draw.',
    price: ROBOT_CRATE_PRICES.ROBOT_CRATE_EPIC,
    weeklyLimit: null,
    drops: [{ label: 'Epic Robot ×1', chance: '100%' }],
  },
}

// ─── Ordem de exibição ────────────────────────────────────────────────────────

const CRATE_ORDER = [
  'PARTS_CRATE',
  'SUPPLY_CRATE',
  'ROBOT_CRATE_COMMON',
  'ROBOT_CRATE_UNCOMMON',
  'ROBOT_CRATE_RARE',
  'ROBOT_CRATE_EPIC',
]

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const lastMonday = getLastMonday()

  const [profile, partsPurchasedThisWeek, dbConfigs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        balanceCrate: true,
        lootboxes: { select: { lootboxType: true, quantity: true } },
      },
    }),
    prisma.transaction.count({
      where: {
        userId: user.id,
        type: 'LOOTBOX_PURCHASE',
        txHash: 'PARTS_CRATE',
        createdAt: { gte: lastMonday },
      },
    }),
    prisma.lootboxConfig.findMany({
      where: { active: true },
      include: { dropEntries: { orderBy: { weight: 'desc' } } },
    }),
  ])

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Mapeia inventário por tipo
  const ownedMap: Record<string, number> = {}
  for (const lb of profile.lootboxes) {
    ownedMap[lb.lootboxType] = lb.quantity
  }

  // Monta um mapa de configs do banco
  const dbConfigMap = new Map(dbConfigs.map((c) => [c.lootboxType, c]))

  // Gera array de crates na ordem definida + quaisquer configs extras no banco
  const allTypes = [
    ...CRATE_ORDER,
    ...dbConfigs.map((c) => c.lootboxType).filter((t) => !CRATE_ORDER.includes(t)),
  ]

  const crates = allTypes.map((lootboxType) => {
    const dbCfg = dbConfigMap.get(lootboxType)

    // Drop entries formatados
    let dropEntries: { label: string; chance: string }[]
    if (dbCfg && dbCfg.dropEntries.length > 0) {
      const totalWeight = dbCfg.dropEntries.reduce((s, e) => s + e.weight, 0)
      dropEntries = dbCfg.dropEntries.map((e) => ({
        label: formatDropLabel(e.dropType, e.rarity, e.minQuantity, e.maxQuantity, e.specificName),
        chance: totalWeight > 0
          ? `${((e.weight / totalWeight) * 100).toFixed(1).replace(/\.0$/, '')}%`
          : '0%',
      }))
    } else {
      dropEntries = FALLBACK_CONFIGS[lootboxType]?.drops ?? []
    }

    const fallback = FALLBACK_CONFIGS[lootboxType]

    return {
      lootboxType,
      name:        dbCfg?.name        ?? fallback?.name        ?? lootboxType,
      description: dbCfg?.description ?? fallback?.description ?? '',
      price:       dbCfg?.priceCrate  ?? fallback?.price       ?? 0,
      weeklyLimit: dbCfg?.weeklyLimit ?? fallback?.weeklyLimit ?? null,
      owned:       ownedMap[lootboxType] ?? 0,
      dropEntries,
    }
  })

  return NextResponse.json({
    balance:              profile.balanceCrate,
    weeklyPartsPurchased: partsPurchasedThisWeek,
    weeklyPartsLimit:     PARTS_CRATE_WEEKLY_LIMIT,
    crates,
  })
}
