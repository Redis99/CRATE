import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ─── Preços fallback (usados APENAS se o banco estiver vazio) ─────────────────

export const PARTS_CRATE_PRICE        = 0.01
export const SUPPLY_CRATE_PRICE       = 0.1
export const PARTS_CRATE_WEEKLY_LIMIT = 5   // fallback — valor real vem do LootboxConfig.weeklyLimit

export const SPECIFIC_CRATE_PRICES: Record<string, number> = {
  ROBOT_CRATE_COMMON:          5,
  ROBOT_CRATE_UNCOMMON:        15,
  ROBOT_CRATE_RARE:            50,
  ROBOT_CRATE_EPIC:            150,
  EQUIPMENT_CRATE_COMMON:      3,
  EQUIPMENT_CRATE_UNCOMMON:    10,
  EQUIPMENT_CRATE_RARE:        30,
  EQUIPMENT_CRATE_EPIC:        90,
  BASE_UPGRADE_CRATE_COMMON:   3,
  BASE_UPGRADE_CRATE_UNCOMMON: 10,
  BASE_UPGRADE_CRATE_RARE:     30,
  BASE_UPGRADE_CRATE_EPIC:     90,
}
/** @deprecated use SPECIFIC_CRATE_PRICES */
export const ROBOT_CRATE_PRICES = SPECIFIC_CRATE_PRICES

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

// ─── Fallback completo (banco vazio / emergência) ─────────────────────────────
// Nunca usado quando o banco está seedado corretamente.

