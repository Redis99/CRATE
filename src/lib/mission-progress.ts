import 'server-only'
import { prisma } from '@/lib/prisma'
import { generateRobotDrop, generateEquipmentDrop, saveDropToInventory } from '@/lib/lootbox'
import type { LootboxType } from '@prisma/client'

// ─── incrementMission ────────────────────────────────────────────────────────
// Call this after any in-game event to advance matching missions.
// Errors are swallowed so they never break the calling API.

export async function incrementMission(
  userId: string,
  category: string,
  amount: number = 1,
): Promise<void> {
  try {
    const now      = new Date()
    const missions = await prisma.mission.findMany({
      where: {
        category: category as never,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { id: true, title: true, target: true },
    })
    if (!missions.length) return

    for (const mission of missions) {
      const existing = await prisma.userMission.findUnique({
        where:  { userId_missionId: { userId, missionId: mission.id } },
        select: { progress: true, completed: true },
      })

      if (existing?.completed) continue

      const current  = existing?.progress ?? 0
      const newProg  = Math.min(current + amount, mission.target)
      const justDone = newProg >= mission.target

      await prisma.userMission.upsert({
        where:  { userId_missionId: { userId, missionId: mission.id } },
        create: {
          userId,
          missionId:   mission.id,
          progress:    newProg,
          completed:   justDone,
          completedAt: justDone ? new Date() : null,
        },
        update: {
          progress:    newProg,
          ...(justDone && { completed: true, completedAt: new Date() }),
        },
      })

      if (justDone) {
        await prisma.notification.create({
          data: {
            userId,
            title:   'Mission Complete!',
            message: `"${mission.title}" completed — go to Missions to claim your reward.`,
          },
        }).catch(() => {})
      }
    }
  } catch {
    // silently ignore — mission progress is non-critical
  }
}

// ─── deliverMissionReward ────────────────────────────────────────────────────
// Returns an error string or null on success.

type RewardData = Record<string, unknown>

export async function deliverMissionReward(
  userId: string,
  rewardType: string,
  rewardData: RewardData,
): Promise<string | null> {
  const data = rewardData

  switch (rewardType) {
    case 'LOOTBOX': {
      const lootboxType = ((data.lootboxType as string) ?? 'PARTS_CRATE') as LootboxType
      const quantity    = (data.quantity as number) ?? 1
      await prisma.inventoryLootbox.upsert({
        where:  { userId_lootboxType: { userId, lootboxType } },
        create: { userId, lootboxType, quantity, source: 'mission' },
        update: { quantity: { increment: quantity } },
      })
      return null
    }

    case 'ROBOT': {
      const rarity = (data.rarity as 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY') ?? 'COMMON'
      const profile = await prisma.user.findUnique({
        where:  { id: userId },
        select: { slotsRobots: true, _count: { select: { robots: true } } },
      })
      if (!profile) return 'Profile not found.'
      if (profile._count.robots >= profile.slotsRobots) return 'Robot inventory is full.'
      const drop = generateRobotDrop(rarity)
      await saveDropToInventory(userId, drop)
      return null
    }

    case 'EQUIPMENT': {
      const rarity = (data.rarity as 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY') ?? 'COMMON'
      const profile = await prisma.user.findUnique({
        where:  { id: userId },
        select: { slotsEquipments: true, _count: { select: { equipments: true } } },
      })
      if (!profile) return 'Profile not found.'
      if (profile._count.equipments >= profile.slotsEquipments) return 'Equipment inventory is full.'
      const drop = generateEquipmentDrop(rarity)
      await saveDropToInventory(userId, drop)
      return null
    }

    case 'REPAIR_KIT': {
      const percent = (data.percent as number) ?? 25
      await prisma.consumable.upsert({
        where:  { userId_consumableType_value: { userId, consumableType: 'REPAIR_KIT', value: percent } },
        create: { userId, consumableType: 'REPAIR_KIT', value: percent, quantity: 1 },
        update: { quantity: { increment: 1 } },
      })
      return null
    }

    case 'INVENTORY_EXPANSION': {
      const tab   = (data.tab as string) ?? 'ROBOTS'
      const slots = (data.slots as number) ?? 5
      const field: Record<string, string> = {
        ROBOTS:        'slotsRobots',
        EQUIPMENTS:    'slotsEquipments',
        BASE_UPGRADES: 'slotsBaseUpgrades',
        PARTS:         'slotsParts',
        CONSUMABLES:   'slotsConsumables',
        LOOTBOXES:     'slotsLootboxes',
      }
      const fieldName = field[tab]
      if (!fieldName) return 'Unknown inventory tab.'
      await prisma.user.update({
        where: { id: userId },
        data:  { [fieldName]: { increment: slots } },
      })
      return null
    }

    case 'OUTPOST_SLOT': {
      const slots = (data.slots as number) ?? 1
      const user  = await prisma.user.findUnique({ where: { id: userId }, select: { outpostSlots: true } })
      if (!user) return 'Profile not found.'
      if (user.outpostSlots >= 6) return 'Outpost is already at maximum capacity.'
      const newSlots = Math.min(user.outpostSlots + slots, 6)
      await prisma.user.update({ where: { id: userId }, data: { outpostSlots: newSlots } })
      return null
    }

    case 'TITLE':
    case 'COSMETIC': {
      const label = rewardType === 'TITLE'
        ? `You earned the title: "${data.title as string}"`
        : `You earned a cosmetic: "${data.name as string}"`
      await prisma.notification.create({
        data: { userId, title: 'Reward Unlocked!', message: label },
      })
      return null
    }

    default:
      return `Unknown reward type: ${rewardType}`
  }
}
