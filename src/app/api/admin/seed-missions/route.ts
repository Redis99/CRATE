/**
 * Seed initial missions. Idempotent — skips if any mission already exists.
 * POST /api/admin/seed-missions  (Bearer CRON_SECRET)
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const MISSIONS = [
  // ── FIRST_STEPS ─────────────────────────────────────────────────────────
  {
    title:       'First Deployment',
    description: 'Deploy your first robot to the Outpost and start mining.',
    category:    'FIRST_STEPS' as const,
    target:      1,
    rewardType:  'LOOTBOX' as const,
    rewardData:  { lootboxType: 'PARTS_CRATE', quantity: 1 },
  },

  // ── LOOTBOX ──────────────────────────────────────────────────────────────
  {
    title:       'First Opening',
    description: 'Open your very first lootbox.',
    category:    'LOOTBOX' as const,
    target:      1,
    rewardType:  'REPAIR_KIT' as const,
    rewardData:  { percent: 25 },
  },
  {
    title:       'Treasure Hunter',
    description: 'Open 10 lootboxes.',
    category:    'LOOTBOX' as const,
    target:      10,
    rewardType:  'LOOTBOX' as const,
    rewardData:  { lootboxType: 'SUPPLY_CRATE', quantity: 1 },
  },
  {
    title:       'Supply Addict',
    description: 'Open 50 lootboxes.',
    category:    'LOOTBOX' as const,
    target:      50,
    rewardType:  'ROBOT' as const,
    rewardData:  { rarity: 'UNCOMMON' },
  },
  {
    title:       'Crate Collector',
    description: 'Open 100 lootboxes.',
    category:    'LOOTBOX' as const,
    target:      100,
    rewardType:  'ROBOT' as const,
    rewardData:  { rarity: 'RARE' },
  },

  // ── MINING ───────────────────────────────────────────────────────────────
  {
    title:       'Block Processor',
    description: 'Accumulate 50 mining blocks processed with your robots.',
    category:    'MINING' as const,
    target:      50,
    rewardType:  'REPAIR_KIT' as const,
    rewardData:  { percent: 50 },
  },
  {
    title:       'Mining Veteran',
    description: 'Accumulate 200 mining blocks processed with your robots.',
    category:    'MINING' as const,
    target:      200,
    rewardType:  'LOOTBOX' as const,
    rewardData:  { lootboxType: 'SUPPLY_CRATE', quantity: 1 },
  },
  {
    title:       'Mining Legend',
    description: 'Accumulate 1000 mining blocks processed with your robots.',
    category:    'MINING' as const,
    target:      1000,
    rewardType:  'ROBOT' as const,
    rewardData:  { rarity: 'RARE' },
  },

  // ── CRAFTING ─────────────────────────────────────────────────────────────
  {
    title:       'First Craft',
    description: 'Craft your first item.',
    category:    'CRAFTING' as const,
    target:      1,
    rewardType:  'REPAIR_KIT' as const,
    rewardData:  { percent: 25 },
  },
  {
    title:       'Artisan',
    description: 'Craft 10 items.',
    category:    'CRAFTING' as const,
    target:      10,
    rewardType:  'EQUIPMENT' as const,
    rewardData:  { rarity: 'UNCOMMON' },
  },
  {
    title:       'Master Crafter',
    description: 'Craft 50 items.',
    category:    'CRAFTING' as const,
    target:      50,
    rewardType:  'ROBOT' as const,
    rewardData:  { rarity: 'RARE' },
  },

  // ── MARKET ───────────────────────────────────────────────────────────────
  {
    title:       'First Trade',
    description: 'Complete your first market transaction (buy or sell).',
    category:    'MARKET' as const,
    target:      1,
    rewardType:  'LOOTBOX' as const,
    rewardData:  { lootboxType: 'PARTS_CRATE', quantity: 1 },
  },
  {
    title:       'Trader',
    description: 'Complete 10 market transactions.',
    category:    'MARKET' as const,
    target:      10,
    rewardType:  'ROBOT' as const,
    rewardData:  { rarity: 'UNCOMMON' },
  },
  {
    title:       'Market Master',
    description: 'Complete 50 market transactions.',
    category:    'MARKET' as const,
    target:      50,
    rewardType:  'LOOTBOX' as const,
    rewardData:  { lootboxType: 'SUPPLY_CRATE', quantity: 2 },
  },

  // ── MINIGAMES ────────────────────────────────────────────────────────────
  {
    title:       'First Victory',
    description: 'Win your first minigame.',
    category:    'MINIGAMES' as const,
    target:      1,
    rewardType:  'REPAIR_KIT' as const,
    rewardData:  { percent: 25 },
  },
  {
    title:       'Gamer',
    description: 'Win 25 minigames.',
    category:    'MINIGAMES' as const,
    target:      25,
    rewardType:  'LOOTBOX' as const,
    rewardData:  { lootboxType: 'PARTS_CRATE', quantity: 2 },
  },
  {
    title:       'Arcade Pro',
    description: 'Win 100 minigames.',
    category:    'MINIGAMES' as const,
    target:      100,
    rewardType:  'ROBOT' as const,
    rewardData:  { rarity: 'UNCOMMON' },
  },
  {
    title:       'Champion',
    description: 'Win 500 minigames.',
    category:    'MINIGAMES' as const,
    target:      500,
    rewardType:  'ROBOT' as const,
    rewardData:  { rarity: 'RARE' },
  },

  // ── CODEX ────────────────────────────────────────────────────────────────
  {
    title:       'First Entry',
    description: 'Register your first robot in the Codex.',
    category:    'CODEX' as const,
    target:      1,
    rewardType:  'LOOTBOX' as const,
    rewardData:  { lootboxType: 'PARTS_CRATE', quantity: 1 },
  },
  {
    title:       'Archivist',
    description: 'Register 5 robots in the Codex.',
    category:    'CODEX' as const,
    target:      5,
    rewardType:  'LOOTBOX' as const,
    rewardData:  { lootboxType: 'SUPPLY_CRATE', quantity: 1 },
  },
  {
    title:       'Curator',
    description: 'Register 15 robots in the Codex.',
    category:    'CODEX' as const,
    target:      15,
    rewardType:  'OUTPOST_SLOT' as const,
    rewardData:  { slots: 1 },
  },

  // ── RANKING ──────────────────────────────────────────────────────────────
  {
    title:       'Top 10',
    description: 'Reach the top 10 in a weekly Mining Race.',
    category:    'RANKING' as const,
    target:      1,
    rewardType:  'ROBOT' as const,
    rewardData:  { rarity: 'RARE' },
  },
  {
    title:       'Elite Miner',
    description: 'Reach the top 3 in a weekly Mining Race.',
    category:    'RANKING' as const,
    target:      1,
    rewardType:  'ROBOT' as const,
    rewardData:  { rarity: 'EPIC' },
  },
]

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    const { getAdminUser } = await import('@/lib/admin-auth')
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const existing = await prisma.mission.count()
  if (existing > 0) {
    return NextResponse.json({ message: `Already seeded (${existing} missions exist).` })
  }

  await prisma.mission.createMany({
    data: MISSIONS.map((m) => ({
      ...m,
      rewardData: m.rewardData as object,
    })),
  })

  return NextResponse.json({ success: true, created: MISSIONS.length })
}