const FALLBACK_CONFIGS: Record<string, {
  name: string; description: string; price: number
  weeklyLimit: number | null; sortOrder: number
  drops: { label: string; chance: string }[]
}> = {
  PARTS_CRATE:  { name: 'Parts Crate',  description: 'Crafting parts of various rarities. Limited to 5 purchases per week.', price: PARTS_CRATE_PRICE,  weeklyLimit: PARTS_CRATE_WEEKLY_LIMIT, sortOrder: 0,
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
  SUPPLY_CRATE: { name: 'Supply Crate', description: 'Robots, equipment, base upgrades and consumables. Legendary drops possible.', price: SUPPLY_CRATE_PRICE, weeklyLimit: null, sortOrder: 1,
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
  ROBOT_CRATE_COMMON:          { name: 'Robot Crate — Common',          description: 'Guaranteed Common robot.',          price: SPECIFIC_CRATE_PRICES.ROBOT_CRATE_COMMON,          weeklyLimit: null, sortOrder: 2,  drops: [{ label: 'Common Robot ×1',          chance: '100%' }] },
  ROBOT_CRATE_UNCOMMON:        { name: 'Robot Crate — Uncommon',        description: 'Guaranteed Uncommon robot.',        price: SPECIFIC_CRATE_PRICES.ROBOT_CRATE_UNCOMMON,        weeklyLimit: null, sortOrder: 3,  drops: [{ label: 'Uncommon Robot ×1',        chance: '100%' }] },
  ROBOT_CRATE_RARE:            { name: 'Robot Crate — Rare',            description: 'Guaranteed Rare robot.',            price: SPECIFIC_CRATE_PRICES.ROBOT_CRATE_RARE,            weeklyLimit: null, sortOrder: 4,  drops: [{ label: 'Rare Robot ×1',            chance: '100%' }] },
  ROBOT_CRATE_EPIC:            { name: 'Robot Crate — Epic',            description: 'Guaranteed Epic robot.',            price: SPECIFIC_CRATE_PRICES.ROBOT_CRATE_EPIC,            weeklyLimit: null, sortOrder: 5,  drops: [{ label: 'Epic Robot ×1',            chance: '100%' }] },
  EQUIPMENT_CRATE_COMMON:      { name: 'Equipment Crate — Common',      description: 'Guaranteed Common equipment.',      price: SPECIFIC_CRATE_PRICES.EQUIPMENT_CRATE_COMMON,      weeklyLimit: null, sortOrder: 6,  drops: [{ label: 'Common Equipment ×1',      chance: '100%' }] },
  EQUIPMENT_CRATE_UNCOMMON:    { name: 'Equipment Crate — Uncommon',    description: 'Guaranteed Uncommon equipment.',    price: SPECIFIC_CRATE_PRICES.EQUIPMENT_CRATE_UNCOMMON,    weeklyLimit: null, sortOrder: 7,  drops: [{ label: 'Uncommon Equipment ×1',    chance: '100%' }] },
  EQUIPMENT_CRATE_RARE:        { name: 'Equipment Crate — Rare',        description: 'Guaranteed Rare equipment.',        price: SPECIFIC_CRATE_PRICES.EQUIPMENT_CRATE_RARE,        weeklyLimit: null, sortOrder: 8,  drops: [{ label: 'Rare Equipment ×1',        chance: '100%' }] },
  EQUIPMENT_CRATE_EPIC:        { name: 'Equipment Crate — Epic',        description: 'Guaranteed Epic equipment.',        price: SPECIFIC_CRATE_PRICES.EQUIPMENT_CRATE_EPIC,        weeklyLimit: null, sortOrder: 9,  drops: [{ label: 'Epic Equipment ×1',        chance: '100%' }] },
  BASE_UPGRADE_CRATE_COMMON:   { name: 'Base Upgrade Crate — Common',   description: 'Guaranteed Common base upgrade.',   price: SPECIFIC_CRATE_PRICES.BASE_UPGRADE_CRATE_COMMON,   weeklyLimit: null, sortOrder: 10, drops: [{ label: 'Common Base Upgrade ×1',   chance: '100%' }] },
  BASE_UPGRADE_CRATE_UNCOMMON: { name: 'Base Upgrade Crate — Uncommon', description: 'Guaranteed Uncommon base upgrade.', price: SPECIFIC_CRATE_PRICES.BASE_UPGRADE_CRATE_UNCOMMON, weeklyLimit: null, sortOrder: 11, drops: [{ label: 'Uncommon Base Upgrade ×1', chance: '100%' }] },
  BASE_UPGRADE_CRATE_RARE:     { name: 'Base Upgrade Crate — Rare',     description: 'Guaranteed Rare base upgrade.',     price: SPECIFIC_CRATE_PRICES.BASE_UPGRADE_CRATE_RARE,     weeklyLimit: null, sortOrder: 12, drops: [{ label: 'Rare Base Upgrade ×1',     chance: '100%' }] },
  BASE_UPGRADE_CRATE_EPIC:     { name: 'Base Upgrade Crate — Epic',     description: 'Guaranteed Epic base upgrade.',     price: SPECIFIC_CRATE_PRICES.BASE_UPGRADE_CRATE_EPIC,     weeklyLimit: null, sortOrder: 13, drops: [{ label: 'Epic Base Upgrade ×1',     chance: '100%' }] },
}

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
    // Ordenado por sort_order via SQL + createdAt como tiebreak.
    // Nota: `orderBy: { sortOrder }` requer client regenerado; usamos createdAt
    // até o próximo `prisma generate` (restart do dev server ou build no Vercel).
    prisma.lootboxConfig.findMany({
      where:   { active: true },
      orderBy: { createdAt: 'asc' },
      include: { dropEntries: { orderBy: { weight: 'desc' } } },
    }),
  ])

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Inventário por tipo
  const ownedMap: Record<string, number> = {}
  for (const lb of profile.lootboxes) {
    ownedMap[lb.lootboxType] = lb.quantity
  }

  // Limite semanal da Parts Crate lido do banco — fallback para a constante
  const partsCrateConfig  = dbConfigs.find((c) => c.lootboxType === 'PARTS_CRATE')
  const weeklyPartsLimit  = partsCrateConfig?.weeklyLimit ?? PARTS_CRATE_WEEKLY_LIMIT

  // ── Constrói crates ───────────────────────────────────────────────────────
  // Banco com configs → usa o banco (ordem pelo sortOrder já aplicada na query)
  // Banco vazio → fallback estático ordenado pelo sortOrder local
  let crates: {
    lootboxType: string; name: string; description: string
    price: number; weeklyLimit: number | null; owned: number
    dropEntries: { label: string; chance: string }[]
    openingWebpUrl: string | null; openingRevealMs: number
  }[]

  if (dbConfigs.length > 0) {
    crates = dbConfigs.map((cfg) => {
      const lootboxType = cfg.lootboxType
      const fallback    = FALLBACK_CONFIGS[lootboxType]
      const entries     = (cfg as any).dropEntries as { dropType: string; rarity: string | null; minQuantity: number; maxQuantity: number; weight: number; specificName: string | null }[] | undefined

      let dropEntries: { label: string; chance: string }[]
      if (entries && entries.length > 0) {
        const totalWeight = entries.reduce((s, e) => s + e.weight, 0)
        dropEntries = entries.map((e) => ({
          label: formatDropLabel(e.dropType, e.rarity, e.minQuantity, e.maxQuantity, e.specificName),
          chance: totalWeight > 0
            ? `${((e.weight / totalWeight) * 100).toFixed(1).replace(/\.0$/, '')}%`
            : '0%',
        }))
      } else {
        dropEntries = fallback?.drops ?? []
      }

      return {
        lootboxType,
        name:        cfg.name        ?? fallback?.name        ?? lootboxType,
        description: cfg.description ?? fallback?.description ?? '',
        price:       cfg.priceCrate  ?? fallback?.price       ?? 0,
        weeklyLimit: cfg.weeklyLimit ?? fallback?.weeklyLimit ?? null,
        owned:       ownedMap[lootboxType] ?? 0,
        dropEntries,
        openingWebpUrl:  cfg.openingWebpUrl  ?? null,
        openingRevealMs: cfg.openingRevealMs ?? 900,
      }
    })
  } else {
    // Fallback de emergência — banco vazio antes do seed
    crates = Object.entries(FALLBACK_CONFIGS)
      .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
      .map(([lootboxType, f]) => ({
        lootboxType,
        name:        f.name,
        description: f.description,
        price:       f.price,
        weeklyLimit: f.weeklyLimit,
        owned:       ownedMap[lootboxType] ?? 0,
        dropEntries: f.drops,
        openingWebpUrl:  null,
        openingRevealMs: 900,
      }))
  }

  return NextResponse.json({
    balance:              profile.balanceCrate,
    weeklyPartsPurchased: partsPurchasedThisWeek,
    weeklyPartsLimit,   // lido do banco, não hardcoded
    crates,
  })
}
