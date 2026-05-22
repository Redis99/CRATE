/**
 * Seed das configurações de lootbox no banco.
 * Espelha exatamente as drop tables hardcoded em lootbox.ts + robot crates.
 * Chamar uma vez: POST /api/admin/seed-lootbox (Bearer CRON_SECRET)
 * Para forçar re-seed: POST /api/admin/seed-lootbox?force=true
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CONFIGS = [
  // ─── Parts Crate ─────────────────────────────────────────────────────────
  {
    lootboxType: 'PARTS_CRATE',
    name:        'Parts Crate',
    description: 'Crafting parts of various rarities. Limited to 5 purchases per week.',
    priceCrate:  0.01,
    weeklyLimit: 5,
    seasonal:    false,
    dropEntries: [
      { dropType: 'PART' as const, rarity: 'COMMON'   as const, minQuantity: 4, maxQuantity: 4, weight: 35 },
      { dropType: 'PART' as const, rarity: 'COMMON'   as const, minQuantity: 8, maxQuantity: 8, weight: 25 },
      { dropType: 'PART' as const, rarity: 'UNCOMMON' as const, minQuantity: 2, maxQuantity: 2, weight: 18 },
      { dropType: 'PART' as const, rarity: 'UNCOMMON' as const, minQuantity: 4, maxQuantity: 4, weight: 12 },
      { dropType: 'PART' as const, rarity: 'RARE'     as const, minQuantity: 1, maxQuantity: 1, weight:  5 },
      { dropType: 'PART' as const, rarity: 'RARE'     as const, minQuantity: 2, maxQuantity: 2, weight:  3 },
      { dropType: 'PART' as const, rarity: 'EPIC'     as const, minQuantity: 1, maxQuantity: 1, weight:  2 },
    ],
  },

  // ─── Supply Crate ─────────────────────────────────────────────────────────
  {
    lootboxType: 'SUPPLY_CRATE',
    name:        'Supply Crate',
    description: 'Robots, equipment, base upgrades and consumables. Legendary drops possible.',
    priceCrate:  0.1,
    weeklyLimit: null,
    seasonal:    false,
    dropEntries: [
      { dropType: 'EQUIPMENT'    as const, rarity: 'COMMON'    as const, minQuantity: 1, maxQuantity: 1, weight: 18 },
      { dropType: 'BASE_UPGRADE' as const, rarity: 'COMMON'    as const, minQuantity: 1, maxQuantity: 1, weight: 15 },
      { dropType: 'CONSUMABLE'   as const, rarity: undefined,             minQuantity: 5, maxQuantity: 5, weight: 12, specificName: 'REPAIR_KIT_25' },
      { dropType: 'ROBOT'        as const, rarity: 'COMMON'    as const, minQuantity: 1, maxQuantity: 1, weight: 12 },
      { dropType: 'EQUIPMENT'    as const, rarity: 'UNCOMMON'  as const, minQuantity: 1, maxQuantity: 1, weight:  9 },
      { dropType: 'BASE_UPGRADE' as const, rarity: 'UNCOMMON'  as const, minQuantity: 1, maxQuantity: 1, weight:  8 },
      { dropType: 'ROBOT'        as const, rarity: 'UNCOMMON'  as const, minQuantity: 1, maxQuantity: 1, weight:  7 },
      { dropType: 'EQUIPMENT'    as const, rarity: 'RARE'      as const, minQuantity: 1, maxQuantity: 1, weight:  5 },
      { dropType: 'BASE_UPGRADE' as const, rarity: 'RARE'      as const, minQuantity: 1, maxQuantity: 1, weight:  4 },
      { dropType: 'ROBOT'        as const, rarity: 'RARE'      as const, minQuantity: 1, maxQuantity: 1, weight:  4 },
      { dropType: 'EQUIPMENT'    as const, rarity: 'EPIC'      as const, minQuantity: 1, maxQuantity: 1, weight:  2 },
      { dropType: 'BASE_UPGRADE' as const, rarity: 'EPIC'      as const, minQuantity: 1, maxQuantity: 1, weight:  2 },
      { dropType: 'ROBOT'        as const, rarity: 'EPIC'      as const, minQuantity: 1, maxQuantity: 1, weight:  1 },
      { dropType: 'EQUIPMENT'    as const, rarity: 'LEGENDARY' as const, minQuantity: 1, maxQuantity: 1, weight: 0.5 },
      { dropType: 'BASE_UPGRADE' as const, rarity: 'LEGENDARY' as const, minQuantity: 1, maxQuantity: 1, weight: 0.3 },
      { dropType: 'ROBOT'        as const, rarity: 'LEGENDARY' as const, minQuantity: 1, maxQuantity: 1, weight: 0.2 },
    ],
  },

  // ─── Robot Crates (drop garantido por raridade) ───────────────────────────
  {
    lootboxType: 'ROBOT_CRATE_COMMON',
    name:        'Robot Crate — Common',
    description: 'Guaranteed Common robot. Reliable and energy efficient.',
    priceCrate:  5,
    weeklyLimit: null,
    seasonal:    false,
    dropEntries: [
      { dropType: 'ROBOT' as const, rarity: 'COMMON' as const, minQuantity: 1, maxQuantity: 1, weight: 1 },
    ],
  },
  {
    lootboxType: 'ROBOT_CRATE_UNCOMMON',
    name:        'Robot Crate — Uncommon',
    description: 'Guaranteed Uncommon robot with improved extraction capabilities.',
    priceCrate:  15,
    weeklyLimit: null,
    seasonal:    false,
    dropEntries: [
      { dropType: 'ROBOT' as const, rarity: 'UNCOMMON' as const, minQuantity: 1, maxQuantity: 1, weight: 1 },
    ],
  },
  {
    lootboxType: 'ROBOT_CRATE_RARE',
    name:        'Robot Crate — Rare',
    description: 'Guaranteed Rare robot. High-performance unit with significant ER output.',
    priceCrate:  50,
    weeklyLimit: null,
    seasonal:    false,
    dropEntries: [
      { dropType: 'ROBOT' as const, rarity: 'RARE' as const, minQuantity: 1, maxQuantity: 1, weight: 1 },
    ],
  },
  {
    lootboxType: 'ROBOT_CRATE_EPIC',
    name:        'Robot Crate — Epic',
    description: 'Guaranteed Epic robot. Top-tier unit. Maximum ER, higher power draw.',
    priceCrate:  150,
    weeklyLimit: null,
    seasonal:    false,
    dropEntries: [
      { dropType: 'ROBOT' as const, rarity: 'EPIC' as const, minQuantity: 1, maxQuantity: 1, weight: 1 },
    ],
  },
]

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    const { getAdminUser } = await import('@/lib/admin-auth')
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const force = new URL(req.url).searchParams.get('force') === 'true'

  if (!force) {
    const existing = await prisma.lootboxConfig.count()
    if (existing > 0)
      return NextResponse.json({ message: `Skipped — ${existing} configs already in DB. Use ?force=true to re-seed.` })
  } else {
    // Remove configs existentes antes de re-seeder
    await prisma.lootboxConfig.deleteMany()
  }

  let created = 0
  for (const cfg of CONFIGS) {
    await prisma.lootboxConfig.create({
      data: {
        lootboxType: cfg.lootboxType,
        name:        cfg.name,
        description: cfg.description,
        priceCrate:  cfg.priceCrate,
        weeklyLimit: cfg.weeklyLimit ?? null,
        seasonal:    cfg.seasonal,
        active:      true,
        dropEntries: {
          create: cfg.dropEntries.map((e) => ({
            dropType:     e.dropType,
            rarity:       e.rarity ?? null,
            minQuantity:  e.minQuantity,
            maxQuantity:  e.maxQuantity,
            weight:       e.weight,
            specificName: 'specificName' in e ? (e as { specificName?: string }).specificName ?? null : null,
          })),
        },
      },
    })
    created++
  }

  return NextResponse.json({ success: true, created })
}
