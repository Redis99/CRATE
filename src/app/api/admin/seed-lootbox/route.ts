/**
 * Seed das configurações de lootbox no banco.
 * Espelha exatamente as drop tables hardcoded em lootbox.ts.
 * Chamar uma vez: POST /api/admin/seed-lootbox (Bearer CRON_SECRET)
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CONFIGS = [
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
      { dropType: 'CONSUMABLE'   as const, rarity: undefined,             minQuantity: 5, maxQuantity: 5, weight: 12, specificName: 'REPAIR_KIT_5' },
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
]

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.lootboxConfig.count()
  if (existing > 0)
    return NextResponse.json({ message: `Skipped — ${existing} configs already in DB.` })

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
