import 'server-only'
import { prisma } from '@/lib/prisma'
import { loadPartsCatalog, pickPartFromCatalog, type CatalogPart } from '@/lib/lootbox'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the Monday 00:00:00 UTC of the week containing `date`. */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getUTCDay() // 0 = Sun, 1 = Mon, …
  const diff = day === 0 ? -6 : 1 - day // days to subtract to reach Monday
  d.setUTCDate(d.getUTCDate() + diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

// ─── Ranking rewards table ────────────────────────────────────────────────────

type PositionReward = { supplyCrates: number; partsCrates: number }

function getRankingReward(position: number): PositionReward | null {
  if (position === 1)  return { supplyCrates: 3, partsCrates: 2 }
  if (position === 2)  return { supplyCrates: 2, partsCrates: 2 }
  if (position === 3)  return { supplyCrates: 2, partsCrates: 1 }
  if (position <= 5)   return { supplyCrates: 1, partsCrates: 1 }
  if (position <= 10)  return { supplyCrates: 0, partsCrates: 1 }
  return null // 11th+: badge only
}

// ─── Weekly drop table ────────────────────────────────────────────────────────

type DropResult =
  | { type: 'PARTS'; rarity: 'COMMON' | 'UNCOMMON' | 'RARE'; quantity: number }
  | { type: 'REPAIR_KIT'; percent: number }
  | { type: 'LOOTBOX'; lootboxType: 'PARTS_CRATE' | 'SUPPLY_CRATE'; quantity: number }

function rollWeeklyDrop(): DropResult {
  const rand = Math.random() * 100
  if (rand < 40) return { type: 'PARTS', rarity: 'COMMON',   quantity: 2 }
  if (rand < 60) return { type: 'REPAIR_KIT', percent: 5 }
  if (rand < 78) return { type: 'PARTS', rarity: 'UNCOMMON', quantity: 1 }
  if (rand < 88) return { type: 'REPAIR_KIT', percent: 25 }
  if (rand < 95) return { type: 'LOOTBOX', lootboxType: 'PARTS_CRATE',  quantity: 1 }
  if (rand < 99) return { type: 'PARTS', rarity: 'RARE',     quantity: 1 }
  return             { type: 'LOOTBOX', lootboxType: 'SUPPLY_CRATE', quantity: 1 }
}

function dropLabel(drop: DropResult): string {
  switch (drop.type) {
    case 'PARTS':      return `${drop.quantity}× ${drop.rarity} Part${drop.quantity > 1 ? 's' : ''}`
    case 'REPAIR_KIT': return `Repair Kit +${drop.percent}%`
    case 'LOOTBOX':    return drop.lootboxType === 'PARTS_CRATE' ? 'Parts Crate' : 'Supply Crate'
  }
}

// ─── Deliver weekly drop reward ───────────────────────────────────────────────

async function deliverDrop(userId: string, drop: DropResult, catalog: CatalogPart[]): Promise<void> {
  switch (drop.type) {
    case 'PARTS': {
      // Sorteia peça do catálogo do banco (fallback hardcoded se vazio)
      const { partType, category } = pickPartFromCatalog(drop.rarity, catalog)
      await prisma.inventoryPart.upsert({
        where:  { userId_partType: { userId, partType } },
        create: { userId, partType, category: category as never, rarity: drop.rarity, quantity: drop.quantity },
        update: { quantity: { increment: drop.quantity } },
      })
      break
    }
    case 'REPAIR_KIT': {
      await prisma.consumable.upsert({
        where:  { userId_consumableType_value: { userId, consumableType: 'REPAIR_KIT', value: drop.percent } },
        create: { userId, consumableType: 'REPAIR_KIT', value: drop.percent, quantity: 1 },
        update: { quantity: { increment: 1 } },
      })
      break
    }
    case 'LOOTBOX': {
      await prisma.inventoryLootbox.upsert({
        where:  { userId_lootboxType: { userId, lootboxType: drop.lootboxType } },
        create: { userId, lootboxType: drop.lootboxType, quantity: drop.quantity, source: 'weekly_drop' },
        update: { quantity: { increment: drop.quantity } },
      })
      break
    }
  }
}

// ─── Deliver ranking lootbox reward ──────────────────────────────────────────

async function deliverRankingLootboxes(
  userId: string,
  supplyCrates: number,
  partsCrates: number,
): Promise<void> {
  const ops: Promise<unknown>[] = []
  if (supplyCrates > 0) {
    ops.push(
      prisma.inventoryLootbox.upsert({
        where:  { userId_lootboxType: { userId, lootboxType: 'SUPPLY_CRATE' } },
        create: { userId, lootboxType: 'SUPPLY_CRATE', quantity: supplyCrates, source: 'ranking' },
        update: { quantity: { increment: supplyCrates } },
      }),
    )
  }
  if (partsCrates > 0) {
    ops.push(
      prisma.inventoryLootbox.upsert({
        where:  { userId_lootboxType: { userId, lootboxType: 'PARTS_CRATE' } },
        create: { userId, lootboxType: 'PARTS_CRATE', quantity: partsCrates, source: 'ranking' },
        update: { quantity: { increment: partsCrates } },
      }),
    )
  }
  await Promise.all(ops)
}

// ─── processWeeklyReset ───────────────────────────────────────────────────────

export type WeeklyResetResult = {
  skipped: boolean
  weekStart: string
  ranking: {
    playersRewarded: number
    badgesAwarded: number
    snapshotEntries: number
  }
  drop: {
    totalActive: number
    dropsDelivered: number
  }
}

export async function processWeeklyReset(): Promise<WeeklyResetResult> {
  const weekStart = getWeekStart()

  // ── Idempotency guard ────────────────────────────────────────────────────────
  const existing = await prisma.weeklySnapshot.findUnique({ where: { weekStart } })
  if (existing) {
    return {
      skipped: true,
      weekStart: weekStart.toISOString(),
      ranking: { playersRewarded: 0, badgesAwarded: 0, snapshotEntries: (existing.entries as unknown[]).length },
      drop: { totalActive: 0, dropsDelivered: 0 },
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PART 1 — RANKING REWARDS
  // ══════════════════════════════════════════════════════════════════════════════

  const miners = await prisma.user.findMany({
    where:   { weeklyErContributed: { gt: 0 } },
    select:  { id: true, username: true, weeklyErContributed: true },
    orderBy: { weeklyErContributed: 'desc' },
  })

  // Snapshot entries for storage
  type SnapshotEntry = {
    userId: string; username: string; position: number; erTotal: number; rewarded: boolean
  }
  const snapshotEntries: SnapshotEntry[] = miners.map((u, idx) => ({
    userId:   u.id,
    username: u.username,
    position: idx + 1,
    erTotal:  u.weeklyErContributed,
    rewarded: idx < 10,
  }))

  let rankingPlayersRewarded = 0
  let badgesAwarded = 0

  // Deliver rewards + notifications in parallel per player
  await Promise.all(
    miners.map(async (miner, idx) => {
      const position = idx + 1
      const reward = getRankingReward(position)

      if (reward) {
        await deliverRankingLootboxes(miner.id, reward.supplyCrates, reward.partsCrates)

        const parts: string[] = []
        if (reward.supplyCrates > 0) parts.push(`${reward.supplyCrates}× Supply Crate`)
        if (reward.partsCrates  > 0) parts.push(`${reward.partsCrates}× Parts Crate`)

        await prisma.notification.create({
          data: {
            userId:  miner.id,
            title:   `🏆 Mining Race — #${position}!`,
            message: `You finished #${position} this week. Reward: ${parts.join(' + ')}. Check your inventory.`,
          },
        })
        rankingPlayersRewarded++
      } else {
        // 11th+ — participation badge notification only
        await prisma.notification.create({
          data: {
            userId:  miner.id,
            title:   'Mining Race — Participant',
            message: `You finished #${position} in this week's Mining Race. Keep mining to reach the top 10!`,
          },
        })
        badgesAwarded++
      }
    }),
  )

  // Increment RANKING missions for top-10
  void Promise.all(
    miners.slice(0, 10).map((m) =>
      prisma.userMission
        .updateMany({
          where: {
            userId: m.id,
            completed: false,
            mission: { category: 'RANKING' },
          },
          data: { progress: { increment: 1 } },
        })
        .catch(() => {}),
    ),
  )

  // Save snapshot + reset weeklyErContributed
  await Promise.all([
    prisma.weeklySnapshot.create({ data: { weekStart, entries: snapshotEntries } }),
    prisma.user.updateMany({ data: { weeklyErContributed: 0 } }),
  ])

  // ══════════════════════════════════════════════════════════════════════════════
  // PART 2 — WEEKLY SUPPLY DROP
  // ══════════════════════════════════════════════════════════════════════════════

  const prevWeekStart = new Date(weekStart)
  prevWeekStart.setUTCDate(prevWeekStart.getUTCDate() - 7)
  const prevWeekEnd   = weekStart // exclusive

  // Active = played any minigame this week OR earned ≥96 mining rewards (≈24h)
  const [minigamePlayers, heavyMiners] = await Promise.all([
    prisma.minigameSession.findMany({
      where:  { playedAt: { gte: prevWeekStart, lt: prevWeekEnd } },
      select: { userId: true },
      distinct: ['userId'],
    }),
    prisma.miningReward.groupBy({
      by:     ['userId'],
      where:  { createdAt: { gte: prevWeekStart, lt: prevWeekEnd } },
      having: { userId: { _count: { gte: 96 } } },
    }),
  ])

  const activeUserIds = new Set<string>([
    ...minigamePlayers.map((s) => s.userId),
    ...heavyMiners.map((r) => r.userId),
  ])

  if (activeUserIds.size === 0) {
    return {
      skipped: false,
      weekStart: weekStart.toISOString(),
      ranking: {
        playersRewarded: rankingPlayersRewarded,
        badgesAwarded,
        snapshotEntries: snapshotEntries.length,
      },
      drop: { totalActive: 0, dropsDelivered: 0 },
    }
  }

  // Find which of those already have a drop this week
  const existingDrops = await prisma.weeklyDrop.findMany({
    where:  { userId: { in: [...activeUserIds] }, weekStart },
    select: { userId: true },
  })
  const alreadyDropped = new Set(existingDrops.map((d) => d.userId))
  const pendingUserIds = [...activeUserIds].filter((id) => !alreadyDropped.has(id))

  let dropsDelivered = 0
  const partsCatalog = await loadPartsCatalog()  // carregado uma vez para todos os drops
  await Promise.all(
    pendingUserIds.map(async (userId) => {
      const drop = rollWeeklyDrop()
      await Promise.all([
        deliverDrop(userId, drop, partsCatalog),
        prisma.weeklyDrop.create({
          data: { userId, weekStart, dropped: true, droppedAt: new Date(), reward: drop as never },
        }),
        prisma.notification.create({
          data: {
            userId,
            title:   '📦 Weekly Supply Drop!',
            message: `Your weekly drop is ready: ${dropLabel(drop)}. Check your inventory.`,
          },
        }),
      ])
      dropsDelivered++
    }),
  )

  console.log(
    `[weekly] weekStart=${weekStart.toISOString()} | ` +
    `ranking: ${rankingPlayersRewarded} rewarded, ${badgesAwarded} badges | ` +
    `drop: ${dropsDelivered}/${activeUserIds.size} delivered`,
  )

  return {
    skipped: false,
    weekStart: weekStart.toISOString(),
    ranking: {
      playersRewarded: rankingPlayersRewarded,
      badgesAwarded,
      snapshotEntries: snapshotEntries.length,
    },
    drop: { totalActive: activeUserIds.size, dropsDelivered },
  }
}
